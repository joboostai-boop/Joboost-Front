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

// Persona dédiée à la rédaction de CV : factuelle, sobre, AUCUN jargon marketing.
// (volontairement distincte du SYSTEM_PROMPT « Jobix » qui produirait des phrases creuses)
const CV_WRITER_PROMPT = "Tu es un expert en rédaction de CV professionnels en français. Tu écris des descriptions d'expériences claires, concises et orientées action. Tu structures la réponse en puces courtes. Règles strictes : n'invente JAMAIS de chiffres, de pourcentages, de noms de clients ou de résultats qui ne sont pas fournis par le candidat ; pas de superlatifs creux ni de jargon ('synergie', 'disruptif', 'haute performance', 'leader')... ; reste crédible et vérifiable par un recruteur. Réponds UNIQUEMENT avec les puces (une par ligne, commençant par '- '), sans introduction ni conclusion.";

// Persona + règles dédiées aux lettres de motivation. SOURCE DE VÉRITÉ unique : toute la
// conformité aux standards français est centralisée ici (réutilisée par le flux route
// /generate-cover-letter ET par la candidature spontanée). Modifier ces règles ici suffit
// à les imposer partout. NB : la consigne brute reste volontairement détaillée et impérative
// pour contraindre fortement le modèle.
const LETTER_WRITER_PROMPT = [
  "Tu es un expert en rédaction de lettres de motivation en français, conformes aux standards professionnels français. Tu écris à la première personne une lettre sobre, sincère, crédible et prête à être envoyée.",
  "",
  "FORMAT GÉNÉRAL :",
  "- une seule page ;",
  "- longueur cible : 250 à 400 mots (ne descends pas sous 250, ne dépasse pas 400) ;",
  "- entièrement en français ;",
  "- ton professionnel, naturel et crédible — jamais générique, robotique ni commercial.",
  "",
  "STRUCTURE OBLIGATOIRE (plusieurs paragraphes distincts, séparés par une ligne vide, JAMAIS un seul bloc compact) :",
  "1. Introduction : reliée explicitement au poste visé ET à l'entreprise ;",
  "2. Profil du candidat : compétences et expériences réellement pertinentes ;",
  "3. Adéquation : lien clair entre le profil du candidat, l'entreprise et le poste / les besoins du recruteur ;",
  "4. Conclusion : polie et professionnelle, exprimant la disponibilité pour un échange ou un entretien.",
  "Assure des transitions fluides entre les paragraphes.",
  "",
  "MISE EN PAGE ET CONFORMITÉ — INTERDICTIONS STRICTES :",
  "- aucune liste à puces ni énumération à tirets ;",
  "- aucun titre interne ni intertitre ;",
  "- aucun bloc de texte désorganisé ;",
  "- ne recopie pas le CV (pas de simple liste de postes/dates) ;",
  "- pas de phrases trop longues ; pas de formulations familières ;",
  "- pas de promesses exagérées ; pas de texte vide ou passe-partout ;",
  "- AUCUNE mise en forme Markdown (pas d'astérisques **, pas de tirets ---, pas de #) ;",
  "- aucun champ à compléter entre crochets (pas de [Votre Email], [Téléphone], etc.).",
  "",
  "CONTENU ATTENDU :",
  "- mention explicite du poste visé ;",
  "- personnalisation selon l'entreprise ;",
  "- mise en avant de compétences et d'expériences pertinentes ;",
  "- démonstration d'un intérêt réel et argumenté pour le poste ;",
  "- conclusion polie et professionnelle.",
  "",
  "QUALITÉ RÉDACTIONNELLE : français fluide et naturel, orthographe et grammaire irréprochables.",
  "",
  "HONNÊTETÉ : n'invente JAMAIS d'expérience, de diplôme, d'entreprise ou de chiffre qui ne figure pas dans le profil fourni. Aucun jargon ni superlatif creux (interdits notamment : 'Matching Score', 'convergence', 'rigueur chirurgicale', 'optimisation de trajectoire', 'haute performance', 'synergie', 'disruptif').",
  "",
  "PÉRIMÈTRE DE SORTIE : tu écris UNIQUEMENT le corps de la lettre — la formule d'appel (ex. « Madame, Monsieur, ») suivie des paragraphes. N'écris PAS l'objet, ni la date, ni les coordonnées, ni la signature (« Cordialement », nom) : ils sont ajoutés automatiquement par ailleurs.",
].join("\n");

// Erreurs Gemini transitoires : surcharge serveur, indisponibilité, rate-limit.
// (NB : avec la facturation activée, le 429 vient d'une limite/minute, pas d'un quota épuisé → réessayer aide.)
const TRANSIENT_ERROR = /\b(503|429)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand|try again/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Appelle l'API Gemini avec réessais automatiques (backoff) sur erreur transitoire.
// Les autres erreurs (clé invalide, requête malformée…) sont relancées immédiatement.
const genWithRetry = async (ai: any, params: any, attempts = 3): Promise<any> => {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (e: any) {
      lastErr = e;
      const msg = `${e?.message || e}`;
      if (i === attempts - 1 || !TRANSIENT_ERROR.test(msg)) throw e;
      console.warn(`Gemini surchargé (tentative ${i + 1}/${attempts}), nouvel essai…`);
      await sleep(700 * Math.pow(2, i)); // 700 ms puis 1400 ms
    }
  }
  throw lastErr;
};

export const geminiService = {
  getProfileOptimizations: async (profileData: any): Promise<string[]> => {
    const ai = getAI();
    const response = await genWithRetry(ai, {
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
    const response = await genWithRetry(ai, {
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
    const response = await genWithRetry(ai, {
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
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Optimisation de la section "${sectionName}". Texte source : ${currentText}. Contexte de matching : ${context}`,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    return response.text || currentText;
  },

  // Détaille une expérience professionnelle en puces factuelles pour le CV (modèle Flash, gratuit).
  detailExperience: async (input: {
    role?: string; company?: string; contractType?: string; period?: string; targetTitle?: string; notes?: string;
  }): Promise<string> => {
    const ai = getAI();
    const { role, company, contractType, period, targetTitle, notes } = input || {};
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents:
        `Rédige la description d'une expérience professionnelle pour un CV, sous forme de 3 à 5 puces.\n` +
        `Poste : ${role || '—'}\n` +
        `Entreprise : ${company || '—'}\n` +
        `Type de contrat : ${contractType || '—'}\n` +
        `Période : ${period || '—'}\n` +
        `Poste actuellement visé par le candidat : ${targetTitle || '—'}\n` +
        `Notes du candidat sur ses missions et réalisations : "${notes || ''}"\n\n` +
        `Appuie-toi en priorité sur ces notes. Si elles sont vides ou très courtes, propose des missions ` +
        `plausibles et génériques pour ce poste, SANS inventer de chiffres ni de résultats précis.`,
      config: { systemInstruction: CV_WRITER_PROMPT },
    });
    return response.text || notes || '';
  },

  generateCVSummary: async (title: string, skills: string[], experiences: any[]): Promise<string> => {
    const ai = getAI();
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Génère un résumé de profil haute-performance pour un ${title}. Compétences : ${skills.join(', ')}. Historique : ${JSON.stringify(experiences)}`,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    return response.text || "";
  },

  generateCoverLetter: async (jobTitle: string, company: string, tone: string, profileContext: any, jobDescription: string): Promise<string> => {
    const ai = getAI();
    let prompt = `Rédige le CORPS d'une lettre de motivation française conforme aux standards professionnels, sincère et prête à être envoyée, pour le poste de "${jobTitle}" chez "${company}". Ton : ${tone}.\n` +
      `Respecte STRICTEMENT le format imposé par tes consignes : 250 à 400 mots, une seule page, plusieurs paragraphes distincts séparés par une ligne vide (jamais un seul bloc).\n` +
      `Suis la structure en quatre temps : (1) introduction reliant le poste et l'entreprise « ${company} », (2) profil du candidat appuyé sur ses VRAIES expériences ci-dessous, (3) adéquation entre son profil, l'entreprise et les besoins du poste, (4) conclusion polie proposant un échange ou un entretien.\n` +
      `Mentionne explicitement le poste « ${jobTitle} » et personnalise selon l'entreprise. Texte courant uniquement, sans aucune mise en forme ni liste à puces.`;
    
    if (profileContext) {
       prompt += `\n\nVoici le profil du candidat :\nNom: ${profileContext.name}\nTitre: ${profileContext.title}\nRésumé: ${profileContext.summary}\nCompétences: ${JSON.stringify(profileContext.skills)}\nExpériences: ${JSON.stringify(profileContext.experiences)}\nVille: ${profileContext.city}\n\nUtilise VRAIMENT ces vraies expériences et compétences, N'INVENTE PAS D'EXPÉRIENCE qui ne figure pas ici. Adapte l'angle pour matcher le poste.`;
    }
    
    if (jobDescription) {
       prompt += `\n\nVoici le contenu/texte associé à l'offre pour t'aider à cibler les mots clés :\n"${jobDescription}"`;
    }

    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: LETTER_WRITER_PROMPT }
    });
    // Filet de sécurité : on retire tout résidu de Markdown que le modèle aurait laissé.
    return (response.text || "").replace(/\*\*/g, '').replace(/^\s*---\s*$/gm, '').trim();
  },

  generateBulkMessage: async (candidateName: string, candidateTitle: string, companyName: string, companySector: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Génère un message de connexion stratégique de la part de ${candidateName} (${candidateTitle}) pour ${companyName} (${companySector}). Focus sur la valeur ajoutée immédiate.`;
    
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { systemInstruction: SYSTEM_PROMPT }
    });
    
    return response.text || `Bonjour, j'ai analysé les enjeux de ${companyName} dans le secteur ${companySector} et je souhaite vous apporter mon expertise de ${candidateTitle}.`;
  }
};
