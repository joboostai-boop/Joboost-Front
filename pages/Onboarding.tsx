
import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  ArrowRight,
  Loader2,
  Rocket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authHeaders } from '../services/authToken';

interface OnboardingProps {
  user?: any;
  onComplete: (data: any) => void | Promise<void>;
  onSkip: () => void;
}

type OnboardingStep = 'choice' | 'form' | 'uploading';

const Onboarding: React.FC<OnboardingProps> = ({ user, onComplete, onSkip }) => {
  const [step, setStep] = useState<OnboardingStep>('choice');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simplifié au maximum (28/09) : avant, la saisie manuelle demandait ~15 champs
  // (nom, email, poste, compétences, LinkedIn + 3 expériences structurées) avant
  // d'avoir rien vu de l'outil — le premier vrai frein à l'activation. Il ne reste
  // qu'un champ obligatoire (le poste) et un champ libre optionnel (le parcours,
  // détaillé par l'IA au moment de générer le CV, dans CVGenerator). Nom et email
  // sont déjà connus depuis l'inscription : on ne les redemande pas.
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    title: user?.title || '',
    skills: '' as string,
    // Remplace les 3 blocs d'expérience (poste/entreprise/période/missions) par
    // un seul texte libre — « colle ton CV en vrac », l'IA structure ensuite.
    parcours: '',
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
        // Les expériences extraites sont regroupées en un seul texte lisible, pour
        // rester cohérent avec le champ « parcours » unique du formulaire manuel —
        // rien n'est perdu, tout reste modifiable avant l'envoi.
        const parcoursLines: string[] = Array.isArray(d.experiences)
          ? d.experiences.map((x: any) => {
              if (typeof x === 'string') return x;
              const head = [x.role, x.company].filter(Boolean).join(' — ');
              const period = x.period || [x.startDate, x.endDate].filter(Boolean).join(' – ');
              const missions = x.desc || x.missions || '';
              return [head, period].filter(Boolean).join(' · ') + (missions ? `\n${missions}` : '');
            })
          : [];

        setFormData((prev) => ({
          ...prev,
          name: d.name || prev.name || '',
          email: d.email || prev.email || '',
          phone: d.phone || prev.phone || '',
          title: d.title || '',
          skills: Array.isArray(d.skills) ? d.skills.join(', ') : (d.skills || ''),
          parcours: parcoursLines.filter(Boolean).join('\n\n'),
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
    if (!formData.title.trim()) {
      toast.error("Indique au moins le poste que tu vises.");
      return;
    }

    setIsLoading(true);
    // Le texte libre devient une expérience unique — l'IA la détaillera au moment
    // de générer le CV (bouton « Générer mon CV »), pas besoin de la structurer ici.
    const experiences = formData.parcours.trim()
      ? [{
          role: formData.title.trim(),
          company: '',
          period: '',
          endDate: '',
          missions: formData.parcours.trim(),
          desc: formData.parcours.trim(),
        }]
      : [];

    // On attend la fin réelle de l'enregistrement. Avant, un setTimeout affichait
    // « Profil enregistré ! » au bout d'une seconde sans attendre la requête :
    // le message s'affichait même en cas d'échec. Le résultat est désormais
    // annoncé par App.tsx, une fois la réponse du serveur connue.
    Promise.resolve(onComplete({ ...formData, experiences }))
      .finally(() => setIsLoading(false));
  };

  if (step === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8 animate-scale-in">
          <div className="relative">
            <div className="w-24 h-24 bg-brand/10 rounded-3xl mx-auto flex items-center justify-center text-brand">
              <Loader2 size={48} className="animate-spin" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white shadow-lg">
              <Rocket size={16} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-ink tracking-tight mb-2">Analyse de ton CV en cours</h2>
            <p className="text-slate-500 font-medium">On lit ton CV pour préremplir ton profil automatiquement...</p>
          </div>
          <div className="space-y-3">
             <div className="h-2 w-full bg-subtle rounded-full overflow-hidden">
                <div className="h-full bg-brand animate-[loading_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
             </div>
             <p className="text-[10px] uppercase font-black tracking-[0.2em] text-brand">Lecture en cours</p>
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full animate-fade-in-up">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-ink">Ton profil, en 30 secondes</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Le reste, tu le complètes quand tu veux — ou jamais.</p>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 text-sm font-semibold text-slate-400 hover:text-brand transition-colors px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Plus tard
            </button>
          </header>

          <form onSubmit={handleFormSubmit} className="card-modern p-7 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <label className="input-label">Poste recherché *</label>
              <input
                required
                autoFocus
                type="text"
                placeholder="Vendeuse, développeur, aide-soignant…"
                className="input-pro"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="input-label">Ton parcours <span className="font-normal text-slate-400 normal-case">(optionnel — tu peux le faire plus tard)</span></label>
              <textarea
                rows={5}
                placeholder="Colle ton CV, ou écris en vrac : tes expériences, stages, formations, ce que tu as fait au quotidien… L'IA se charge de le rédiger proprement."
                className="textarea-pro"
                value={formData.parcours}
                onChange={e => setFormData({...formData, parcours: e.target.value})}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="press btn btn-primary btn-lg w-full group disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Enregistrer et continuer"}
              {!isLoading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-lg w-full text-center animate-fade-in-up">
        <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-50 dark:bg-brand/10 rounded-full text-brand dark:text-brand-300 text-xs font-black uppercase tracking-widest">
          <Rocket size={16} /> Bienvenue sur Joboost
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-black text-ink leading-[1.05] tracking-tight">
          Crée ton profil en <span className="text-brand">2 minutes.</span>
        </h1>
        <p className="mt-5 text-base text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
          Importe ton CV, l'IA remplit le reste.
        </p>

        {/* Un seul choix mis en avant — la saisie manuelle et « plus tard » restent
            à un clic, mais en retrait : sur 54 inscrits, la plupart ont un CV déjà
            prêt quelque part, et l'import évite toute ressaisie. */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="press group card-modern w-full mt-9 p-8 sm:p-10 text-left border-2 border-transparent hover:border-brand transition-all bg-surface shadow-2xl hover:shadow-brand/20 dark:hover:shadow-none relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 dark:bg-brand/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-5">
            <div className="w-16 h-16 shrink-0 bg-brand text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand/30 dark:shadow-none">
              <UploadCloud size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-ink mb-1.5">Importer mon CV</h3>
              <p className="text-slate-500 font-medium text-sm">PDF ou Word — l'IA lit ton fichier et préremplit tout.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-brand font-black text-xs uppercase tracking-widest">
                Choisir un fichier <ArrowRight size={14} />
              </div>
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

        <div className="mt-5 flex items-center justify-center gap-5 text-sm font-semibold">
          <button type="button" onClick={() => setStep('form')} className="text-slate-500 hover:text-brand transition-colors">
            Remplir à la main
          </button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={onSkip} className="text-slate-400 hover:text-brand transition-colors">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
