import { BusinessOffer, BusinessJobseeker, BusinessJobseekerDetail, BusinessJobseekerInput, BusinessStats, StatsQuery, Pagination, OfferMatchesResult, BusinessAccount, OfferAssistResult } from '../types';
import { authHeaders } from './authToken';

const API_URL = import.meta.env.VITE_API_URL || '';

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...options.headers as any },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

// ==================== OFFERS ====================

export const businessOfferApi = {
  list: async (page = 1, limit = 10, filters: { search?: string; status?: string } = {}): Promise<{ offers: BusinessOffer[]; pagination: Pagination }> => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters.search) query.set('search', filters.search);
    if (filters.status) query.set('status', filters.status);
    const data = await fetchApi(`/api/business/offers?${query.toString()}`);
    return { offers: data.offers, pagination: data.pagination };
  },

  // Assistant IA : rédige la description de l'offre + suggère des compétences.
  assist: async (input: {
    title: string;
    contractType?: string;
    location?: string;
    salaryRange?: string;
    skills?: string[];
    notes?: string;
  }): Promise<OfferAssistResult> => {
    const data = await fetchApi('/api/business/offers/assist', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.data;
  },

  create: async (offer: Partial<BusinessOffer>): Promise<BusinessOffer> => {
    const data = await fetchApi('/api/business/offers', {
      method: 'POST',
      body: JSON.stringify(offer),
    });
    return data.offer;
  },

  update: async (id: string, offer: Partial<BusinessOffer>): Promise<BusinessOffer> => {
    const data = await fetchApi(`/api/business/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(offer),
    });
    return data.offer;
  },

  delete: async (id: string): Promise<void> => {
    await fetchApi(`/api/business/offers/${id}`, { method: 'DELETE' });
  },

  togglePublish: async (id: string): Promise<BusinessOffer> => {
    const data = await fetchApi(`/api/business/offers/${id}/publish`, { method: 'PATCH' });
    return data.offer;
  },

  matches: async (id: string): Promise<OfferMatchesResult> => {
    const data = await fetchApi(`/api/business/offers/${id}/matches`);
    return { matches: data.matches, requiredSkills: data.requiredSkills, totalVivier: data.totalVivier };
  },
};

// ==================== JOBSEEKERS ====================

export const businessJobseekerApi = {
  list: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{ jobseekers: BusinessJobseeker[]; pagination: Pagination }> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const data = await fetchApi(`/api/business/jobseekers?${query.toString()}`);
    return { jobseekers: data.jobseekers, pagination: data.pagination };
  },

  getDetail: async (id: string): Promise<BusinessJobseekerDetail> => {
    const data = await fetchApi(`/api/business/jobseekers/${id}`);
    return data.jobseeker;
  },

  create: async (input: BusinessJobseekerInput): Promise<BusinessJobseeker> => {
    const data = await fetchApi('/api/business/jobseekers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return data.jobseeker;
  },

  update: async (id: string, input: Partial<BusinessJobseekerInput>): Promise<BusinessJobseeker> => {
    const data = await fetchApi(`/api/business/jobseekers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.jobseeker;
  },

  updateStatus: async (id: string, status: string): Promise<string> => {
    const data = await fetchApi(`/api/business/jobseekers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return data.status;
  },

  updateNote: async (id: string, note: string): Promise<string | null> => {
    const data = await fetchApi(`/api/business/jobseekers/${id}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ note }),
    });
    return data.note;
  },

  remove: async (id: string): Promise<void> => {
    await fetchApi(`/api/business/jobseekers/${id}`, { method: 'DELETE' });
  },

  // Email d'approche IA d'un candidat du vivier (texte prêt à copier).
  outreach: async (id: string, offerTitle?: string): Promise<string> => {
    const data = await fetchApi(`/api/business/jobseekers/${id}/outreach`, {
      method: 'POST',
      body: JSON.stringify({ offerTitle }),
    });
    return data.data;
  },
};

// ==================== COMPTE ====================

export const businessAccountApi = {
  get: async (): Promise<BusinessAccount> => {
    const data = await fetchApi('/api/business/account');
    return data.account;
  },

  update: async (input: { name?: string; companyName?: string; logoUrl?: string | null }): Promise<BusinessAccount> => {
    const data = await fetchApi('/api/business/account', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return data.account;
  },
};

// ==================== FACTURATION (STRIPE) ====================

export const businessBillingApi = {
  // Lance le paiement d'un abonnement Business → URL Stripe Checkout.
  checkout: async (plan: 'essentiel' | 'pro'): Promise<string> => {
    const data = await fetchApi('/api/business/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
    return data.url;
  },

  // Portail client Stripe (factures, carte, résiliation).
  portal: async (): Promise<string> => {
    const data = await fetchApi('/api/business/billing/portal', { method: 'POST' });
    return data.url;
  },

  // Demande de devis Entreprise (gros volumes) — envoie un email à l'équipe Joboost.
  requestQuote: async (input: {
    organizationName: string;
    phone?: string;
    membersCount?: string;
    recruitersCount?: string;
    message?: string;
  }): Promise<void> => {
    await fetchApi('/api/business/billing/quote', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

// ==================== STATS ====================

export const businessStatsApi = {
  getStats: async (params: StatsQuery = {}): Promise<BusinessStats> => {
    const query = new URLSearchParams();
    if (params.period) query.set('period', params.period);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.status) query.set('status', params.status);
    if (params.skill) query.set('skill', params.skill);

    const qs = query.toString();
    const data = await fetchApi(`/api/business/stats${qs ? `?${qs}` : ''}`);
    return data.stats;
  },
};
