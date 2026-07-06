import React, { useState, useEffect } from 'react';
import { Search, MapPin, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Sparkles, Navigation, Send, Check, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
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
}

/* Squelette du nouvel agencement : liste compacte à gauche + panneau à droite. */
const OfferSkeleton: React.FC = () => (
  <div className="lg:grid lg:grid-cols-12 lg:gap-5 space-y-3 lg:space-y-0">
    <div className="lg:col-span-5 space-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface p-3.5 flex items-center gap-3">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
          <div className="skeleton h-5 w-12 rounded-full" />
        </div>
      ))}
    </div>
    <div className="hidden lg:block lg:col-span-7">
      <div className="surface p-6 space-y-4">
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
    </div>
  </div>
);

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
  const [page, setPage] = useState(1); // pagination (affichage)
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set()); // offres déjà ajoutées au suivi (cette session)
  const [applyOffer, setApplyOffer] = useState<JobOffer | null>(null); // offre en cours de candidature in-app
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // offre affichée dans le panneau de détail

  const PER_PAGE = 10;

  const offerKey = (o: JobOffer) => `${o.title}__${o.company}`;

  // Anti-rebond : on attend ~500 ms après la dernière frappe avant de relancer la recherche.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  // Toute nouvelle recherche (mot-clé, contrat, rayon) ramène à la première page.
  useEffect(() => { setPage(1); }, [debouncedQuery, contractType, radius]);

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
    if (appliedKeys.has(key)) { toast('Déjà dans ton suivi.'); return; }
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
          notes: offer.url ? `Offre : ${offer.url}` : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedKeys((prev) => new Set(prev).add(key));
        toast.success("Ajoutée à ton suivi (Envoyées) — finalise sur la page de l'offre.");
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

  // Pagination (côté affichage) sur les offres déjà chargées.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageOffers = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sélection pour le panneau de détail : par défaut, la première offre de la page.
  useEffect(() => {
    if (!pageOffers.length) return;
    if (!selectedKey || !pageOffers.some((o) => offerKey(o) === selectedKey)) {
      setSelectedKey(offerKey(pageOffers[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageOffers, selectedKey]);
  const selectedOffer = pageOffers.find((o) => offerKey(o) === selectedKey) || pageOffers[0] || null;
  const isBestOffer = (o: JobOffer) => filtered.length > 0 && offerKey(filtered[0]) === offerKey(o);

  // Synthèse du marché pour le bandeau : moyenne et meilleur score de match.
  const matchScores = offers.map((o) => Number(o.matchScore)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgMatch = matchScores.length ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;
  const bestMatch = matchScores.length ? Math.max(...matchScores) : 0;

  /* Panneau de détail d'une offre : tout le contenu riche (chips, analyse IA, tags,
     actions) vit ici — la liste de gauche reste scannable en un coup d'œil. */
  const renderDetail = (offer: JobOffer, isBest: boolean) => {
    const isApplied = appliedKeys.has(offerKey(offer));
    const isBookmarked = !!getSavedId(offer);
    return (
      <article className={`surface relative overflow-hidden p-5 md:p-6 ${isBest ? 'ring-2 ring-[#7D5CFF]/30 shadow-[0_10px_36px_-8px_rgba(125,92,255,0.28)]' : ''}`}>
        {isBest && (
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6DFF] via-[#7D5CFF] to-[#6D28D9]" />
        )}
        {isBest && (
          <div className="inline-flex items-center gap-1.5 mb-4 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-bold uppercase tracking-wide shadow-[0_2px_10px_rgba(125,92,255,0.4)]">
            <Sparkles size={12} /> Meilleur match pour toi
          </div>
        )}

        {/* Tête : entreprise + titre + badge de compatibilité */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <span className={`w-12 h-12 rounded-xl bg-gradient-to-br ${companyGradient(offer.company)} text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-[0_3px_10px_rgba(16,24,40,0.18)]`}>
              {offer.company?.charAt(0)?.toUpperCase() || '?'}
            </span>
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

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          {(() => {
            if (isApplied) {
              return (
                <button disabled className="press btn flex-1 sm:flex-none bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 cursor-default">
                  <Check size={15} /> Dans ton suivi
                </button>
              );
            }
            // Offre avec email employeur → candidature 100 % dans l'app (envoi par email).
            // Sur le meilleur match, le bouton porte un reflet animé (tab-shine) → CTA n°1.
            if (offer.contactEmail) {
              return (
                <button onClick={() => setApplyOffer(offer)} className={`press btn btn-primary flex-1 sm:flex-none ${isBest ? 'tab-shine' : ''}`} title="Envoyer ta candidature par email, sans quitter Joboost">
                  <Send size={15} /> Postuler depuis Joboost
                </button>
              );
            }
            // Sinon → ouverture de l'offre (l'employeur reçoit via son propre système) + suivi.
            return (
              <button onClick={() => handlePostuler(offer)} className={`press btn btn-primary flex-1 sm:flex-none ${isBest ? 'tab-shine' : ''}`}>
                <Send size={15} /> Postuler
              </button>
            );
          })()}
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
      </article>
    );
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
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
              { value: 'DIN', label: 'CDI intérimaire' },
              { value: 'SAI', label: 'Saisonnier' },
              { value: 'E2', label: 'Alternance · apprentissage' },
              { value: 'FS', label: 'Alternance · professionnalisation' },
              { value: 'DDI', label: "CDD d'insertion" },
              { value: 'TTI', label: "Intérim d'insertion" },
              { value: 'CCE', label: 'Profession commerciale' },
              { value: 'LIB', label: 'Profession libérale' },
              { value: 'FRA', label: 'Franchise' },
              { value: 'REP', label: "Reprise d'entreprise" },
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
        <div className="lg:grid lg:grid-cols-12 lg:gap-5 lg:items-start space-y-3 lg:space-y-0">
          {/* ── Liste compacte (gauche) : on scanne, on clique, le détail s'affiche à droite.
                 Sur mobile, le détail se déplie sous la ligne sélectionnée. ── */}
          <div className="lg:col-span-5 space-y-2.5">
            {pageOffers.map((offer, index) => {
              const key = offerKey(offer);
              const isSelected = selectedKey === key;
              const globalIndex = (currentPage - 1) * PER_PAGE + index;
              const isBest = globalIndex === 0 && currentPage === 1;
              const isApplied = appliedKeys.has(key);
              const isBookmarked = !!getSavedId(offer);
              return (
                <React.Fragment key={offer.id || globalIndex}>
                  <button
                    onClick={() => setSelectedKey(key)}
                    aria-pressed={isSelected}
                    style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                    className={`press w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/45 ${
                      isSelected
                        ? 'bg-white dark:bg-[#111827] border-[#7D5CFF]/45 ring-1 ring-[#7D5CFF]/30 shadow-card'
                        : 'bg-white/70 dark:bg-[#111827]/70 border-[#ECEAF6] dark:border-[#1F2937] hover:border-[#7D5CFF]/30 hover:bg-white dark:hover:bg-[#111827]'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${companyGradient(offer.company)} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-[0_2px_8px_rgba(16,24,40,0.16)]`}>
                      {offer.company?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {isBest && <Sparkles size={12} className="text-[#7D5CFF] shrink-0" />}
                        <span className="block text-sm font-bold text-[#111827] dark:text-white truncate">{offer.title}</span>
                      </span>
                      <span className="block text-xs text-[#6B7280] dark:text-slate-400 truncate mt-0.5">
                        {offer.company}{offer.location ? ` · ${offer.location}` : ''}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      <MatchBadge score={offer.matchScore} />
                      {(isApplied || isBookmarked) && (
                        <span className="flex items-center gap-1">
                          {isApplied && <Check size={12} className="text-emerald-500" strokeWidth={3} />}
                          {isBookmarked && <Bookmark size={11} className="text-amber-500" fill="currentColor" />}
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Mobile : détail accordéon sous la ligne sélectionnée */}
                  {isSelected && (
                    <div className="lg:hidden animate-fade-in-up">
                      {renderDetail(offer, isBestOffer(offer))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-1.5 pt-2" aria-label="Pagination des offres">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="press btn btn-secondary !px-3 disabled:opacity-40"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    aria-current={p === currentPage ? 'page' : undefined}
                    className={`press btn !px-3.5 ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="press btn btn-secondary !px-3 disabled:opacity-40"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={16} />
                </button>
              </nav>
            )}
          </div>

          {/* ── Panneau de détail (droite, desktop) : collant au scroll ── */}
          <div className="hidden lg:block lg:col-span-7">
            {selectedOffer && (
              <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-none rounded-2xl" key={offerKey(selectedOffer)}>
                <div className="animate-fade-in">
                  {renderDetail(selectedOffer, isBestOffer(selectedOffer))}
                </div>
              </div>
            )}
          </div>
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
