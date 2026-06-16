// ====================================================================
//  Score ATS — indicateur INDICATIF de lisibilité d'un CV par les ATS.
//  Ce n'est PAS une analyse par un vrai moteur ATS ni une garantie : c'est
//  une checklist heuristique basée sur les bonnes pratiques de CV (coordonnées
//  complètes, accroche, compétences, descriptions chiffrées…). Le but est de
//  guider l'utilisateur, honnêtement, vers un CV plus complet et plus clair.
// ====================================================================

export interface AtsCheck {
  label: string;
  weight: number; // points max de ce critère
  got: number;    // points obtenus (0..weight)
  ok: boolean;    // critère pleinement satisfait
  tip?: string;   // conseil affiché quand le critère n'est pas au maximum
}

export interface AtsResult {
  score: number; // 0..100
  level: 'faible' | 'moyen' | 'bon' | 'excellent';
  checks: AtsCheck[];
}

interface ScorableCv {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  city?: string;
  summary?: string;
  skills?: string[];
  experiences?: { role?: string; company?: string; period?: string; desc?: string }[];
  education?: { degree?: string; school?: string; date?: string; city?: string }[];
}

const has = (s?: string) => !!(s && s.trim());

export const computeAtsScore = (cv: ScorableCv): AtsResult => {
  const skills = cv.skills || [];
  const exps = (cv.experiences || []).filter((e) => has(e.role) || has(e.company) || has(e.desc));
  const edu = (cv.education || []).filter((e) => has(e.degree) || has(e.school));
  const summaryLen = (cv.summary || '').trim().length;

  // 1. Coordonnées (email + téléphone + ville) — 15 pts (5 chacun).
  const contactCount = [cv.email, cv.phone, cv.city].filter(has).length;
  const contact: AtsCheck = {
    label: 'Coordonnées complètes',
    weight: 15,
    got: Math.round((contactCount / 3) * 15),
    ok: contactCount === 3,
    tip: 'Ajoute ton email, ton téléphone et ta ville : les ATS y cherchent tes coordonnées.',
  };

  // 2. Intitulé de poste — 10 pts.
  const title: AtsCheck = {
    label: 'Intitulé de poste',
    weight: 10,
    got: has(cv.title) ? 10 : 0,
    ok: has(cv.title),
    tip: "Indique le poste visé en haut du CV (ex : « Développeur web »).",
  };

  // 3. Résumé / accroche — 12 pts (complet ≥ 120 caractères).
  const summaryGot = summaryLen >= 120 ? 12 : summaryLen >= 40 ? 6 : 0;
  const summary: AtsCheck = {
    label: 'Résumé d’accroche',
    weight: 12,
    got: summaryGot,
    ok: summaryGot === 12,
    tip: summaryLen === 0
      ? 'Ajoute 2-3 phrases qui résument ton profil (clic « Aider à rédiger »).'
      : 'Étoffe ton résumé : vise au moins 2-3 phrases complètes.',
  };

  // 4. Compétences (≥ 8 idéalement) — 13 pts.
  const skillsGot = skills.length >= 8 ? 13 : skills.length >= 5 ? 9 : skills.length >= 3 ? 5 : skills.length >= 1 ? 2 : 0;
  const skillsCheck: AtsCheck = {
    label: 'Compétences clés',
    weight: 13,
    got: skillsGot,
    ok: skillsGot === 13,
    tip: 'Liste au moins 8 compétences (les ATS filtrent souvent par mots-clés).',
  };

  // 5. Au moins 2 expériences — 15 pts.
  const expCountGot = exps.length >= 2 ? 15 : exps.length === 1 ? 8 : 0;
  const expCount: AtsCheck = {
    label: 'Expériences renseignées',
    weight: 15,
    got: expCountGot,
    ok: expCountGot === 15,
    tip: "Ajoute tes expériences (stage, job d'été ou bénévolat comptent aussi).",
  };

  // 6. Descriptions d'expériences — 15 pts (proportion d'expériences décrites).
  const described = exps.filter((e) => has(e.desc)).length;
  const descGot = exps.length === 0 ? 0 : Math.round((described / exps.length) * 15);
  const descriptions: AtsCheck = {
    label: 'Expériences décrites',
    weight: 15,
    got: descGot,
    ok: exps.length > 0 && described === exps.length,
    tip: 'Décris chaque expérience en quelques lignes (missions, outils, contexte).',
  };

  // 7. Résultats chiffrés — 10 pts (au moins un nombre / % dans les descriptions).
  const hasNumbers = exps.some((e) => /\d/.test(e.desc || ''));
  const quantified: AtsCheck = {
    label: 'Résultats chiffrés',
    weight: 10,
    got: hasNumbers ? 10 : 0,
    ok: hasNumbers,
    tip: 'Quantifie tes résultats (ex : « +15 % de ventes », « équipe de 4 »).',
  };

  // 8. Formation renseignée — 10 pts.
  const education: AtsCheck = {
    label: 'Formation renseignée',
    weight: 10,
    got: edu.length > 0 ? 10 : 0,
    ok: edu.length > 0,
    tip: 'Ajoute au moins ta dernière formation ou ton diplôme.',
  };

  const checks = [contact, title, summary, skillsCheck, expCount, descriptions, quantified, education];
  const score = Math.max(0, Math.min(100, checks.reduce((s, c) => s + c.got, 0)));
  const level: AtsResult['level'] = score >= 85 ? 'excellent' : score >= 70 ? 'bon' : score >= 50 ? 'moyen' : 'faible';

  return { score, level, checks };
};
