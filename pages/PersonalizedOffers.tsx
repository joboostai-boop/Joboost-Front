import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Sparkles, Navigation, Send, Check, X, FileText, Building2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import MatchBadge from '../components/MatchBadge';
import EmptyState from '../components/EmptyState';
import ExpandableText from '../components/ExpandableText';
import FilterSelect from '../components/FilterSelect';
import ApplyInAppModal from '../components/ApplyInAppModal';
import { formatSalary } from '../services/format';
import { companyGradient } from '../services/visual';

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
        toast.error("Erreur de récupération des offres.");
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
          ? `C'est noté ! ${offer.partner.name} voit ta candidature sur ton profil.`
          : "Ajoutée à ton suivi (Envoyées) — finalise sur la page de l'offre.");
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
          toast.success("Offre retirée des favoris");
        }
      } catch (e) { toast.error("Erreur système"); }
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
          toast.success("Offre enregistrée");
        }
      } catch (e) { toast.error("Erreur système"); }
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

  /* Contenu détaillé d'une carte (chips, analyse IA, tags) — inchangé dans le fond,
     seul l'agencement autour (pile + swipe) a changé. */
  const renderCardContent = (offer: JobOffer, isBest: boolean) => {
    const isApplied = appliedKeys.has(offerKey(offer));
    const isBookmarked = !!getSavedId(offer);
    return (
      <>
        {isBest && (
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6DFF] via-[#7D5CFF] to-[#6D28D9]" />
        )}
        {isBest && (
          <div className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-bold uppercase tracking-wide shadow-[0_2px_10px_rgba(125,92,255,0.4)]">
            <Sparkles size={12} /> Meilleur match pour toi
          </div>
        )}

        {/* Offre publiée par l'organisme du candidat : attribution bien visible */}
        {offer.partner && (
          <div className={`inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full bg-[#7D5CFF]/10 border border-[#7D5CFF]/25 text-[#6D28D9] dark:text-[#B9A7FF] text-[11px] font-bold ${isBest ? 'ml-2' : ''}`}>
            <Building2 size={12} /> Publiée par votre organisme · {offer.partner.name}
          </div>
        )}

        {/* Tête : entreprise + titre + badge de compatibilité */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            {offer.partner?.logoUrl ? (
              <span className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-[#ECEAF6] dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_3px_10px_rgba(16,24,40,0.12)]">
                <img src={offer.partner.logoUrl} alt={offer.partner.name} className="w-full h-full object-contain p-1" />
              </span>
            ) : (
              <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${companyGradient(offer.company)} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-[0_3px_10px_rgba(16,24,40,0.18)]`}>
                {offer.company?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-[#111827] dark:text-white leading-tight">{offer.title}</h2>
              <p className="text-sm text-[#7D5CFF] font-semibold truncate mt-0.5">{offer.company}</p>
            </div>
          </div>
          <MatchBadge score={offer.matchScore} detailed className="hidden sm:inline-flex" />
        </div>
        <MatchBadge score={offer.matchScore} detailed className="sm:hidden mt-3" />

        {/* Méta en chips : le salaire (vert) et le contrat (bleu) ressortent
            au premier coup d'œil — les infos clés d'une offre. */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4">
          {offer.salary && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Euro size={13} /> {formatSalary(offer.salary)}
            </span>
          )}
          {offer.type && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <Briefcase size={13} /> {offer.type}
            </span>
          )}
          {offer.location && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-medium text-[#6B7280] dark:text-slate-300">
              <MapPin size={13} className="text-[#9CA3AF]" /> {offer.location}
            </span>
          )}
          {offer.postedDate && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs font-medium text-[#6B7280] dark:text-slate-300">
              <Clock size={13} className="text-[#9CA3AF]" /> {offer.postedDate}
            </span>
          )}
        </div>

        {/* Encart IA — bordure gauche dégradée : signature visuelle de l'analyse Joboost */}
        {offer.aiInsight && (
          <div className="relative mt-4 rounded-lg p-3 pl-4 bg-gradient-to-r from-[#7D5CFF]/[0.07] to-transparent dark:from-[#7D5CFF]/10 overflow-hidden">
            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-gradient-to-b from-[#8C6DFF] to-[#6D28D9]" />
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#7D5CFF] uppercase tracking-wide mb-1">
              <Sparkles size={12} /> Pourquoi ça matche
            </p>
            <ExpandableText className="text-sm text-[#4B5563] dark:text-slate-300 leading-relaxed" text={offer.aiInsight} />
          </div>
        )}

        {/* Tags — pastilles teintées marque (compétences/mots-clés de l'offre) */}
        {offer.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {offer.tags.map(t => (
              <span key={t} className="px-2.5 py-0.5 bg-[#7D5CFF]/[0.06] dark:bg-[#7D5CFF]/10 border border-[#7D5CFF]/15 dark:border-[#7D5CFF]/20 text-[11px] text-[#6D28D9] dark:text-[#A78BFA] rounded-full font-semibold">{t}</span>
            ))}
          </div>
        )}

        {/* Actions secondaires — postuler/passer se font désormais par le geste ou les
            gros boutons ✕/✓ sous la carte ; ici ne restent que les à-côtés. */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          {isApplied && (
            <span className="press btn flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 cursor-default">
              <Check size={15} /> Dans ton suivi
            </span>
          )}
          <button onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })} className="press btn btn-secondary" title="Créer la lettre de motivation">
            <Edit3 size={15} /> Lettre
          </button>
          <button
            onClick={() => navigate('/prepare/cv', { state: { jobTitle: offer.title, company: offer.company, targetContext: [offer.aiInsight, offer.tags?.length ? `Mots-clés : ${offer.tags.join(', ')}` : '', offer.type ? `Contrat : ${offer.type}` : ''].filter(Boolean).join('\n') } })}
            className="press btn btn-secondary"
            title="Générer un CV adapté à cette offre"
          >
            <FileText size={15} /> CV
          </button>
          {offer.url && (
            <a href={offer.url} target="_blank" rel="noopener noreferrer" className="press btn btn-secondary !px-3" title="Voir l'offre (sans l'ajouter au suivi)">
              <ExternalLink size={15} />
            </a>
          )}
          <button
            onClick={() => toggleSave(offer)}
            aria-label={isBookmarked ? 'Retirer des favoris' : 'Enregistrer'}
            title={isBookmarked ? 'Retirer des favoris' : 'Enregistrer'}
            className={`press btn !px-3 ml-auto ${isBookmarked ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30' : 'btn-secondary'}`}
          >
            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Barre d'outils (le titre est porté par le hero du layout) */}
      <header className="surface !rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${source === 'demo' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
            {loading
              ? 'Recherche des meilleures offres pour vous…'
              : source === 'demo'
                ? `Exemples illustratifs (offres réelles momentanément indisponibles) · ${offers.length}`
                : source === 'mixed'
                  ? `${offers.length} offres réelles (France Travail + Adzuna).`
                  : source === 'adzuna'
                    ? `${offers.length} offres réelles via Adzuna.`
                    : `${offers.length} offres réelles France Travail.`}
          </p>
          {/* Pouls du marché : compatibilité moyenne et meilleur score du lot. */}
          {!loading && matchScores.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-bold shadow-[0_2px_8px_rgba(125,92,255,0.35)]">
                <Sparkles size={11} /> Meilleur match {bestMatch}%
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7D5CFF]/[0.07] dark:bg-[#7D5CFF]/10 border border-[#7D5CFF]/15 text-[#6D28D9] dark:text-[#A78BFA] text-[11px] font-bold">
                Compatibilité moyenne {avgMatch}%
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          <FilterSelect
            className="w-full sm:w-auto shrink-0"
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
            className="w-full sm:w-auto shrink-0"
            ariaLabel="Rayon de recherche autour de ta ville"
            icon={<Navigation size={16} />}
            value={radius}
            onChange={(v) => setRadius(Number(v))}
            options={[10, 20, 30, 50, 100].map((km) => ({ value: km, label: `${km} km` }))}
          />
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un autre métier…"
              className="input-pro pl-10 w-full"
            />
          </div>
        </div>
      </header>

      {loading ? (
        <OfferSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="offers"
          title={hasQuery ? 'Aucun résultat' : 'Aucune offre pour le moment'}
          description={hasQuery ? 'Essayez un autre métier, un autre type de contrat ou un rayon plus large.' : 'Complétez votre profil pour que l\'IA cible des offres qui vous correspondent vraiment.'}
          action={!hasQuery ? <button onClick={() => navigate('/prepare/profile')} className="press btn btn-secondary">Compléter mon profil</button> : undefined}
        />
      ) : (
        <div className="space-y-5">
          {/* Compteur de progression dans la pile */}
          <p className="text-center text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
            {Math.min(cursor + 1, filtered.length)} / {filtered.length} offres
          </p>

          {currentOffer ? (
            <div className="relative max-w-xl mx-auto" style={{ minHeight: 420 }}>
              {/* Carte suivante, en aperçu derrière — donne l'effet de pile, non interactive. */}
              {nextOffer && (
                <div aria-hidden className="absolute inset-0 z-0 surface p-5 md:p-6 scale-[0.96] translate-y-3 opacity-60 pointer-events-none overflow-hidden">
                  {renderCardContent(nextOffer, false)}
                </div>
              )}

              {/* Carte active — le geste de swipe vit ici. */}
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUpOrLeave}
                onPointerLeave={onPointerUpOrLeave}
                style={{
                  transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`,
                  transition: dragging ? 'none' : 'transform 220ms ease-out, opacity 220ms ease-out',
                  opacity: exiting ? 0 : 1,
                  touchAction: 'pan-y',
                  cursor: dragging ? 'grabbing' : 'grab',
                }}
                className={`relative z-10 surface p-5 md:p-6 select-none ${isBestOffer(currentOffer) ? 'ring-2 ring-[#7D5CFF]/30 shadow-[0_10px_36px_-8px_rgba(125,92,255,0.28)]' : ''}`}
              >
                {/* Étiquettes qui apparaissent pendant le glissement — retour visuel immédiat. */}
                <span
                  aria-hidden
                  className="absolute top-6 left-6 z-10 px-3 py-1.5 rounded-lg border-[3px] border-rose-500 text-rose-500 font-black text-sm uppercase tracking-wider -rotate-12"
                  style={{ opacity: dragX < 0 ? Math.min(-dragX / 100, 1) : 0 }}
                >
                  Passer
                </span>
                <span
                  aria-hidden
                  className="absolute top-6 right-6 z-10 px-3 py-1.5 rounded-lg border-[3px] border-emerald-500 text-emerald-500 font-black text-sm uppercase tracking-wider rotate-12"
                  style={{ opacity: dragX > 0 ? Math.min(dragX / 100, 1) : 0 }}
                >
                  Postuler
                </span>

                {renderCardContent(currentOffer, isBestOffer(currentOffer))}
              </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto">
              <EmptyState
                variant="offers"
                title="Tu as vu toutes les offres"
                description={`${appliedKeys.size} candidature${appliedKeys.size > 1 ? 's' : ''} envoyée${appliedKeys.size > 1 ? 's' : ''}, ${rejectedKeys.size} passée${rejectedKeys.size > 1 ? 's' : ''}. Élargis le rayon ou change de métier pour en voir de nouvelles.`}
                action={
                  <button onClick={restart} className="press btn btn-secondary">
                    <RotateCcw size={15} /> Revoir depuis le début
                  </button>
                }
              />
            </div>
          )}

          {/* Boutons de secours — même effet que le swipe, accessibles sans glisser
              (souris précise, clavier, lecteur d'écran, ou simplement par préférence). */}
          {currentOffer && (
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={() => commitSwipe('left')}
                aria-label="Passer cette offre"
                title="Passer"
                className="press w-14 h-14 rounded-full bg-white dark:bg-[#111827] border-2 border-rose-200 dark:border-rose-500/30 text-rose-500 flex items-center justify-center shadow-card hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
              <button
                onClick={() => toggleSave(currentOffer)}
                aria-label={getSavedId(currentOffer) ? 'Retirer des favoris' : 'Enregistrer pour plus tard'}
                title={getSavedId(currentOffer) ? 'Retirer des favoris' : 'Enregistrer pour plus tard'}
                className={`press w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-card transition-colors ${
                  getSavedId(currentOffer)
                    ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-500/10 dark:border-amber-500/30'
                    : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-300'
                }`}
              >
                <Bookmark size={18} fill={getSavedId(currentOffer) ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => commitSwipe('right')}
                aria-label="Postuler à cette offre"
                title="Postuler"
                className="press w-14 h-14 rounded-full bg-gradient-to-br from-[#34D399] to-[#059669] text-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(5,150,105,0.5)] hover:-translate-y-0.5 transition-all"
              >
                <Send size={22} />
              </button>
            </div>
          )}
          <p className="text-center text-xs text-[#9CA3AF]">Glisse la carte à droite pour postuler, à gauche pour passer — ou utilise les boutons.</p>
        </div>
      )}

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
