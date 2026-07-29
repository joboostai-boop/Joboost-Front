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

// Persona générale des aides à la rédaction (remplissage du profil, réécriture
// d'une section, résumé de CV, message d'approche).
//
// ⚠️ Remplace l'ancienne persona « Jobix », qui imposait au modèle un ton
// jargonneux — elle lui demandait explicitement de parler en « Matching Score »,
// « Convergence de profil » et « Optimisation de trajectoire ». Résultat : les
// champs remplis automatiquement se retrouvaient truffés de formules creuses,
// invérifiables par un recruteur. On garde donc ici le même registre sobre que
// les personas CV et lettre ci-dessous.
const SYSTEM_PROMPT = "Tu es l'assistant de rédaction de Joboost. Tu écris en français, de façon claire, sobre et concrète. Règles strictes : n'invente JAMAIS de chiffres, de pourcentages, de noms d'entreprises, de dates ou de résultats qui ne t'ont pas été fournis ; n'emploie aucun jargon ni superlatif creux ('haute performance', 'disruptif', 'synergie', 'score de matching', 'convergence de profil', 'optimisation de trajectoire', 'irrésistible') ; pas de formules d'agence. Emploie les mots que le candidat utiliserait lui-même, et reste toujours vérifiable par un recruteur.";

// Persona dédiée à la rédaction de CV : factuelle, sobre, AUCUN jargon marketing.
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

// Filet de sécurité côté serveur : le modèle suit la consigne de paragraphes dans l'immense
// majorité des cas, mais renvoie parfois un bloc compact (surtout sur les lettres courtes).
// On redécoupe alors le texte en 4 paragraphes de taille équilibrée (regroupement de phrases)
// pour ne jamais livrer un pavé illisible à l'utilisateur.
const ensureParagraphs = (text: string): string => {
  if (!text) return text;
  const hasParagraphs = /\n\s*\n/.test(text);
  if (hasParagraphs) return text;

  // Découpe naïve en phrases (point/!/? suivi d'une majuscule ou fin de texte).
  const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
  if (sentences.length < 4) return text;

  const targetParagraphs = 4;
  const perParagraph = Math.ceil(sentences.length / targetParagraphs);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    paragraphs.push(sentences.slice(i, i + perParagraph).join('').trim());
  }
  return paragraphs.filter(Boolean).join('\n\n');
};

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
    /** Offre ciblée : oriente le vocabulaire et les compétences mises en avant (sans rien inventer). */
    jobContext?: string;
  }): Promise<string> => {
    const ai = getAI();
    const { role, company, contractType, period, targetTitle, notes, jobContext } = input || {};
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents:
        `Rédige la description d'une expérience professionnelle pour un CV, sous forme de 3 à 5 puces.\n` +
        `Poste : ${role || '—'}\n` +
        `Entreprise : ${company || '—'}\n` +
        `Type de contrat : ${contractType || '—'}\n` +
        `Période : ${period || '—'}\n` +
        `Poste actuellement visé par le candidat : ${targetTitle || '—'}\n` +
        `Notes du candidat sur ses missions et réalisations : "${notes || ''}"\n` +
        (jobContext
          ? `\nOffre ciblée par le candidat — oriente le vocabulaire des puces et fais ressortir en PRIORITÉ les missions et compétences pertinentes pour cette offre, en reprenant ses mots-clés quand c'est honnête (SANS inventer d'expérience ni de chiffre) :\n"""${`${jobContext}`.slice(0, 1500)}"""\n`
          : '') +
        `\nAppuie-toi en priorité sur ces notes. Si elles sont vides ou très courtes, propose des missions ` +
        `plausibles et génériques pour ce poste, SANS inventer de chiffres ni de résultats précis.`,
      config: { systemInstruction: CV_WRITER_PROMPT },
    });
    return response.text || notes || '';
  },

  generateCVSummary: async (title: string, skills: string[], experiences: any[], jobContext?: string): Promise<string> => {
    const ai = getAI();
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents:
        `Génère un résumé de profil haute-performance pour un ${title}. Compétences : ${skills.join(', ')}. Historique : ${JSON.stringify(experiences)}` +
        (jobContext
          ? `\n\nOffre ciblée par le candidat — aligne le vocabulaire du résumé sur cette offre et reprends ses mots-clés pertinents (SANS inventer d'expérience ni de compétence non présente ci-dessus) :\n"""${`${jobContext}`.slice(0, 1500)}"""`
          : ''),
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
    const cleaned = (response.text || "").replace(/\*\*/g, '').replace(/^\s*---\s*$/gm, '').trim();
    // Filet de sécurité supplémentaire : si le modèle a malgré tout renvoyé un bloc compact
    // (moins de 2 paragraphes), on le redécoupe nous-mêmes plutôt que de livrer un pavé illisible.
    return ensureParagraphs(cleaned);
  },

  // Simulateur d'entretien : génère des questions d'entretien réalistes et personnalisées
  // à partir de l'offre + du profil du candidat. Pour chaque question : l'intention du
  // recruteur, un conseil de structure (STAR), et un exemple de réponse ancré UNIQUEMENT
  // dans les vraies expériences fournies (aucune invention).
  generateInterviewQuestions: async (
    jobTitle: string,
    company: string,
    jobDescription: string,
    profileContext: any,
  ): Promise<any> => {
    const ai = getAI();

    const INTERVIEW_COACH_PROMPT = [
      "Tu es un coach d'entretien d'embauche expert, en français.",
      "Tu prépares un candidat à un entretien RÉEL pour un poste précis.",
      "Tes questions sont réalistes et réellement posées par des recruteurs français.",
      "Pour chaque question tu fournis : (1) l'intention — ce que le recruteur cherche à évaluer ;",
      "(2) un conseil de structure de réponse (méthode STAR : Situation, Tâche, Action, Résultat, quand c'est pertinent) ;",
      "(3) un exemple de réponse à la 1re personne, personnalisé.",
      "HONNÊTETÉ ABSOLUE : l'exemple de réponse s'appuie UNIQUEMENT sur les vraies expériences,",
      "compétences et formations du candidat fournies. N'invente JAMAIS d'expérience, de diplôme,",
      "de chiffre, de client ou de résultat qui ne figure pas dans le profil. Si une info manque,",
      "reste général plutôt que d'inventer. Aucun jargon creux. Français naturel et irréprochable.",
    ].join("\n");

    let prompt =
      `Prépare une simulation d'entretien pour le poste de "${jobTitle}"` +
      (company ? ` chez "${company}"` : '') + `.\n` +
      `Organise 10 à 14 questions au total, réparties en catégories (dans cet ordre) :\n` +
      `1. "Présentation & parcours" ; 2. "Compétences & expériences" ; 3. "Motivation & entreprise" ;\n` +
      `4. "Mise en situation & comportemental" ; 5. "Questions à poser au recruteur" (ici, propose 2 à 3\n` +
      `bonnes questions que LE CANDIDAT peut poser — pour ce dernier bloc, "intention" explique pourquoi\n` +
      `c'est une bonne question, "tip" et "sampleAnswer" peuvent rester courts ou vides).`;

    if (profileContext) {
      prompt +=
        `\n\nProfil RÉEL du candidat (unique source de vérité pour les exemples de réponse) :\n` +
        `Nom: ${profileContext.name || '—'}\nTitre: ${profileContext.title || '—'}\n` +
        `Résumé: ${profileContext.summary || '—'}\n` +
        `Compétences: ${JSON.stringify(profileContext.skills || [])}\n` +
        `Expériences: ${JSON.stringify(profileContext.experiences || [])}`;
    }
    if (jobDescription) {
      prompt += `\n\nContenu de l'offre (pour cibler les questions et le vocabulaire) :\n"""${`${jobDescription}`.slice(0, 3000)}"""`;
    }

    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: INTERVIEW_COACH_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        intent: { type: Type.STRING },
                        tip: { type: Type.STRING },
                        sampleAnswer: { type: Type.STRING },
                      },
                      required: ["question", "intent"],
                    },
                  },
                },
                required: ["title", "questions"],
              },
            },
          },
          required: ["categories"],
        },
      },
    });
    try {
      return JSON.parse(response.text || '{"categories":[]}');
    } catch {
      throw new Error("Impossible de générer la simulation d'entretien. Réessaie dans un instant.");
    }
  },

  // Email de relance d'une candidature restée sans réponse. Texte prêt à envoyer :
  // « Objet : … » en première ligne puis le corps. Aucune invention autorisée.
  generateFollowUpMessage: async (company: string, jobTitle: string, daysAgo: number, candidateName?: string): Promise<string> => {
    const ai = getAI();
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents:
        `Rédige un email de RELANCE de candidature en français.\n` +
        `Poste : ${jobTitle}\nEntreprise : ${company}\nCandidature envoyée il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}.\n` +
        (candidateName ? `Candidat : ${candidateName}\n` : '') +
        `\nFormat EXACT :\n` +
        `- Première ligne : « Objet : » suivi d'un objet court et précis (ex. relance candidature + intitulé du poste).\n` +
        `- Une ligne vide, puis le corps (100 à 150 mots) : rappel poli de la candidature envoyée, réaffirmation sincère de l'intérêt pour le poste et l'entreprise, proposition d'un échange, formule de politesse.\n` +
        `- Termine par « Cordialement, »${candidateName ? ` puis « ${candidateName} » sur la ligne suivante` : ''}.\n` +
        `Règles : ton professionnel, positif, jamais insistant ni culpabilisant. AUCUNE invention (pas de faux échanges, pas de chiffres inventés), aucun champ à compléter entre crochets, aucune mise en forme Markdown.`,
      config: {
        systemInstruction: "Tu es un expert des candidatures en France. Tu rédiges des emails de relance sobres, polis et efficaces, prêts à envoyer tels quels.",
      },
    });
    return (response.text || '').replace(/\*\*/g, '').trim();
  },

  // ==================== ESPACE RECRUTEUR ====================

  // Rédige le corps d'une offre d'emploi à partir des infos saisies par le recruteur,
  // et suggère des compétences clés pour activer le matching avec le vivier.
  // Même exigence d'honnêteté que côté candidat : rien d'inventé (salaire, avantages,
  // chiffres d'entreprise…) qui ne figure pas dans les infos fournies.
  generateJobOfferContent: async (input: {
    title: string;
    contractType?: string;
    location?: string;
    salaryRange?: string;
    skills?: string[];
    companyName?: string;
    notes?: string;
  }): Promise<{ description: string; suggestedSkills: string[] }> => {
    const ai = getAI();

    const OFFER_WRITER_PROMPT = [
      "Tu es un expert du recrutement en France. Tu rédiges des offres d'emploi claires,",
      "attractives et conformes aux usages français, prêtes à être publiées.",
      "Structure attendue du texte (paragraphes et listes à puces '- ', SANS Markdown gras/titres #) :",
      "1. Accroche courte sur le poste ; 2. « Vos missions : » suivie de 4 à 6 puces ;",
      "3. « Profil recherché : » suivie de 3 à 5 puces ; 4. Une phrase de conclusion invitant à postuler.",
      "HONNÊTETÉ STRICTE : n'invente JAMAIS de salaire, d'avantages, de chiffres, de nom ou de",
      "description d'entreprise qui ne figurent pas dans les informations fournies. Si une info",
      "manque, n'en parle pas. Pas de mention discriminatoire (âge, genre, origine…) — utilise",
      "la mention (H/F) après l'intitulé. Français irréprochable, ton professionnel et humain.",
    ].join("\n");

    const parts = [
      `Rédige une offre d'emploi pour le poste : « ${input.title} »`,
      input.contractType ? `Type de contrat : ${input.contractType}` : '',
      input.location ? `Lieu : ${input.location}` : '',
      input.salaryRange ? `Rémunération annoncée : ${input.salaryRange}` : '',
      input.companyName ? `Entreprise : ${input.companyName}` : '',
      input.skills && input.skills.length > 0 ? `Compétences déjà identifiées : ${input.skills.join(', ')}` : '',
      input.notes ? `Précisions du recruteur (source de vérité) : ${input.notes}` : '',
      '',
      `Renvoie aussi « suggestedSkills » : 5 à 8 compétences clés, courtes (1 à 3 mots),`,
      `pertinentes pour ce poste, utilisables comme étiquettes de matching (complète celles déjà identifiées, sans les répéter).`,
    ].filter(Boolean).join('\n');

    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: parts,
      config: {
        systemInstruction: OFFER_WRITER_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            suggestedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["description", "suggestedSkills"],
        },
      },
    });
    try {
      const data = JSON.parse(response.text || '{}');
      return {
        description: String(data.description || '').replace(/\*\*/g, '').trim(),
        suggestedSkills: Array.isArray(data.suggestedSkills)
          ? data.suggestedSkills.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 8)
          : [],
      };
    } catch {
      throw new Error("Impossible de générer l'offre. Réessayez dans un instant.");
    }
  },

  // Message d'approche d'un candidat du vivier (email prêt à envoyer, « Objet : » en 1re ligne).
  generateCandidateOutreach: async (input: {
    candidateName: string;
    candidateTitle?: string;
    candidateSkills?: string[];
    offerTitle?: string;
    companyName?: string;
    recruiterName?: string;
  }): Promise<string> => {
    const ai = getAI();
    const response = await genWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents:
        `Rédige un email d'APPROCHE d'un candidat, envoyé par un recruteur, en français.\n` +
        `Candidat : ${input.candidateName}` +
        (input.candidateTitle ? ` (${input.candidateTitle})` : '') + `\n` +
        (input.candidateSkills && input.candidateSkills.length > 0
          ? `Compétences connues du candidat : ${input.candidateSkills.slice(0, 8).join(', ')}\n` : '') +
        (input.offerTitle ? `Poste proposé : ${input.offerTitle}\n` : `Contexte : prise de contact pour une opportunité correspondant à son profil.\n`) +
        (input.companyName ? `Entreprise / organisme : ${input.companyName}\n` : '') +
        (input.recruiterName ? `Signataire : ${input.recruiterName}\n` : '') +
        `\nFormat EXACT :\n` +
        `- Première ligne : « Objet : » suivi d'un objet court et engageant.\n` +
        `- Une ligne vide, puis le corps (90 à 140 mots) : salutation personnalisée, pourquoi ce profil` +
        ` a retenu l'attention (en s'appuyant UNIQUEMENT sur les infos fournies), présentation brève de` +
        ` l'opportunité, proposition d'un échange téléphonique, formule de politesse.\n` +
        `- Termine par « Cordialement, »${input.recruiterName ? ` puis « ${input.recruiterName} » sur la ligne suivante` : ''}.\n` +
        `Règles : ton professionnel et chaleureux, jamais racoleur. AUCUNE invention (pas de salaire, pas` +
        ` d'avantages, pas de faux historique), aucun champ à compléter entre crochets, aucune mise en forme Markdown.`,
      config: {
        systemInstruction: "Tu es un recruteur français expérimenté. Tu écris des emails d'approche sobres, personnalisés et efficaces, prêts à envoyer tels quels.",
      },
    });
    return (response.text || '').replace(/\*\*/g, '').trim();
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
