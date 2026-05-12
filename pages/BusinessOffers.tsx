import React, { useState, useEffect, useCallback } from 'react';
import { BusinessOffer, Pagination } from '../types';
import { businessOfferApi } from '../services/business';
import toast from 'react-hot-toast';
import {
  Plus, Edit3, Trash2, Eye, EyeOff, X,
  MapPin, Briefcase, DollarSign, Clock, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';

const CONTRACT_TYPES = ['CDI', 'CDD', 'Stage', 'Alternance', 'Mission', 'Freelance'];

const emptyOffer = {
  title: '',
  description: '',
  contractType: '',
  location: '',
  salaryRange: '',
  requiredSkills: [] as string[],
  expiresAt: '',
};

const BusinessOffers: React.FC = () => {
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<BusinessOffer | null>(null);
  const [form, setForm] = useState(emptyOffer);
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOffers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await businessOfferApi.list(page);
      setOffers(data.offers);
      setPagination(data.pagination);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const openCreate = () => {
    setEditingOffer(null);
    setForm(emptyOffer);
    setSkillInput('');
    setShowModal(true);
  };

  const openEdit = (offer: BusinessOffer) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      contractType: offer.contractType || '',
      location: offer.location || '',
      salaryRange: offer.salaryRange || '',
      requiredSkills: offer.requiredSkills || [],
      expiresAt: offer.expiresAt ? offer.expiresAt.slice(0, 10) : '',
    });
    setSkillInput('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Le titre et la description sont requis.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingOffer) {
        await businessOfferApi.update(editingOffer.id, form);
        toast.success('Offre modifiée !');
      } else {
        await businessOfferApi.create(form);
        toast.success('Offre créée !');
      }
      setShowModal(false);
      fetchOffers(pagination.page);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette offre ?')) return;
    try {
      await businessOfferApi.delete(id);
      toast.success('Offre supprimée.');
      fetchOffers(pagination.page);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const updated = await businessOfferApi.togglePublish(id);
      toast.success(updated.isPublished ? 'Offre publiée !' : 'Offre dépubliée.');
      fetchOffers(pagination.page);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.requiredSkills.includes(s)) {
      setForm({ ...form, requiredSkills: [...form.requiredSkills, s] });
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm({ ...form, requiredSkills: form.requiredSkills.filter((s) => s !== skill) });
  };

  const getStatusBadge = (offer: BusinessOffer) => {
    if (offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock size={12} /> Expirée</span>;
    }
    if (offer.isPublished) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><Eye size={12} /> Publiée</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"><EyeOff size={12} /> Brouillon</span>;
  };

  /* ──────── Action buttons (shared between mobile card & desktop row) ──────── */
  const ActionButtons: React.FC<{ offer: BusinessOffer }> = ({ offer }) => (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); handleTogglePublish(offer.id); }}
        className={`p-2.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
          offer.isPublished
            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title={offer.isPublished ? 'Dépublier' : 'Publier'}
      >
        {offer.isPublished ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); openEdit(offer); }}
        className="p-2.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="Modifier"
      >
        <Edit3 size={18} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); handleDelete(offer.id); }}
        className="p-2.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="Supprimer"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Offres d'emploi</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Créez et gérez vos offres pour vos adhérents</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary min-h-[44px] px-4 w-full sm:w-auto">
          <Plus size={16} /> Nouvelle offre
        </button>
      </div>

      {/* Content */}
      <div className="card-pro overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#7D5CFF]" size={32} />
          </div>
        ) : offers.length === 0 ? (
          <div className="text-center py-16 md:py-20 px-4">
            <Briefcase className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Aucune offre pour le moment.</p>
            <button onClick={openCreate} className="btn btn-primary mt-4 min-h-[44px]">
              <Plus size={16} /> Créer votre première offre
            </button>
          </div>
        ) : (
          <>
            {/* ─── MOBILE: Card list (< md) ─── */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {offers.map((offer) => (
                <div key={offer.id} className="p-4 space-y-3">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{offer.title}</p>
                      {offer.salaryRange && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><DollarSign size={10} />{offer.salaryRange}</p>
                      )}
                    </div>
                    {getStatusBadge(offer)}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {offer.contractType && (
                      <span className="badge-ai text-[10px]">{offer.contractType}</span>
                    )}
                    {offer.location && (
                      <span className="flex items-center gap-1"><MapPin size={10} />{offer.location}</span>
                    )}
                    <span className="text-slate-400">{new Date(offer.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end -mr-1">
                    <ActionButtons offer={offer} />
                  </div>
                </div>
              ))}
            </div>

            {/* ─── DESKTOP: Table (>= md) ─── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Titre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lieu</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {offers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white">{offer.title}</p>
                        {offer.salaryRange && (
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><DollarSign size={10} />{offer.salaryRange}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {offer.contractType ? (
                          <span className="badge-ai">{offer.contractType}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {offer.location ? (
                          <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1"><MapPin size={12} />{offer.location}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(offer)}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">{new Date(offer.createdAt).toLocaleDateString('fr-FR')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end">
                          <ActionButtons offer={offer} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500">{pagination.total} offre{pagination.total > 1 ? 's' : ''}</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => fetchOffers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-300 px-2">{pagination.page} / {pagination.totalPages}</span>
                  <button
                    onClick={() => fetchOffers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Modal Create / Edit (fullscreen on mobile) ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:rounded-xl shadow-2xl md:max-w-xl md:mx-4 max-h-[100dvh] md:max-h-[90vh] overflow-y-auto border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl">
            <div className="sticky top-0 bg-white dark:bg-[#111827] flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 z-10">
              {/* Drag indicator on mobile */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 md:mt-0">
                {editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4">
              <div>
                <label className="input-label">Titre du poste *</label>
                <input
                  className="input-pro"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Développeur React Junior"
                  required
                />
              </div>

              <div>
                <label className="input-label">Description *</label>
                <textarea
                  className="textarea-pro"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez le poste, les missions et les conditions..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Type de contrat</label>
                  <select
                    className="input-pro"
                    value={form.contractType}
                    onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                  >
                    <option value="">Sélectionner...</option>
                    {CONTRACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Localisation</label>
                  <input
                    className="input-pro"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Ex: Paris, Lyon..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Fourchette salariale</label>
                  <input
                    className="input-pro"
                    value={form.salaryRange}
                    onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                    placeholder="Ex: 28-35K€"
                  />
                </div>
                <div>
                  <label className="input-label">Date d'expiration</label>
                  <input
                    className="input-pro"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Compétences requises</label>
                <div className="flex gap-2">
                  <input
                    className="input-pro flex-1"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Ajouter une compétence..."
                  />
                  <button type="button" onClick={addSkill} className="btn btn-secondary min-h-[44px] min-w-[44px]">+</button>
                </div>
                {form.requiredSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.requiredSkills.map((skill) => (
                      <span key={skill} className="badge-ai flex items-center gap-1">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors p-0.5"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary min-h-[44px] w-full sm:w-auto">Annuler</button>
                <button type="submit" disabled={submitting} className="btn btn-primary min-h-[44px] w-full sm:w-auto">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingOffer ? 'Enregistrer' : 'Créer l\'offre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessOffers;
