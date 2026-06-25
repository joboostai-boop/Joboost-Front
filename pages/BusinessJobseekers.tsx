import React, { useState, useEffect, useCallback } from 'react';
import { BusinessJobseeker, BusinessJobseekerDetail, Pagination } from '../types';
import { businessJobseekerApi } from '../services/business';
import { useModalBehavior } from '../hooks/useModalBehavior';
import toast from 'react-hot-toast';
import {
  Search, Filter, X, ChevronLeft, ChevronRight, Loader2, Download,
  Mail, Phone, MapPin, Briefcase, ExternalLink, FileText, User, MoreVertical
} from 'lucide-react';

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

  // Échap pour fermer + blocage du scroll de fond sur les overlays.
  useModalBehavior(drawerOpen, () => { setDrawerOpen(false); setSelectedDetail(null); });
  useModalBehavior(showFiltersMobile, () => setShowFiltersMobile(false));
  useModalBehavior(showMobileActions, () => setShowMobileActions(false));

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
    } catch (err: any) {
      toast.error(err.message);
      setDrawerOpen(false);
    } finally {
      setLoadingDetail(false);
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
        <div className="hidden md:flex">
          <button onClick={exportCSV} className="btn btn-secondary min-h-[44px]" disabled={jobseekers.length === 0}>
            <Download size={16} /> Export CSV
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
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                className="input-pro w-auto min-w-[160px] min-h-[44px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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
        <div className="card-pro text-center py-20 px-4">
          <User className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Aucun demandeur d'emploi trouvé.</p>
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
                  <div className="w-10 md:w-12 h-10 md:h-12 rounded-full bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5] flex items-center justify-center text-white font-bold text-sm md:text-base shrink-0">
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
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5] flex items-center justify-center text-white font-bold text-2xl md:text-3xl shrink-0">
                      {selectedDetail.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedDetail.name}</h3>
                      {selectedDetail.title && <p className="text-sm font-medium text-slate-500 mt-1">{selectedDetail.title}</p>}
                    </div>
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
                          <div key={cv.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center shrink-0">
                              <FileText size={14} className="text-[#7D5CFF] dark:text-[#A78BFA]" />
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{cv.title}</span>
                            <span className="text-xs text-slate-400 shrink-0">{new Date(cv.updatedAt).toLocaleDateString('fr-FR')}</span>
                          </div>
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
    </div>
  );
};

export default BusinessJobseekers;
