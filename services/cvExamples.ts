// ====================================================================
//  Exemples de CV par métier — modèles PRÉ-REMPLIS à personnaliser.
//  Données 100 % FICTIVES (noms, entreprises, chiffres = illustratifs).
//  Servent de point de départ : l'utilisateur charge un exemple proche de
//  son métier puis remplace par ses vraies informations.
// ====================================================================

export interface ExampleExperience { id: string; role: string; company: string; period: string; desc: string; }
export interface ExampleEducation { id: string; degree: string; school: string; date: string; city: string; }

export interface CvExample {
  id: string;
  category: string;
  role: string; // intitulé affiché dans la librairie
  data: {
    name: string;
    title: string;
    email: string;
    phone: string;
    city: string;
    summary: string;
    skills: string[];
    experiences: ExampleExperience[];
    education: ExampleEducation[];
  };
}

export const CV_EXAMPLE_CATEGORIES = [
  'Tech', 'Commerce', 'Marketing', 'Santé', 'Finance',
  'Administratif', 'Logistique', 'Restauration', 'Design', 'BTP', 'Débutant',
] as const;

let n = 0;
const x = () => `ex${++n}`;

export const CV_EXAMPLES: CvExample[] = [
  {
    id: 'dev-fullstack',
    category: 'Tech',
    role: 'Développeur Full-Stack',
    data: {
      name: 'Camille Martin', title: 'Développeur Full-Stack', email: 'camille.martin@email.com', phone: '06 12 34 56 78', city: 'Lyon',
      summary: "Développeur full-stack avec 4 ans d'expérience sur des applications web React/Node. Autonome et rigoureux, j'aime livrer des produits soignés et bien testés, en équipe agile.",
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Git', 'Docker', 'API REST'],
      experiences: [
        { id: x(), role: 'Développeur Full-Stack', company: 'Nova Web', period: '2022 – Aujourd’hui', desc: "Développement d'une plateforme SaaS (React/Node) utilisée par 8 000 clients. Réduction de 30 % du temps de chargement après refonte du front. Revue de code et mentorat de 2 alternants." },
        { id: x(), role: 'Développeur Front-End', company: 'Studio Pixel', period: '2020 – 2022', desc: "Intégration de maquettes en React, mise en place de tests automatisés (Jest) et amélioration de l'accessibilité (passage à 95 % Lighthouse)." },
      ],
      education: [
        { id: x(), degree: 'Master Informatique', school: 'Université Claude Bernard', date: '2020', city: 'Lyon' },
        { id: x(), degree: 'Licence Informatique', school: 'Université Claude Bernard', date: '2018', city: 'Lyon' },
      ],
    },
  },
  {
    id: 'admin-sys',
    category: 'Tech',
    role: 'Administrateur Systèmes & Réseaux',
    data: {
      name: 'Yanis Bensaïd', title: 'Administrateur Systèmes & Réseaux', email: 'yanis.bensaid@email.com', phone: '06 23 45 67 89', city: 'Toulouse',
      summary: "Administrateur systèmes et réseaux orienté sécurité et continuité de service. Expérience sur des parcs de 200+ postes, supervision, sauvegardes et support utilisateur.",
      skills: ['Windows Server', 'Linux', 'Active Directory', 'VMware', 'Réseaux TCP/IP', 'Sauvegardes', 'Sécurité', 'Support N2'],
      experiences: [
        { id: x(), role: 'Administrateur Systèmes', company: 'Mairie de Belleville', period: '2021 – Aujourd’hui', desc: "Supervision d'un parc de 220 postes, maintenance préventive et curative, gestion des incidents et application stricte des protocoles de sécurité informatique." },
        { id: x(), role: 'Technicien Support', company: 'InfoServices', period: '2019 – 2021', desc: "Support utilisateurs N1/N2, résolution de 95 % des tickets dans les délais, installation et configuration de postes." },
      ],
      education: [
        { id: x(), degree: 'BTS SIO option SISR', school: 'Lycée Déodat de Séverac', date: '2019', city: 'Toulouse' },
      ],
    },
  },
  {
    id: 'commercial',
    category: 'Commerce',
    role: 'Commercial / Chargé de clientèle',
    data: {
      name: 'Léa Dubois', title: 'Chargée de clientèle', email: 'lea.dubois@email.com', phone: '06 34 56 78 90', city: 'Nantes',
      summary: "Commerciale orientée résultats, à l'aise en prospection comme en fidélisation. Sens de l'écoute, négociation et suivi rigoureux des objectifs.",
      skills: ['Prospection', 'Négociation', 'Relation client', 'CRM (Salesforce)', 'Vente B2B', 'Reporting', 'Fidélisation'],
      experiences: [
        { id: x(), role: 'Chargée de clientèle', company: 'Atlas Distribution', period: '2021 – Aujourd’hui', desc: "Gestion d'un portefeuille de 120 clients, +18 % de chiffre d'affaires sur la zone en 2 ans, relances et négociations commerciales." },
        { id: x(), role: 'Conseillère de vente', company: 'Boutique Horizon', period: '2019 – 2021', desc: "Accueil et conseil client, mise en avant produits, atteinte régulière des objectifs mensuels de vente." },
      ],
      education: [
        { id: x(), degree: 'BTS NDRC (Négociation et Digitalisation de la Relation Client)', school: 'Lycée La Colinière', date: '2019', city: 'Nantes' },
      ],
    },
  },
  {
    id: 'marketing',
    category: 'Marketing',
    role: 'Chargé de marketing digital',
    data: {
      name: 'Hugo Lefèvre', title: 'Chargé de marketing digital', email: 'hugo.lefevre@email.com', phone: '06 45 67 89 01', city: 'Paris',
      summary: "Chargé de marketing digital polyvalent : acquisition, contenu et réseaux sociaux. J'aime piloter par la donnée et tester pour améliorer la performance.",
      skills: ['SEO', 'Google Ads', 'Réseaux sociaux', 'Google Analytics', 'Content marketing', 'Emailing', 'Canva', 'Notion'],
      experiences: [
        { id: x(), role: 'Chargé de marketing digital', company: 'Lumen Studio', period: '2022 – Aujourd’hui', desc: "Pilotage des campagnes SEA et social ads (+40 % de trafic qualifié), création de contenus et reporting hebdomadaire des KPIs." },
        { id: x(), role: 'Assistant communication', company: 'Brightway', period: '2021 – 2022', desc: "Animation des réseaux sociaux, rédaction de la newsletter (12 000 abonnés) et soutien à l'organisation d'événements." },
      ],
      education: [
        { id: x(), degree: 'Master Marketing & Communication', school: 'ISCOM', date: '2021', city: 'Paris' },
      ],
    },
  },
  {
    id: 'aide-soignant',
    category: 'Santé',
    role: 'Aide-soignant(e)',
    data: {
      name: 'Sofia Moreau', title: 'Aide-soignante', email: 'sofia.moreau@email.com', phone: '06 56 78 90 12', city: 'Marseille',
      summary: "Aide-soignante bienveillante et organisée, attentive au confort et à la dignité des patients. Habituée au travail en équipe pluridisciplinaire.",
      skills: ['Soins d’hygiène', 'Surveillance des constantes', 'Aide à la mobilité', 'Hygiène hospitalière', 'Écoute', 'Travail en équipe'],
      experiences: [
        { id: x(), role: 'Aide-soignante', company: 'EHPAD Les Tilleuls', period: '2020 – Aujourd’hui', desc: "Accompagnement quotidien de 12 résidents, soins d'hygiène et de confort, transmissions écrites et orales, collaboration avec l'équipe infirmière." },
        { id: x(), role: 'Aide-soignante (remplacements)', company: 'Centre Hospitalier Saint-Joseph', period: '2019 – 2020', desc: "Soins de base, aide aux repas et à la mobilité, respect strict des protocoles d'hygiène." },
      ],
      education: [
        { id: x(), degree: "Diplôme d'État d'Aide-Soignant (DEAS)", school: 'IFAS de Marseille', date: '2019', city: 'Marseille' },
      ],
    },
  },
  {
    id: 'comptable',
    category: 'Finance',
    role: 'Comptable',
    data: {
      name: 'Thomas Garnier', title: 'Comptable', email: 'thomas.garnier@email.com', phone: '06 67 89 01 23', city: 'Bordeaux',
      summary: "Comptable rigoureux et fiable, maîtrisant la saisie, le lettrage et la préparation des déclarations. Sens du détail et respect des échéances.",
      skills: ['Saisie comptable', 'Sage', 'Excel', 'Déclarations TVA', 'Rapprochements bancaires', 'Lettrage', 'Fiscalité'],
      experiences: [
        { id: x(), role: 'Comptable', company: 'Cabinet Verdier', period: '2021 – Aujourd’hui', desc: "Tenue de la comptabilité de 30 dossiers clients, préparation des déclarations de TVA, rapprochements bancaires et révision des comptes." },
        { id: x(), role: 'Assistant comptable', company: 'Groupe Sereno', period: '2019 – 2021', desc: "Saisie des factures, lettrage des comptes et participation aux clôtures mensuelles." },
      ],
      education: [
        { id: x(), degree: 'DCG (Diplôme de Comptabilité et de Gestion)', school: 'INSEEC', date: '2019', city: 'Bordeaux' },
      ],
    },
  },
  {
    id: 'assistant-admin',
    category: 'Administratif',
    role: 'Assistant(e) administratif',
    data: {
      name: 'Inès Roux', title: 'Assistante administrative', email: 'ines.roux@email.com', phone: '06 78 90 12 34', city: 'Lille',
      summary: "Assistante administrative organisée et polyvalente : gestion du courrier, planning, accueil et suivi des dossiers. Discrète et réactive.",
      skills: ['Gestion administrative', 'Pack Office', 'Accueil téléphonique', 'Planification', 'Classement', 'Rédaction'],
      experiences: [
        { id: x(), role: 'Assistante administrative', company: 'Cabinet Lambert', period: '2020 – Aujourd’hui', desc: "Gestion du courrier et des agendas, accueil physique et téléphonique, suivi des dossiers et préparation de documents." },
        { id: x(), role: 'Secrétaire', company: 'Association Solidarité Nord', period: '2018 – 2020', desc: "Saisie de documents, classement et archivage, organisation de réunions." },
      ],
      education: [
        { id: x(), degree: 'BTS Gestion de la PME', school: 'Lycée Baggio', date: '2018', city: 'Lille' },
      ],
    },
  },
  {
    id: 'cariste',
    category: 'Logistique',
    role: 'Cariste / Préparateur de commandes',
    data: {
      name: 'Karim Haddad', title: 'Cariste — Préparateur de commandes', email: 'karim.haddad@email.com', phone: '06 89 01 23 45', city: 'Strasbourg',
      summary: "Cariste expérimenté et ponctuel, titulaire des CACES 1-3-5. Habitué aux cadences d'entrepôt, soucieux de la sécurité et de la qualité.",
      skills: ['CACES 1-3-5', 'Préparation de commandes', 'Gestion de stock', 'Scan / WMS', 'Sécurité', 'Travail en équipe'],
      experiences: [
        { id: x(), role: 'Cariste', company: 'LogiPro', period: '2021 – Aujourd’hui', desc: "Réception et stockage des marchandises, préparation de 200+ commandes par jour, respect des consignes de sécurité (zéro incident en 2 ans)." },
        { id: x(), role: 'Préparateur de commandes', company: 'Entrepôt Est Distribution', period: '2019 – 2021', desc: "Préparation et conditionnement des commandes, contrôle qualité et chargement des camions." },
      ],
      education: [
        { id: x(), degree: 'CAP Opérateur logistique', school: 'CFA Strasbourg', date: '2019', city: 'Strasbourg' },
      ],
    },
  },
  {
    id: 'serveur',
    category: 'Restauration',
    role: 'Serveur / Serveuse',
    data: {
      name: 'Manon Girard', title: 'Serveuse', email: 'manon.girard@email.com', phone: '06 90 12 34 56', city: 'Nice',
      summary: "Serveuse dynamique et souriante, à l'aise sous le rythme du service. Sens du contact, rapidité et esprit d'équipe.",
      skills: ['Service en salle', 'Prise de commande', 'Encaissement', 'Dressage', 'Relation client', 'Travail en équipe'],
      experiences: [
        { id: x(), role: 'Serveuse', company: 'Brasserie du Port', period: '2021 – Aujourd’hui', desc: "Service de 80 couverts par service, conseil client, encaissement et mise en place. Esprit d'équipe en période estivale." },
        { id: x(), role: 'Serveuse (saisonnier)', company: 'Restaurant Le Sud', period: '2020 – 2021', desc: "Accueil et installation des clients, service rapide et entretien de la salle." },
      ],
      education: [
        { id: x(), degree: 'CAP Commercialisation et services en restauration', school: 'Lycée Paul Augier', date: '2020', city: 'Nice' },
      ],
    },
  },
  {
    id: 'graphiste',
    category: 'Design',
    role: 'Graphiste / Designer',
    data: {
      name: 'Noah Petit', title: 'Graphiste — Designer', email: 'noah.petit@email.com', phone: '06 01 23 45 67', city: 'Rennes',
      summary: "Graphiste créatif et polyvalent : identité visuelle, supports print et digital. Maîtrise de la suite Adobe et de Figma, sensible aux détails.",
      skills: ['Photoshop', 'Illustrator', 'InDesign', 'Figma', 'Identité visuelle', 'Mise en page', 'UI Design'],
      experiences: [
        { id: x(), role: 'Graphiste', company: 'Agence Tandem', period: '2021 – Aujourd’hui', desc: "Création d'identités visuelles et de supports print/web pour 15+ clients, déclinaison de chartes graphiques et maquettage UI sur Figma." },
        { id: x(), role: 'Graphiste junior', company: 'Studio Indigo', period: '2020 – 2021', desc: "Réalisation de visuels pour les réseaux sociaux et mise en page de brochures." },
      ],
      education: [
        { id: x(), degree: 'DN MADE mention graphisme', school: 'Lycée Bréquigny', date: '2020', city: 'Rennes' },
      ],
    },
  },
  {
    id: 'macon',
    category: 'BTP',
    role: 'Maçon / Ouvrier du bâtiment',
    data: {
      name: 'Lucas Faure', title: 'Maçon', email: 'lucas.faure@email.com', phone: '06 12 23 34 45', city: 'Clermont-Ferrand',
      summary: "Maçon qualifié et polyvalent sur le gros œuvre. Soigneux, ponctuel et respectueux des règles de sécurité sur chantier.",
      skills: ['Coffrage', 'Ferraillage', 'Lecture de plans', 'Maçonnerie traditionnelle', 'Sécurité chantier', 'Travail en équipe'],
      experiences: [
        { id: x(), role: 'Maçon', company: 'BTP Auvergne', period: '2020 – Aujourd’hui', desc: "Réalisation de fondations, coffrage et coulage de dalles, montage de murs en parpaings. Respect des consignes de sécurité." },
        { id: x(), role: 'Aide-maçon', company: 'Construction Vallée', period: '2018 – 2020', desc: "Préparation des matériaux, assistance aux maçons et entretien du chantier." },
      ],
      education: [
        { id: x(), degree: 'CAP Maçon', school: 'CFA BTP', date: '2018', city: 'Clermont-Ferrand' },
      ],
    },
  },
  {
    id: 'etudiant-debutant',
    category: 'Débutant',
    role: 'Étudiant / Premier emploi',
    data: {
      name: 'Emma Lambert', title: 'Étudiante en recherche d’alternance', email: 'emma.lambert@email.com', phone: '06 22 33 44 55', city: 'Montpellier',
      summary: "Étudiante motivée et sérieuse en recherche d'alternance. Première expérience en stage et jobs étudiants, à l'aise en équipe et désireuse d'apprendre.",
      skills: ['Pack Office', 'Travail en équipe', 'Organisation', 'Relation client', 'Réseaux sociaux', 'Anglais (B2)'],
      experiences: [
        { id: x(), role: 'Stagiaire assistante marketing', company: 'Start Local', period: 'Mai 2023 – Juil. 2023', desc: "Aide à la création de contenus pour les réseaux sociaux, veille concurrentielle et mise à jour du site web." },
        { id: x(), role: 'Équipière polyvalente (job étudiant)', company: 'Café Central', period: '2022 – 2023', desc: "Accueil client, encaissement et entretien, en parallèle des études." },
      ],
      education: [
        { id: x(), degree: 'BUT Techniques de Commercialisation (en cours)', school: 'IUT de Montpellier', date: '2024', city: 'Montpellier' },
        { id: x(), degree: 'Baccalauréat général', school: 'Lycée Jean Jaurès', date: '2022', city: 'Montpellier' },
      ],
    },
  },
];

export const getCvExample = (id?: string) => CV_EXAMPLES.find((e) => e.id === id);
