import React, { useState, useEffect } from 'react';
import { Search, MapPin, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Sparkles, Inbox, Navigation, Send, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import MatchRing from '../components/MatchRing';
import EmptyState from '../components/EmptyState';
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
}

const OfferSkeleton: React.FC = () => (
  <div className="surface p-5 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-44 rounded" />
          <div className="skeleton h-3 w-28 rounded" />
        </div>
      </div>
      <div className="skeleton w-12 h-12 rounded-full" />
    </div>
    <div className="skeleton h-9 w-full rounded-lg" />
    <div className="skeleton h-14 w-full rounded-lg" />
    <div className="flex gap-2">
      <div className="skeleton h-8 w-32 rounded-lg" />
      <div className="skeleton h-8 w-28 rounded-lg" />
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

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Barre d'outils (le titre est porté par le hero du layout) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-sm text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${source === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
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

        <div className="flex flex-col sm:flex-row items-stretch gap-2 w-full md:w-auto">
          <div className="relative shrink-0">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              title="Type de contrat"
              className="input-pro pl-9 pr-8 appearance-none cursor-pointer w-full sm:w-auto"
            >
              <option value="">Tous contrats</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="MIS">Intérim</option>
              <option value="SAI">Saisonnier</option>
            </select>
          </div>
          <div className="relative shrink-0">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              title="Rayon de recherche autour de ta ville"
              className="input-pro pl-9 pr-8 appearance-none cursor-pointer w-full sm:w-auto"
            >
              {[10, 20, 30, 50, 100].map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          </div>
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
        <div className="space-y-4">
          <OfferSkeleton />
          <OfferSkeleton />
          <OfferSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="offers"
          title={hasQuery ? 'Aucun résultat' : 'Aucune offre pour le moment'}
          description={hasQuery ? 'Essayez un autre métier, un autre type de contrat ou un rayon plus large.' : 'Complétez votre profil pour que l\'IA cible des offres qui vous correspondent vraiment.'}
          action={!hasQuery ? <button onClick={() => navigate('/prepare/profile')} className="press btn btn-secondary">Compléter mon profil</button> : undefined}
        />
      ) : (
        <>
        <div className="space-y-4">
          {pageOffers.map((offer, index) => {
            const isBookmarked = !!getSavedId(offer);
            const globalIndex = (currentPage - 1) * PER_PAGE + index;
            return (
              <article
                key={offer.id || globalIndex}
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                className={`surface p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up ${globalIndex === 0 ? 'ring-2 ring-[#7D5CFF]/25' : ''}`}
              >
                {globalIndex === 0 && (
                  <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] text-[11px] font-bold uppercase tracking-wide border border-[#7D5CFF]/20">
                    <Sparkles size={12} /> Meilleur match
                  </div>
                )}
                {/* Tête : entreprise + titre + jauge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-sm shrink-0">
                      {offer.company?.charAt(0) || '?'}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-[#111827] dark:text-white leading-tight">{offer.title}</h2>
                      <p className="text-sm text-[#7D5CFF] font-medium truncate">{offer.company}</p>
                    </div>
                  </div>
                  <MatchRing score={offer.matchScore} />
                </div>

                {/* Méta en ligne */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs font-medium text-[#6B7280] dark:text-slate-400">
                  {offer.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#9CA3AF]" /> {offer.location}</span>}
                  {offer.salary && <span className="flex items-center gap-1.5"><Euro size={13} className="text-[#9CA3AF]" /> {formatSalary(offer.salary)}</span>}
                  {offer.type && <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-[#9CA3AF]" /> {offer.type}</span>}
                  {offer.postedDate && <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#9CA3AF]" /> {offer.postedDate}</span>}
                </div>

                {/* Encart IA */}
                {offer.aiInsight && (
                  <div className="mt-3 surface-accent rounded-lg p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D5CFF] uppercase tracking-wide mb-1">
                      <Sparkles size={12} /> Pourquoi ça matche
                    </p>
                    <p className="text-sm text-[#4B5563] dark:text-slate-300 leading-relaxed">{offer.aiInsight}</p>
                  </div>
                )}

                {/* Tags */}
                {offer.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {offer.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-[#6B7280] dark:text-slate-300 rounded-md font-medium">{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
                  {(() => {
                    const isApplied = appliedKeys.has(offerKey(offer));
                    return (
                      <button
                        onClick={() => handlePostuler(offer)}
                        disabled={isApplied}
                        className={`press btn flex-1 sm:flex-none ${isApplied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 cursor-default' : 'btn-primary'}`}
                      >
                        {isApplied ? <><Check size={15} /> Dans ton suivi</> : <><Send size={15} /> Postuler</>}
                      </button>
                    );
                  })()}
                  <button onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })} className="press btn btn-secondary" title="Créer la lettre de motivation">
                    <Edit3 size={15} /> Lettre
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
          })}
        </div>

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
        </>
      )}
    </div>
  );
};

export default PersonalizedOffers;
