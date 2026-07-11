
export enum Plan {
  FREE = 'Gratuit',
  PRO = 'Pro',
  PREMIUM = 'Premium'
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  period: string;
  desc: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  period: string;
  desc?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  title?: string;
  photoUrl?: string;
  summary?: string;
  skills?: string[];
  experiences?: Experience[];
  education?: Education[];
  languages?: string[];
  linkedin?: string;
  portfolio?: string;
  github?: string;
  hobbies?: string[];
  plan: Plan;
  applicationsCount: number;
  quota: number;
  phone?: string;
  city?: string;

  // Profil étendu (CV complet)
  firstName?: string;
  lastName?: string;
  postalCode?: string;
  targetSectors?: string[];
  targetLocations?: string[];
  contractTypes?: string[];
  workTime?: string;
  availability?: string;
  salaryMin?: number;
  salaryMax?: number;
  softSkills?: string[];
  languagesDetailed?: { language: string; level: string; certification?: string }[];
  mobility?: string[];
  drivingLicenses?: string[];
  ownVehicle?: boolean;
  workSchedules?: string[];
  projects?: { title: string; link?: string; description?: string; role?: string }[];

  // Auth & Roles
  role?: string;
  organizationId?: string;
  
  // France Travail
  ftAccessToken?: string;

  // Alertes emploi par email
  jobAlertOptIn?: boolean;
  jobAlertFrequency?: 'daily' | 'weekly';
}

export interface Application {
  id: string;
  companyName: string;
  jobTitle: string;
  city: string;
  status: 'sent' | 'pending' | 'failed';
  date: string;
  emailContact: string;
}

export interface Company {
  id: string;
  name: string;
  activity: string;
  city: string;
  email: string;
  relevance: number;
}

export interface CVData {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  experiences: {
    title: string;
    company: string;
    period: string;
    description: string;
  }[];
  education: {
    degree: string;
    school: string;
    year: string;
  }[];
}

// ==================== BUSINESS SESSION ====================

export interface BusinessOffer {
  id: string;
  businessId: string;
  title: string;
  description: string;
  contractType?: string;
  location?: string;
  salaryRange?: string;
  requiredSkills: string[];
  isPublished: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessJobseeker {
  affiliationId: string;
  affiliationStatus: string;
  affiliatedAt: string;
  id: string;
  name: string;
  email: string;
  title?: string;
  skills: string[];
  city?: string;
  phone?: string;
  updatedAt: string;
  experiences?: any;
  education?: any;
  summary?: string;
  linkedin?: string;
}

export interface BusinessJobseekerDetail extends BusinessJobseeker {
  languages?: string[];
  portfolio?: string;
  github?: string;
  note?: string | null;       // note privée du recruteur (mini-CRM)
  managed?: boolean;          // true = candidat saisi par le recruteur (fiche éditable)
  applications?: {
    id: string;
    company: string;
    title: string;
    status: string;
    appliedAt: string;
  }[];
  cvs?: {
    id: string;
    title: string;
    updatedAt: string;
  }[];
}

// Saisie / édition d'un candidat dans le vivier (par le recruteur)
export interface BusinessJobseekerInput {
  name: string;
  email?: string;
  title?: string;
  city?: string;
  phone?: string;
  summary?: string;
  linkedin?: string;
  skills?: string[];
}

// Matching offre → candidats du vivier
export interface OfferMatch {
  id: string;
  name: string;
  title?: string | null;
  city?: string | null;
  skills: string[];
  affiliationStatus: string;
  matchCount: number;
  matchedSkills: string[];
  matchPercent: number;
}

export interface OfferMatchesResult {
  matches: OfferMatch[];
  requiredSkills: string[];
  totalVivier: number;
}

export type StatsPeriod = '7d' | '30d' | '3m' | '6m' | '12m' | 'custom';

export interface StatsQuery {
  period?: StatsPeriod;
  from?: string; // ISO, pour période personnalisée
  to?: string;   // ISO
  status?: string;
  skill?: string;
}

export interface BusinessStats {
  range: {
    from: string;
    to: string;
    period: StatsPeriod;
    granularity: 'day' | 'month';
  };
  kpis: {
    totalActive: number;
    newInPeriod: number;
    newInPeriodDelta: number | null;        // % vs période précédente
    avgProfileCompletion: number;
    applicationCount: number;
    applicationCountDelta: number | null;
  };
  statusBreakdown: { status: string; count: number }[];
  growth: { bucket: string; total: number }[]; // bucket = 'YYYY-MM-DD' ou 'YYYY-MM'
  topSkills: { skill: string; count: number }[];
  publishedOffers: number;
  totalOffers: number;
}

// Compte recruteur (nom, entreprise, logo, abonnement) — affiché dans l'en-tête et le tableau de bord B2B
export interface BusinessAccount {
  name: string;
  email: string;
  plan: string;
  companyName: string;
  logoUrl?: string | null;
  subscriptionStatus?: string | null;
  subscriptionEndsAt?: string | null;
}

// Résultat de l'assistant IA de rédaction d'offre
export interface OfferAssistResult {
  description: string;
  suggestedSkills: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

