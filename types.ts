
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
