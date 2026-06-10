
import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  UserPlus,
  ArrowRight,
  FileText,
  Linkedin,
  CheckCircle2,
  Loader2,
  Rocket,
  Plus,
  Trash2,
  Mail,
  Phone,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authHeaders } from '../services/authToken';

interface OnboardingProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

type OnboardingStep = 'choice' | 'form' | 'uploading';

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    linkedin: '',
    experiences: ['', '', ''],
    skills: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
      return;
    }

    setStep('uploading');
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/parse-cv`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders() }, // pas de Content-Type : le navigateur gère le boundary multipart
        body: fd,
      });
      const data = await res.json();

      if (data.success && data.data) {
        const d = data.data;
        // Les expériences extraites (objets) sont converties en lignes lisibles pour le formulaire.
        const exps: string[] = Array.isArray(d.experiences)
          ? d.experiences.map((x: any) =>
              typeof x === 'string'
                ? x
                : [x.role, x.company ? `chez ${x.company}` : '', x.period ? `(${x.period})` : '']
                    .filter(Boolean).join(' ') + (x.desc ? ` : ${x.desc}` : '')
            )
          : [];
        while (exps.length < 3) exps.push('');

        setFormData((prev) => ({
          ...prev,
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          title: d.title || '',
          skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || ''),
          experiences: exps.slice(0, 3),
        }));
        toast.success("CV analysé ! Vérifie et complète tes infos.");
      } else {
        toast.error(data.error || "On n'a pas pu lire ton CV. Saisis tes infos à la main.");
      }
    } catch {
      toast.error("Erreur réseau. Saisis tes infos à la main.");
    } finally {
      setIsLoading(false);
      // On bascule sur le formulaire pour que l'utilisateur vérifie/complète (zéro fausse donnée).
      setStep('form');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.title) {
      toast.error("Remplis au moins les champs obligatoires.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete(formData);
      toast.success("Profil enregistré !");
    }, 1000);
  };

  const updateExperience = (index: number, val: string) => {
    const newExps = [...formData.experiences];
    newExps[index] = val;
    setFormData({ ...formData, experiences: newExps });
  };

  if (step === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="w-24 h-24 bg-indigo-600/10 rounded-3xl mx-auto flex items-center justify-center text-indigo-600">
              <Loader2 size={48} className="animate-spin" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
              <Rocket size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Analyse de ton CV en cours</h2>
            <p className="text-slate-500 font-medium">On lit ton CV pour préremplir ton profil automatiquement...</p>
          </div>
          <div className="space-y-3">
             <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
             </div>
             <p className="text-[10px] uppercase font-black tracking-[0.2em] text-indigo-600">Lecture en cours</p>
          </div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-500">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('choice')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <ArrowRight className="rotate-180" size={24} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Mon profil</h1>
                <p className="text-sm text-slate-500 font-medium">Ces infos servent à générer ton CV et tes lettres.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Plus tard
            </button>
          </header>

          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            {/* Infos de Base */}
            <div className="card-modern p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <User size={14} /> Mes infos
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nom complet *</label>
                  <input
                    required
                    type="text"
                    placeholder="Jean Dupont"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-sm"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="jean@exemple.com"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-sm"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Poste recherché *</label>
                  <input
                    required
                    type="text"
                    placeholder="Développeur Fullstack"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-sm"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Compétences</label>
                  <input
                    type="text"
                    placeholder="React, gestion de projet, anglais..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-sm"
                    value={formData.skills}
                    onChange={e => setFormData({...formData, skills: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">LinkedIn</label>
                  <div className="relative">
                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="url"
                      placeholder="linkedin.com/in/..."
                      className="w-full pl-12 pr-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-sm"
                      value={formData.linkedin}
                      onChange={e => setFormData({...formData, linkedin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expériences */}
            <div className="card-modern p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <FileText size={14} /> Mes expériences
              </h3>
              <p className="text-xs text-slate-400 font-medium italic">Décris tes 3 expériences les plus importantes.</p>
              <div className="space-y-6">
                {formData.experiences.map((exp, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expérience #{idx + 1}</label>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Poste, entreprise et ce que tu y as accompli..."
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium text-sm resize-none"
                      value={exp}
                      onChange={e => updateExperience(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 group"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Enregistrer mon profil"}
                {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left: Message */}
        <div className="space-y-8 text-center md:text-left p-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
            <Rocket size={16} /> Bienvenue sur JoBoost
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tight">
            Crée ton profil en <span className="text-indigo-600">2 minutes.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
            Pour générer tes documents, JoBoost a besoin de te connaître. Choisis comment commencer.
          </p>
        </div>

        {/* Right: Choices */}
        <div className="grid grid-cols-1 gap-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group card-modern p-10 text-left border-2 border-transparent hover:border-indigo-600 transition-all bg-white dark:bg-slate-900 shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-indigo-200 dark:shadow-none">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Importer mon CV</h3>
              <p className="text-slate-500 font-medium">L'IA lit ton fichier (PDF/DOCX) et préremplit tout automatiquement.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                Importer mon CV <ArrowRight size={14} />
              </div>
            </div>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
            />
          </button>

          <button
            onClick={() => setStep('form')}
            className="group card-modern p-10 text-left border-2 border-transparent hover:border-indigo-600 transition-all bg-white dark:bg-slate-900 shadow-xl hover:shadow-indigo-100 dark:hover:shadow-none relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mb-8">
                <UserPlus size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Saisie manuelle</h3>
              <p className="text-slate-500 font-medium">Remplis ton profil toi-même, étape par étape.</p>
              <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 font-black text-xs uppercase tracking-widest transition-colors">
                Remplir à la main <ArrowRight size={14} />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors py-2 text-center"
          >
            Je remplirai mon profil plus tard
          </button>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
