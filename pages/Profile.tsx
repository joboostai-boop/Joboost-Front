import React, { useState } from 'react';
import { 
  Plus, 
  Wand2, 
  RefreshCw, 
  Zap, 
  Lightbulb, 
  CheckCircle2,
  ChevronRight,
  BrainCircuit,
  Linkedin,
  Import,
  X
} from 'lucide-react';
import { User as UserType } from '../types';
import toast from 'react-hot-toast';
import { getProfileOptimizations, rewriteSection, parseLinkedInProfile } from '../services/gemini';

interface ProfileProps { user: UserType; }

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [linkedInText, setLinkedInText] = useState('');
  const [globalSuggestions, setGlobalSuggestions] = useState<string[]>([]);
  
  const [proInfo, setProInfo] = useState({
    title: user?.title || "",
    summary: user?.summary || "",
    skills: (user?.skills || []).map(s => typeof s === 'string' ? { name: s, level: 'Avancé', type: 'hard' } : s),
    experiences: Array.isArray(user?.experiences) ? user.experiences : []
  });

  const handleSave = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proInfo.title,
          summary: proInfo.summary,
          skills: proInfo.skills.map((s: any) => typeof s === 'string' ? s : s.name),
          experiences: proInfo.experiences
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profil mis à jour en base de données !");
      } else {
        toast.error("Erreur: " + data.error);
      }
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde.");
    }
  };

  const completionScore = (() => {
    let score = 0;
    const max = 6;
    if (user.name) score++;
    if (proInfo.title) score++;
    if (proInfo.summary) score++;
    if (proInfo.skills.length > 0) score++;
    if (proInfo.experiences.length > 0) score++;
    if (user.linkedin || user.portfolio || user.github) score++;
    return Math.round((score / max) * 100);
  })();

  const handleRewriteSummary = async () => {
    setLoadingAI(true);
    try {
      const newText = await rewriteSection("Résumé", proInfo.summary, `Titre: ${proInfo.title}`);
      setProInfo({ ...proInfo, summary: newText });
      toast.success("Votre résumé a été optimisé !");
    } catch (e) { toast.error("Erreur de l'IA."); }
    finally { setLoadingAI(false); }
  };

  const handleGlobalOptimization = async () => {
    setLoadingGlobal(true);
    try {
      const suggestions = await getProfileOptimizations(proInfo);
      setGlobalSuggestions(suggestions);
      toast.success("Analyse globale terminée avec succès !");
    } catch (e) {
      toast.error("Échec de l'analyse globale.");
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleLinkedInImport = async () => {
    if (!linkedInText.trim()) {
      toast.error("Veuillez coller le texte de votre profil LinkedIn.");
      return;
    }
    setLoadingImport(true);
    try {
      const data = await parseLinkedInProfile(linkedInText);
      setProInfo({
        ...proInfo,
        title: data.title || proInfo.title,
        summary: data.summary || proInfo.summary,
        skills: data.skills.map((s: string) => ({ name: s, level: 'Avancé', type: 'hard' })),
        experiences: data.experiences.map((e: any, i: number) => ({ id: `${Date.now()}-${i}`, ...e }))
      });
      setShowImportModal(false);
      setLinkedInText('');
      toast.success("Profil importé et mis à jour !");
    } catch (e) {
      toast.error("Échec de l'importation LinkedIn.");
    } finally {
      setLoadingImport(false);
    }
  };

  const dismissSuggestion = (index: number) => {
    setGlobalSuggestions(prev => prev.filter((_, i) => i !== index));
    if (globalSuggestions.length <= 1) {
      toast.success("Toutes les optimisations ont été traitées !");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#E5E7EB] pb-6">
        <div>
          <h1>Mon Profil</h1>
          <p>Gérez vos informations pour de meilleures recommandations.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/5"
          >
            <Linkedin size={16} />
            Import LinkedIn
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Enregistrer les modifications
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="card-pro text-center">
            <div className="w-24 h-24 bg-[#F3F4F6] dark:bg-[#1F2937] rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-bold text-[#7D5CFF] overflow-hidden border-4 border-white shadow-sm">
               {user.photoUrl ? (
                 <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               ) : (
                 <span>{(user.name || '?').charAt(0).toUpperCase()}</span>
               )}
            </div>
            <h2>{user.name}</h2>
            <input 
               type="text"
               value={proInfo.title}
               onChange={(e) => setProInfo({...proInfo, title: e.target.value})}
               className="w-full text-center text-sm font-semibold text-[#7D5CFF] uppercase tracking-wide bg-transparent border-none outline-none mt-2"
               placeholder="Votre Titre"
            />
          </div>

          <div className="card-pro space-y-6">
            <h3>Compétences</h3>
            <div className="space-y-4">
              {proInfo.skills.map((skill, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tight text-slate-500">
                    <span>{skill.name}</span>
                    <span className="text-indigo-600">{skill.level}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: skill.level === 'Expert' ? '100%' : '75%' }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn w-full btn-secondary">
              Ajouter une compétence
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-pro space-y-6 relative overflow-visible">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Résumé professionnel</h3>
              <button 
                onClick={handleRewriteSummary} 
                disabled={loadingAI}
                className="flex items-center gap-2 text-indigo-600 text-xs font-bold hover:underline disabled:opacity-50"
              >
                {loadingAI ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />} 
                Optimiser avec l'IA
              </button>
            </div>
            <textarea 
              value={proInfo.summary}
              onChange={(e) => setProInfo({...proInfo, summary: e.target.value})}
              className="w-full text-slate-600 dark:text-slate-400 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 leading-relaxed font-medium italic min-h-[100px] resize-y"
              placeholder="Écrivez votre résumé professionnel ici..."
            />

            <div className="space-y-2 py-2">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-[#6B7280]">Complétion du profil</span>
                <span className="text-[#7D5CFF]">{completionScore}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#F3F4F6] dark:bg-[#1F2937] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#7D5CFF] rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${completionScore}%` }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1F2937] flex flex-col gap-6">
              <button 
                onClick={handleGlobalOptimization}
                disabled={loadingGlobal}
                className="btn btn-secondary self-start btn-sm"
              >
                {loadingGlobal ? <RefreshCw className="animate-spin" size={16} /> : <BrainCircuit size={16} />}
                Aide IA pour profil
              </button>

              {globalSuggestions.length > 0 && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-500" />
                    <span className="text-xs font-semibold text-[#6B7280]">Suggestions d'optimisation</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {globalSuggestions.map((suggestion, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-4 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-md hover:shadow-sm transition-shadow group cursor-pointer"
                        onClick={() => dismissSuggestion(index)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-[#F3F0FF] text-[#7D5CFF]">
                            <Zap size={14} />
                          </div>
                          <p className="text-sm font-medium text-[#111827] dark:text-white">{suggestion}</p>
                        </div>
                        <CheckCircle2 size={18} className="text-[#9CA3AF] group-hover:text-emerald-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-modern p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Expériences</h3>
              <button className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-8">
              {proInfo.experiences.map((exp) => (
                <div key={exp.id} className="relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 last:border-transparent pb-4">
                  <div className="absolute top-0 -left-1.5 w-3 h-3 bg-indigo-600 rounded-full" />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{exp.role}</h4>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{exp.period}</span>
                  </div>
                  <p className="text-indigo-600 font-bold text-sm mb-2">{exp.company}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{exp.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'Import LinkedIn */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-2xl p-8 rounded-md shadow-2xl relative border border-[#E5E7EB] dark:border-[#1F2937]">
            <button onClick={() => setShowImportModal(false)} className="absolute top-6 right-6 text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#0A66C2] rounded-md flex items-center justify-center text-white">
                <Import size={24} />
              </div>
              <div>
                <h2>Importation Intelligente</h2>
                <p>L'IA Jobix va reconstruire votre profil à partir de LinkedIn.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="input-label">Coller votre profil LinkedIn (Texte)</label>
                <textarea 
                  rows={8}
                  placeholder="Copiez-collez ici le contenu textuel de votre profil LinkedIn (Résumé, Expériences, Compétences)..."
                  className="textarea-pro"
                  value={linkedInText}
                  onChange={(e) => setLinkedInText(e.target.value)}
                />
              </div>

              <div className="bg-[#7D5CFF]/10 p-4 rounded-md border border-[#7D5CFF]/20">
                <p className="text-xs text-[#7D5CFF] font-medium leading-relaxed">
                  <span className="mr-2">💡</span>
                  Conseil : Pour un meilleur résultat, copiez la section "Infos" (résumé) et vos 3 dernières expériences professionnelles.
                </p>
              </div>

              <button 
                onClick={handleLinkedInImport}
                disabled={loadingImport}
                className="btn w-full bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 disabled:opacity-50 h-12 text-base"
              >
                {loadingImport ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
                Lancer la synchronisation IA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;