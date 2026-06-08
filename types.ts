
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
  
  // Auth & Roles
  role?: string;
  organizationId?: string;
  
  // France Travail
  ftAccessToken?: string;
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

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

