import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, Inbox, ArrowRight, Navigation, ChevronDown, Check, X, Copy, BellRing, ExternalLink, FileText, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import { generateFollowUpMessage } from '../services/gemini';
import EmptyState from '../components/EmptyState';
import CountUp from '../components/CountUp';

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
      toast.success('Message copié. Colle-le dans ton e-mail.');
    } catch {
      toast.error('Copie impossible. Sélectionne le texte à la main.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Message de relance" className="relative w-full max-w-lg bg-surface rounded-2xl shadow-pop border border-line p-6 animate-scale-in">
        <button onClick={onClose} aria-label="Fermer" className="absolute top-4 right-4 w-8 h-8 rounded-lg grid place-items-center text-faint hover:bg-subtle hover:text-ink transition-colors">
          <X size={17} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="min-w-0 pr-8">
            <h2 className="text-lg leading-tight">Message de relance</h2>
            <p className="text-xs text-faint truncate">{app.title} · {app.company} · envoyée il y a {daysSince(app.appliedAt)} j</p>
          </div>
        </div>

        {genLoading ? (
          <div className="space-y-2.5 py-2" aria-busy="true">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-full rounded" />
            <div className="skeleton h-3.5 w-5/6 rounded" />
            <div className="skeleton h-3.5 w-1/2 rounded" />
            <p className="text-xs text-faint pt-1">Rédaction en cours…</p>
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
              <p className="text-xs text-faint">Relis-le, ajuste si besoin, puis envoie-le au recruteur.</p>
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

const Suivi: React.FC = () => {
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
      // Limite large : les 4 chiffres clés en haut de page doivent refléter la totalité,
      // pas seulement la première page affichée dans la liste.
      const res = await fetch(`${API}/api/applications?limit=1000`, { credentials: 'include', headers: { ...authHeaders() } });
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

  // Chiffres clés — dérivés directement de la même liste que celle affichée en dessous
  // (une seule source de vérité, plus de deuxième appel /api/dashboard/stats).
  const sentCount = applications.filter((a) => a.status === 'SENT').length;
  const interviewCount = applications.filter((a) => a.status === 'INTERVIEW').length;
  const offerCount = applications.filter((a) => a.status === 'OFFER').length;
  const rejectedCount = applications.filter((a) => a.status === 'REJECTED').length;
  const activeSent = sentCount + interviewCount + offerCount + rejectedCount;
  const interviewRate = activeSent ? Math.round(((interviewCount + offerCount) / activeSent) * 100) : 0;

  const kpis: { label: string; value: number; suffix?: string; accent?: 'violet' | 'emerald' }[] = [
    { label: 'Candidatures totales', value: total },
    { label: "Taux d'entretien", value: interviewRate, suffix: '%', accent: 'violet' },
    { label: 'Entretiens décrochés', value: interviewCount },
    { label: 'Offres reçues', value: offerCount, accent: 'emerald' },
  ];

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
          <div ref={menuRef} role="listbox" style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-[9999] w-44 rounded-2xl bg-surface border border-line shadow-pop p-1.5 animate-scale-in origin-top-right">
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
                    active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-subtle hover:text-brand'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${o.dot}`} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {active && <Check size={15} className="shrink-0 text-brand" />}
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
    <div className={`transition-colors ${open ? 'bg-subtle/40' : 'hover:bg-subtle/40'}`}>
      {/* En-tête cliquable */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => toggleExpand(app.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(app.id); } }}
        className="flex items-start gap-3.5 px-4 md:px-5 py-4 cursor-pointer select-none outline-none focus-visible:bg-subtle/60"
      >
        <span className="w-10 h-10 rounded-lg bg-subtle text-muted flex items-center justify-center font-semibold text-sm shrink-0">
          {app.company?.charAt(0)?.toUpperCase() || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-[15px] text-ink leading-tight truncate">{app.title}</p>
                {app.isSpontaneous && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded text-[11px] font-medium bg-subtle text-muted" title="Candidature spontanée">
                    <Navigation size={9} /> Spontanée
                  </span>
                )}
                {followUp && (
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 h-5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" title={`Sans réponse depuis ${daysSince(app.appliedAt)} jours — pense à relancer`}>
                    <BellRing size={9} /> À relancer
                  </span>
                )}
              </div>
              <p className="text-[13px] text-muted mt-0.5 truncate">{app.company}</p>
            </div>
            {/* Le sélecteur de statut ne doit pas déclencher le dépliage */}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <StatusSelect app={app} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 text-xs text-faint">
            <span className="shrink-0">{formatDate(app.appliedAt)}</span>
            {note && (
              <>
                <span>·</span>
                <span className="truncate">{note}</span>
              </>
            )}
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-muted">
              {open ? 'Masquer' : 'Détails'}
              <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </span>
          </div>
        </div>
      </div>

      {/* Panneau de détails */}
      {open && (
        <div className="px-4 md:px-5 pb-5 animate-fade-in">
          <div className="rounded-xl border border-line bg-surface p-4 space-y-4 md:ml-[54px]">
            {/* Informations connues */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div>
                <dt className="text-faint mb-0.5">Source</dt>
                <dd className="text-ink font-medium truncate">{app.source || '—'}</dd>
              </div>
              <div>
                <dt className="text-faint mb-0.5">Date de candidature</dt>
                <dd className="text-ink font-medium">{formatDate(app.appliedAt)}</dd>
              </div>
              <div>
                <dt className="text-faint mb-0.5">Type</dt>
                <dd className="text-ink font-medium">{app.isSpontaneous ? 'Candidature spontanée' : 'Candidature sur offre'}</dd>
              </div>
              <div>
                <dt className="text-faint mb-0.5">Statut</dt>
                <dd className="inline-flex items-center gap-1.5 text-ink font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta(app.status).dot}`} /> {statusMeta(app.status).label}
                </dd>
              </div>
            </dl>

            {/* Note libre éventuelle */}
            {note && (
              <div className="text-xs">
                <p className="text-faint font-medium mb-0.5">Note</p>
                <p className="text-muted">{note}</p>
              </div>
            )}

            {/* Lettre de motivation réellement envoyée (candidatures spontanées) */}
            {letter && (
              <div className="text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-faint font-medium inline-flex items-center gap-1.5"><FileText size={12} /> Lettre envoyée</p>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(letter); toast.success('Lettre copiée'); } catch { toast.error('Copie impossible.'); } }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
                  >
                    <Copy size={12} /> Copier
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg bg-subtle/60 p-3 text-muted whitespace-pre-wrap leading-relaxed">
                  {letter}
                </div>
              </div>
            )}

            {/* Actions : ouvrir l'offre + générer une relance */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {offerUrl && (
                <a href={offerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !min-h-[34px] !px-3 text-[13px]">
                  <ExternalLink size={14} /> Voir l'offre
                </a>
              )}
              {canFollowUp && (
                <button
                  onClick={() => setFollowUpApp(app)}
                  className="btn btn-primary !min-h-[34px] !px-3 text-[13px]"
                  title="Un message de relance prêt à envoyer, que tu pourras modifier"
                >
                  <Mail size={14} /> Rédiger une relance
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
    <div className="px-5 py-4 flex items-center gap-3.5">
      <div className="skeleton w-10 h-10 rounded-lg shrink-0" />
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
        className={`shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-full text-[13px] font-medium transition-colors ${
          active
            ? 'bg-ink text-canvas'
            : 'text-muted hover:text-ink hover:bg-subtle'
        }`}
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        {label}
        <span className={`text-xs tabular-nums ${active ? 'opacity-70' : 'text-faint'}`}>{count}</span>
      </button>
    );
  };

  return (
    <div className="px-5 md:px-8 pt-4 md:pt-6 pb-10 max-w-6xl mx-auto space-y-5">
      <h1 className="text-[22px] leading-tight">Suivi</h1>

      {(loading || total > 0) && (
        <>
          {/* Chiffres clés — une seule couleur d'accent (violet), l'émeraude réservée aux offres reçues */}
          <section className="surface">
            <dl className="grid grid-cols-2 sm:grid-cols-4">
              {kpis.map((k, i) => (
                <div
                  key={k.label}
                  className={`px-5 py-4 border-line ${i % 2 === 1 ? 'border-l' : ''} ${i === 2 ? 'sm:border-l' : ''} ${i > 1 ? 'border-t sm:border-t-0' : ''}`}
                >
                  <dt className="text-[13px] text-muted">{k.label}</dt>
                  <dd className={`mt-1 text-[28px] font-semibold tracking-tight tabular-nums ${
                    k.accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                      : k.accent === 'violet' ? 'text-brand'
                      : 'text-ink'
                  }`}>
                    {loading ? '–' : <><CountUp value={k.value} />{k.suffix}</>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Barre d'outils : filtres par statut + recherche */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
              <FilterPill id="ALL" label="Toutes" count={filtered.length} />
              {STATUS.map((s) => (
                <FilterPill key={s.id} id={s.id} label={s.label} count={byStatus(s.id).length} dot={s.dot} />
              ))}
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="flex-1 lg:w-64 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={16} />
                <input type="search" placeholder="Entreprise ou poste…" value={search} onChange={(e) => setSearch(e.target.value)} className="input-pro pl-9 w-full" aria-label="Filtrer les candidatures" />
              </div>
              <button onClick={fetchApplications} className="btn btn-secondary !px-3 shrink-0" title="Actualiser" aria-label="Actualiser">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Liste (tri par date décroissante) */}
          <div className="surface divide-y divide-line overflow-hidden">
            {loading ? (
              <><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
            ) : visible.length > 0 ? (
              visible.map((app) => <Row key={app.id} app={app} />)
            ) : (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-14">
                <Inbox size={24} className="text-faint" />
                <p className="text-sm text-muted">
                  {statusFilter === 'ALL'
                    ? 'Aucune candidature ne correspond à ta recherche.'
                    : `Aucune candidature dans « ${statusMeta(statusFilter).label} ».`}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* État vide illustré quand aucune candidature */}
      {!loading && total === 0 && (
        <EmptyState
          variant="applications"
          title="Aucune candidature pour l’instant"
          description="Chaque offre à laquelle tu postules arrive ici. Tu pourras suivre son avancement, de l’envoi jusqu’à la réponse."
          action={
            <button onClick={() => navigate('/target/offers')} className="btn btn-primary">
              Voir les offres <ArrowRight size={16} />
            </button>
          }
        />
      )}

      {followUpApp && <FollowUpModal app={followUpApp} onClose={() => setFollowUpApp(null)} />}
    </div>
  );
};

export default Suivi;
