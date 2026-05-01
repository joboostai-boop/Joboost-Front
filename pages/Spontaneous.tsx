import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Zap, ArrowRight, BookOpen, Navigation, Target, Send, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface CompanyResult {
  id: string;
  name: string;
  address: string;
  sector: string;
  hiringPotential: string;
  size: string;
  matchedJob: string;
  reason: string;
  contactRole: string;
}

const Spontaneous: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  const [companies, setCompanies] = useState<CompanyResult[]>([]);
  // Store which cards have the "Include Letter" checked
  const [includeLetterMap, setIncludeLetterMap] = useState<Record<string, boolean>>({});
  // Store which companies are currently being applied to (loading state per company)
  const [applyingTo, setApplyingTo] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (user) {
      setJobTitle(user.title || '');
      setLocation(user.city || '');
      setLoadingInit(false);
    }
  }, [user]);

  const connectFT = async () => {
    try {
      const res = await fetch('/api/auth/ft/login', { credentials: 'include' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Erreur d'URL de redirection");
      }
    } catch(e) {
      toast.error("Erreur de connexion serveur");
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!jobTitle || !location) {
      toast.error("Veuillez saisir un métier et une ville.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/lbb/search?jobTitle=${encodeURIComponent(jobTitle)}&location=${encodeURIComponent(location)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setCompanies(data.results);
        
        // Initialize checkboxes as checked by default
        const initialMap: Record<string, boolean> = {};
        data.results.forEach((c: CompanyResult) => initialMap[c.id] = true);
        setIncludeLetterMap({...includeLetterMap, ...initialMap});
        
        toast.success(`${data.results.length} entreprises détectées.`);
      }
    } catch (e) {
      toast.error("Erreur de recherche.");
    } finally {
      setLoading(false);
    }
  };

  const toggleIncludeLetter = (id: string) => {
    setIncludeLetterMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const applySpontaneous = async (company: CompanyResult) => {
    setApplyingTo(prev => ({ ...prev, [company.id]: true }));
    const includeLetter = includeLetterMap[company.id];
    
    // Notification de chargement long si on utilise l'IA
    const toastId = includeLetter 
       ? toast.loading("Génération de la lettre IA et transmission à France Travail...") 
       : toast.loading("Transmission de la candidature à France Travail...");

    try {
      const res = await fetch('/api/lbb/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.name,
          jobTitle: jobTitle,
          reason: company.reason,
          includeLetter: includeLetter
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
         toast.success("Candidature envoyée et trackée avec succès !", { id: toastId });
         navigate('/track/applications'); // Redirige vers le kanban
      } else {
         toast.error(data.error || "L'API France Travail a rejeté l'envoi.", { id: toastId });
      }
    } catch(e) {
      toast.error("Erreur réseau de transmission.", { id: toastId });
    } finally {
      setApplyingTo(prev => ({ ...prev, [company.id]: false }));
    }
  };

  const navToLetter = (company: CompanyResult) => {
    navigate('/target/letter', { state: { jobTitle, company: company.name, targetContext: company.reason } });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col border-b border-[#E5E7EB] dark:border-[#1F2937] pb-8 space-y-4">
        <div>
          <h1 className="flex items-center gap-3">
             <Navigation className="text-[#7D5CFF]" size={32} />
             Marché Caché (La Bonne Boîte)
          </h1>
          <p className="mt-2 text-sm text-[#6B7280] max-w-3xl leading-relaxed">
            API Connectée: N'attendez pas qu'une offre soit publiée. Détectez les entreprises actives et propulsez instantanément votre candidature (Profil + Lettre IA) via le protocole France Travail.
          </p>
        </div>
      </header>
      
      {!user?.ftAccessToken && (
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-violet-900 text-lg">Connectez votre compte France Travail</h3>
            <p className="text-violet-700 text-sm mt-1">
              Pour rechercher et transmettre vos candidatures spontanées aux entreprises via La Bonne Boîte, vous devez lier votre compte France Travail.
            </p>
          </div>
          <button 
            onClick={connectFT}
            className="btn-primary whitespace-nowrap"
          >
            Connecter France Travail
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="card-pro p-6 md:p-8 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 border-[#7D5CFF] relative">
        {!user?.ftAccessToken && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
             {/* Un petit overlay si non connecté */}
          </div>
        )}
        <h3 className="text-sm font-bold text-[#111827] dark:text-white uppercase tracking-widest mb-6">Critères de ciblage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="input-label">Métier Ciblé</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input 
                type="text" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)} 
                disabled={loadingInit}
                className="input-pro pl-10" 
                placeholder="Ex: Développeur React"
              />
            </div>
          </div>
          <div>
            <label className="input-label">Localisation ciblée</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                disabled={loadingInit}
                className="input-pro pl-10" 
                placeholder="Ex: Paris 75"
              />
            </div>
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading || loadingInit} 
          className="btn btn-primary btn-lg w-full mt-6"
        >
          {loading ? <Zap className="animate-spin" size={18} /> : <Target size={18} />}
          Lancer le radar d'entreprises
        </button>
      </form>

      {companies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-[#111827] dark:text-white mb-4">{companies.length} Entreprises stratégiques identifiées</h3>
          {companies.map((company) => {
            const isApplying = applyingTo[company.id] || false;
            const wantsLetter = includeLetterMap[company.id] || false;

            return (
              <div key={company.id} className={`card-pro p-6 flex flex-col md:flex-row gap-6 transition-colors group ${isApplying ? 'opacity-70 pointer-events-none border-[#7D5CFF] ring-1 ring-[#7D5CFF]' : 'hover:border-[#D1D5DB] dark:hover:border-[#374151]'}`}>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-[#F3F4F6] dark:bg-[#1F2937] rounded flex items-center justify-center text-[#6B7280]">
                          <Building2 size={24} />
                       </div>
                       <div>
                         <h2 className="text-xl font-bold text-[#111827] dark:text-white">{company.name}</h2>
                         <p className="text-[#6B7280] text-sm flex items-center gap-1.5 mt-1"><MapPin size={14} /> {company.address}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                       Potentiel {company.hiringPotential}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                    <span className="px-2 py-1 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB] rounded">{company.sector}</span>
                    <span className="px-2 py-1 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] text-[#4B5563] dark:text-[#D1D5DB] rounded">{company.size}</span>
                    <span className="px-2 py-1 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 border border-[#7D5CFF] text-[#7D5CFF] rounded flex items-center gap-1">
                       <BookOpen size={12} /> Contact estimé: {company.contactRole}
                    </span>
                  </div>

                  <div className="p-4 bg-[#F3F4F6] dark:bg-[#1F2937] rounded border-l-4 border-[#D1D5DB] dark:border-[#4B5563] mt-2">
                    <p className="text-sm text-[#4B5563] dark:text-[#9CA3AF]"><strong>Cible LBB :</strong> {company.reason}</p>
                  </div>
                </div>

                <div className="md:w-64 flex flex-col gap-3 justify-center shrink-0 border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#1F2937] pt-4 md:pt-0 md:pl-6">
                  
                  <div 
                     className="flex items-center gap-2 cursor-pointer group/check" 
                     onClick={() => toggleIncludeLetter(company.id)}
                  >
                     {wantsLetter ? (
                        <CheckSquare className="text-[#7D5CFF]" size={18} />
                     ) : (
                        <Square className="text-[#9CA3AF] group-hover/check:text-[#7D5CFF] transition-colors" size={18} />
                     )}
                     <span className={`text-xs font-bold transition-colors ${wantsLetter ? 'text-[#7D5CFF]' : 'text-[#6B7280]'}`}>Inclure lettre de motivation (IA)</span>
                  </div>

                  <button 
                    onClick={() => applySpontaneous(company)} 
                    disabled={isApplying}
                    className="btn btn-primary w-full mt-2"
                  >
                    <div className="flex items-center justify-center gap-2">
                       {isApplying ? <Zap className="animate-spin" size={16} /> : <Send size={16} />}
                       <span>Envoyer Candidature</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => navToLetter(company)} 
                    disabled={isApplying}
                    className="btn btn-secondary w-full"
                  >
                    Aperçu manuel de la lettre
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

export default Spontaneous;
