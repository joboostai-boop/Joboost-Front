import React, { useState, useEffect } from 'react';
import { Search, MapPin, Bookmark, Star, ArrowRight, Euro, Clock, Link as LinkIcon, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
  tags: string[];
  aiInsight: string;
}

const PersonalizedOffers: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [savedOffers, setSavedOffers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [recRes, savedRes] = await Promise.all([
          fetch('/api/opportunities/recommendations'),
          fetch('/api/opportunities/saved')
        ]);
        
        const recData = await recRes.json();
        const savedData = await savedRes.json();

        if (recData.success) {
           setOffers(recData.recommendations);
        }
        
        if (savedData.success) {
           setSavedOffers(savedData.saved);
        }
      } catch(e) {
        toast.error("Erreur de récupération des offres.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Détermine si une offre est sauvegardée en cherchant son titre et entreprise
  const getSavedId = (offer: JobOffer) => {
    const found = savedOffers.find(s => s.title === offer.title && s.company === offer.company);
    return found ? found.id : null;
  };

  const toggleSave = async (offer: JobOffer) => {
    const savedId = getSavedId(offer);
    
    if (savedId) {
      // DELETE
      try {
        const res = await fetch(`/api/opportunities/saved/${savedId}`, { method: 'DELETE' });
        const data = await res.json();
        if(data.success) {
          setSavedOffers(savedOffers.filter(s => s.id !== savedId));
          toast.success("Offre retirée des favoris");
        }
      } catch(e) { toast.error("Erreur système"); }
    } else {
      // POST
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
          tags: offer.tags,
          aiInsight: offer.aiInsight
        };

        const res = await fetch('/api/opportunities/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.success) {
          setSavedOffers([...savedOffers, data.saved]);
          toast.success("Offre enregistrée");
        }
      } catch(e) { toast.error("Erreur système"); }
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E5E7EB] dark:border-[#1F2937] pb-8">
        <div>
          <h1>Offres recommandées</h1>
          <p className="mt-1">Simulé coté Backend: l'I.A. a sourcé ces offres selon votre profil réel.</p>
        </div>
        
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
          <input type="text" placeholder="Rechercher par métier..." className="input-pro pl-10 w-full md:w-64" />
        </div>
      </header>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Génération intelligente de vos offres en cours...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map((offer, i) => {
            const isBookmarked = !!getSavedId(offer);
            return (
              <div key={i} className="card-pro p-6 hover:border-[#D1D5DB] dark:hover:border-[#4B5563] transition-colors flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-[#111827] dark:text-white">{offer.title}</h2>
                      <p className="text-[#7D5CFF] font-semibold text-sm tracking-wide">{offer.company}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] px-3 py-1.5 rounded-full text-xs font-bold border border-[#7D5CFF]/30">
                       <Star size={14} fill="currentColor" />
                       {offer.matchScore}% de pertinence
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs font-medium text-[#6B7280] bg-[#F3F4F6] dark:bg-[#111827] p-3 rounded border border-[#E5E7EB] dark:border-[#1F2937]">
                    <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#9CA3AF]" /> {offer.location}</span>
                    <span className="flex items-center gap-1.5"><Euro size={14} className="text-[#9CA3AF]" /> {offer.salary}</span>
                    <span className="flex items-center gap-1.5"><Clock size={14} className="text-[#9CA3AF]" /> {offer.postedDate}</span>
                  </div>

                  <div className="space-y-2 text-sm pt-2">
                     <p className="font-semibold text-[#111827] dark:text-gray-200">Pourquoi cette offre vous matche-t-elle ?</p>
                     <div className="p-4 bg-[#F3F0FF] dark:bg-[#111827] rounded border-l-4 border-[#7D5CFF]">
                       <p className="text-sm text-[#4B5563] dark:text-[#D1D5DB] font-medium leading-relaxed">"{offer.aiInsight}"</p>
                     </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                     {offer.tags.map(t => (
                        <span key={t} className="px-2 py-1 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#374151] text-xs text-[#6B7280] dark:text-[#9CA3AF] rounded font-semibold">{t}</span>
                     ))}
                  </div>
                </div>

                <div className="md:w-48 flex md:flex-col gap-2 justify-center">
                  <button onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })} className="btn btn-primary w-full shadow-none flex items-center justify-center gap-2">
                    <Edit3 size={16} />
                    Créer la lettre
                  </button>
                  <button 
                    onClick={() => toggleSave(offer)}
                    className={`btn w-full font-semibold transition-colors flex items-center justify-center gap-2 ${
                      isBookmarked ? 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' : 'btn-secondary bg-white'
                    }`}
                  >
                    <Bookmark size={16} fill={isBookmarked ? "currentColor" : "none"} /> 
                    {isBookmarked ? 'Sauvegardé' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PersonalizedOffers;