import React, { useState, useEffect, useRef } from 'react';
import { Search, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Navigation, Send, Check, X, FileText, Building2, RotateCcw } from 'lucide-react';
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

/* Squelette pendant le chargement — une carte, comme le nouvel agencement en pile. */
const OfferSkeleton: React.FC = () => (
  <div className="max-w-xl mx-auto surface p-6 space-y-4">
    <div className="flex gap-3">
      <div className="skeleton w-12 h-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-5 w-2/3 rounded" />
        <div className="skeleton h-3.5 w-1/3 rounded" />
      </div>
    </div>
    <div className="flex gap-2">
      <div className="skeleton h-7 w-28 rounded-lg" />
      <div className="skeleton h-7 w-20 rounded-lg" />
      <div className="skeleton h-7 w-32 rounded-lg" />
    </div>
    <div className="skeleton h-24 w-full rounded-lg" />
    <div className="skeleton h-10 w-full rounded-lg" />
  </div>
);

// Distance de glissement (px) à partir de laquelle le geste est considéré comme
// un vrai swipe plutôt qu'un simple tapotement.
const SWIPE_THRESHOLD = 110;

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
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set()); // offres déjà ajoutées au suivi (cette session)
  const [rejectedKeys, setRejectedKeys] = useState<Set<string>>(new Set()); // offres passées (swipe gauche, cette session)
  const [applyOffer, setApplyOffer] = useState<JobOffer | null>(null); // offre en cours de candidature in-app

  // ── Pile de cartes (remplace liste + pagination, 29/09) ──
  // `cursor` avance d'un cran à chaque swipe (gauche ou droite) : la carte quitte
  // la pile pour de bon, comme sur une appli de rencontre. Pas de retour en arrière
  // dans cette version — chercher un « annuler » aurait recompliqué ce qu'on vient
  // de simplifier ; on peut reprendre une offre passée depuis les favoris si besoin.
  const [cursor, setCursor] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null);
  const dragStartX = useRef(0);

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
        setExiting(null);
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
  // ET on ajoute automatiquement la candidature au Suivi (Kanban, colonne « Envoyées »).
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
          setSavedOffers(savedOffers.filter(s => s.id !== savedId));
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
          source: offer.source || 'Recommandation AI',
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
          setSavedOffers([...savedOffers, data.saved]);
          toast.success('Offre sauvegardée');
        }
      } catch (e) { toast.error('Une erreur est survenue, réessaie.'); }
    }
  };

  // La recherche est désormais faite côté serveur (France Travail + Adzuna) : on affiche
  // directement les offres renvoyées. `hasQuery` sert juste aux libellés d'état vide.
  const hasQuery = debouncedQuery.length > 0 || contractType !== '';
  const filtered = offers;
  const currentOffer = filtered[cursor] || null;
  const nextOffer = filtered[cursor + 1] || null;
  const isBestOffer = (o: JobOffer) => filtered.length > 0 && offerKey(filtered[0]) === offerKey(o);
  const seenCount = Math.min(cursor, filtered.length);

  // Synthèse du marché pour le bandeau : moyenne et meilleur score de match.
  const matchScores = offers.map((o) => Number(o.matchScore)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgMatch = matchScores.length ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;
  const bestMatch = matchScores.length ? Math.max(...matchScores) : 0;

  // ── Geste de swipe ── Pointer Events couvre souris ET tactile en une seule API.
  const onPointerDown = (e: React.PointerEvent) => {
    if (exiting || !currentOffer) return;
    setDragging(true);
    dragStartX.current = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragX(e.clientX - dragStartX.current);
  };
  const onPointerUpOrLeave = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) commitSwipe('right');
    else if (dragX < -SWIPE_THRESHOLD) commitSwipe('left');
    else setDragX(0);
  };

  // Passer une offre (gauche) ou postuler (droite). Utilisé par le geste ET par les
  // boutons ✕ / ✓ — le swipe n'est jamais la SEULE façon de faire l'action (accessible
  // au clavier/à la souris, et lisible pour qui n'a pas le réflexe de glisser).
  const commitSwipe = (dir: 'left' | 'right') => {
    const offer = currentOffer;
    if (!offer || exiting) return;
    setExiting(dir);
    setDragX(dir === 'right' ? 700 : -700);
    if (dir === 'right') {
      if (offer.contactEmail) setApplyOffer(offer);
      else handlePostuler(offer);
    } else {
      setRejectedKeys((prev) => new Set(prev).add(offerKey(offer)));
    }
    setTimeout(() => {
      setCursor((c) => c + 1);
      setExiting(null);
      setDragX(0);
    }, 220);
  };

  const restart = () => {
    setCursor(0);
    setRejectedKeys(new Set());
    setDragX(0);
    setExiting(null);
  };

  /* Contenu d'une carte d'offre. Refonte 09/2026 : hiérarchie par la typo,
     méta en texte simple, une seule couleur d'accent (le score). */
  const renderCardContent = (offer: JobOffer, isBest: boolean) => {
    const isApplied = appliedKeys.has(offerKey(offer));
    const isBookmarked = !!getSavedId(offer);
    const score = Number(offer.matchScore) || 0;
    const meta = [
      offer.type && { icon: <Briefcase size={14} />, text: offer.type },
      offer.salary && { icon: <Euro size={14} />, text: formatSalary(offer.salary) },
      offer.postedDate && { icon: <Clock size={14} />, text: offer.postedDate },
    ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

    return (
      <>
        {(isBest || offer.partner) && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {isBest && (
              <span className="inline-flex items-center h-6 px-2 rounded-md bg-brand/10 text-brand dark:text-brand-300 text-xs font-medium">
                La plus proche de ton profil
              </span>
            )}
            {offer.partner && (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-subtle text-muted text-xs font-medium">
                <Building2 size={12} /> Publiée par {offer.partner.name}
              </span>
            )}
          </div>
        )}

        {/* Tête : entreprise + titre + score */}
        <div className="flex items-start gap-3.5">
          {offer.partner?.logoUrl ? (
            <span className="w-11 h-11 rounded-lg bg-white border border-line grid place-items-center shrink-0 overflow-hidden">
              <img src={offer.partner.logoUrl} alt="" className="w-full h-full object-contain p-1" />
            </span>
          ) : (
            <span className="w-11 h-11 rounded-lg bg-subtle text-muted grid place-items-center font-semibold shrink-0">
              {offer.company?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl leading-snug">{offer.title}</h2>
            <p className="text-sm text-muted mt-0.5 truncate">
              {offer.company}{offer.location ? <> · {offer.location}</> : null}
            </p>
          </div>
          {score > 0 && (
            <div className="text-right shrink-0">
              <p className={`text-lg font-semibold tabular-nums leading-none ${score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : score >= 50 ? 'text-ink' : 'text-muted'}`}>{score} %</p>
              <p className="text-[11px] text-faint mt-1">compatible</p>
            </div>
          )}
        </div>

        {meta.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-[13px] text-muted">
            {meta.map((m) => (
              <span key={m.text} className="inline-flex items-center gap-1.5">
                <span className="text-faint">{m.icon}</span>{m.text}
              </span>
            ))}
          </div>
        )}

        {offer.aiInsight && (
          <div className="mt-5 rounded-[10px] bg-subtle/70 px-4 py-3">
            <p className="text-xs font-medium text-ink mb-1">Pourquoi cette offre</p>
            <ExpandableText className="text-sm text-muted leading-relaxed" text={offer.aiInsight} />
          </div>
        )}

        {offer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {offer.tags.map((t) => (
              <span key={t} className="chip !h-6">{t}</span>
            ))}
          </div>
        )}

        {/* Actions secondaires : préparer les documents pour CETTE offre. */}
        <div className="flex flex-wrap items-center gap-1 mt-5 pt-4 border-t border-line -mx-1">
          {isApplied && (
            <span className="inline-flex items-center gap-1.5 h-9 px-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Check size={15} /> Dans ton suivi
            </span>
          )}
          <button
            onClick={() => navigate('/prepare/cv', { state: { jobTitle: offer.title, company: offer.company, targetContext: [offer.aiInsight, offer.tags?.length ? `Mots-clés : ${offer.tags.join(', ')}` : '', offer.type ? `Contrat : ${offer.type}` : ''].filter(Boolean).join('\n') } })}
            className="btn btn-ghost !min-h-[36px] !px-2.5"
          >
            <FileText size={15} /> Adapter mon CV
          </button>
          <button
            onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })}
            className="btn btn-ghost !min-h-[36px] !px-2.5"
          >
            <Edit3 size={15} /> Écrire la lettre
          </button>
          {offer.url && (
            <a href={offer.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !min-h-[36px] !px-2.5" title="Voir l'annonce sans l'ajouter au suivi">
              <ExternalLink size={15} /> Annonce
            </a>
          )}
          <button
            onClick={() => toggleSave(offer)}
            aria-label={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder'}
            title={isBookmarked ? 'Retirer des sauvegardées' : 'Sauvegarder'}
            className={`btn btn-ghost !min-h-[36px] !px-2.5 ml-auto ${isBookmarked ? '!text-brand dark:!text-brand-300' : ''}`}
          >
            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </>
    );
  };

  const sourceLabel =
    source === 'demo'
      ? 'Exemples (les offres réelles sont momentanément indisponibles)'
      : source === 'mixed'
        ? 'France Travail et Adzuna'
        : source === 'adzuna'
          ? 'Adzuna'
          : 'France Travail';

  return (
    <div className="px-5 md:px-8 pt-4 md:pt-6 pb-10 max-w-6xl mx-auto">
      <div className="max-w-xl mx-auto space-y-6">
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
                { value: '', label: 'Tous contrats' },
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
            : <>{offers.length} offre{offers.length > 1 ? 's' : ''} · {sourceLabel}{matchScores.length > 0 ? ` · compatibilité moyenne ${avgMatch} %` : ''}</>}
        </p>
      </div>

      {loading ? (
        <OfferSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="offers"
          title={hasQuery ? 'Aucun résultat' : 'Aucune offre pour le moment'}
          description={hasQuery ? 'Essaie un autre métier, un autre contrat ou un rayon plus large.' : 'Indique ton métier et ta ville dans ton profil pour recevoir des offres qui te correspondent.'}
          action={!hasQuery ? <button onClick={() => navigate('/prepare/profile')} className="btn btn-secondary">Compléter mon profil</button> : undefined}
        />
      ) : (
        <div className="space-y-5">
          {currentOffer ? (
            <div className="relative" style={{ minHeight: 400 }}>
              {/* Carte suivante, en aperçu derrière : effet de pile, non interactive. */}
              {nextOffer && (
                <div aria-hidden className="absolute inset-0 z-0 surface p-5 md:p-6 scale-[0.96] translate-y-3 opacity-50 pointer-events-none overflow-hidden">
                  {renderCardContent(nextOffer, false)}
                </div>
              )}

              {/* Carte active : le geste de swipe vit ici. */}
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrLeave}
                onPointerLeave={onPointerUpOrLeave}
                style={{
                  transform: `translateX(${dragX}px) rotate(${dragX / 22}deg)`,
                  transition: dragging ? 'none' : 'transform 220ms ease-out, opacity 220ms ease-out',
                  opacity: exiting ? 0 : 1,
                  touchAction: 'pan-y',
                  cursor: dragging ? 'grabbing' : 'grab',
                }}
                className="relative z-10 surface shadow-card-hover p-5 md:p-6 select-none"
              >
                {/* Retour visuel pendant le glissement. */}
                <span
                  aria-hidden
                  className="absolute top-5 left-5 z-10 h-7 px-2.5 inline-flex items-center rounded-md bg-rose-500 text-white text-xs font-semibold"
                  style={{ opacity: dragX < 0 ? Math.min(-dragX / 100, 1) : 0 }}
                >
                  Passer
                </span>
                <span
                  aria-hidden
                  className="absolute top-5 right-5 z-10 h-7 px-2.5 inline-flex items-center rounded-md bg-emerald-500 text-white text-xs font-semibold"
                  style={{ opacity: dragX > 0 ? Math.min(dragX / 100, 1) : 0 }}
                >
                  Postuler
                </span>

                {renderCardContent(currentOffer, isBestOffer(currentOffer))}
              </div>
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

          {/* Boutons : même effet que le swipe, pour qui ne glisse pas (souris, clavier). */}
          {currentOffer && (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => commitSwipe('left')} className="btn btn-secondary btn-lg">
                  <X size={18} /> Passer
                </button>
                <button onClick={() => commitSwipe('right')} className="btn btn-primary btn-lg">
                  <Send size={17} /> Postuler
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-faint tabular-nums">
                Offre {Math.min(cursor + 1, filtered.length)} sur {filtered.length} · tu peux aussi glisser la carte
              </p>
            </div>
          )}
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
