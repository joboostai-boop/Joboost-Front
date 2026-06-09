import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'votre_cle_api_gemini_ici') {
        throw new Error("GEMINI_API_KEY est introuvable ou non configurée dans le fichier .env");
    }
    return new GoogleGenAI({ apiKey });
};

const SYSTEM_PROMPT = "Tu es Jobix, l'intelligence artificielle haute performance de Joboost. Ton ton est chirurgical, visionnaire et ultra-rapide. Tu parles en termes de 'Matching Score', de 'Convergence de profil' et d' 'Optimisation de trajectoire'. Ton but est de rendre le dossier du candidat indétectable pour les algorithmes de tri classiques et irrésistible pour les recruteurs humains.";

export const geminiService = {
  getProfileOptimizations: async (profileData: any): Promise<string[]> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyse neuronale de ce profil pour optimisation de convergence : ${JSON.stringify(profileData)}. Retourne 3 vecteurs d'amélioration sous forme de liste JSON de chaînes.`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    try {
      return JSON.parse(response.text || "[]");
    } catch {
      return ["Ajuster le gradient de compétences", "Renforcer les preuves de projets", "Synchroniser le pitch avec le marché"];
    }
  },

  parseLinkedInProfile: async (profileText: string): Promise<any> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extrais les informations professionnelles clés de ce texte de profil LinkedIn : "${profileText}". Retourne un objet JSON avec les propriétés : title (string), summary (string), skills (array de strings), experiences (array d'objets avec company, role, period, desc).`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  period: { type: Type.STRING },
                  desc: { type: Type.STRING }
                }
              }
            }
          },
          required: ["title", "summary", "skills", "experiences"]
        }
      }
    });
    try {
      return JSON.parse(response.text || "{}");
    } catch {
      throw new Error("Impossible de parser les données LinkedIn.");
    }
  },

  // Extrait un profil structuré à partir du texte brut d'un CV (PDF/DOCX déjà converti en texte).
  parseCv: async (cvText: string): Promise<any> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Voici le texte brut d'un CV. Extrais-en les informations du candidat de façon factuelle (n'invente rien ; laisse vide si absent). Texte du CV :\n"""${cvText.slice(0, 12000)}"""`,
      config: {
        systemInstruction: "Tu es un extracteur de données de CV précis et factuel. Tu ne déformes pas les informations et tu n'inventes jamais de contenu. Tu réponds uniquement en JSON valide.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experiences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  period: { type: Type.STRING },
                  desc: { type: Type.STRING }
                }
              }
            }
          },
          required: ["name", "title", "skills", "experiences"]
        }
      }
    });
    try {
      return JSON.parse(response.text || "{}");
    } catch {
      throw new Error("Impossible d'extraire les données du CV.");
    }
  },

  rewriteSection: async (sectionName: string, currentText: string, context: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Optimisation de la section "${sectionName}". Texte source : ${currentText}. Contexte de matching : ${context}`,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    return response.text || currentText;
  },

  generateCVSummary: async (title: string, skills: string[], experiences: any[]): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Génère un résumé de profil haute-performance pour un ${title}. Compétences : ${skills.join(', ')}. Historique : ${JSON.stringify(experiences)}`,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    return response.text || "";
  },

  generateCoverLetter: async (jobTitle: string, company: string, tone: string, profileContext: any, jobDescription: string): Promise<string> => {
    const ai = getAI();
    let prompt = `Rédige une lettre de motivation stratégique et professionnelle, en français, pour le poste de "${jobTitle}" chez "${company}". Ton : ${tone}.`;
    
    if (profileContext) {
       prompt += `\n\nVoici le profil du candidat :\nNom: ${profileContext.name}\nTitre: ${profileContext.title}\nRésumé: ${profileContext.summary}\nCompétences: ${JSON.stringify(profileContext.skills)}\nExpériences: ${JSON.stringify(profileContext.experiences)}\nVille: ${profileContext.city}\n\nUtilise VRAIMENT ces vraies expériences et compétences, N'INVENTE PAS D'EXPÉRIENCE qui ne figure pas ici. Adapte l'angle pour matcher le poste.`;
    }
    
    if (jobDescription) {
       prompt += `\n\nVoici le contenu/texte associé à l'offre pour t'aider à cibler les mots clés :\n"${jobDescription}"`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    return response.text || "";
  },

  generateBulkMessage: async (candidateName: string, candidateTitle: string, companyName: string, companySector: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Génère un message de connexion stratégique de la part de ${candidateName} (${candidateTitle}) pour ${companyName} (${companySector}). Focus sur la valeur ajoutée immédiate.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    
    return response.text || `Bonjour, j'ai analysé les enjeux de ${companyName} dans le secteur ${companySector} et je souhaite vous apporter mon expertise de ${candidateTitle}.`;
  }
};
