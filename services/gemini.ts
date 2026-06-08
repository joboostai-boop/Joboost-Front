// Service client connecté à notre backend Antigravity NodeJS
const API_BASE_URL = `${import.meta.env.VITE_API_URL || ''}/api/ai`;

const fetchFromAPI = async (endpoint: string, bodyData: any) => {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      credentials: 'include', // envoie le cookie d'auth (nécessaire pour identifier l'utilisateur et son quota)
      headers: {
        'Content-Type': 'application/json',
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

export const generateCVSummary = async (title: string, skills: string[], experiences: any[]): Promise<string> => {
  try {
    return await fetchFromAPI('/generate-cv-summary', { title, skills, experiences });
  } catch {
    return "";
  }
};

export const generateCoverLetter = async (jobTitle: string, company: string, tone: string, profileContext: any, jobDescription: string): Promise<string> => {
  try {
    return await fetchFromAPI('/generate-cover-letter', { jobTitle, company, tone, profileContext, jobDescription });
  } catch (err: any) {
    throw new Error(err.message || 'Erreur IA lors de la génération de lettre');
  }
};

export const generateBulkMessage = async (candidateName: string, candidateTitle: string, companyName: string, companySector: string): Promise<string> => {
  try {
    return await fetchFromAPI('/generate-bulk-message', { candidateName, candidateTitle, companyName, companySector });
  } catch {
    return `Bonjour, j'ai analysé les enjeux de ${companyName} dans le secteur ${companySector} et je souhaite vous apporter mon expertise de ${candidateTitle}.`;
  }
};