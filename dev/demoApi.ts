/* ════════════════════════════════════════════════════════════════════
   Mode démo — DÉVELOPPEMENT UNIQUEMENT (chargé par index.tsx seulement si
   import.meta.env.DEV et `?demo` dans l'URL ; exclu du build de production).

   Remplace les réponses de l'API par des données fictives pour pouvoir
   regarder les écrans connectés (Accueil, Offres, Suivi…) sans compte ni
   mot de passe. Rien n'est envoyé au serveur : les écritures sont simulées.
   Sortir du mode démo : ouvrir l'app avec `?demo=off`.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();

const user = {
  id: 'demo-user',
  name: 'Camille Martin',
  firstName: 'Camille',
  lastName: 'Martin',
  email: 'camille.demo@example.com',
  role: 'JOBSEEKER',
  title: 'Assistante administrative',
  city: 'Lyon',
  postalCode: '69003',
  photoUrl: null as string | null,
  skills: ['Accueil', 'Excel', 'Gestion de planning'],
  experiences: [],
  education: [],
};

const offers = [
  { title: 'Assistant·e administratif·ve', company: 'LUMEN CONSEIL', location: 'Lyon 3e', salary: '2100', type: 'CDI', matchScore: 92, postedDate: 'Il y a 2 jours', source: 'France Travail', url: 'https://example.com/1', tags: ['Accueil', 'Excel', 'Planning'], aiInsight: 'Gestion des agendas de l’équipe, accueil téléphonique et physique, suivi des factures fournisseurs et classement. Poste en CDI, temps plein, avec télétravail un jour par semaine après la période d’essai.' },
  { title: 'Document Controller / Gestionnaire documentaire F/H', company: 'MILES GROUP', location: 'Magny-en-Vexin, Pontoise', salary: '', type: 'CDI', matchScore: 87, postedDate: 'Il y a 2 sem.', source: 'Adzuna', url: 'https://example.com/2', tags: ['Emplois Ingénierie'], aiInsight: 'Dans le cadre du développement de nos activités, nous recherchons un(e) Document Controller / Gestionnaire documentaire pour assurer la gestion, le suivi et l’archivage de la documentation technique des projets.' },
  { title: 'Agent·e d’accueil', company: 'Mairie de Lyon 3e', location: 'Lyon 3e', salary: '1850', type: 'CDD', matchScore: 78, postedDate: 'Hier', source: 'France Travail', url: 'https://example.com/3', tags: ['Accueil', 'Service public'], aiInsight: 'Accueil et orientation du public, prise de rendez-vous, gestion du courrier.' },
  { title: 'Secrétaire médicale', company: 'Clinique du Parc', location: 'Lyon 6e', salary: '2000', type: 'CDI', matchScore: 64, postedDate: 'Il y a 5 jours', source: 'France Travail', url: 'https://example.com/4', tags: ['Secrétariat', 'Accueil'], aiInsight: 'Accueil des patients, gestion des dossiers et des rendez-vous, frappe de comptes rendus.' },
  { title: 'Office manager', company: 'Kiosk Studio', location: 'Villeurbanne', salary: '2400', type: 'CDI', matchScore: 58, postedDate: 'Il y a 1 sem.', source: 'Adzuna', url: 'https://example.com/5', tags: ['Organisation', 'Achats'], aiInsight: 'Organisation du quotidien d’une équipe de 25 personnes : achats, fournisseurs, accueil des nouveaux arrivants.' },
];

const applications = [
  { id: 'a1', company: 'Lumen Conseil', title: 'Assistante administrative', source: 'France Travail', status: 'SENT', appliedAt: iso(9), notes: null },
  { id: 'a2', company: 'Hôtel Bellecour', title: 'Réceptionniste', source: 'Adzuna', status: 'INTERVIEW', appliedAt: iso(12), notes: null },
  { id: 'a3', company: 'Mairie de Lyon 3e', title: 'Agent d’accueil', source: 'France Travail', status: 'SENT', appliedAt: iso(2), notes: null },
  { id: 'a4', company: 'Clinique du Parc', title: 'Secrétaire médicale', source: 'France Travail', status: 'REJECTED', appliedAt: iso(20), notes: null },
  { id: 'a5', company: 'Kiosk Studio', title: 'Office manager', source: 'Adzuna', status: 'PENDING', appliedAt: iso(30), notes: null },
];

const routes: [RegExp, (method: string, body: any) => any][] = [
  [/\/api\/auth\/me$/, () => ({ success: true, user })],
  [/\/api\/users\/me$/, (m, b) => {
    if (m === 'PUT' && b) Object.assign(user, b);
    return { success: true, user };
  }],
  [/\/api\/users\/usage$/, () => ({ success: true, usage: { planLabel: 'Essai', remainingQuota: 3, credits: 0, unlimited: false, isSubscribed: false, inTrial: true, trialDaysLeft: 5 } })],
  [/\/api\/dashboard\/stats$/, () => ({ success: true, stats: { profileCompletion: 72, profileMissing: ['tes langues', 'ta formation'], canGenerateCV: true, cvCount: 1, letterCount: 2, savedCount: 3, applications: { total: 5, pending: 1, sent: 2, interview: 1, offer: 0, rejected: 1 } } })],
  [/\/api\/opportunities\/recommendations/, () => ({ success: true, source: 'mixed', recommendations: offers })],
  [/\/api\/opportunities\/saved/, (m, b) => (m === 'POST' ? { success: true, saved: { id: 's' + Date.now(), ...b } } : { success: true, saved: [] })],
  [/\/api\/opportunities\/partner-offers$/, () => ({ success: true, offers: [] })],
  [/\/api\/applications/, (m) => (m === 'POST' ? { success: true } : { success: true, data: applications })],
  [/\/api\/cvs/, () => ({ success: true, cvs: [] })],
  [/\/api\/letters/, () => ({ success: true, letters: [] })],
  [/\/api\/spontaneous/, () => ({ success: true, data: [] })],
];

export const installDemoApi = () => {
  const realFetch = window.fetch.bind(window);
  try { localStorage.setItem('joboost-token', 'demo'); } catch { /* ignore */ }
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const method = (init?.method || 'GET').toUpperCase();
    for (const [re, handler] of routes) {
      if (re.test(path)) {
        let body: any = null;
        try { body = init?.body ? JSON.parse(String(init.body)) : null; } catch { /* corps non JSON */ }
        await new Promise((r) => setTimeout(r, 250));
        return new Response(JSON.stringify(handler(method, body)), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(input as any, init);
  };
  // eslint-disable-next-line no-console
  console.info('[Joboost] Mode démo actif — données fictives, aucun appel au serveur.');
};
