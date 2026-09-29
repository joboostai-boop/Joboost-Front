import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Navigation, Send, Check, X,
  FileText, Building2, RotateCcw, MapPin, Undo2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import EmptyState from '../components/EmptyState';
import ExpandableText from '../components/ExpandableText';
import FilterSelect from '../components/FilterSelect';
import ApplyInAppModal from '../components/ApplyInAppModal';
import { formatSalary } from '../services/format';

export interface JobOffer {
  id?: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  matchScore: number;
  postedDate: string;
  source?: string;
  url?: string;
  tags: string[];
  aiInsight: string;
  contactEmail?: string; // email employeur (offres France Travail qui le fournissent)
  // Offre publiée par un organisme partenaire auquel le candidat est affilié
  // (espace recruteur) : nom + logo de l'organisme, affichés sur la carte.
  partner?: { name: string; logoUrl?: string | null };
}

/* ════════════════════════════════════════════════════════════════════
   Offres pour moi — pile de cartes à glisser (refonte 09/2026).

   Corrigé par rapport à la première version :
   - le doigt n'est « capturé » qu'après un vrai déplacement horizontal : les
     boutons de la carte (CV, lettre, voir plus, sauvegarder) répondent au
     premier appui, et un défilement vertical ne déclenche plus de glissement ;
   - un geste interrompu par le navigateur (pointercancel) ne laisse plus la
     carte bloquée à mi-course ;
   - la carte suivante « monte » depuis la pile au lieu d'arriver par le côté :
     chaque carte garde son élément DOM (clé = position dans la liste) et la
     carte qui part est animée à part.
   ════════════════════════════════════════════════════════════════════ */

// Distance horizontale (px) au-delà de laquelle le geste vaut décision.
const SWIPE_THRESHOLD = 100;
// Déplacement minimal avant de considérer qu'un glissement commence.
const DRAG_START = 8;

// Teinte stable par entreprise (même société = même couleur sur toutes les cartes).
const hueOf = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
};

/* Jauge circulaire de compatibilité. */
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = score >= 75 ? '#10B981' : score >= 50 ? '#6E50F5' : '#8C8C9A';
  return (
    <div className="relative w-[58px] h-[58px] shrink-0" title={`Compatibilité avec ton profil : ${score} %`}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="rgb(var(--c-surface))" stroke="rgb(var(--c-line))" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={tone} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold tabular-nums text-ink">{score}%</span>
    </div>
  );
};

/* Skeleton pendant le chargement — même silhouette que la carte. */
const OfferSkeleton: React.FC = () => (
  <div className="surface overflow-hidden">
    <div className="skeleton !rounded-none h-24" />
    <div className="p-5 space-y-4 -mt-8">
      <div className="skeleton w-16 h-16 !rounded-2xl" />
      <div className="skeleton h-6 w-2/3 rounded" />
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="flex gap-2">
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-20 rounded-full" />
      </div>
      <div className="skeleton h-24 w-full rounded-xl" />
    </div>
  </div>
);

interface CardProps {
  offer: JobOffer;
  isBest: boolean;
  isApplied: boolean;
  isBookmarked: boolean;
  onCv: () => void;
  onLetter: () => void;
  onSave: () => void;
}

/* Carte d'offre : bandeau teinté à la couleur de l'entreprise, logo, jauge de
   compatibilité, infos clés en pastilles, explication et mots-clés. */
const OfferCard: React.FC<CardProps> = ({ offer, isBest, isApplied, isBookmarked, onCv, onLetter, onSave }) => {
  const hue = hueOf(offer.company || offer.title);
  const score = Math.round(Number(offer.matchScore) || 0);
  const facts = [
    offer.type && { icon: <Briefcase size={13} />, text: offer.type },
    offer.salary && { icon: <Euro size={13} />, text: formatSalary(offer.salary) },
    offer.location && { icon: <MapPin size={13} />, text: offer.location },
    offer.postedDate && { icon: <Clock size={13} />, text: offer.postedDate },
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <>
      {/* Bandeau */}
      <div
        className="relative h-24"
        style={{ background: `linear-gradient(135deg, hsla(${hue}, 85%, 62%, .22), hsla(${(hue + 50) % 360}, 85%, 62%, .08))` }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: `radial-gradient(hsla(${hue}, 60%, 45%, .35) 1px, transparent 1px)`, backgroundSize: '14px 14px', maskImage: 'linear-gradient(to left, #000, transparent 70%)', WebkitMaskImage: 'linear-gradient(to left, #000, transparent 70%)' }}
        />
        <div className="absolute top-3 left-4 flex flex-wrap gap-1.5">
          {isBest && (
            <span className="inline-flex items-center h-6 px-2 rounded-md bg-surface/90 text-ink text-[11px] font-medium shadow-xs">
              La plus proche de ton profil
            </span>
          )}
          {offer.partner && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-surface/90 text-ink text-[11px] font-medium shadow-xs">
              <Building2 size={11} /> {offer.partner.name}
            </span>
          )}
        </div>
        {score > 0 && <div className="absolute right-4 -bottom-7"><ScoreRing score={score} /></div>}
      </div>

      <div className="px-5 pb-5">
        {/* Logo */}
        <div className="-mt-8 mb-3">
          {offer.partner?.logoUrl ? (
            <span className="w-16 h-16 rounded-2xl bg-white border border-line shadow-card grid place-items-center overflow-hidden">
              <img src={offer.partner.logoUrl} alt="" className="w-full h-full object-contain p-1.5" draggable={false} />
            </span>
          ) : (
            <span
              className="w-16 h-16 rounded-2xl bg-surface border border-line shadow-card grid place-items-center text-2xl font-semibold"
              style={{ color: `hsl(${hue}, 55%, 45%)` }}
            >
              {offer.company?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
        </div>

        <h2 className="text-[21px] leading-snug pr-2">{offer.title}</h2>
        <p className="text-[15px] text-muted mt-0.5">{offer.company}</p>

        {facts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {facts.map((f) => (
              <span key={f.text} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-subtle text-[12.5px] text-ink">
                <span className="text-faint">{f.icon}</span>{f.text}
              </span>
            ))}
          </div>
        )}

        {offer.aiInsight && (
          <div className="mt-4 rounded-xl border border-line bg-canvas/60 px-4 py-3">
            <p className="text-xs font-medium text-ink mb-1 inline-flex items-center gap-1.5">
              <Check size={13} className="text-emerald-500" strokeWidth={3} /> Pourquoi cette offre
            </p>
            <ExpandableText className="text-[13.5px] text-muted leading-relaxed" text={offer.aiInsight} clamp={3} />
          </div>
        )}

        {offer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {offer.tags.slice(0, 6).map((t) => (
              <span key={t} className="chip !h-6 !text-[11.5px]">{t}</span>
            ))}
          </div>
        )}

        {/* Préparer les documents pour CETTE offre. */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-line -mx-1.5">
          {isApplied ? (
            <span className="inline-flex items-center gap-1.5 h-9 px-2 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
              <Check size={15} /> Dans ton suivi
            </span>
          ) : null}
          <button type="button" onClick={onCv} className="btn btn-ghost !min-h-[36px] !px-2 text-[13px]">
            <FileText size={15} /> CV adapté
          </button>
          <button type="button" onClick={onLetter} className="btn btn-ghost !min-h-[36px] !px-2 text-[13px]">
            <Edit3 size={15} /> Lettre
          </button>
          {offer.url && (
            <a href={offer.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[36px] !px-2 text-[13px]" title="Voir l'annonce sans l'ajouter au suivi">
              <ExternalLink size={15} /> <span className="hidden sm:inline">Annonce</span>
            </a>
          )}
          <button
            type="button"
            onClick={onSave}
            aria-label={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder'}
            title={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder (S)'}
            className={`btn btn-ghost !min-h-[36px] !px-2 ml-auto ${isBookmarked ? '!text-brand dark:!text-brand-300' : ''}`}
          >
            <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </>
  );
};

const PersonalizedOffers: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [savedOffers, setSavedOffers] = useState<any[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(''); // déclenche la recherche serveur
  const [contractType, setContractType] = useState(''); // '' = tous ; sinon CDI/CDD/MIS/SAI
  const [radius, setRadius] = useState(30); // rayon de recherche en km
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set()); // offres ajoutées au suivi (cette session)
  const [rejectedKeys, setRejectedKeys] = useState<Set<string>>(new Set()); // offres passées (cette session)
  const [applyOffer, setApplyOffer] = useState<JobOffer | null>(null); // candidature in-app en cours

  // ── Pile de cartes ──
  const [cursor, setCursor] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Carte en train de partir (animée à part, pendant que la pile avance déjà).
  const [leaving, setLeaving] = useState<{ offer: JobOffer; index: number; dir: 'left' | 'right'; fromX: number } | null>(null);
  // Historique des décisions de la session, pour « Revenir » sur une offre passée.
  const [history, setHistory] = useState<{ index: number; dir: 'left' | 'right' }[]>([]);

  const gesture = useRef({ tracking: false, dragging: false, startX: 0, startY: 0, dx: 0 });

  const offerKey = (o: JobOffer) => `${o.title}__${o.company}`;

  // Anti-rebond : on attend ~500 ms après la dernière frappe avant de relancer la recherche.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ distance: String(radius) });
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (contractType) params.set('contractType', contractType);
        const [recRes, savedRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/recommendations?${params.toString()}`, { credentials: 'include', headers: { ...authHeaders() } }),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved`, { credentials: 'include', headers: { ...authHeaders() } })
        ]);

        const recData = await recRes.json();
        const savedData = await savedRes.json();

        if (recData.success) {
          setOffers(recData.recommendations);
          setSource(recData.source || 'demo');
        }
        if (savedData.success) {
          setSavedOffers(savedData.saved);
        }
      } catch (e) {
        toast.error('Impossible de charger les offres.');
      } finally {
        setLoading(false);
        // Une nouvelle recherche repart d'une pile fraîche.
        setCursor(0);
        setDragX(0);
        setLeaving(null);
        setHistory([]);
      }
    };
    fetchData();
  }, [radius, debouncedQuery, contractType]);

  const getSavedId = (offer: JobOffer) => {
    const found = savedOffers.find(s => s.title === offer.title && s.company === offer.company);
    return found ? found.id : null;
  };

  // « Postuler » : on ouvre l'offre pour finaliser la candidature (l'envoi se fait sur
  // le site de l'offre — France Travail/Adzuna ne permettent pas de soumettre via API),
  // ET on ajoute automatiquement la candidature au Suivi (colonne « Envoyées »).
  const handlePostuler = async (offer: JobOffer) => {
    // Ouvrir AVANT l'await : sinon le bloqueur de pop-up coupe la nouvelle fenêtre.
    if (offer.url) window.open(offer.url, '_blank', 'noopener,noreferrer');
    const key = offerKey(offer);
    if (appliedKeys.has(key)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/applications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          company: offer.company,
          title: offer.title,
          source: offer.source || 'Offre',
          status: 'SENT',
          notes: offer.partner
            ? `Offre de ${offer.partner.name} (organisme partenaire, via Joboost)`
            : (offer.url ? `Offre : ${offer.url}` : undefined),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedKeys((prev) => new Set(prev).add(key));
        // Offre partenaire : pas de site externe — l'organisme voit la candidature
        // dans le profil du candidat (section Candidatures de son espace recruteur).
        toast.success(offer.partner
          ? `${offer.partner.name} voit ta candidature sur ton profil.`
          : "Ajoutée à ton suivi. Termine ta candidature sur la page de l'annonce.");
      } else {
        toast.error(data.error || "Impossible d'ajouter au suivi.");
      }
    } catch { toast.error('Erreur réseau.'); }
  };

  const toggleSave = async (offer: JobOffer) => {
    const savedId = getSavedId(offer);

    if (savedId) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved/${savedId}`, { method: 'DELETE', credentials: 'include', headers: { ...authHeaders() } });
        const data = await res.json();
        if (data.success) {
          setSavedOffers((prev) => prev.filter(s => s.id !== savedId));
          toast.success('Retirée des sauvegardées');
        }
      } catch (e) { toast.error('Une erreur est survenue, réessaie.'); }
    } else {
      try {
        const payload = {
          title: offer.title,
          company: offer.company,
          location: offer.location,
          salary: offer.salary,
          type: offer.type,
          matchScore: offer.matchScore,
          postedDate: offer.postedDate,
          source: offer.source || 'Recommandation',
          url: offer.url || '',
          tags: offer.tags,
          aiInsight: offer.aiInsight
        };

        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setSavedOffers((prev) => [...prev, data.saved]);
          toast.success('Offre sauvegardée');
        }
      } catch (e) { toast.error('Une erreur est survenue, réessaie.'); }
    }
  };

  // La recherche est faite côté serveur (France Travail + Adzuna) : on affiche
  // directement les offres renvoyées. `hasQuery` sert aux libellés d'état vide.
  const hasQuery = debouncedQuery.length > 0 || contractType !== '';
  const currentOffer = offers[cursor] || null;
  const isBestOffer = (o: JobOffer) => offers.length > 0 && offerKey(offers[0]) === offerKey(o);
  const matchScores = offers.map((o) => Number(o.matchScore)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgMatch = matchScores.length ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;
  const lastDecision = history[history.length - 1];
  const canUndo = !!lastDecision && lastDecision.dir === 'left' && !leaving;

  /* Passer (gauche) ou postuler (droite). Appelé par le geste, les boutons et le clavier. */
  const commit = (dir: 'left' | 'right', fromX = 0) => {
    const offer = currentOffer;
    if (!offer || leaving) return;
    setLeaving({ offer, index: cursor, dir, fromX });
    setHistory((h) => [...h, { index: cursor, dir }]);
    setCursor((c) => c + 1);
    setDragX(0);
    if (dir === 'right') {
      if (offer.contactEmail) setApplyOffer(offer);
      else handlePostuler(offer);
    } else {
      setRejectedKeys((prev) => new Set(prev).add(offerKey(offer)));
    }
    window.setTimeout(() => setLeaving(null), 340);
  };

  /* Revenir sur la dernière offre PASSÉE (une candidature envoyée ne s'annule pas ici). */
  const undo = () => {
    if (!canUndo) return;
    const offer = offers[lastDecision.index];
    setHistory((h) => h.slice(0, -1));
    setCursor(lastDecision.index);
    if (offer) setRejectedKeys((prev) => { const n = new Set(prev); n.delete(offerKey(offer)); return n; });
  };

  const restart = () => {
    setCursor(0);
    setRejectedKeys(new Set());
    setHistory([]);
    setDragX(0);
    setLeaving(null);
  };

  // ── Geste ── Pointer Events couvre souris ET tactile.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!currentOffer || leaving || e.button !== 0) return;
    // Un appui sur un bouton / lien de la carte reste un simple clic.
    if ((e.target as Element).closest('button, a, input, textarea, select')) return;
    gesture.current = { tracking: true, dragging: false, startX: e.clientX, startY: e.clientY, dx: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g.tracking) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.dragging) {
      // Mouvement surtout vertical : c'est un défilement, on laisse faire la page.
      if (Math.abs(dy) > DRAG_START && Math.abs(dy) > Math.abs(dx)) { g.tracking = false; return; }
      if (Math.abs(dx) < DRAG_START) return;
      g.dragging = true;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    g.dx = dx;
    setDragX(dx);
  };
  const endGesture = (cancelled: boolean) => {
    const g = gesture.current;
    const wasDragging = g.dragging;
    const dx = g.dx;
    gesture.current = { tracking: false, dragging: false, startX: 0, startY: 0, dx: 0 };
    if (!wasDragging) return;
    setDragging(false);
    if (!cancelled && dx > SWIPE_THRESHOLD) commit('right', dx);
    else if (!cancelled && dx < -SWIPE_THRESHOLD) commit('left', dx);
    else setDragX(0);
  };

  // ── Clavier : ← passer, → postuler, S sauvegarder, Z revenir ──
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e: KeyboardEvent) => {
    if (applyOffer || !currentOffer || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); commit('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); commit('right'); }
    else if (e.key.toLowerCase() === 's') { e.preventDefault(); toggleSave(currentOffer); }
    else if (e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sourceLabel =
    source === 'demo'
      ? 'Exemples (les offres réelles sont momentanément indisponibles)'
      : source === 'mixed'
        ? 'France Travail et Adzuna'
        : source === 'adzuna'
          ? 'Adzuna'
          : 'France Travail';

  const cardHandlers = (offer: JobOffer) => ({
    onCv: () => navigate('/prepare/cv', { state: { jobTitle: offer.title, company: offer.company, targetContext: [offer.aiInsight, offer.tags?.length ? `Mots-clés : ${offer.tags.join(', ')}` : '', offer.type ? `Contrat : ${offer.type}` : ''].filter(Boolean).join('\n') } }),
    onLetter: () => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } }),
    onSave: () => toggleSave(offer),
  });

  // Les 3 prochaines cartes : la première est active, les deux autres forment la pile.
  const stack = offers.slice(cursor, cursor + 3);
  const progress = offers.length ? Math.min(cursor, offers.length) / offers.length : 0;
  const pull = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1); // 0 → 1 pendant le glissement

  return (
    <div className="px-5 md:px-8 pt-4 md:pt-6 pb-10 max-w-6xl mx-auto">
      <div className="max-w-md mx-auto space-y-5">
        {/* Barre d'outils */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un autre métier…"
                className="input-pro pl-9 w-full"
                aria-label="Chercher un métier"
              />
            </div>
            <div className="flex gap-2">
              <FilterSelect
                className="flex-1 sm:flex-none"
                ariaLabel="Type de contrat"
                icon={<Briefcase size={16} />}
                value={contractType}
                onChange={(v) => setContractType(String(v))}
                options={[
                  { value: '', label: 'Contrats' },
                  { value: 'CDI', label: 'CDI' },
                  { value: 'CDD', label: 'CDD' },
                  { value: 'MIS', label: 'Intérim' },
                  { value: 'SAI', label: 'Saisonnier' },
                  { value: 'E2', label: 'Alternance' },
                ]}
              />
              <FilterSelect
                className="flex-1 sm:flex-none"
                ariaLabel="Rayon de recherche autour de ta ville"
                icon={<Navigation size={16} />}
                value={radius}
                onChange={(v) => setRadius(Number(v))}
                options={[10, 20, 30, 50, 100].map((km) => ({ value: km, label: `${km} km` }))}
              />
            </div>
          </div>
          <p className="text-[13px] text-faint flex items-center gap-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${source === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {loading
              ? 'Recherche en cours…'
              : <>{offers.length} offre{offers.length > 1 ? 's' : ''} · {sourceLabel}{matchScores.length > 0 ? ` · ${avgMatch} % en moyenne` : ''}</>}
          </p>
        </div>

        {loading ? (
          <OfferSkeleton />
        ) : offers.length === 0 ? (
          <EmptyState
            variant="offers"
            title={hasQuery ? 'Aucun résultat' : 'Aucune offre pour le moment'}
            description={hasQuery ? 'Essaie un autre métier, un autre contrat ou un rayon plus large.' : 'Indique ton métier et ta ville dans ton profil pour recevoir des offres qui te correspondent.'}
            action={!hasQuery ? <button onClick={() => navigate('/prepare/profile')} className="btn btn-secondary">Compléter mon profil</button> : undefined}
          />
        ) : (
          <>
            {/* Progression */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-subtle overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-faint shrink-0">
                {Math.min(cursor + 1, offers.length)} / {offers.length}
              </span>
            </div>

            {currentOffer ? (
              <div className="relative pb-6" style={{ minHeight: 420 }}>
                {stack.map((offer, i) => {
                  const index = cursor + i;
                  const depth = i;
                  const active = depth === 0;
                  const style: React.CSSProperties = active
                    ? {
                        transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
                        transition: dragging ? 'none' : 'transform 320ms cubic-bezier(.2,.8,.2,1)',
                        touchAction: 'pan-y',
                        cursor: dragging ? 'grabbing' : 'grab',
                      }
                    : {
                        transform: `translateY(${depth * 12 - pull * 6}px) scale(${1 - depth * 0.045 + pull * 0.02})`,
                        opacity: depth === 1 ? 1 : 0.6,
                        transition: 'transform 320ms cubic-bezier(.2,.8,.2,1), opacity 320ms',
                      };
                  return (
                    <div
                      key={index}
                      aria-hidden={!active}
                      className={`surface overflow-hidden select-none origin-top ${
                        active ? 'relative z-30 shadow-pop' : `absolute inset-x-0 top-0 bottom-6 pointer-events-none ${depth === 1 ? 'z-20 shadow-card' : 'z-10'}`
                      }`}
                      style={style}
                      onPointerDown={active ? onPointerDown : undefined}
                      onPointerMove={active ? onPointerMove : undefined}
                      onPointerUp={active ? () => endGesture(false) : undefined}
                      onPointerCancel={active ? () => endGesture(true) : undefined}
                    >
                      <OfferCard
                        offer={offer}
                        isBest={isBestOffer(offer)}
                        isApplied={appliedKeys.has(offerKey(offer))}
                        isBookmarked={!!getSavedId(offer)}
                        {...cardHandlers(offer)}
                      />
                      {/* Voile de décision pendant le glissement */}
                      {active && dragX !== 0 && (
                        <div
                          aria-hidden
                          className={`absolute inset-0 pointer-events-none grid place-items-center ${dragX > 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}
                          style={{ opacity: pull }}
                        >
                          <span className={`inline-flex items-center gap-2 h-12 px-5 rounded-full text-white font-semibold shadow-pop ${dragX > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ transform: `scale(${0.8 + pull * 0.2})` }}>
                            {dragX > 0 ? <><Send size={18} /> Postuler</> : <><X size={18} strokeWidth={2.5} /> Passer</>}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Carte qui s'en va */}
                {leaving && (
                  <div
                    key={`leaving-${leaving.index}`}
                    aria-hidden
                    className="surface overflow-hidden absolute inset-x-0 top-0 z-40 pointer-events-none shadow-pop animate-card-out"
                    style={{
                      ['--from' as any]: `${leaving.fromX}px`,
                      ['--rot-from' as any]: `${leaving.fromX / 20}deg`,
                      ['--to' as any]: leaving.dir === 'right' ? '140%' : '-140%',
                      ['--rot-to' as any]: leaving.dir === 'right' ? '18deg' : '-18deg',
                    }}
                  >
                    <OfferCard offer={leaving.offer} isBest={false} isApplied={false} isBookmarked={!!getSavedId(leaving.offer)} onCv={() => {}} onLetter={() => {}} onSave={() => {}} />
                    <div className={`absolute inset-0 grid place-items-center ${leaving.dir === 'right' ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`}>
                      <span className={`inline-flex items-center gap-2 h-12 px-5 rounded-full text-white font-semibold ${leaving.dir === 'right' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {leaving.dir === 'right' ? <><Send size={18} /> Postuler</> : <><X size={18} strokeWidth={2.5} /> Passer</>}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                variant="offers"
                title="Tu as vu toutes les offres"
                description={`${appliedKeys.size} candidature${appliedKeys.size > 1 ? 's' : ''} envoyée${appliedKeys.size > 1 ? 's' : ''}, ${rejectedKeys.size} passée${rejectedKeys.size > 1 ? 's' : ''}. Élargis le rayon ou cherche un autre métier pour en voir d’autres.`}
                action={
                  <button onClick={restart} className="btn btn-secondary">
                    <RotateCcw size={15} /> Revoir depuis le début
                  </button>
                }
              />
            )}

            {/* Commandes : même effet que le geste, pour qui ne glisse pas. */}
            {currentOffer && (
              <div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={undo}
                    disabled={!canUndo}
                    aria-label="Revenir sur l'offre passée"
                    title="Revenir (Z)"
                    className="w-11 h-11 rounded-full grid place-items-center bg-surface border border-line text-muted shadow-xs hover:text-ink transition-colors disabled:opacity-35 disabled:pointer-events-none"
                  >
                    <Undo2 size={18} />
                  </button>
                  <button
                    onClick={() => commit('left')}
                    aria-label="Passer cette offre"
                    title="Passer (←)"
                    className="w-16 h-16 rounded-full grid place-items-center bg-surface border border-line text-rose-500 shadow-card hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition"
                  >
                    <X size={28} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => commit('right')}
                    aria-label="Postuler à cette offre"
                    title="Postuler (→)"
                    className="w-16 h-16 rounded-full grid place-items-center bg-brand text-white shadow-[0_10px_24px_-8px_rgba(110,80,245,0.6)] hover:bg-brand-700 active:scale-95 transition"
                  >
                    <Send size={24} />
                  </button>
                  <button
                    onClick={() => toggleSave(currentOffer)}
                    aria-label={getSavedId(currentOffer) ? 'Retirer des sauvegardées' : 'Sauvegarder pour plus tard'}
                    title="Sauvegarder (S)"
                    className={`w-11 h-11 rounded-full grid place-items-center border shadow-xs transition-colors ${
                      getSavedId(currentOffer)
                        ? 'bg-brand/10 border-brand/30 text-brand dark:text-brand-300'
                        : 'bg-surface border-line text-muted hover:text-ink'
                    }`}
                  >
                    <Bookmark size={18} fill={getSavedId(currentOffer) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-faint">
                  <span className="md:hidden">Glisse la carte : à droite pour postuler, à gauche pour passer.</span>
                  <span className="hidden md:inline">Raccourcis : ← passer · → postuler · S sauvegarder · Z revenir</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {applyOffer && (
        <ApplyInAppModal
          offer={applyOffer}
          onClose={() => setApplyOffer(null)}
          onSent={() => setAppliedKeys((prev) => new Set(prev).add(offerKey(applyOffer)))}
        />
      )}
    </div>
  );
};

export default PersonalizedOffers;
