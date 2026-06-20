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
        .filter(Boolean).join(' · ');
      const cta = o.url
        ? `<a href="${o.url}" style="color:#7D5CFF;font-weight:bold;text-decoration:none;">Voir l'offre →</a>`
        : '';
      return `<tr><td style="padding:14px 16px;border:1px solid #E5E7EB;border-radius:12px;display:block;margin-bottom:10px;">
        <div style="font-weight:bold;color:#111827;font-size:15px;">${o.title}</div>
        <div style="color:#7D5CFF;font-size:13px;margin:2px 0 6px;">${o.company}</div>
        <div style="color:#6B7280;font-size:12px;margin-bottom:8px;">${meta}</div>
        ${cta}
      </td></tr>`;
    }).join('');

    const freqLabel = params.frequency === 'weekly' ? 'cette semaine' : "aujourd'hui";
    const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#F8FAFC;padding:16px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;">
        <div style="font-size:20px;font-weight:800;color:#111827;margin-bottom:4px;">Jo<span style="color:#7D5CFF;">Boost</span></div>
        <p style="color:#111827;font-size:15px;">Bonjour ${params.name.split(' ')[0] || ''},</p>
        <p style="color:#4B5563;font-size:14px;line-height:1.5;">Voici une sélection d'offres qui correspondent à votre profil ${freqLabel} :</p>
        <table role="presentation" style="width:100%;border-collapse:separate;">${cards}</table>
        <a href="${APP_URL}/target/lbb" style="display:inline-block;margin-top:8px;background:#7D5CFF;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px;">Voir toutes les offres</a>
        <hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0;"/>
        <p style="font-size:11px;color:#9CA3AF;margin:0;">Vous recevez cet email car vous avez activé les alertes emploi sur JobBoost. Pour les désactiver, rendez-vous dans Paramètres → Notifications.</p>
      </div>
    </body></html>`;

    const subject = `${params.offers.length} offre${params.offers.length > 1 ? 's' : ''} pour vous — JobBoost`;
    const payload = {
      from: `JobBoost <${EMAIL_FROM}>`,
      to: [params.to],
      subject,
      html,
    };

    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
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
