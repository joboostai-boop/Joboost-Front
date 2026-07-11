import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BusinessJobseeker, BusinessJobseekerDetail, BusinessJobseekerInput, Pagination } from '../types';
import { businessJobseekerApi, businessOfferApi } from '../services/business';
import { useModalBehavior } from '../hooks/useModalBehavior';
import ConfirmDialog from '../components/ConfirmDialog';
import toast from 'react-hot-toast';
import {
  Search, Filter, X, ChevronLeft, ChevronRight, Loader2, Download,
  Mail, Phone, MapPin, Briefcase, ExternalLink, FileText, User, MoreVertical,
  UserPlus, Edit3, Trash2, Save, StickyNote, Sparkles, Copy, Send, Eye, GraduationCap
} from 'lucide-react';

/* Aperçu lisible d'un CV Joboost (contenu JSON du builder candidat) — lecture seule
   pour le recruteur. Tolérant : n'affiche que les sections présentes. */
const CvPreview: React.FC<{ content: any }> = ({ content }) => {
  const c = content || {};
  const experiences: any[] = Array.isArray(c.experiences) ? c.experiences : [];
  const education: any[] = Array.isArray(c.education) ? c.education : [];
  const skills: string[] = Array.isArray(c.skills) ? c.skills.map((s: any) => String(s)) : [];
  const hasAnything = c.name || c.summary || experiences.length > 0 || education.length > 0 || skills.length > 0;

  if (!hasAnything) {
    return <p className="text-sm text-slate-400 text-center py-10">Aperçu indisponible pour ce CV.</p>;
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      {(c.name || c.title) && (
        <div className="flex items-center gap-3">
          {c.photoUrl && (
            <img src={c.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
          )}
          <div className="min-w-0">
            {c.name && <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{c.name}</p>}
            {c.title && <p className="text-sm font-semibold text-[#7D5CFF] mt-0.5">{c.title}</p>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-500">
              {c.email && <span>{c.email}</span>}
              {c.phone && <span>{c.phone}</span>}
              {c.city && <span>{c.city}</span>}
            </div>
          </div>
        </div>
      )}

      {c.summary && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Profil</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.summary}</p>
        </div>
      )}

      {skills.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Compétences</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#B9A7FF] text-xs font-semibold">{s}</span>
            ))}
          </div>
        </div>
      )}

      {experiences.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Briefcase size={12} /> Expériences
          </p>
          <div className="space-y-3">
            {experiences.map((e, i) => (
              <div key={e.id || i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {e.role || e.title || 'Poste'}{e.company ? ` · ${e.company}` : ''}
                </p>
                {(e.period || e.dates) && <p className="text-[11px] text-slate-400 mt-0.5">{e.period || e.dates}</p>}
                {(e.desc || e.description) && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{e.desc || e.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {education.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <GraduationCap size={12} /> Formation
          </p>
          <div className="space-y-2">
            {education.map((e, i) => (
              <div key={e.id || i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{e.degree || e.title || 'Formation'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {[e.school, e.date || e.year || e.period, e.city].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const STATUS_FORM_OPTIONS = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'suspended', label: 'Suspendu' },
];

const emptyJsForm: BusinessJobseekerInput = {
  name: '', email: '', title: '', city: '', phone: '', summary: '', linkedin: '', skills: [],
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'suspended', label: 'Suspendus' },
];

const BusinessJobseekers: React.FC = () => {
  const [jobseekers, setJobseekers] = useState<BusinessJobseeker[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<BusinessJobseekerDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Formulaire d'ajout / édition de candidat
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BusinessJobseekerInput>(emptyJsForm);
  const [skillInput, setSkillInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // CRM (statut + note) et retrait
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // Message d'approche IA
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachText, setOutreachText] = useState('');

  // Lecture d'un CV (adhérent)
  const [cvOpen, setCvOpen] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvView, setCvView] = useState<{ title: string; content: any; updatedAt: string } | null>(null);

  // Positionnement sur une offre (candidature déposée pour le candidat)
  const [positionOpen, setPositionOpen] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offerOptions, setOfferOptions] = useState<{ id: string; title: string }[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [positioning, setPositioning] = useState(false);

  // Échap pour fermer + blocage du scroll de fond sur les overlays.
  useModalBehavior(drawerOpen, () => { setDrawerOpen(false); setSelectedDetail(null); });
  useModalBehavior(showFiltersMobile, () => setShowFiltersMobile(false));
  useModalBehavior(showMobileActions, () => setShowMobileActions(false));
  useModalBehavior(showForm, () => setShowForm(false));
  useModalBehavior(outreachOpen, () => setOutreachOpen(false));
  useModalBehavior(cvOpen, () => setCvOpen(false));
  useModalBehavior(positionOpen, () => setPositionOpen(false));

  const fetchJobseekers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await businessJobseekerApi.list({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined,
      });
      setJobseekers(data.jobseekers);
      setPagination(data.pagination);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchJobseekers(); }, [fetchJobseekers]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setDrawerOpen(true);
    try {
      const detail = await businessJobseekerApi.getDetail(id);
      setSelectedDetail(detail);
      setNoteDraft(detail.note || '');
    } catch (err: any) {
      toast.error(err.message);
      setDrawerOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Liens profonds depuis le tableau de bord : ?new=1 ouvre l'ajout, ?open=<id> ouvre une fiche.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    if (searchParams.get('new') === '1') openCreate();
    else if (openId) openDetail(openId);
    if (openId || searchParams.get('new')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Contact : email réel vs adresse interne du vivier ---
  const hasRealEmail = (email?: string) => !!email && !email.endsWith('@candidat.joboost.local');

  const handleOutreach = async () => {
    if (!selectedDetail) return;
    setOutreachOpen(true);
    setOutreachLoading(true);
    setOutreachText('');
    try {
      const text = await businessJobseekerApi.outreach(selectedDetail.id);
      setOutreachText(text);
    } catch (err: any) {
      toast.error(err.message);
      setOutreachOpen(false);
    } finally {
      setOutreachLoading(false);
    }
  };

  const copyOutreach = async () => {
    try {
      await navigator.clipboard.writeText(outreachText);
      toast.success('Message copié !');
    } catch {
      toast.error('Impossible de copier automatiquement — sélectionnez le texte.');
    }
  };

  // Ouvre l'aperçu lecture seule d'un CV du candidat.
  const openCv = async (cvId: string) => {
    if (!selectedDetail) return;
    setCvOpen(true);
    setCvLoading(true);
    setCvView(null);
    try {
      const cv = await businessJobseekerApi.getCv(selectedDetail.id, cvId);
      setCvView(cv);
    } catch (err: any) {
      toast.error(err.message);
      setCvOpen(false);
    } finally {
      setCvLoading(false);
    }
  };

  // Positionner le candidat sur une offre publiée de l'organisme.
  const openPosition = async () => {
    setPositionOpen(true);
    setOffersLoading(true);
    setSelectedOfferId('');
    try {
      const data = await businessOfferApi.list(1, 50, { status: 'published' });
      setOfferOptions(data.offers.map((o) => ({ id: o.id, title: o.title })));
    } catch (err: any) {
      toast.error(err.message);
      setPositionOpen(false);
    } finally {
      setOffersLoading(false);
    }
  };

  const confirmPosition = async () => {
    if (!selectedDetail || !selectedOfferId) return;
    setPositioning(true);
    try {
      await businessOfferApi.applyCandidate(selectedOfferId, selectedDetail.id);
      toast.success('Candidat positionné — la candidature apparaît dans son suivi.');
      setPositionOpen(false);
      const refreshed = await businessJobseekerApi.getDetail(selectedDetail.id);
      setSelectedDetail(refreshed);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPositioning(false);
    }
  };

  // Transforme le message généré (« Objet : … » + corps) en lien mailto prêt à envoyer.
  const outreachMailto = () => {
    if (!selectedDetail) return '#';
    const lines = outreachText.split('\n');
    let subject = 'Opportunité professionnelle';
    let body = outreachText;
    if (lines[0]?.toLowerCase().startsWith('objet')) {
      subject = lines[0].replace(/^objet\s*:\s*/i, '').trim() || subject;
      body = lines.slice(1).join('\n').trim();
    }
    return `mailto:${selectedDetail.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyJsForm);
    setSkillInput('');
    setShowMobileActions(false);
    setShowForm(true);
  };

  const openEdit = (d: BusinessJobseekerDetail) => {
    setEditingId(d.id);
    setForm({
      name: d.name || '',
      email: d.email?.endsWith('@candidat.joboost.local') ? '' : (d.email || ''),
      title: d.title || '',
      city: d.city || '',
      phone: d.phone || '',
      summary: d.summary || '',
      linkedin: d.linkedin || '',
      skills: d.skills || [],
    });
    setSkillInput('');
    setShowForm(true);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !(form.skills || []).includes(s)) {
      setForm({ ...form, skills: [...(form.skills || []), s] });
    }
    setSkillInput('');
  };
  const removeSkill = (skill: string) => {
    setForm({ ...form, skills: (form.skills || []).filter((s) => s !== skill) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Le nom du candidat est requis.'); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await businessJobseekerApi.update(editingId, form);
        toast.success('Candidat mis à jour !');
        if (selectedDetail?.id === editingId) {
          const refreshed = await businessJobseekerApi.getDetail(editingId);
          setSelectedDetail(refreshed);
        }
      } else {
        await businessJobseekerApi.create(form);
        toast.success('Candidat ajouté au vivier !');
      }
      setShowForm(false);
      fetchJobseekers(editingId ? pagination.page : 1);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedDetail) return;
    setSavingStatus(true);
    try {
      await businessJobseekerApi.updateStatus(selectedDetail.id, status);
      setSelectedDetail({ ...selectedDetail, affiliationStatus: status });
      setJobseekers((prev) => prev.map((j) => (j.id === selectedDetail.id ? { ...j, affiliationStatus: status } : j)));
      toast.success('Statut mis à jour.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedDetail) return;
    setSavingNote(true);
    try {
      const saved = await businessJobseekerApi.updateNote(selectedDetail.id, noteDraft);
      setSelectedDetail({ ...selectedDetail, note: saved });
      toast.success('Note enregistrée.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const confirmRemove = async () => {
    if (!removingId) return;
    setRemoving(true);
    try {
      await businessJobseekerApi.remove(removingId);
      toast.success('Candidat retiré du vivier.');
      if (selectedDetail?.id === removingId) { setDrawerOpen(false); setSelectedDetail(null); }
      setRemovingId(null);
      fetchJobseekers(pagination.page);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowFiltersMobile(false);
    fetchJobseekers(1);
  };

  const exportCSV = () => {
    if (jobseekers.length === 0) return;
    const headers = ['Nom', 'Email', 'Ville', 'Compétences', 'Statut', 'Affilié le'];
    const rows = jobseekers.map((j) => [
      j.name,
      j.email,
      j.city || '',
      (j.skills || []).join('; '),
      j.affiliationStatus,
      new Date(j.affiliatedAt).toLocaleDateString('fr-FR'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adherents_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé !');
    setShowMobileActions(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case 'inactive': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      case 'suspended': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'suspended': return 'Suspendu';
      default: return s;
    }
  };

  return (
    <div className="relative">
      {/* Barre d'outils (le titre est porté par le hero du layout) */}
      <div className="flex items-center justify-end mb-4 md:mb-6">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={exportCSV} className="btn btn-secondary min-h-[44px]" disabled={jobseekers.length === 0}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openCreate} className="btn btn-primary min-h-[44px]">
            <UserPlus size={16} /> Ajouter un candidat
          </button>
        </div>

        {/* Mobile Actions Toggle */}
        <button 
          onClick={() => setShowMobileActions(true)}
          className="md:hidden p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Mobile Actions Bottom Sheet */}
      {showMobileActions && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileActions(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full rounded-t-2xl shadow-2xl p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Actions</h3>
            <button
              onClick={openCreate}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]"
            >
              <UserPlus size={20} className="text-[#7D5CFF]" />
              <span className="font-medium text-slate-900 dark:text-white">Ajouter un candidat</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={jobseekers.length === 0}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]"
            >
              <Download size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Exporter en CSV</span>
            </button>
            <button 
              onClick={() => setShowMobileActions(false)}
              className="w-full mt-4 p-4 text-center font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl min-h-[44px]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Filters - Sticky on Mobile */}
      <div className="sticky top-0 md:relative z-20 bg-slate-50 dark:bg-[#030712] pb-4 md:pb-0 md:mb-6">
        <div className="card-pro">
          {/* Desktop Form */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-pro pl-9 min-h-[44px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email ou compétence..."
              />
            </div>
            <div className="flex items-center gap-1.5">
              {STATUS_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setStatusFilter(o.value)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors min-h-[38px] ${
                    statusFilter === o.value
                      ? 'bg-[#7D5CFF] text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary min-h-[44px]">Rechercher</button>
          </form>

          {/* Mobile Search & Filter Toggle */}
          <div className="md:hidden flex gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input-pro pl-10 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
              />
            </form>
            <button 
              onClick={() => setShowFiltersMobile(true)}
              className={`p-2.5 rounded-xl border flex items-center justify-center min-h-[44px] min-w-[44px] transition-colors ${
                statusFilter 
                  ? 'bg-[#7D5CFF]/10 border-[#7D5CFF]/20 text-[#7D5CFF]' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <Filter size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {showFiltersMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowFiltersMobile(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full rounded-t-2xl shadow-2xl p-5 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Filtres</h3>
              <button onClick={() => setShowFiltersMobile(false)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="input-label">Statut</label>
                <select
                  className="input-pro w-full min-h-[44px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button 
                onClick={() => { setShowFiltersMobile(false); fetchJobseekers(1); }}
                className="btn btn-primary w-full min-h-[44px] mt-2"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-pro p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="skeleton w-10 md:w-12 h-10 md:h-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
              <div className="flex gap-1">
                <div className="skeleton h-5 w-14 rounded" />
                <div className="skeleton h-5 w-14 rounded" />
              </div>
              <div className="skeleton h-3 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : jobseekers.length === 0 ? (
        <div className="card-pro text-center py-16 md:py-20 px-4">
          <User className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {search || statusFilter ? 'Aucun candidat ne correspond à votre recherche.' : 'Votre vivier est vide pour le moment.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={openCreate} className="btn btn-primary mt-4 min-h-[44px]">
              <UserPlus size={16} /> Ajouter votre premier candidat
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            {jobseekers.map((js) => (
              <div
                key={js.affiliationId}
                onClick={() => openDetail(js.id)}
                className="card-pro p-4 hover:shadow-md hover:border-[#7D5CFF]/30 cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-[#EFEBFF] dark:bg-[#7D5CFF]/15 text-[#5B3FD6] dark:text-[#B9A7FF] flex items-center justify-center font-bold text-sm md:text-base shrink-0">
                    {js.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm md:text-base text-slate-900 dark:text-white truncate leading-tight">{js.name}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${getStatusColor(js.affiliationStatus)}`}>
                        {statusLabel(js.affiliationStatus)}
                      </span>
                    </div>
                    {js.title && <p className="text-[11px] md:text-xs text-slate-500 truncate mt-0.5">{js.title}</p>}
                    <p className="text-[11px] md:text-xs text-slate-400 mt-0.5 truncate">{js.email}</p>
                  </div>
                </div>

                {js.skills && js.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {js.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="badge-ai text-[10px] py-0.5">{skill}</span>
                    ))}
                    {js.skills.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">+{js.skills.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {js.city ? (
                    <span className="text-[11px] md:text-xs text-slate-400 flex items-center gap-1"><MapPin size={10} />{js.city}</span>
                  ) : <span />}
                  <span className="text-[11px] md:text-xs text-slate-400">
                    Actif le : {new Date(js.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 card-pro p-3">
              <p className="text-xs text-slate-500 hidden sm:block">{pagination.total} adhérent{pagination.total > 1 ? 's' : ''}</p>
              <div className="flex items-center gap-1 w-full sm:w-auto justify-between sm:justify-start">
                <button onClick={() => fetchJobseekers(pagination.page - 1)} disabled={pagination.page <= 1} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 px-4">{pagination.page} / {pagination.totalPages}</span>
                <button onClick={() => fetchJobseekers(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Drawer / Bottom Sheet */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => { setDrawerOpen(false); setSelectedDetail(null); }} />
          <div className="fixed inset-x-0 bottom-0 md:top-0 md:right-0 md:left-auto md:w-full md:max-w-lg z-50 bg-white dark:bg-[#111827] shadow-2xl rounded-t-2xl md:rounded-none md:border-l border-slate-200 dark:border-slate-700 h-[90vh] md:h-full flex flex-col transition-transform duration-300">
            {/* Header Sticky */}
            <div className="shrink-0 bg-white dark:bg-[#111827] z-10 flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-none">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 md:mt-0">Profil adhérent</h2>
              <button onClick={() => { setDrawerOpen(false); setSelectedDetail(null); }} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center mt-2 md:mt-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-[#7D5CFF]" size={32} />
                </div>
              ) : selectedDetail ? (
                <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                  {/* Header Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#EFEBFF] dark:bg-[#7D5CFF]/15 text-[#5B3FD6] dark:text-[#B9A7FF] flex items-center justify-center font-bold text-2xl md:text-3xl shrink-0">
                      {selectedDetail.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedDetail.name}</h3>
                      {selectedDetail.title && <p className="text-sm font-medium text-slate-500 mt-1">{selectedDetail.title}</p>}
                    </div>
                  </div>

                  {/* ── Gestion (CRM) ── */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
                    {/* Statut */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        Statut {savingStatus && <Loader2 size={11} className="animate-spin" />}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {STATUS_FORM_OPTIONS.map((o) => {
                          const isActive = selectedDetail.affiliationStatus === o.value;
                          return (
                            <button
                              key={o.value}
                              onClick={() => handleStatusChange(o.value)}
                              disabled={savingStatus || isActive}
                              className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[40px] disabled:cursor-default ${
                                isActive
                                  ? getStatusColor(o.value)
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                            >
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Note privée */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <StickyNote size={12} /> Note privée
                      </label>
                      <textarea
                        className="textarea-pro text-sm"
                        rows={3}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Vos remarques sur ce candidat (visibles par vous seul)…"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleSaveNote}
                          disabled={savingNote || noteDraft === (selectedDetail.note || '')}
                          className="btn btn-secondary min-h-[40px] text-sm disabled:opacity-50"
                        >
                          {savingNote ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                          Enregistrer la note
                        </button>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOutreach}
                        className="min-h-[40px] text-sm flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#B9A7FF] font-semibold hover:bg-[#7D5CFF]/20 transition-colors px-3"
                      >
                        <Sparkles size={14} /> Message d'approche IA
                      </button>
                      {hasRealEmail(selectedDetail.email) && (
                        <a href={`mailto:${selectedDetail.email}`} className="btn btn-secondary min-h-[40px] text-sm flex-1">
                          <Mail size={14} /> Écrire un email
                        </a>
                      )}
                    </div>

                    {/* Positionner sur une offre : dépose la candidature pour le candidat */}
                    <button
                      onClick={openPosition}
                      className="w-full min-h-[40px] text-sm inline-flex items-center justify-center gap-2 rounded-xl border border-[#7D5CFF]/25 text-[#7D5CFF] dark:text-[#B9A7FF] font-semibold hover:bg-[#7D5CFF]/10 transition-colors px-3"
                    >
                      <Briefcase size={14} /> Positionner sur une offre
                    </button>

                    {/* Actions fiche */}
                    <div className="flex items-center gap-2 pt-1">
                      {selectedDetail.managed && (
                        <button onClick={() => openEdit(selectedDetail)} className="btn btn-secondary min-h-[40px] text-sm flex-1">
                          <Edit3 size={14} /> Modifier la fiche
                        </button>
                      )}
                      <button
                        onClick={() => setRemovingId(selectedDetail.id)}
                        className="min-h-[40px] text-sm flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors px-3"
                      >
                        <Trash2 size={14} /> Retirer du vivier
                      </button>
                    </div>
                    {!selectedDetail.managed && (
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Ce candidat possède un compte Joboost : sa fiche n'est pas modifiable ici.
                      </p>
                    )}
                  </div>

                  {/* Contact Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <Mail size={16} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{selectedDetail.email}</span>
                    </div>
                    {selectedDetail.phone && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <Phone size={16} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedDetail.phone}</span>
                      </div>
                    )}
                    {selectedDetail.city && (
                      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <MapPin size={16} className="text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selectedDetail.city}</span>
                      </div>
                    )}
                    {selectedDetail.linkedin && (
                      <a href={selectedDetail.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[#7D5CFF] hover:bg-[#7D5CFF]/10 transition-colors">
                        <ExternalLink size={16} className="shrink-0" />
                        <span className="text-sm font-medium">LinkedIn</span>
                      </a>
                    )}
                  </div>

                  {/* Summary */}
                  {selectedDetail.summary && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Résumé</h4>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedDetail.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedDetail.skills && selectedDetail.skills.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Compétences</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDetail.skills.map((s: string) => (
                          <span key={s} className="px-3 py-1.5 bg-[#F3F0FF] text-[#7D5CFF] border border-[#7D5CFF]/15 dark:bg-[#7D5CFF]/10 dark:text-[#A78BFA] dark:border-[#7D5CFF]/20 rounded-lg text-sm font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Applications */}
                  {selectedDetail.applications && selectedDetail.applications.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <Briefcase size={16} className="text-slate-400" /> Candidatures
                      </h4>
                      <div className="space-y-3">
                        {selectedDetail.applications.map((app) => (
                          <div key={app.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                            <div className="min-w-0 pr-4">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{app.title}</p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{app.company}</p>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                              app.status === 'INTERVIEW' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              app.status === 'OFFER' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              app.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}>{app.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CVs */}
                  {selectedDetail.cvs && selectedDetail.cvs.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 uppercase tracking-wider">
                        <FileText size={16} className="text-slate-400" /> CVs enregistrés
                      </h4>
                      <div className="space-y-2">
                        {selectedDetail.cvs.map((cv) => (
                          <button
                            key={cv.id}
                            onClick={() => openCv(cv.id)}
                            title="Consulter ce CV"
                            className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group/cv"
                          >
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-[#7D5CFF] dark:text-[#A78BFA]" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{cv.title}</span>
                            <span className="text-xs text-slate-400 shrink-0">{new Date(cv.updatedAt).toLocaleDateString('fr-FR')}</span>
                            <Eye size={14} className="text-slate-300 group-hover/cv:text-[#7D5CFF] transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Padding bottom for safe area on mobile */}
                  <div className="h-6 md:hidden"></div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ─── Modale Ajout / Édition de candidat ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:rounded-xl shadow-2xl md:max-w-xl md:mx-4 max-h-[100dvh] md:max-h-[90vh] overflow-y-auto border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl">
            <div className="sticky top-0 bg-white dark:bg-[#111827] flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 z-10">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 md:mt-0">
                {editingId ? 'Modifier le candidat' : 'Ajouter un candidat'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Nom complet *</label>
                  <input className="input-pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Camille Durand" required />
                </div>
                <div>
                  <label className="input-label">Intitulé / métier</label>
                  <input className="input-pro" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Développeuse web" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">E-mail</label>
                  <input className="input-pro" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="(facultatif)" />
                  {!editingId && (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                      Si cet e-mail correspond à un compte Joboost, le candidat est rattaché à votre organisme et voit vos offres dans son espace.
                    </p>
                  )}
                </div>
                <div>
                  <label className="input-label">Téléphone</label>
                  <input className="input-pro" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(facultatif)" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Ville</label>
                  <input className="input-pro" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ex : Lyon" />
                </div>
                <div>
                  <label className="input-label">LinkedIn</label>
                  <input className="input-pro" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="URL du profil (facultatif)" />
                </div>
              </div>

              <div>
                <label className="input-label">Résumé / notes profil</label>
                <textarea className="textarea-pro" rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Parcours, points forts…" />
              </div>

              <div>
                <label className="input-label">Compétences</label>
                <div className="flex gap-2">
                  <input
                    className="input-pro flex-1"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    placeholder="Ajouter une compétence…"
                  />
                  <button type="button" onClick={addSkill} className="btn btn-secondary min-h-[44px] min-w-[44px]">+</button>
                </div>
                {(form.skills || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(form.skills || []).map((skill) => (
                      <span key={skill} className="badge-ai flex items-center gap-1">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors p-0.5"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-2">Les compétences alimentent le matching avec vos offres d'emploi.</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary min-h-[44px] w-full sm:w-auto">Annuler</button>
                <button type="submit" disabled={submitting} className="btn btn-primary min-h-[44px] w-full sm:w-auto">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editingId ? 'Enregistrer' : 'Ajouter au vivier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modale : message d'approche IA ─── */}
      {outreachOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOutreachOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:max-w-lg md:mx-4 max-h-[90dvh] md:max-h-[85vh] flex flex-col border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl shadow-2xl">
            <div className="shrink-0 flex items-start justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <div className="mt-2 md:mt-0 min-w-0 pr-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-[#7D5CFF] shrink-0" /> Message d'approche
                </h2>
                {selectedDetail && <p className="text-xs text-slate-500 mt-0.5 truncate">Pour {selectedDetail.name}</p>}
              </div>
              <button onClick={() => setOutreachOpen(false)} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-5">
              {outreachLoading ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 className="animate-spin text-[#7D5CFF]" size={28} />
                  <p className="text-sm text-slate-500">L'IA rédige un message personnalisé…</p>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{outreachText}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-3 leading-snug">
                    Relisez et personnalisez avant d'envoyer — le message s'appuie uniquement sur les infos de la fiche candidat.
                  </p>
                </>
              )}
            </div>

            {!outreachLoading && outreachText && (
              <div className="shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2.5 p-4 md:p-5 border-t border-slate-200 dark:border-slate-700">
                <button onClick={copyOutreach} className="btn btn-secondary min-h-[44px] w-full sm:w-auto">
                  <Copy size={15} /> Copier le message
                </button>
                {selectedDetail && hasRealEmail(selectedDetail.email) && (
                  <a href={outreachMailto()} className="btn btn-primary min-h-[44px] w-full sm:w-auto">
                    <Send size={15} /> Ouvrir dans ma messagerie
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modale : aperçu d'un CV (lecture seule) ─── */}
      {cvOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCvOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:max-w-2xl md:mx-4 max-h-[95dvh] md:max-h-[88vh] flex flex-col border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl shadow-2xl">
            <div className="shrink-0 flex items-start justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <div className="mt-2 md:mt-0 min-w-0 pr-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#7D5CFF] shrink-0" /> {cvView?.title || 'CV'}
                </h2>
                {cvView && <p className="text-xs text-slate-500 mt-0.5">Mis à jour le {new Date(cvView.updatedAt).toLocaleDateString('fr-FR')} · aperçu simplifié (lecture seule)</p>}
              </div>
              <button onClick={() => setCvOpen(false)} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              {cvLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-[#7D5CFF]" size={28} /></div>
              ) : cvView ? (
                <CvPreview content={cvView.content} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modale : positionner le candidat sur une offre ─── */}
      {positionOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPositionOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:max-w-md md:mx-4 border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl shadow-2xl p-4 md:p-5">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
            <div className="flex items-center justify-between mb-3 mt-2 md:mt-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase size={18} className="text-[#7D5CFF]" /> Positionner sur une offre
              </h2>
              <button onClick={() => setPositionOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              La candidature est créée sur le compte de <span className="font-bold text-slate-700 dark:text-slate-200">{selectedDetail?.name}</span> :
              elle apparaît dans son suivi et dans la section Candidatures de sa fiche.
            </p>
            {offersLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-[#7D5CFF]" size={24} /></div>
            ) : offerOptions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                Aucune offre publiée. Publiez d'abord une offre (icône œil) dans l'onglet Offres d'emploi.
              </p>
            ) : (
              <>
                <label className="input-label">Offre publiée</label>
                <select
                  className="input-pro w-full min-h-[44px]"
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                >
                  <option value="">Choisir une offre…</option>
                  {offerOptions.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-5">
                  <button onClick={() => setPositionOpen(false)} className="btn btn-secondary min-h-[44px] w-full sm:w-auto">Annuler</button>
                  <button
                    onClick={confirmPosition}
                    disabled={!selectedOfferId || positioning}
                    className="btn btn-primary min-h-[44px] w-full sm:w-auto disabled:opacity-50"
                  >
                    {positioning ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    Positionner
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation de retrait */}
      <ConfirmDialog
        open={!!removingId}
        title="Retirer ce candidat ?"
        message="Le candidat sera retiré de votre vivier. S'il a été saisi par vous, sa fiche sera définitivement supprimée."
        confirmLabel="Retirer"
        variant="danger"
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemovingId(null)}
      />
    </div>
  );
};

export default BusinessJobseekers;
