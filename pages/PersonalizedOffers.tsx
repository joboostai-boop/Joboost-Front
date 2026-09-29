import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Navigation, Send, Check, X,
  FileText, Building2, RotateCcw, MapPin, Undo2, SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import ExpandableText from '../components/ExpandableText';
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

/* Jauge circulaire de compatibilité, posée sur la couverture de la carte. */
const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 17;
  const c = 2 * Math.PI * r;
  const tone = score >= 75 ? '#10B981' : score >= 50 ? '#6E50F5' : '#8C8C9A';
  return (
    <div className="relative w-12 h-12 shrink-0 rounded-full bg-white/90 backdrop-blur shadow-xs" title={`Compatibilité avec ton profil : ${score} %`}>
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(18,18,23,.08)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11.5px] font-semibold tabular-nums text-[#121217]">{score}%</span>
    </div>
  );
};

/* Squelette pendant le chargement — même silhouette que la carte. */
const OfferSkeleton: React.FC = () => (
  <div className="absolute inset-x-0 top-0 bottom-5 surface overflow-hidden">
    <div className="skeleton !rounded-none h-[76px]" />
    <div className="px-5 pt-4 space-y-3">
      <div className="skeleton h-6 w-3/4 rounded" />
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" />
        <div className="skeleton h-14 rounded-xl" /><div className="skeleton h-14 rounded-xl" />
      </div>
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
  /** Carte vue derrière la carte active : couverture seule, sans texte. */
  preview?: boolean;
}

/* Carte d'offre : bandeau teinté à la couleur de l'entreprise, logo, jauge de
   compatibilité, infos clés en pastilles, explication et mots-clés. */
// « MILES GROUP » → « Miles Group » : les intitulés tout en capitales crient.
const tidyCase = (s: string) =>
  s && s.length > 3 && s === s.toUpperCase() && /[A-Z]/.test(s)
    ? s.toLowerCase().replace(/(^|[\s\-'/(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase())
    : s;

/* Carte d'offre (refonte 09/2026, v2). Hauteur fixe : la couverture et les actions
   restent en place, seul le contenu défile à l'intérieur de la carte. */
const OfferCard: React.FC<CardProps> = ({ offer, isBest, isApplied, isBookmarked, onCv, onLetter, onSave, preview = false }) => {
  const hue = hueOf(offer.company || offer.title);
  const hue2 = (hue + 55) % 360;
  const score = Math.round(Number(offer.matchScore) || 0);
  const company = tidyCase(offer.company || '');
  const facts = [
    { icon: <Briefcase size={15} />, label: 'Contrat', value: offer.type || 'À préciser' },
    { icon: <Euro size={15} />, label: 'Salaire', value: offer.salary ? formatSalary(offer.salary) : 'Non précisé' },
    { icon: <MapPin size={15} />, label: 'Lieu', value: offer.location || 'Non précisé' },
    { icon: <Clock size={15} />, label: 'Publiée', value: offer.postedDate || 'Récemment' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Couverture compacte : logo, repères, jauge. Hauteur fixe et réduite pour
         laisser la place au contenu sur les petits écrans (iPhone + barres Safari). */}
      <div
        className="relative h-[76px] shrink-0 overflow-hidden flex items-center gap-3 px-4"
        style={{
          background: `radial-gradient(120% 160% at 0% 0%, hsla(${hue}, 90%, 62%, .55), transparent 60%),
                       radial-gradient(120% 160% at 100% 100%, hsla(${hue2}, 90%, 62%, .45), transparent 55%),
                       hsl(${hue}, 60%, 96%)`,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
        />
        {offer.partner?.logoUrl ? (
          <span className="relative w-12 h-12 rounded-xl bg-white border-2 border-white shadow-card grid place-items-center overflow-hidden shrink-0">
            <img src={offer.partner.logoUrl} alt="" className="w-full h-full object-contain p-1" draggable={false} />
          </span>
        ) : (
          <span
            className="relative w-12 h-12 rounded-xl border-2 border-white/80 shadow-card grid place-items-center text-xl font-semibold text-white shrink-0"
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${hue2}, 70%, 45%))` }}
          >
            {company.charAt(0).toUpperCase() || '?'}
          </span>
        )}
        <div className="relative flex flex-wrap gap-1.5 min-w-0">
          {isBest && (
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-white/85 text-[#121217] text-[11px] font-medium backdrop-blur">
              Top pour toi
            </span>
          )}
          {offer.partner && (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/85 text-[#121217] text-[11px] font-medium backdrop-blur truncate max-w-[150px]">
              <Building2 size={11} /> {offer.partner.name}
            </span>
          )}
        </div>
        {score > 0 && <div className="relative ml-auto"><ScoreRing score={score} /></div>}
      </div>

      {preview ? (
        // Carte du dessous : aucune écriture, pour qu'aucun texte ne dépasse sous la carte active.
        <div className="flex-1" />
      ) : (
      <>
      {/* Tout le contenu défile dans la carte ; seules la couverture et les actions restent fixes. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-4 pb-4 scrollbar-none">
        <h2 className="text-[20px] leading-[1.22] tracking-[-0.02em]">{offer.title}</h2>
        <p className="text-[15px] text-muted mt-1">{company}</p>

        <dl className="grid grid-cols-2 gap-2 mt-4">
          {facts.map((f) => (
            <div key={f.label} className="rounded-xl bg-subtle/70 px-3 py-2.5 min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] text-faint">
                <span className="text-faint">{f.icon}</span>{f.label}
              </dt>
              <dd className="mt-0.5 text-[13px] font-medium text-ink truncate" title={f.value}>{f.value}</dd>
            </div>
          ))}
        </dl>

        {offer.aiInsight && (
          <div className="mt-4">
            <p className="eyebrow mb-1.5">En bref</p>
            <ExpandableText className="text-[14px] text-muted leading-relaxed" text={offer.aiInsight} clamp={4} />
          </div>
        )}

        {offer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {offer.tags.slice(0, 6).map((t) => (
              <span key={t} className="chip !h-6 !text-[11.5px]">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions : préparer les documents pour CETTE offre */}
      <div className="shrink-0 flex items-center gap-0.5 px-3 py-2 border-t border-line bg-surface">
        {isApplied && (
          <span className="inline-flex items-center gap-1 h-9 px-2 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
            <Check size={15} /> Suivie
          </span>
        )}
        <button type="button" onClick={onCv} className="btn btn-ghost !min-h-[36px] !px-2.5 text-[13px]">
          <FileText size={15} /> CV adapté
        </button>
        <button type="button" onClick={onLetter} className="btn btn-ghost !min-h-[36px] !px-2.5 text-[13px]">
          <Edit3 size={15} /> Lettre
        </button>
        {offer.url && (
          <a href={offer.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[36px] !px-2.5 text-[13px]" aria-label="Voir l'annonce" title="Voir l'annonce sans l'ajouter au suivi">
            <ExternalLink size={15} />
          </a>
        )}
        <button
          type="button"
          onClick={onSave}
          aria-label={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder'}
          title={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder (S)'}
          className={`btn btn-ghost !min-h-[36px] !px-2.5 ml-auto ${isBookmarked ? '!text-brand dark:!text-brand-300' : ''}`}
        >
          <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>
      </>
      )}
    </div>
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0); // offres masquées car déjà vues / déjà suivies
  const [reloadTick, setReloadTick] = useState(0);

  // ── Pile de cartes ──
  const [cursor, setCursor] = useState(0);
  const [broadened, setBroadened] = useState(false); // recherche élargie côté serveur
  // Carte en train de partir (animée à part, pendant que la pile avance déjà).
  const [leaving, setLeaving] = useState<{ offer: JobOffer; index: number; dir: 'left' | 'right'; fromX: number } | null>(null);
  // Historique des décisions de la session, pour « Revenir » sur une offre passée.
  const [history, setHistory] = useState<{ index: number; dir: 'left' | 'right' }[]>([]);

  const gesture = useRef({ tracking: false, dragging: false, startX: 0, startY: 0, dx: 0 });
  // Le glissement modifie directement le style de la carte active (sans re-rendu React
  // à chaque mouvement du doigt : c'était la cause des saccades sur téléphone).
  const activeRef = useRef<HTMLDivElement | null>(null);
  const applyVeilRef = useRef<HTMLDivElement | null>(null);
  const passVeilRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);

  // Offres déjà vues (passées ou postulées) : mémorisées sur l'appareil, par compte,
  // pour qu'elles ne reviennent pas à chaque visite.
  const { user } = useAuth();
  const seenStorageKey = `joboost-seen-offers:${user?.id || 'anon'}`;
  const readSeen = (): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(seenStorageKey) || '[]')); } catch { return new Set(); }
  };
  const markSeen = (key: string) => {
    try {
      const list = Array.from(readSeen());
      if (!list.includes(key)) list.push(key);
      localStorage.setItem(seenStorageKey, JSON.stringify(list.slice(-600)));
    } catch { /* stockage indisponible */ }
  };
  const unmarkSeen = (key: string) => {
    try { localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(readSeen()).filter((k) => k !== key))); } catch { /* ignore */ }
  };

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
        const [recRes, savedRes, appsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/recommendations?${params.toString()}`, { credentials: 'include', headers: { ...authHeaders() } }),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved`, { credentials: 'include', headers: { ...authHeaders() } }),
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/applications?limit=100`, { credentials: 'include', headers: { ...authHeaders() } }).catch(() => null),
        ]);

        const recData = await recRes.json();
        const savedData = await savedRes.json();
        const appsData = appsRes ? await appsRes.json().catch(() => null) : null;

        if (recData.success) {
          const seen = readSeen();
          const inTracking = new Set<string>(
            (appsData?.success && Array.isArray(appsData.data) ? appsData.data : []).map((a: any) => offerKey({ title: a.title, company: a.company } as JobOffer)),
          );
          const all: JobOffer[] = recData.recommendations || [];
          setOffers(all.filter((o) => !seen.has(offerKey(o)) && !inTracking.has(offerKey(o))));
          setHiddenCount(all.filter((o) => seen.has(offerKey(o)) || inTracking.has(offerKey(o))).length);
          setSource(recData.source || 'demo');
          setBroadened(!!recData.broadened);
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
        setLeaving(null);
        setHistory([]);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius, debouncedQuery, contractType, reloadTick]);

  const getSavedId = (offer: JobOffer) => {
    const found = savedOffers.find(s => s.title === offer.title && s.company === offer.company);
    return found ? found.id : null;
  };

  // « Postuler » : ajoute l'offre au Suivi. On N'OUVRE PLUS le site de l'annonce
  // automatiquement : sur téléphone, chaque swipe faisait quitter Joboost. Un bouton
  // « Voir l'annonce » dans la notification l'ouvre quand la personne le décide.
  // Statut « À préparer » : la candidature n'est pas encore envoyée chez l'employeur
  // (sauf offre d'un organisme partenaire, qui la reçoit directement dans Joboost).
  const handlePostuler = async (offer: JobOffer) => {
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
          status: offer.partner ? 'SENT' : 'PENDING',
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
        if (offer.partner) {
          toast.success(`${offer.partner.name} voit ta candidature sur ton profil.`);
        } else {
          toast((t) => (
            <span className="flex items-center gap-3">
              <span>Ajoutée à ton suivi</span>
              {offer.url && (
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.dismiss(t.id)}
                  className="shrink-0 font-semibold underline underline-offset-2"
                >
                  Voir l’annonce
                </a>
              )}
            </span>
          ), { duration: 6000 });
        }
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
  const isBestOffer = (o: JobOffer) => offers.length > 0 && offerKey(offers[0]) === offerKey(o) && Number(o.matchScore) >= 85;
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
    markSeen(offerKey(offer));
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
    if (offer) unmarkSeen(offerKey(offer));
    if (offer) setRejectedKeys((prev) => { const n = new Set(prev); n.delete(offerKey(offer)); return n; });
  };

  // Revoir les offres déjà passées (les candidatures du suivi restent masquées).
  const restart = () => {
    try { localStorage.removeItem(seenStorageKey); } catch { /* ignore */ }
    setRejectedKeys(new Set());
    setHistory([]);
    setLeaving(null);
    setReloadTick((n) => n + 1);
  };

  // ── Geste ── Pointer Events couvre souris ET tactile.
  const onPointerDown = (e: React.PointerEvent) => {
    if (!currentOffer || leaving || e.button !== 0) return;
    // Un appui sur un bouton / lien de la carte reste un simple clic.
    if ((e.target as Element).closest('button, a, input, textarea, select')) return;
    gesture.current = { tracking: true, dragging: false, startX: e.clientX, startY: e.clientY, dx: 0 };
  };
  // Applique la position du doigt à la carte active (une fois par image affichée).
  const paint = (dx: number, animate: boolean) => {
    const el = activeRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 320ms cubic-bezier(.2,.8,.2,1)' : 'none';
    el.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    const pull = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);
    if (applyVeilRef.current) applyVeilRef.current.style.opacity = dx > 0 ? String(pull) : '0';
    if (passVeilRef.current) passVeilRef.current.style.opacity = dx < 0 ? String(pull) : '0';
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
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      if (activeRef.current) activeRef.current.style.cursor = 'grabbing';
    }
    g.dx = dx;
    if (frame.current == null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        if (gesture.current.dragging) paint(gesture.current.dx, false);
      });
    }
  };
  const endGesture = (cancelled: boolean) => {
    const g = gesture.current;
    const wasDragging = g.dragging;
    const dx = g.dx;
    gesture.current = { tracking: false, dragging: false, startX: 0, startY: 0, dx: 0 };
    if (frame.current != null) { cancelAnimationFrame(frame.current); frame.current = null; }
    if (!wasDragging) return;
    if (activeRef.current) activeRef.current.style.cursor = '';
    if (!cancelled && dx > SWIPE_THRESHOLD) commit('right', dx);
    else if (!cancelled && dx < -SWIPE_THRESHOLD) commit('left', dx);
    else paint(0, true);
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
      ? 'exemples (offres réelles indisponibles)'
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
  const activeFilters = (contractType ? 1 : 0) + (radius !== 30 ? 1 : 0);

  const CONTRACTS = [
    { value: '', label: 'Tous' },
    { value: 'CDI', label: 'CDI' },
    { value: 'CDD', label: 'CDD' },
    { value: 'MIS', label: 'Intérim' },
    { value: 'SAI', label: 'Saisonnier' },
    { value: 'E2', label: 'Alternance' },
  ];
  const RADII = [10, 20, 30, 50, 100];
  const pill = (active: boolean) =>
    `shrink-0 h-8 px-3 rounded-full text-[13px] font-medium transition-colors ${active ? 'bg-ink text-canvas' : 'bg-surface border border-line text-muted hover:text-ink'}`;

  return (
    /* Sur téléphone, l'écran tient pile entre la barre du haut (56 px), les pastilles
       de section (53 px) et la barre d'onglets du bas (réserve de 96 px) : la carte
       remplit l'espace restant et les boutons restent toujours visibles. */
    <div className="overflow-x-clip px-4 md:px-8 pt-3 md:pt-6 max-w-6xl mx-auto h-[calc(100dvh-205px)] md:h-[calc(100dvh-150px)] md:min-h-[600px] md:max-h-[820px]">
      <div className="max-w-md mx-auto h-full flex flex-col gap-3">
        {/* Recherche + filtres */}
        <div className="shrink-0 space-y-2.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={16} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Un autre métier ?"
                className="input-pro pl-9 w-full"
                aria-label="Chercher un métier"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className={`btn btn-secondary !px-3 relative ${filtersOpen ? '!bg-subtle' : ''}`}
            >
              <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Filtres</span>
              {activeFilters > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-semibold grid place-items-center">{activeFilters}</span>
              )}
            </button>
          </div>

          {filtersOpen && (
            <div className="surface p-3 space-y-3 animate-fade-in">
              <div>
                <p className="eyebrow mb-1.5">Contrat</p>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
                  {CONTRACTS.map((c) => (
                    <button key={c.value} type="button" onClick={() => setContractType(c.value)} className={pill(contractType === c.value)}>{c.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow mb-1.5">Distance autour de ta ville</p>
                <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
                  {RADII.map((km) => (
                    <button key={km} type="button" onClick={() => setRadius(km)} className={pill(radius === km)}>{km} km</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Progression + provenance */}
          {!loading && offers.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-subtle overflow-hidden">
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums text-faint shrink-0" title={`Source : ${sourceLabel}${matchScores.length ? ` · compatibilité moyenne ${avgMatch} %` : ''}`}>
                {Math.min(cursor + 1, offers.length)} / {offers.length}
              </span>
            </div>
          )}
          {!loading && broadened && offers.length > 0 && cursor === 0 && (
            <p className="text-xs text-faint">Recherche élargie à des intitulés proches pour te montrer plus d’offres.</p>
          )}
        </div>

        {/* Pile de cartes. `isolate` : ses z-index restent confinés ici et la carte
            ne passe plus jamais au-dessus des barres de navigation. */}
        <div className="relative isolate flex-1 min-h-0">
          {loading ? (
            <OfferSkeleton />
          ) : offers.length === 0 ? (
            <div className="h-full overflow-y-auto">
              <EmptyState
                variant="offers"
                title={hasQuery ? 'Aucun résultat' : 'Aucune offre pour le moment'}
                description={hasQuery ? 'Essaie un autre métier, un autre contrat ou une distance plus grande.' : 'Indique ton métier et ta ville dans ton profil pour recevoir des offres qui te correspondent.'}
                action={!hasQuery ? <button onClick={() => navigate('/prepare/profile')} className="btn btn-secondary">Compléter mon profil</button> : undefined}
              />
            </div>
          ) : currentOffer ? (
            <>
              {stack.map((offer, i) => {
                const index = cursor + i;
                const depth = i;
                const active = depth === 0;
                const style: React.CSSProperties = active
                  ? {
                      transform: 'translateX(0px) rotate(0deg)',
                      transition: 'transform 320ms cubic-bezier(.2,.8,.2,1)',
                      touchAction: 'pan-y',
                      WebkitTouchCallout: 'none',
                      WebkitUserSelect: 'none',
                    }
                  : {
                      transform: `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`,
                      opacity: depth === 1 ? 1 : 0.55,
                      transition: 'transform 320ms cubic-bezier(.2,.8,.2,1), opacity 320ms',
                    };
                return (
                  <div
                    key={index}
                    aria-hidden={!active}
                    className={`absolute inset-x-0 top-0 bottom-5 surface overflow-hidden select-none origin-bottom ${
                      active ? 'z-30 shadow-pop' : `pointer-events-none ${depth === 1 ? 'z-20 shadow-card' : 'z-10'}`
                    } ${active ? 'cursor-grab' : ''}`}
                    ref={active ? activeRef : undefined}
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
                      preview={!active}
                    />
                    {/* Voiles de décision : opacité pilotée par le geste (0 au repos). */}
                    {active && (
                      <>
                        <div ref={applyVeilRef} aria-hidden className="absolute inset-0 pointer-events-none grid place-items-center bg-emerald-500/15" style={{ opacity: 0 }}>
                          <span className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-white font-semibold shadow-pop bg-emerald-500 -rotate-6">
                            <Send size={18} /> Postuler
                          </span>
                        </div>
                        <div ref={passVeilRef} aria-hidden className="absolute inset-0 pointer-events-none grid place-items-center bg-rose-500/15" style={{ opacity: 0 }}>
                          <span className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-white font-semibold shadow-pop bg-rose-500 rotate-6">
                            <X size={18} strokeWidth={2.5} /> Passer
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Carte qui s'en va */}
              {leaving && (
                <div
                  key={`leaving-${leaving.index}`}
                  aria-hidden
                  className="absolute inset-x-0 top-0 bottom-5 z-40 surface overflow-hidden pointer-events-none shadow-pop animate-card-out"
                  style={{
                    ['--from' as any]: `${leaving.fromX}px`,
                    ['--rot-from' as any]: `${leaving.fromX / 22}deg`,
                    ['--to' as any]: leaving.dir === 'right' ? '140%' : '-140%',
                    ['--rot-to' as any]: leaving.dir === 'right' ? '16deg' : '-16deg',
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
            </>
          ) : (
            <div className="h-full overflow-y-auto">
              <EmptyState
                variant="offers"
                title="Tu as vu toutes les offres"
                description={`${appliedKeys.size} ajoutée${appliedKeys.size > 1 ? 's' : ''} à ton suivi, ${rejectedKeys.size} passée${rejectedKeys.size > 1 ? 's' : ''}${hiddenCount ? `, ${hiddenCount} déjà vue${hiddenCount > 1 ? 's' : ''} avant` : ''}. Augmente la distance ou cherche un autre métier pour en voir d’autres.`}
                action={
                  <button onClick={restart} className="btn btn-secondary">
                    <RotateCcw size={15} /> Revoir les offres passées
                  </button>
                }
              />
            </div>
          )}
        </div>

        {/* Commandes : même effet que le geste, pour qui ne glisse pas. */}
        {!loading && currentOffer && (
          <div className="shrink-0 pb-1">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={undo}
                disabled={!canUndo}
                aria-label="Revenir sur l'offre passée"
                title="Revenir (Z)"
                className="w-11 h-11 rounded-full grid place-items-center bg-surface border border-line text-amber-500 shadow-xs active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={() => commit('left')}
                aria-label="Passer cette offre"
                title="Passer (←)"
                className="w-14 h-14 [@media(min-height:760px)]:w-[60px] [@media(min-height:760px)]:h-[60px] rounded-full grid place-items-center bg-surface border border-line text-rose-500 shadow-card hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-95 transition"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => commit('right')}
                aria-label="Postuler à cette offre"
                title="Postuler (→)"
                className="w-14 h-14 [@media(min-height:760px)]:w-[60px] [@media(min-height:760px)]:h-[60px] rounded-full grid place-items-center bg-brand text-white shadow-[0_10px_24px_-8px_rgba(110,80,245,0.7)] hover:bg-brand-700 active:scale-95 transition"
              >
                <Send size={24} />
              </button>
              <button
                onClick={() => toggleSave(currentOffer)}
                aria-label={getSavedId(currentOffer) ? 'Retirer des sauvegardées' : 'Sauvegarder pour plus tard'}
                title="Sauvegarder (S)"
                className={`w-11 h-11 rounded-full grid place-items-center border shadow-xs active:scale-95 transition ${
                  getSavedId(currentOffer)
                    ? 'bg-brand/10 border-brand/30 text-brand dark:text-brand-300'
                    : 'bg-surface border-line text-sky-500'
                }`}
              >
                <Bookmark size={18} fill={getSavedId(currentOffer) ? 'currentColor' : 'none'} />
              </button>
            </div>
            <p className="hidden md:block mt-2.5 text-center text-xs text-faint">
              ← passer · → postuler · S sauvegarder · Z revenir
            </p>
          </div>
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
