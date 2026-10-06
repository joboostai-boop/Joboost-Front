// ====================================================================
//  Boîte mail du candidat (envoi uniquement) — comme Jobea.
//
//  Gmail : le candidat génère un « mot de passe d'application » (16 lettres) dans
//  son compte Google (nécessite la validation en deux étapes). Joboost s'en sert
//  UNIQUEMENT pour envoyer via le serveur SMTP de Gmail : rien n'est lu dans la
//  boîte. Le candidat peut le révoquer à tout moment depuis son compte Google.
//  Le secret est chiffré (secretBox) et n'est jamais renvoyé au navigateur.
// ====================================================================
import nodemailer from 'nodemailer';
import { prisma } from '../db';
import { seal, open, isSecretBoxConfigured } from './secretBox';

const GMAIL_SMTP = { host: 'smtp.gmail.com', port: 465, secure: true };

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: string }[]; // content en base64
}

const transportFor = (email: string, password: string) =>
  nodemailer.createTransport({ ...GMAIL_SMTP, auth: { user: email, pass: password }, connectionTimeout: 15_000, socketTimeout: 30_000 });

// Message d'erreur compréhensible à partir d'une erreur SMTP.
const explain = (e: any): string => {
  const msg = `${e?.response || e?.message || e}`;
  if (/535|Username and Password not accepted|Invalid login|BadCredentials/i.test(msg)) {
    return "Gmail a refusé ces identifiants. Vérifie l'adresse et le mot de passe d'application (16 lettres), puis réessaie.";
  }
  if (/534|Application-specific password required|InvalidSecondFactor/i.test(msg)) {
    return "Gmail exige un mot de passe d'application : ton mot de passe habituel ne fonctionne pas ici.";
  }
  if (/limit|quota|550 5\.4\.5|daily/i.test(msg)) return "Gmail a atteint sa limite d'envoi pour aujourd'hui.";
  if (/ETIMEDOUT|ECONNRESET|ENOTFOUND|timeout/i.test(msg)) return 'Connexion à Gmail impossible pour le moment. Réessaie dans quelques minutes.';
  return msg.slice(0, 200);
};

export const isAuthError = (e: any) => /535|534|Invalid login|BadCredentials|not accepted/i.test(`${e?.response || e?.message || e}`);

export const mailboxService = {
  isAvailable: () => isSecretBoxConfigured(),

  /** État de la connexion, sans aucun secret. */
  status: async (userId: string) => {
    const c = await prisma.mailboxConnection.findUnique({ where: { userId } });
    if (!c) return { connected: false as const };
    return {
      connected: true as const,
      provider: c.provider,
      email: c.email,
      status: c.status,
      lastError: c.lastError,
      dailyLimit: c.dailyLimit,
      verifiedAt: c.verifiedAt,
    };
  },

  /** Vérifie les identifiants auprès de Gmail, puis les enregistre chiffrés. */
  connect: async (userId: string, email: string, appPassword: string) => {
    if (!isSecretBoxConfigured()) throw new Error("L'envoi depuis ta boîte n'est pas encore activé sur Joboost.");
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (appPassword || '').replace(/\s+/g, '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Adresse e-mail invalide.');
    if (!/^[a-zA-Z]{16}$/.test(cleanPass)) {
      throw new Error("Un mot de passe d'application Gmail fait 16 lettres (Google l'affiche en 4 groupes de 4).");
    }
    try {
      await transportFor(cleanEmail, cleanPass).verify();
    } catch (e: any) {
      throw new Error(explain(e));
    }
    const data = { provider: 'gmail', email: cleanEmail, secretEnc: seal(cleanPass), status: 'ACTIVE', lastError: null, verifiedAt: new Date() };
    await prisma.mailboxConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return mailboxService.status(userId);
  },

  disconnect: async (userId: string) => {
    await prisma.mailboxConnection.deleteMany({ where: { userId } });
  },

  /** Envoie depuis la boîte du candidat. Lève une erreur lisible en cas d'échec. */
  send: async (userId: string, senderName: string, mail: OutgoingMail): Promise<{ messageId: string }> => {
    const c = await prisma.mailboxConnection.findUnique({ where: { userId } });
    if (!c) throw new Error("Aucune boîte mail connectée.");
    try {
      const info = await transportFor(c.email, open(c.secretEnc)).sendMail({
        from: { name: senderName, address: c.email },
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        attachments: (mail.attachments || []).map((a) => ({ filename: a.filename, content: Buffer.from(a.content, 'base64') })),
      });
      await prisma.mailboxConnection.update({ where: { userId }, data: { lastSentAt: new Date(), status: 'ACTIVE', lastError: null } });
      return { messageId: info.messageId };
    } catch (e: any) {
      const message = explain(e);
      if (isAuthError(e)) {
        await prisma.mailboxConnection.update({ where: { userId }, data: { status: 'ERROR', lastError: message } });
      }
      throw Object.assign(new Error(message), { auth: isAuthError(e) });
    }
  },
};
