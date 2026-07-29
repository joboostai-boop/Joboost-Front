import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Calendar, Search, RefreshCw, Inbox, ArrowRight, Navigation, Briefcase, Send, CalendarCheck, Award, ChevronDown, Check, Sparkles, X, Copy, BellRing, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import { generateFollowUpMessage } from '../services/gemini';
import { companyGradient } from '../services/visual';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';

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

/* Métadonnées de statut : libellé + pastille + style de badge (pilule colorée). */
const STATUS: { id: StatusId; label: string; dot: string; badge: string }[] = [
  { id: 'PENDING', label: 'À préparer', dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  { id: 'SENT', label: 'Envoyées', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/50' },
  { id: 'INTERVIEW', label: 'Entretiens', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900/50' },
  { id: 'OFFER', label: 'Offres', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900/50' },
  { id: 'REJECTED', label: 'Refusées', dot: 'bg-red-400', badge: 'bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900/50' },
];
const statusMeta = (id: StatusId) => STATUS.find((s) => s.id === id)!;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

/* Candidature envoyée depuis 7 jours ou plus, sans réponse → il est temps de relancer.
   (Une relance polie double souvent les chances de réponse.) */
const FOLLOW_UP_AFTER_DAYS = 7;
const needsFollowUp = (app: Application) => app.status === 'SENT' && daysSince(app.appliedAt) >= FOLLOW_UP_AFTER_DAYS;

/* Beaucoup de candidatures rangent le lien de l'offre dans les notes
   (ex. « Offre : https://… »). On isole l'URL pour la rendre cliquable
   et on nettoie le texte de note affiché à l'écran. */
const extractUrl = (notes: string | null): string | null => {
  const m = notes?.match(/https?:\/\/[^\s]+/);
  return m ? m[0] : null;
};
const cleanNote = (notes: string | null): string | null => {
  if (!notes) return null;
  const t = notes
    .replace(/Offre\s*:\s*https?:\/\/\S+/gi, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return t.length ? t : null;
};

const API = import.meta.env.VITE_API_URL || '';

/* Modal « Message de relance » : l'IA rédige un email prêt à envoyer (objet + corps),
   éditable puis copiable en un clic. */
const FollowUpModal: React.FC<{ app: Application; onClose: () => void }> = ({ app, onClose }) => {
  const [text, setText] = useState('');
  const [genLoading, setGenLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const msg = await generateFollowUpMessage(app.company, app.title, daysSince(app.appliedAt));
        if (alive) setText(msg);
      } catch (e: any) {
        toast.error(e?.message || 'Erreur lors de la génération du message.');
        if (alive) onClose();
      } finally {
        if (alive) setGenLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copié ! Colle-le dans ton email.');
    } catch {
      toast.error('Copie impossible — sélectionne le texte à la main.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Message de relance" className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl shadow-pop border border-[#ECEAF6] dark:border-[#1F2937] p-5 md:p-6 animate-scale-in">
        <button onClick={onClose} aria-label="Fermer" className="press absolute top-4 right-4 w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
          <X size={17} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8C6DFF] to-[#6D28D9] text-white grid place-items-center shadow-[0_4px_14px_rgba(125,92,255,0.35)]">
            <Send size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#111827] dark:text-white leading-tight">Message de relance</h2>
            <p className="text-xs text-[#9CA3AF] truncate">{app.title} · {app.company} · envoyée il y a {daysSince(app.appliedAt)} j</p>
          </div>
        </div>

        {genLoading ? (
          <div className="space-y-2.5 py-2" aria-busy="true">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-5/6 rounded" />
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <p className="text-xs text-[#9CA3AF] pt-1 flex items-center gap-1.5"><Sparkles size={12} className="text-[#7D5CFF]" /> L'IA rédige ta relance…</p>
          </div>
        ) : (
          <>
            <textarea
              className="textarea-pro !min-h-[240px] !text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Texte du message de relance"
            />
            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-[11px] text-[#9CA3AF]">Relis, ajuste si besoin, puis envoie-le par email au recruteur.</p>
              <button onClick={copy} className="press btn btn-primary shrink-0">
                <Copy size={15} /> Copier le message
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusId | 'ALL'>('ALL');
  const [followUpApp, setFollowUpApp] = useState<Application | null>(null); // relance IA en cours
  const [expandedId, setExpandedId] = useState<string | null>(null); // candidature dépliée
  const [letters, setLetters] = useState<Record<string, string>>({}); // lettre réelle par candidature spontanée (applicationId → texte)
  const navigate = useNavigate();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/applications?limit=100`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
        if (data.data.some((a: Application) => a.isSpontaneous)) fetchLetters();
      } else toast.error('Impossible de charger les candidatures.');
    } catch {
      toast.error('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  /* Récupère les lettres réellement envoyées pour les candidatures spontanées
     (l'endpoint existe déjà — bonus honnête, sans modifier le backend). */
  const fetchLetters = async () => {
    try {
      const res = await fetch(`${API}/api/spontaneous`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, string> = {};
        for (const sp of data.data) if (sp.applicationId && sp.coverLetterText) map[sp.applicationId] = sp.coverLetterText;
        setLetters(map);
      }
    } catch { /* silencieux : la lettre est un plus, pas un bloquant */ }
  };

  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

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
      else toast.success(`Déplacée vers « ${statusMeta(newStatus).label} »`);
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

  // Liste visible : filtre par statut puis tri par date décroissante (plus récent en premier).
  const visible = [...filtered]
    .filter((a) => statusFilter === 'ALL' || a.status === statusFilter)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  /* Sélecteur de statut par ligne — pilule colorée + menu déroulant à la charte. */
  const StatusSelect: React.FC<{ app: Application }> = ({ app }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const meta = statusMeta(app.status);

    // Menu rendu en portail (hors des cartes) → ne peut plus être recouvert/coupé.
    const place = useCallback(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }, []);

    useEffect(() => {
      if (!open) return;
      place();
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node;
        if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
        setOpen(false);
      };
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
      const onScroll = () => setOpen(false);
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      return () => {
        document.removeEventListener('mousedown', onDoc);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      };
    }, [open, place]);

    return (
      <div ref={ref} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label="Changer le statut"
          className={`press inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-semibold border transition-colors ${meta.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
          <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && pos && createPortal(
          <div ref={menuRef} role="listbox" style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-[9999] w-44 rounded-2xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-pop p-1.5 animate-scale-in origin-top-right">
            {STATUS.map((o) => {
              const active = o.id === app.status;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { setOpen(false); moveTo(app.id, o.id); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors ${
                    active ? 'bg-[#7D5CFF]/10 text-[#7D5CFF]' : 'text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${o.dot}`} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {active && <Check size={15} className="shrink-0 text-[#7D5CFF]" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    );
  };

  /* Ligne de candidature (liste) — cliquable pour déplier ses détails. */
  const Row: React.FC<{ app: Application }> = ({ app }) => {
    const followUp = needsFollowUp(app);
    const open = expandedId === app.id;
    const canFollowUp = app.status === 'SENT' || app.status === 'INTERVIEW';
    const offerUrl = extractUrl(app.notes);
    const note = cleanNote(app.notes);
    const letter = letters[app.id];

    return (
    <div className={`surface overflow-hidden transition-all duration-200 ${open ? 'shadow-card-hover' : 'hover:shadow-card-hover hover:-translate-y-0.5'} ${followUp ? 'ring-1 ring-amber-300/60 dark:ring-amber-500/30' : ''}`}>
      {/* En-tête cliquable */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => toggleExpand(app.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(app.id); } }}
        className="flex items-start gap-3 md:gap-3.5 p-3.5 md:p-4 cursor-pointer select-none"
      >
        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${companyGradient(app.company)} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-[0_2px_8px_rgba(16,24,40,0.16)]`}>
          {app.company?.charAt(0)?.toUpperCase() || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-semibold text-sm md:text-[15px] text-[#111827] dark:text-white leading-tight truncate">{app.title}</p>
                {app.isSpontaneous && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F3F0FF] text-[#7D5CFF] border border-[#7D5CFF]/30" title="Candidature spontanée">
                    <Navigation size={9} /> Spontanée
                  </span>
                )}
                {followUp && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25" title={`Sans réponse depuis ${daysSince(app.appliedAt)} jours — pense à relancer`}>
                    <BellRing size={9} /> À relancer
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                <Building2 size={13} className="shrink-0" /> <span className="truncate">{app.company}</span>
              </p>
            </div>
            {/* Le sélecteur de statut ne doit pas déclencher le dépliage */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <StatusSelect app={app} />
            </div>
          </div>

          <div className="flex items-center gap-2.5 mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1 shrink-0">
              <Calendar size={12} /> {formatDate(app.appliedAt)}
            </span>
            {note && (
              <>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="truncate italic">{note}</span>
              </>
            )}
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 font-semibold text-[#7D5CFF]/85">
              {open ? 'Masquer' : 'Détails'}
              <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </div>
      </div>

      {/* Panneau de détails */}
      {open && (
        <div className="px-3.5 md:px-4 pb-4 pt-0.5 animate-fade-in">
          <div className="rounded-xl border border-[#ECEAF6] dark:border-[#1F2937] bg-[#FAFAFE] dark:bg-[#0E1524] p-3.5 md:p-4 space-y-3.5 md:ml-[52px]">
            {/* Informations connues */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium mb-0.5">Source</dt>
                <dd className="text-[#111827] dark:text-slate-200 font-semibold truncate">{app.source || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium mb-0.5">Date de candidature</dt>
                <dd className="text-[#111827] dark:text-slate-200 font-semibold">{formatDate(app.appliedAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium mb-0.5">Type</dt>
                <dd className="text-[#111827] dark:text-slate-200 font-semibold">{app.isSpontaneous ? 'Candidature spontanée' : 'Candidature sur offre'}</dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500 font-medium mb-0.5">Statut</dt>
                <dd className="inline-flex items-center gap-1.5 text-[#111827] dark:text-slate-200 font-semibold">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta(app.status).dot}`} /> {statusMeta(app.status).label}
                </dd>
              </div>
            </dl>

            {/* Note libre éventuelle */}
            {note && (
              <div className="text-xs">
                <p className="text-slate-400 dark:text-slate-500 font-medium mb-0.5">Note</p>
                <p className="text-slate-600 dark:text-slate-300 italic">{note}</p>
              </div>
            )}

            {/* Lettre de motivation réellement envoyée (candidatures spontanées) */}
            {letter && (
              <div className="text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-slate-400 dark:text-slate-500 font-medium inline-flex items-center gap-1.5"><FileText size={12} /> Lettre envoyée</p>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(letter); toast.success('Lettre copiée !'); } catch { toast.error('Copie impossible.'); } }}
                    className="press inline-flex items-center gap-1 text-[11px] font-bold text-[#7D5CFF] hover:opacity-80"
                  >
                    <Copy size={12} /> Copier
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] p-2.5 text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {letter}
                </div>
              </div>
            )}

            {/* Actions : ouvrir l'offre + générer une relance */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {offerUrl && (
                <a href={offerUrl} target="_blank" rel="noopener noreferrer" className="press btn btn-secondary !py-1.5 !px-3 text-xs">
                  <ExternalLink size={14} /> Voir l'offre
                </a>
              )}
              {canFollowUp && (
                <button
                  onClick={() => setFollowUpApp(app)}
                  className="press btn btn-primary !py-1.5 !px-3 text-xs"
                  title="L'IA rédige un message de relance prêt à envoyer"
                >
                  <Sparkles size={14} /> Générer une relance
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  const RowSkeleton: React.FC = () => (
    <div className="surface p-3.5 md:p-4 flex items-center gap-3.5">
      <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-1/2 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full shrink-0" />
    </div>
  );

  /* Pilule de filtre par statut (incl. « Toutes »). */
  const FilterPill: React.FC<{ id: StatusId | 'ALL'; label: string; count: number; dot?: string }> = ({ id, label, count, dot }) => {
    const active = statusFilter === id;
    return (
      <button
        type="button"
        onClick={() => setStatusFilter(id)}
        className={`press shrink-0 inline-flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
          active
            ? 'bg-[#7D5CFF] text-white border-[#7D5CFF] shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
            : 'bg-white dark:bg-[#111827] border-[#E2E0EF] dark:border-[#374151] text-slate-600 dark:text-slate-300 hover:border-[#7D5CFF]/45 hover:text-[#7D5CFF]'
        }`}
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/80' : dot}`} />}
        {label}
        <span className={`text-xs tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
      </button>
    );
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-6">
      {/* Barre d'outils (le titre est porté par la nav de section) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-slate-400">
          <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] font-bold tabular-nums">{loading ? '–' : total}</span>
          candidature{total > 1 ? 's' : ''} suivie{total > 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex-1 md:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input type="text" placeholder="Filtrer entreprise, poste…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-pro pl-9 w-full" />
          </div>
          <button onClick={fetchApplications} className="press btn btn-secondary px-3 shrink-0" title="Actualiser">
            <RefreshCw size={18} className={loading ? 'animate-spin text-[#7D5CFF]' : ''} />
          </button>
        </div>
      </header>

      {/* Synthèse — funnel des candidatures (cohérent avec l'Accueil / Dashboard) */}
      {(loading || total > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Candidatures" value={loading ? '–' : total} icon={<Briefcase size={20} strokeWidth={2.4} />} tone="violet" />
          <StatCard label="Envoyées" value={loading ? '–' : applications.filter((a) => a.status === 'SENT').length} icon={<Send size={20} strokeWidth={2.4} />} tone="blue" />
          <StatCard label="Entretiens" value={loading ? '–' : applications.filter((a) => a.status === 'INTERVIEW').length} icon={<CalendarCheck size={20} strokeWidth={2.4} />} tone="amber" />
          <StatCard label="Offres" value={loading ? '–' : applications.filter((a) => a.status === 'OFFER').length} icon={<Award size={20} strokeWidth={2.4} />} tone="emerald" />
        </div>
      )}

      {/* Liste des candidatures (filtre par statut + tri date décroissante) */}
      {(loading || total > 0) && (
        <div className="space-y-4">
          {/* Filtres par statut */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">
            <FilterPill id="ALL" label="Toutes" count={filtered.length} />
            {STATUS.map((s) => (
              <FilterPill key={s.id} id={s.id} label={s.label} count={byStatus(s.id).length} dot={s.dot} />
            ))}
          </div>

          {/* Liste */}
          <div className="space-y-2.5">
            {loading ? (
              <><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
            ) : visible.length > 0 ? (
              visible.map((app) => <Row key={app.id} app={app} />)
            ) : (
              <div className="surface flex flex-col items-center justify-center text-center gap-2 py-12">
                <Inbox size={26} className="text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {statusFilter === 'ALL'
                    ? 'Aucune candidature ne correspond à votre recherche.'
                    : `Aucune candidature dans « ${statusMeta(statusFilter).label} ».`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* État vide illustré quand aucune candidature */}
      {!loading && total === 0 && (
        <EmptyState
          variant="applications"
          title="Aucune candidature pour l'instant"
          description="Dès que tu postules, tes candidatures apparaissent ici et tu suis leur avancement — de l'envoi à l'offre."
          action={
            <button onClick={() => navigate('/target/offers')} className="press btn btn-primary">
              Trouver des offres <ArrowRight size={16} />
            </button>
          }
        />
      )}

      {followUpApp && <FollowUpModal app={followUpApp} onClose={() => setFollowUpApp(null)} />}
    </div>
  );
};

export default Applications;
