import dotenv from 'dotenv';
dotenv.config();

// ====================================================================
//  Service La Bonne Alternance (API Apprentissage, gouvernementale).
//  Doc : https://api.apprentissage.beta.gouv.fr — auth Bearer (LBA_API_KEY).
//
//  - Recherche : GET /job/v1/search (offres d'alternance + recruteurs =
//    entreprises SANS offre, cibles de candidature spontanée).
//  - Postuler  : POST /job/v1/apply → l'API transmet ELLE-MÊME la
//    candidature (CV + message) au recruteur. On ne manipule aucun email.
//
//  Dégradation propre : si LBA_API_KEY absente, isLbaConfigured() = false.
// ====================================================================

const LBA_API_KEY = process.env.LBA_API_KEY || '';
const LBA_BASE = (process.env.LBA_API_BASE || 'https://api.apprentissage.beta.gouv.fr/api').replace(/\/$/, '');

export const isLbaConfigured = (): boolean => Boolean(LBA_API_KEY);

export interface LbaSearchParams {
  latitude: number;
  longitude: number;
  romes?: string;        // codes ROME séparés par virgule
  radius?: number;       // km (0-200, défaut 30)
  diplomaLevel?: number; // target_diploma_level (3-7)
}

export interface LbaOpportunity {
  id: string;
  kind: 'offre' | 'entreprise'; // offre publiée vs recruteur (spontanée)
  title: string;
  company: string;
  location?: string;
  contractType?: string;
  description?: string;
  recipientId?: string; // requis pour postuler via /job/v1/apply
  applyUrl?: string;
  raw?: any;
}

export interface LbaApplyInput {
  recipientId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  attachmentName: string;  // ex. "CV.pdf"
  attachmentContent: string; // base64
  message?: string;        // lettre / mot de motivation
}

const authHeaders = () => ({ Authorization: `Bearer ${LBA_API_KEY}`, Accept: 'application/json' });

// Normalisation défensive : la réponse peut exposer workplace/offer/apply.
const pick = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== '');
const normalize = (item: any): LbaOpportunity => {
  const workplace = item?.workplace || {};
  const offer = item?.offer || {};
  const apply = item?.apply || {};
  const contract = item?.contract || {};
  const loc = workplace?.location || {};
  const contractType = Array.isArray(contract?.type) ? contract.type.join(', ') : contract?.type;
  const hasOffer = Boolean(offer?.title || offer?.description);
  return {
    id: String(pick(item?.identifier?.id, item?._id, item?.id, apply?.recipient_id, Math.random().toString(36).slice(2))),
    kind: hasOffer ? 'offre' : 'entreprise',
    title: pick(offer?.title, workplace?.name, workplace?.brand, 'Alternance'),
    company: pick(workplace?.brand, workplace?.name, workplace?.legal_name, 'Entreprise'),
    location: pick(loc?.address, workplace?.city, loc?.city),
    contractType,
    description: pick(offer?.description, offer?.access_conditions),
    recipientId: pick(apply?.recipient_id, apply?.recipientId),
    applyUrl: pick(apply?.url),
    raw: item,
  };
};

// Extrait la liste d'éléments quelle que soit la forme de la réponse.
const extractItems = (json: any): any[] => {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.jobs)) return json.jobs;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.results)) return json.results;
  // fallback : concatène tous les tableaux présents (ex. jobs + recruiters)
  const arrays = Object.values(json || {}).filter((v) => Array.isArray(v)) as any[][];
  return arrays.flat();
};

export const laBonneAlternanceService = {
  /** Recherche offres + entreprises en alternance autour d'un point géo. */
  search: async (p: LbaSearchParams): Promise<LbaOpportunity[]> => {
    if (!isLbaConfigured()) return [];
    const params = new URLSearchParams({
      latitude: String(p.latitude),
      longitude: String(p.longitude),
      radius: String(Math.min(200, Math.max(0, p.radius ?? 30))),
    });
    if (p.romes) params.set('romes', p.romes);
    if (p.diplomaLevel) params.set('target_diploma_level', String(p.diplomaLevel));

    const res = await fetch(`${LBA_BASE}/job/v1/search?${params.toString()}`, { headers: authHeaders() });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`La Bonne Alternance search ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return extractItems(json).map(normalize);
  },

  /**
   * Envoie une candidature au recruteur via le relais officiel.
   * Renvoie { sent, id? } ; l'API répond 202 en cas de succès.
   */
  apply: async (input: LbaApplyInput): Promise<{ sent: boolean; id?: string; error?: string }> => {
    if (!isLbaConfigured()) return { sent: false, error: 'LBA non configurée' };
    const body = {
      applicant_first_name: input.firstName,
      applicant_last_name: input.lastName,
      applicant_email: input.email,
      applicant_phone: input.phone || undefined,
      applicant_attachment_name: input.attachmentName,
      applicant_attachment_content: input.attachmentContent,
      applicant_message: input.message || undefined,
      recipient_id: input.recipientId,
    };
    const res = await fetch(`${LBA_BASE}/job/v1/apply`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const txt = await res.text().catch(() => '');
    if (res.status === 200 || res.status === 201 || res.status === 202) {
      let id: string | undefined;
      try { id = JSON.parse(txt)?.id; } catch { /* réponse vide possible */ }
      return { sent: true, id };
    }
    return { sent: false, error: `LBA apply ${res.status}: ${txt.slice(0, 200)}` };
  },
};
