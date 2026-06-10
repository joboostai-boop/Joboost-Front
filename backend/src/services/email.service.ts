import dotenv from 'dotenv';
dotenv.config();

// ====================================================================
//  Service d'envoi — candidatures spontanées
//  Stratégie MVP : "send on behalf of" via Resend (API REST, pas de dépendance npm).
//    From     : "Prénom Nom via JobBoost <envois@joboost.io>"  (domaine vérifié JobBoost)
//    Reply-To : email réel de l'utilisateur  → les réponses lui reviennent directement
//    To       : contact entreprise
//  Si Resend n'est pas configuré, on bascule en mode "manuel" (aucun envoi réel),
//  exactement comme le repli France Travail → l'app reste fonctionnelle sans clé.
// ====================================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'envois@joboost.io';
const RESEND_URL = 'https://api.resend.com/emails';

export const isEmailConfigured = (): boolean => Boolean(RESEND_API_KEY && EMAIL_FROM);

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

// Gabarit HTML sobre et professionnel
const buildHtml = (params: SendSpontaneousParams): string => {
  const paragraphs = params.bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#111827;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;background:#ffffff;padding:8px;">
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
    <p style="font-size:12px;color:#6B7280;margin:0;">Candidature envoyée via JobBoost pour le compte de ${params.senderName}. Répondez directement à cet e-mail pour échanger avec le candidat.</p>
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

    const payload = {
      from: `${params.senderName} via JobBoost <${EMAIL_FROM}>`,
      to: [params.to],
      reply_to: params.replyTo,
      subject: `Candidature spontanée — ${params.jobTitle}`,
      html: buildHtml(params),
      text: params.bodyText,
      attachments: (params.attachments || []).map((a) => ({ filename: a.filename, content: a.content })),
    };

    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
  },
};
