import React, { useState, useEffect } from 'react';
import { Search, MapPin, Bookmark, Clock, Edit3, ExternalLink, Briefcase, Euro, Sparkles, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import MatchRing from '../components/MatchRing';

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
  const [source, setSource] = useState<'francetravail' | 'demo' | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recRes, savedRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/recommendations`, { credentials: 'include', headers: { ...authHeaders() } }),
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
  }, []);

  const getSavedId = (offer: JobOffer) => {
    const found = savedOffers.find(s => s.title === offer.title && s.company === offer.company);
    return found ? found.id : null;
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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? offers.filter(o => o.title.toLowerCase().includes(q) || o.company.toLowerCase().includes(q) || o.location.toLowerCase().includes(q))
    : offers;

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Barre d'outils (le titre est porté par le hero du layout) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <p className="text-sm text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${source === 'demo' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          {loading
            ? 'Recherche des meilleures offres pour vous…'
            : source === 'demo'
              ? `Exemples illustratifs (France Travail momentanément indisponible) · ${offers.length}`
              : `${offers.length} offres réelles France Travail, sourcées selon votre profil.`}
        </p>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par métier, ville…"
            className="input-pro pl-10 w-full"
          />
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <OfferSkeleton />
          <OfferSkeleton />
          <OfferSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-10 flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-xl surface-accent text-[#7D5CFF] flex items-center justify-center"><Inbox size={24} /></span>
          <div>
            <h3 className="text-base font-semibold text-[#111827] dark:text-white">{q ? 'Aucun résultat' : 'Aucune offre pour le moment'}</h3>
            <p className="text-sm text-[#6B7280] mt-1">{q ? 'Essayez un autre métier ou une autre ville.' : 'Complétez votre profil pour affiner les recommandations.'}</p>
          </div>
          {!q && <button onClick={() => navigate('/prepare/profile')} className="press btn btn-secondary mt-1">Compléter mon profil</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((offer, index) => {
            const isBookmarked = !!getSavedId(offer);
            return (
              <article
                key={offer.id || index}
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                className="surface p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up"
              >
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 text-xs font-medium text-[#6B7280] dark:text-slate-400">
                  {offer.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#9CA3AF]" /> {offer.location}</span>}
                  {offer.salary && <span className="flex items-center gap-1.5"><Euro size={13} className="text-[#9CA3AF]" /> {offer.salary}</span>}
                  {offer.type && <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-[#9CA3AF]" /> {offer.type}</span>}
                  {offer.postedDate && <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#9CA3AF]" /> {offer.postedDate}</span>}
                </div>

                {/* Encart IA */}
                {offer.aiInsight && (
                  <div className="mt-4 surface-accent rounded-lg p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D5CFF] uppercase tracking-wide mb-1">
                      <Sparkles size={12} /> Pourquoi ça matche
                    </p>
                    <p className="text-sm text-[#4B5563] dark:text-slate-300 leading-relaxed">{offer.aiInsight}</p>
                  </div>
                )}

                {/* Tags */}
                {offer.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {offer.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-[#6B7280] dark:text-slate-300 rounded-md font-medium">{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })} className="press btn btn-primary flex-1 sm:flex-none">
                    <Edit3 size={15} /> Créer la lettre
                  </button>
                  {offer.url && (
                    <a href={offer.url} target="_blank" rel="noopener noreferrer" className="press btn btn-secondary">
                      <ExternalLink size={15} /> Voir l'offre
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
      )}
    </div>
  );
};

export default PersonalizedOffers;
