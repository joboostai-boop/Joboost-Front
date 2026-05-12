import { BusinessOffer, BusinessJobseeker, BusinessJobseekerDetail, BusinessStats, Pagination } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

const fetchApi = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers as any },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
};

// ==================== OFFERS ====================

export const businessOfferApi = {
  list: async (page = 1, limit = 10): Promise<{ offers: BusinessOffer[]; pagination: Pagination }> => {
    const data = await fetchApi(`/api/business/offers?page=${page}&limit=${limit}`);
    return { offers: data.offers, pagination: data.pagination };
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
};

// ==================== STATS ====================

export const businessStatsApi = {
  getStats: async (): Promise<BusinessStats> => {
    const data = await fetchApi('/api/business/stats');
    return data.stats;
  },
};
