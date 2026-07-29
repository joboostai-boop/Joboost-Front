
import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  FileText,
  Linkedin,
  CheckCircle2,
  Loader2,
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

type OnboardingStep = 'form';

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
  const [step, setStep] = useState<OnboardingStep>('form');
  const [isLoading, setIsLoading] = useState(false);

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

    // On attend la fin réelle de l'enregistrement avant d'annoncer un succès :
    // avant, le message « Profil enregistré ! » s'affichait même quand la requête
    // échouait, et l'utilisateur restait bloqué sur cet écran sans comprendre.
    Promise.resolve(onComplete({ ...formData, experiences }))
      .finally(() => setIsLoading(false));
  };

  const updateExperience = (index: number, patch: Partial<ExperienceForm>) => {
    const newExps = formData.experiences.map((e, i) => (i === index ? { ...e, ...patch } : e));
    setFormData({ ...formData, experiences: newExps });
  };

  return (
      <div className="min-h-screen p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
};

export default Onboarding;
