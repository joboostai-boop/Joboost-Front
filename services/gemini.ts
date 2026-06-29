// Service client connecté à notre backend Antigravity NodeJS
import { authHeaders } from './authToken';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/ai`;

const fetchFromAPI = async (endpoint: string, bodyData: any) => {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include', // envoie le cookie d'auth (nécessaire pour identifier l'utilisateur et son quota)
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(), // fallback mobile : header Bearer si le cookie tiers est bloqué
      },
      body: JSON.stringify(bodyData)
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.success === false) {
      // On fait remonter le vrai message du serveur (ex. quota dépassé) au lieu d'un message générique.
      const err: any = new Error(json.error || `Erreur réseau: ${res.statusText}`);
      err.code = json.code;        // ex. 'QUOTA_EXCEEDED'
      err.status = res.status;     // ex. 402
      throw err;
    }

    return json.data;
  } catch (error) {
    console.error(`Fetch API Error (${endpoint}):`, error);
    throw error;
  }
};

export const getProfileOptimizations = async (profileData: any): Promise<string[]> => {
  try {
    return await fetchFromAPI('/optimize-profile', { profileData });
  } catch {
    return ["Ajuster le gradient de compétences", "Renforcer les preuves de projets", "Synchroniser le pitch avec le marché"];
  }
};

export const parseLinkedInProfile = async (profileText: string): Promise<any> => {
  return await fetchFromAPI('/parse-linkedin', { profileText });
};

export const rewriteSection = async (sectionName: string, currentText: string, context: string): Promise<string> => {
  try {
    return await fetchFromAPI('/rewrite-section', { sectionName, currentText, context });
  } catch {
    return currentText;
  }
};

export const detailExperience = async (input: {
  role?: string; company?: string; contractType?: string; period?: string; targetTitle?: string; notes?: string;
  /** Offre ciblée : oriente le vocabulaire et les compétences mises en avant. */
  jobContext?: string;
}): Promise<string> => {
  // On laisse l'erreur remonter pour afficher un vrai message (ex. quota) côté UI.
  return await fetchFromAPI('/detail-experience', input);
};

export const generateCVSummary = async (title: string, skills: string[], experiences: any[], jobContext?: string): Promise<string> => {
  try {
    return await fetchFromAPI('/generate-cv-summary', { title, skills, experiences, jobContext });
  } catch {
    return "";
  }
};

export const generateCoverLetter = async (jobTitle: string, company: string, tone: string, profileContext: any, jobDescription: string): Promise<string> => {
  // On laisse remonter l'erreur d'origine (avec err.code/err.status, ex. QUOTA_EXCEEDED)
  // pour que l'UI puisse proposer une offre adaptée plutôt qu'un simple toast d'erreur.
  return await fetchFromAPI('/generate-cover-letter', { jobTitle, company, tone, profileContext, jobDescription });
};

export interface OfferExtraction {
  ok: boolean;
  title?: string;
  text?: string;
  reason?: string;
}

// Tente d'extraire le contenu d'une offre depuis son URL (via le micro-service de scraping).
// Échec attendu sur LinkedIn/Indeed (mur d'auth) → l'appelant invite à coller le texte.
export const extractOfferFromUrl = async (url: string): Promise<OfferExtraction> => {
  try {
    return await fetchFromAPI('/extract-offer', { url });
  } catch {
    return { ok: false, reason: 'request_failed' };
  }
};

export const generateBulkMessage = async (candidateName: string, candidateTitle: string, companyName: string, companySector: string): Promise<string> => {
  try {
    return await fetchFromAPI('/generate-bulk-message', { candidateName, candidateTitle, companyName, companySector });
  } catch {
    return `Bonjour, j'ai analysé les enjeux de ${companyName} dans le secteur ${companySector} et je souhaite vous apporter mon expertise de ${candidateTitle}.`;
  }
};