import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  Trash2, 
  ArrowRight, 
  MapPin, 
  Euro,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
}

const SavedOffers: React.FC = () => {
  const [savedOffers, setSavedOffers] = useState<SavedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved`);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/saved/${offerId}`, { method: 'DELETE' });
      const data = await res.json();
      if(data.success) {
        setSavedOffers(savedOffers.filter(o => o.id !== offerId));
        toast.success("Offre retirée des favoris");
      }
    } catch(e) { 
      toast.error("Erreur système"); 
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
      <header className="border-b border-slate-100 dark:border-slate-800 pb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mes Offres Sauvegardées</h1>
        <p className="text-slate-500 text-sm mt-1">Retrouvez toutes les opportunités que vous avez isolées depuis le marché.</p>
      </header>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : savedOffers.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-8 card-modern border-dashed bg-slate-50/50">
          <Bookmark className="text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Aucun favori</h3>
          <p className="text-sm text-slate-500">Parcourez les offres personnalisées pour commencer à en enregistrer.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedOffers.map((offer) => (
            <div key={offer.id} className="card-modern p-6 flex flex-col md:flex-row gap-6 hover:border-indigo-200 transition-all">
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{offer.title}</h2>
                    <p className="text-indigo-600 font-bold text-sm">{offer.company}</p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">{offer.matchScore}% Match</span>
                </div>
                
                <div className="flex gap-4 text-xs font-bold text-slate-500 uppercase tracking-tight">
                  <span className="flex items-center gap-1.5"><MapPin size={14} /> {offer.location}</span>
                  <span className="text-indigo-600">{offer.salary || 'Non spécifié'}</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> {offer.postedDate || "Récent"}</span>
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-xl border-l-2 border-indigo-500 text-sm italic text-slate-600">
                   "{offer.aiInsight}"
                </div>
              </div>

              <div className="md:w-48 flex md:flex-col gap-2 justify-center">
                <button 
                   onClick={() => navigate('/target/letter', { state: { jobTitle: offer.title, company: offer.company, targetContext: offer.aiInsight } })}
                   className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  Générer Lettre <ArrowRight size={14} />
                </button>
                <button onClick={() => removeOffer(offer.id)} className="p-3 bg-slate-50 border border-slate-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors flex justify-center items-center">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedOffers;