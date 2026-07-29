
import React, { useState, useRef, useEffect } from 'react';
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
  user?: any;
  onComplete: (data: any) => void | Promise<void>;
  onSkip: () => void;
}

type OnboardingStep = 'choice' | 'form' | 'uploading';

// Expérience structurée : même forme que le profil et les modèles de CV
// (role / company / period / missions) → l'expérience s'affiche correctement
// dans le CV au lieu d'un « Poste » vide.
interface ExperienceForm {
  role: string;
  company: string;
  period: string;
  missions: string;
}

const emptyExperience = (): ExperienceForm => ({ role: '', company: '', period: '', missions: '' });

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete, onSkip }) => {
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    title: user?.title || '',
    linkedin: user?.linkedin || '',
    experiences: [emptyExperience(), emptyExperience(), emptyExperience()],
    skills: '',
  });

  // Pré-remplit le nom / l'email dès que l'utilisateur connecté est disponible
  // (l'inscription et Google les renseignent déjà) — sans écraser une saisie en cours.
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      email: prev.email || user.email || '',
      phone: prev.phone || user.phone || '',
    }));
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5 Mo)");
      return;
    }

    setStep('uploading');
    setIsLoading(true);
    // Panne momentanée du service d'analyse : on le retient pour décider, en fin
    // de traitement, s'il faut proposer un nouvel essai ou passer à la saisie.
    let transient = false;

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
        // Les expériences extraites sont gardées structurées (role / company / period / missions)
        // pour alimenter directement le CV.
        const exps: ExperienceForm[] = Array.isArray(d.experiences)
          ? d.experiences.map((x: any) =>
              typeof x === 'string'
                ? { ...emptyExperience(), missions: x }
                : {
                    role: x.role || '',
                    company: x.company || '',
                    period: x.period || [x.startDate, x.endDate].filter(Boolean).join(' – ') || '',
                    missions: x.desc || x.missions || '',
                  }
            )
          : [];
        while (exps.length < 3) exps.push(emptyExperience());

        setFormData((prev) => ({
          ...prev,
          name: d.name || prev.name || '',
          email: d.email || prev.email || '',
          phone: d.phone || prev.phone || '',
          title: d.title || '',
          skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || ''),
          experiences: exps.slice(0, 3),
        }));
        toast.success("CV analysé ! Vérifie et complète tes infos.");
      } else {
        // `transient` (503) = panne momentanée du service d'analyse, le fichier
        // est bon. On garde l'utilisateur sur l'écran d'import pour qu'il puisse
        // relancer d'un geste, au lieu de le pousser vers la saisie manuelle.
        transient = res.status === 503 || !!data.transient;
        toast.error(
          data.error || "On n'a pas pu lire ton CV. Saisis tes infos à la main.",
          transient ? { duration: 7000 } : undefined
        );
      }
    } catch {
      // Échec côté navigateur (réseau coupé, requête interrompue) : également
      // transitoire, donc on propose de réessayer plutôt que de renoncer.
      transient = true;
      toast.error("Connexion interrompue. Réessaie l'import : ton fichier n'est pas en cause.", { duration: 7000 });
    } finally {
      setIsLoading(false);
      // Succès ou fichier illisible → formulaire (l'utilisateur vérifie/complète,
      // zéro fausse donnée). Panne passagère → on reste sur l'écran d'import.
      setStep(transient ? 'choice' : 'form');
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
    // On ne garde que les expériences renseignées et on les normalise au format
    // attendu par le CV / le profil (role, company, period, missions + desc).
    const experiences = formData.experiences
      .filter((e) => e.role.trim() || e.company.trim() || e.missions.trim())
      .map((e) => ({
        role: e.role.trim(),
        company: e.company.trim(),
        period: e.period.trim(),
        endDate: e.period.trim(),
        missions: e.missions.trim(),
        desc: e.missions.trim(),
      }));

    // On attend la fin réelle de l'enregistrement. Avant, un setTimeout affichait
    // « Profil enregistré ! » au bout d'une seconde sans attendre la requête :
    // le message s'affichait même en cas d'échec. Le résultat est désormais
    // annoncé par App.tsx, une fois la réponse du serveur connue.
    Promise.resolve(onComplete({ ...formData, experiences }))
      .finally(() => setIsLoading(false));
  };

  const updateExperience = (index: number, patch: Partial<ExperienceForm>) => {
    const newExps = formData.experiences.map((e, i) => (i === index ? { ...e, ...patch } : e));
    setFormData({ ...formData, experiences: newExps });
  };

  if (step === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-scale-in">
          <div className="relative">
            <div className="w-24 h-24 bg-[#7D5CFF]/10 rounded-3xl mx-auto flex items-center justify-center text-[#7D5CFF]">
              <Loader2 size={48} className="animate-spin" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#7D5CFF] rounded-full flex items-center justify-center text-white shadow-lg">
              <Rocket size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Analyse de ton CV en cours</h2>
            <p className="text-slate-500 font-medium">On lit ton CV pour préremplir ton profil automatiquement...</p>
          </div>
          <div className="space-y-3">
             <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#7D5CFF] animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
             </div>
             <p className="text-[10px] uppercase font-black tracking-[0.2em] text-[#7D5CFF]">Lecture en cours</p>
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
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up">
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
              className="text-sm font-semibold text-slate-400 hover:text-[#7D5CFF] transition-colors px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Plus tard
            </button>
          </header>

          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
            {/* Infos de Base */}
            <div className="card-modern p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#7D5CFF] flex items-center gap-2">
                <User size={14} /> Mes infos
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="input-label">Nom complet *</label>
                  <input
                    required
                    type="text"
                    placeholder="Jean Dupont"
                    className="input-pro"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">Email *</label>
                  <input
                    required
                    type="email"
                    placeholder="jean@exemple.com"
                    className="input-pro"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">Poste recherché *</label>
                  <input
                    required
                    type="text"
                    placeholder="Développeur Fullstack"
                    className="input-pro"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">Compétences</label>
                  <input
                    type="text"
                    placeholder="React, gestion de projet, anglais..."
                    className="input-pro"
                    value={formData.skills}
                    onChange={e => setFormData({...formData, skills: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="input-label">LinkedIn</label>
                  <div className="relative">
                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="url"
                      placeholder="linkedin.com/in/..."
                      className="input-pro pl-12"
                      value={formData.linkedin}
                      onChange={e => setFormData({...formData, linkedin: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expériences */}
            <div className="card-modern p-8 space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#7D5CFF] flex items-center gap-2">
                <FileText size={14} /> Mes expériences
              </h3>
              <p className="text-xs text-slate-400 font-medium italic">Décris tes 3 expériences les plus importantes. Tu pourras les affiner plus tard dans ton profil.</p>
              <div className="space-y-6">
                {formData.experiences.map((exp, idx) => (
                  <div key={idx} className="space-y-2.5 border-b border-slate-100 dark:border-slate-800 pb-5 last:border-0 last:pb-0">
                    <label className="input-label">Expérience #{idx + 1}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Poste (ex : Développeur)"
                        className="input-pro"
                        value={exp.role}
                        onChange={e => updateExperience(idx, { role: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Entreprise"
                        className="input-pro"
                        value={exp.company}
                        onChange={e => updateExperience(idx, { company: e.target.value })}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Période (ex : 2021 – 2024)"
                      className="input-pro"
                      value={exp.period}
                      onChange={e => updateExperience(idx, { period: e.target.value })}
                    />
                    <textarea
                      rows={2}
                      placeholder="Ce que tu y as accompli (missions, résultats)..."
                      className="textarea-pro"
                      value={exp.missions}
                      onChange={e => updateExperience(idx, { missions: e.target.value })}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="press btn btn-primary btn-lg w-full group disabled:opacity-60"
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
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded-full text-[#7D5CFF] dark:text-[#A78BFA] text-xs font-black uppercase tracking-widest">
            <Rocket size={16} /> Bienvenue sur Joboost
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tight">
            Crée ton profil en <span className="text-[#7D5CFF]">2 minutes.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
            Pour générer tes documents, Joboost a besoin de te connaître. Choisis comment commencer.
          </p>
        </div>

        {/* Right: Choices */}
        <div className="grid grid-cols-1 gap-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="press group card-modern p-10 text-left border-2 border-transparent hover:border-[#7D5CFF] hover:-translate-y-0.5 transition-all bg-white dark:bg-slate-900 shadow-2xl hover:shadow-[#7D5CFF]/20 dark:hover:shadow-none relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-[#7D5CFF] text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-[#7D5CFF]/30 dark:shadow-none">
                <UploadCloud size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Importer mon CV</h3>
              <p className="text-slate-500 font-medium">L'IA lit ton fichier (PDF/DOCX) et préremplit tout automatiquement.</p>
              <div className="mt-8 flex items-center gap-2 text-[#7D5CFF] font-black text-xs uppercase tracking-widest">
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
            className="press group card-modern p-10 text-left border-2 border-transparent hover:border-[#7D5CFF] hover:-translate-y-0.5 transition-all bg-white dark:bg-slate-900 shadow-xl hover:shadow-[#7D5CFF]/20 dark:hover:shadow-none relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl flex items-center justify-center mb-8">
                <UserPlus size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Saisie manuelle</h3>
              <p className="text-slate-500 font-medium">Remplis ton profil toi-même, étape par étape.</p>
              <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-[#7D5CFF] font-black text-xs uppercase tracking-widest transition-colors">
                Remplir à la main <ArrowRight size={14} />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-slate-400 hover:text-[#7D5CFF] transition-colors py-2 text-center"
          >
            Je remplirai mon profil plus tard
          </button>
        </div>

      </div>
    </div>
  );
};

export default Onboarding;
