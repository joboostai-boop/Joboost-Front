import dotenv from 'dotenv';
import nodemailer, { Transporter } from 'nodemailer';
dotenv.config();

// ====================================================================
//  Service d'envoi d'emails — deux transports possibles :
//   1) GMAIL SMTP (sans domaine à acheter) : GMAIL_USER + GMAIL_APP_PASSWORD.
//      Envoie depuis l'adresse Gmail via un « mot de passe d'application ».
//      Idéal pour un lancement à petit volume (~500 mails/j). PRIORITAIRE si présent.
//   2) RESEND (API REST) : RESEND_API_KEY + EMAIL_FROM (exige un domaine vérifié).
//  Si aucun n'est configuré → mode "manuel" (aucun envoi réel), l'app reste
//  fonctionnelle sans clé (repli identique à France Travail).
//
//  Reply-To = email réel de l'utilisateur → les réponses lui reviennent directement.
// ====================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_URL = 'https://api.resend.com/emails';

const GMAIL_USER = process.env.GMAIL_USER || '';
// Mot de passe d'application Google (16 caractères), PAS le mot de passe du compte.
const GMAIL_APP_PASSWORD = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

// Adresse expéditrice : l'adresse Gmail si transport Gmail, sinon EMAIL_FROM (Resend).
const EMAIL_FROM = GMAIL_USER || process.env.EMAIL_FROM || 'envois@joboost.io';

const useGmail = (): boolean => Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
const useResend = (): boolean => Boolean(RESEND_API_KEY && process.env.EMAIL_FROM);

export const isEmailConfigured = (): boolean => useGmail() || useResend();

// Transport Gmail créé une seule fois (réutilisé entre les envois).
let gmailTransport: Transporter | null = null;
const getGmailTransport = (): Transporter => {
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return gmailTransport;
};

// Envoi générique bas niveau : choisit Gmail (prioritaire) puis Resend.
interface RawMail {
  fromLabel: string;        // ex. "Sana via Joboost" (le domaine réel est EMAIL_FROM)
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}
const sendRaw = async (mail: RawMail): Promise<SendResult> => {
  // 1) Gmail SMTP (sans domaine)
  if (useGmail()) {
    try {
      const info = await getGmailTransport().sendMail({
        from: `${mail.fromLabel} <${EMAIL_FROM}>`,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        replyTo: mail.replyTo,
        attachments: (mail.attachments || []).map((a) => ({
          filename: a.filename,
          content: a.content,
          encoding: 'base64',
        })),
      });
      return { sent: true, manual: false, messageId: info.messageId || null };
    } catch (e: any) {
      return { sent: false, manual: false, messageId: null, error: e?.message || 'Erreur Gmail SMTP.' };
    }
  }

  // 2) Resend (domaine vérifié)
  if (useResend()) {
    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${mail.fromLabel} <${EMAIL_FROM}>`,
          to: [mail.to],
          reply_to: mail.replyTo,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          attachments: (mail.attachments || []).map((a) => ({ filename: a.filename, content: a.content })),
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { sent: false, manual: false, messageId: null, error: `Resend ${res.status}: ${txt.slice(0, 200)}` };
      }
      const json: any = await res.json().catch(() => ({}));
      return { sent: true, manual: false, messageId: json?.id || null };
    } catch (e: any) {
      return { sent: false, manual: false, messageId: null, error: e?.message || 'Erreur réseau Resend.' };
    }
  }

  // 3) Aucun transport → manuel
  return { sent: false, manual: true, messageId: null };
};

export interface EmailAttachment {
  filename: string;
  content: string; // base64
}

export interface SendSpontaneousParams {
  senderName: string;        // nom de l'utilisateur (affiché dans le From)
  replyTo: string;           // email réel de l'utilisateur
  to: string;                // email entreprise
  companyName: string;
  jobTitle: string;
  bodyText: string;          // corps (lettre de motivation)
  attachments?: EmailAttachment[];
}

export interface SendResult {
  sent: boolean;
  manual: boolean;           // true => non envoyé (Resend absent) : à finaliser manuellement
  messageId: string | null;
  error?: string;
}

// Offre minimale affichée dans un email d'alerte emploi.
export interface JobAlertOffer {
  title: string;
  company: string;
  location: string;
  salary?: string;
  type?: string;
  url?: string;
}

export interface SendJobAlertParams {
  to: string;                // email du candidat
  name: string;              // prénom/nom du candidat
  offers: JobAlertOffer[];   // sélection d'offres
  frequency: 'daily' | 'weekly';
}

const APP_URL = process.env.FRONTEND_URL || 'https://joboost.netlify.app';

// Échappe les valeurs dynamiques injectées dans le HTML d'un email (titres/entreprises
// d'offres venant d'API tierces) pour éviter qu'un caractère < > " casse la mise en page.
const escapeHtml = (s: string = ''): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Gabarit HTML sobre et professionnel
const buildHtml = (params: SendSpontaneousParams): string => {
  const paragraphs = params.bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#111827;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;background:#ffffff;padding:8px;">
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
    <p style="font-size:12px;color:#6B7280;margin:0;">Candidature envoyée via Joboost pour le compte de ${params.senderName}. Répondez directement à cet e-mail pour échanger avec le candidat.</p>
  </body></html>`;
};

export const emailService = {
  /**
   * Envoie une candidature spontanée. Renvoie { manual: true } sans rien envoyer
   * si Resend n'est pas configuré (l'appelant proposera alors l'envoi manuel).
   */
  sendSpontaneous: async (params: SendSpontaneousParams): Promise<SendResult> => {
    if (!isEmailConfigured()) {
      return { sent: false, manual: true, messageId: null };
    }
    return sendRaw({
      fromLabel: `${params.senderName} via Joboost`,
      to: params.to,
      replyTo: params.replyTo,
      subject: `Candidature spontanée — ${params.jobTitle}`,
      html: buildHtml(params),
      text: params.bodyText,
      attachments: params.attachments,
    });
  },

  /**
   * Envoie une alerte emploi : une sélection d'offres qui correspondent au profil.
   * Renvoie { manual: true } sans rien envoyer si Resend n'est pas configuré.
   */
  sendJobAlert: async (params: SendJobAlertParams): Promise<SendResult> => {
    if (!isEmailConfigured()) {
      return { sent: false, manual: true, messageId: null };
    }
    if (!params.offers.length) {
      return { sent: false, manual: false, messageId: null, error: 'Aucune offre à envoyer.' };
    }

    const cards = params.offers.map((o) => {
      const meta = [o.location, o.type, o.salary && o.salary !== 'Salaire non précisé' ? o.salary : null]
        .filter(Boolean).map((v) => escapeHtml(String(v))).join(' · ');
      const cta = o.url
        ? `<a href="${escapeHtml(o.url)}" style="color:#7D5CFF;font-weight:bold;text-decoration:none;">Voir l'offre →</a>`
        : '';
      return `<tr><td style="padding:14px 16px;border:1px solid #E5E7EB;border-radius:12px;display:block;margin-bottom:10px;">
        <div style="font-weight:bold;color:#111827;font-size:15px;">${escapeHtml(o.title)}</div>
        <div style="color:#7D5CFF;font-size:13px;margin:2px 0 6px;">${escapeHtml(o.company)}</div>
        <div style="color:#6B7280;font-size:12px;margin-bottom:8px;">${meta}</div>
        ${cta}
      </td></tr>`;
    }).join('');

    const n = params.offers.length;
    const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#F8FAFC;padding:16px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;">
        <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">Jo<span style="color:#7D5CFF;">boost</span></div>
        <p style="color:#111827;font-size:15px;">Bonjour ${escapeHtml(params.name.split(' ')[0] || '')},</p>
        <p style="color:#4B5563;font-size:14px;line-height:1.5;">${n > 1 ? `${n} nouvelles offres correspondent` : 'Une nouvelle offre correspond'} à votre profil :</p>
        <table role="presentation" style="width:100%;border-collapse:separate;">${cards}</table>
        <a href="${APP_URL}/target/lbb" style="display:inline-block;margin-top:8px;background:#7D5CFF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">Voir toutes les offres</a>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">Vous recevez cet email car vous avez activé les alertes emploi sur Joboost. Pour les désactiver, rendez-vous dans Paramètres → Notifications.</p>
      </div>
    </body></html>`;

    const subject = `${params.offers.length} nouvelle${params.offers.length > 1 ? 's' : ''} offre${params.offers.length > 1 ? 's' : ''} pour vous — Joboost`;
    return sendRaw({ fromLabel: 'Joboost', to: params.to, subject, html });
  },

  /**
   * Envoie l'email de réinitialisation de mot de passe (lien avec token).
   * Renvoie { manual: true } si aucun transport n'est configuré.
   */
  sendPasswordReset: async (params: { to: string; name?: string; resetUrl: string }): Promise<SendResult> => {
    if (!isEmailConfigured()) {
      return { sent: false, manual: true, messageId: null };
    }
    const firstName = escapeHtml((params.name || '').split(' ')[0] || '');
    const link = escapeHtml(params.resetUrl);
    const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#F8FAFC;padding:16px;">
      <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;">
        <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:12px;">Jo<span style="color:#7D5CFF;">boost</span></div>
        <p style="color:#111827;font-size:15px;">Bonjour ${firstName},</p>
        <p style="color:#4B5563;font-size:14px;line-height:1.6;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous (lien valable 1 heure) :</p>
        <a href="${link}" style="display:inline-block;margin:14px 0;background:#7D5CFF;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">Choisir un nouveau mot de passe</a>
        <p style="color:#6B7280;font-size:12px;line-height:1.6;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe reste inchangé.</p>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
        <p style="font-size:11px;color:#9CA3AF;margin:0;word-break:break-all;">Si le bouton ne fonctionne pas, copiez ce lien : ${link}</p>
      </div>
    </body></html>`;
    return sendRaw({
      fromLabel: 'Joboost',
      to: params.to,
      subject: 'Réinitialisation de votre mot de passe Joboost',
      html,
      text: `Réinitialisez votre mot de passe : ${params.resetUrl}`,
    });
  },
};
