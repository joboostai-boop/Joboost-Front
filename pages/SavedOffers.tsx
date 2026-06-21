import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, ArrowRight, MapPin, Euro, Clock, Sparkles, Send, Check, Edit3, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import MatchRing from '../components/MatchRing';
import EmptyState from '../components/EmptyState';
import { formatSalary } from '../services/format';

interface SavedOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  matchScore: number;
  postedDate: string;
  source: string;
  tags: string[];
  aiInsight: string;
  url?: string;
}

const SavedSkeleton: React.FC = () => (
  <div className="surface p-5 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-lg" />
        <div className="space-y-2"><div className="skeleton h-4 w-44 rounded" /><div className="skeleton h-3 w-28 rounded" /></div>
      </div>
      <div className="skeleton w-12 h-12 rounded-full" />
    </div>
    <div className="skeleton h-14 w-full rounded-lg" />
  </div>
);

const SavedOffers: React.FC = () => {
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const offerKey = (o: SavedOffer) => `${o.title}__${o.company}`;

  // Voir le détail dans PersonalizedOffers : ouvre l'offre + ajoute la candidature au Suivi.
  const handlePostuler = async (offer: SavedOffer) => {
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
      } else { toast.error(data.error || "Impossible d'ajouter au suivi."); }
    } catch { toast.error('Erreur réseau.'); }
  };

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved`, { credentials: 'include', headers: { ...authHeaders() } });
        const data = await res.json();
        if (data.success) {
          setSavedOffers(data.saved);
        }
      } catch (e) {
        toast.error("Impossible de charger les favoris");
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  const removeOffer = async (offerId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved/${offerId}`, { method: 'DELETE', credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success) {
        setSavedOffers(savedOffers.filter(o => o.id !== offerId));
        toast.success("Offre retirée des favoris");
      }
    } catch (e) {
      toast.error("Erreur système");
    }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-slate-400">
        <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] font-bold tabular-nums">{loading ? '–' : savedOffers.length}</span>
        opportunité{savedOffers.length > 1 ? 's' : ''} mise{savedOffers.length > 1 ? 's' : ''} de côté
      </header>

      {loading ? (
        <div className="space-y-4"><SavedSkeleton /><SavedSkeleton /></div>
      ) : savedOffers.length === 0 ? (
        <EmptyState
          variant="saved"
          title="Aucun favori pour l'instant"
          description="Parcourez les offres recommandées et mettez de côté celles qui vous intéressent pour y revenir plus tard."
          action={
            <button onClick={() => navigate('/target/offers')} className="press btn btn-secondary">Voir les offres <ArrowRight size={15} /></button>
          }
        />
      ) : (
        <div className="space-y-4">
          {savedOffers.map((offer, index) => (
            <article
              key={offer.id}
              style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              className="surface p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 animate-fade-in-up"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-semibold text-sm shrink-0">
                    {offer.company?.charAt(0) || '?'}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{offer.title}</h2>
                    <p className="text-sm text-[#7D5CFF] font-medium truncate">{offer.company}</p>
                  </div>
                </div>
                {offer.matchScore ? <MatchRing score={offer.matchScore} /> : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs font-medium text-[#6B7280] dark:text-slate-400">
                {offer.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#9CA3AF]" /> {offer.location}</span>}
                {offer.salary && <span className="flex items-center gap-1.5"><Euro size={13} className="text-[#9CA3AF]" /> {formatSalary(offer.salary)}</span>}
                {offer.postedDate && <span className="flex items-center gap-1.5"><Clock size={13} className="text-[#9CA3AF]" /> {offer.postedDate}</span>}
              </div>

              {offer.aiInsight && (
                <div className="mt-3 surface-accent rounded-lg p-3">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D5CFF] uppercase tracking-wide mb-1">
                    <Sparkles size={12} /> Pourquoi ça matche
                  </p>
                  <p className="text-sm text-[#4B5563] dark:text-slate-300 leading-relaxed">{offer.aiInsight}</p>
                </div>
              )}

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
                <button
                  onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })}
                  className="press btn btn-secondary"
                  title="Créer la lettre de motivation"
                >
                  <Edit3 size={15} /> Lettre
                </button>
                {offer.url && (
                  <a href={offer.url} target="_blank" rel="noopener noreferrer" className="press btn btn-secondary !px-3" title="Voir l'offre (sans l'ajouter au suivi)">
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  onClick={() => removeOffer(offer.id)}
                  aria-label="Retirer des favoris"
                  title="Retirer des favoris"
                  className="press btn btn-secondary !px-3 ml-auto !text-red-500 hover:!bg-red-50 hover:!border-red-200 dark:hover:!bg-red-900/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedOffers;
