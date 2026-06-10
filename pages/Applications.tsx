import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Calendar, Search, RefreshCw, Inbox, ArrowRight, GripVertical, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';

interface Application {
  id: string;
  company: string;
  title: string;
  source: string;
  status: 'PENDING' | 'SENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  appliedAt: string;
  notes: string | null;
  isSpontaneous?: boolean;
}

type StatusId = Application['status'];

const COLUMNS: { id: StatusId; label: string; dot: string; ring: string; soft: string; text: string }[] = [
  { id: 'PENDING', label: 'À préparer', dot: 'bg-slate-400', ring: 'ring-slate-200 dark:ring-slate-700', soft: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-300' },
  { id: 'SENT', label: 'Envoyées', dot: 'bg-blue-500', ring: 'ring-blue-200 dark:ring-blue-900/50', soft: 'bg-blue-50/60 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-400' },
  { id: 'INTERVIEW', label: 'Entretiens', dot: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-900/50', soft: 'bg-amber-50/60 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'OFFER', label: 'Offres', dot: 'bg-emerald-500', ring: 'ring-emerald-200 dark:ring-emerald-900/50', soft: 'bg-emerald-50/60 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'REJECTED', label: 'Refusées', dot: 'bg-red-400', ring: 'ring-red-200 dark:ring-red-900/50', soft: 'bg-red-50/60 dark:bg-red-900/10', text: 'text-red-500 dark:text-red-400' },
];

const API = import.meta.env.VITE_API_URL || '';

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mobileTab, setMobileTab] = useState<StatusId>('SENT');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<StatusId | null>(null);
  const navigate = useNavigate();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/applications?limit=100`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success) setApplications(data.data);
      else toast.error('Impossible de charger les candidatures.');
    } catch {
      toast.error('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  const moveTo = async (id: string, newStatus: StatusId) => {
    const current = applications.find((a) => a.id === id);
    if (!current || current.status === newStatus) return;
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    try {
      const res = await fetch(`${API}/api/applications/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) { toast.error('Échec de la mise à jour.'); fetchApplications(); }
    } catch {
      toast.error('Hors ligne.'); fetchApplications();
    }
  };

  const filtered = applications.filter((a) =>
    a.company.toLowerCase().includes(search.toLowerCase()) ||
    a.title.toLowerCase().includes(search.toLowerCase())
  );
  const byStatus = (s: StatusId) => filtered.filter((a) => a.status === s);
  const total = applications.length;

  const Card: React.FC<{ app: Application; col: typeof COLUMNS[number] }> = ({ app, col }) => (
    <div
      draggable
      onDragStart={() => setDragId(app.id)}
      onDragEnd={() => { setDragId(null); setDragOver(null); }}
      className={`group bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${dragId === app.id ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={15} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0 hidden lg:block" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-sm text-[#111827] dark:text-white leading-tight truncate">{app.title}</p>
            {app.isSpontaneous && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F3F0FF] text-[#7D5CFF] border border-[#7D5CFF]/30" title="Candidature spontanée">
                <Navigation size={9} /> Spontanée
              </span>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1">
            <Building2 size={13} className="shrink-0" /> <span className="truncate">{app.company}</span>
          </p>
        </div>
      </div>

      {app.notes && (
        <p className="mt-2.5 text-xs text-[#6B7280] dark:text-slate-400 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">{app.notes}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 uppercase tracking-wide">
          <Calendar size={11} /> {new Date(app.appliedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        </span>
        <select
          value={app.status}
          onChange={(e) => moveTo(app.id, e.target.value as StatusId)}
          className={`text-[11px] font-semibold bg-transparent border-0 outline-none cursor-pointer ${col.text} text-right`}
          aria-label="Déplacer la candidature"
        >
          {COLUMNS.map((o) => (
            <option key={o.id} value={o.id} className="text-[#111827] dark:text-gray-200 bg-white dark:bg-[#111827]">{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  const EmptyCol: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center gap-1.5 py-8 text-slate-300 dark:text-slate-600">
      <Inbox size={22} />
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Aucune candidature ici</span>
    </div>
  );

  return (
    <div className="p-5 md:p-8 max-w-[1500px] mx-auto space-y-6">
      {/* En-tête */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10 flex items-center justify-center shrink-0">
            <Briefcase size={22} />
          </span>
          <div>
            <h1>Mes candidatures</h1>
            <p className="text-sm text-[#6B7280]">{total} candidature{total > 1 ? 's' : ''} · suis l'avancement de chacune.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input type="text" placeholder="Filtrer entreprise, poste…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-pro pl-9 w-full" />
          </div>
          <button onClick={fetchApplications} className="btn btn-secondary px-3 shrink-0" title="Actualiser">
            <RefreshCw size={18} className={loading ? 'animate-spin text-[#7D5CFF]' : ''} />
          </button>
        </div>
      </header>

      {/* Aperçu Kanban (toujours visible) */}
      <>
          {/* ───── PC : board 5 colonnes (drag & drop) ───── */}
          <div className="hidden lg:grid grid-cols-5 gap-4 items-start">
            {COLUMNS.map((col) => {
              const apps = byStatus(col.id);
              return (
                <div
                  key={col.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                  onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
                  onDrop={() => { if (dragId) moveTo(dragId, col.id); setDragId(null); setDragOver(null); }}
                  className={`rounded-2xl p-2.5 transition-colors ${col.soft} ${dragOver === col.id ? `ring-2 ${col.ring}` : 'ring-1 ring-transparent'}`}
                >
                  <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <h3 className={`text-sm font-bold ${col.text}`}>{col.label}</h3>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{apps.length}</span>
                  </div>
                  <div className="space-y-2.5 min-h-[120px]">
                    {apps.map((app) => <Card key={app.id} app={app} col={col} />)}
                    {apps.length === 0 && <EmptyCol />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ───── Mobile / tablette : onglets de statut ───── */}
          <div className="lg:hidden space-y-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
              {COLUMNS.map((col) => {
                const count = byStatus(col.id).length;
                const active = mobileTab === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setMobileTab(col.id)}
                    className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold border transition-colors ${
                      active ? 'bg-[#7D5CFF] text-white border-[#7D5CFF]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? 'bg-white/80' : col.dot}`} />
                    {col.label}
                    <span className={`text-xs ${active ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2.5">
              {byStatus(mobileTab).map((app) => {
                const col = COLUMNS.find((c) => c.id === mobileTab)!;
                return <Card key={app.id} app={app} col={col} />;
              })}
              {byStatus(mobileTab).length === 0 && !loading && (
                <div className="card-pro"><EmptyCol /></div>
              )}
            </div>
          </div>
      </>

      {/* CTA sous le board quand aucune candidature */}
      {!loading && total === 0 && (
        <div className="card-pro flex flex-col items-center text-center gap-4 py-10">
          <span className="w-14 h-14 rounded-2xl bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10 flex items-center justify-center"><Inbox size={26} /></span>
          <div>
            <h3 className="text-base font-bold text-[#111827] dark:text-white">Aucune candidature pour l'instant</h3>
            <p className="text-sm text-[#6B7280] mt-1">Dès que tu postules, tes candidatures apparaissent dans le tableau ci-dessus.</p>
          </div>
          <button onClick={() => navigate('/target/offers')} className="btn btn-primary">
            Trouver des offres <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Applications;
