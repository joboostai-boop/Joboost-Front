import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Sparkles, Target, MessageSquareText, Lightbulb, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import { generateInterviewQuestions, InterviewCategory } from '../services/gemini';
import AiLoadingOverlay from '../components/AiLoadingOverlay';

interface InterviewSimulatorProps {
  user: User;
}

/* Simulateur d'entretien — génère des questions d'entretien personnalisées (offre + profil)
   avec, pour chacune : l'intention du recruteur, un conseil de réponse (STAR) et un exemple
   ancré dans le vrai profil. Base FONCTIONNELLE ; le style final passera par Fable. */
const InterviewSimulator: React.FC<InterviewSimulatorProps> = ({ user }) => {
  const location = useLocation();
  const state = (location.state as any) || {};

  const [jobTitle, setJobTitle] = useState<string>(state.jobTitle || user.title || '');
  const [company, setCompany] = useState<string>(state.company || '');
  const [offerText, setOfferText] = useState<string>(state.targetContext || '');

  const [userProfile, setUserProfile] = useState<any>(null);
  const [categories, setCategories] = useState<InterviewCategory[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Clé "catégorie:index" de la question ouverte (accordéon simple).
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Récupère le profil complet pour personnaliser les exemples de réponse.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (data.success) {
          setUserProfile(data.user);
          if (!jobTitle && data.user?.title) setJobTitle(data.user.title);
        }
      } catch {
        /* Profil non chargé : la génération reste possible, exemples juste moins personnalisés. */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!jobTitle.trim()) {
      toast.error('Indique le poste visé pour lancer la simulation.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateInterviewQuestions(jobTitle.trim(), company.trim(), offerText.trim(), userProfile);
      const cats = result?.categories || [];
      if (!cats.length) throw new Error("La simulation n'a rien renvoyé. Réessaie dans un instant.");
      setCategories(cats);
      setOpenKey('0:0'); // ouvre la 1re question
      toast.success('Simulation prête 🎤');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la génération.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <AiLoadingOverlay
        show={loading}
        title="Préparation de ton entretien…"
        messages={[
          'Analyse du poste et de ton profil…',
          'Sélection des questions les plus probables…',
          'Rédaction de conseils et d’exemples de réponse…',
        ]}
      />

      {/* En-tête */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Préparer</p>
        <h1 className="text-2xl md:text-3xl font-black text-[#111827] dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl surface-accent text-[#7D5CFF] flex items-center justify-center">
            <Mic size={20} strokeWidth={2.2} />
          </span>
          Simulateur d'entretien
        </h1>
        <p className="text-sm text-[#6B7280] dark:text-slate-400">
          L'IA génère les questions les plus probables pour ce poste, avec des conseils et des exemples de réponse fondés sur ton profil.
        </p>
      </header>

      {/* Formulaire */}
      <section className="card-pro !p-5 md:!p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-slate-200 mb-1.5">Poste visé *</label>
            <input
              className="input-pro"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex. Commercial B2B"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-slate-200 mb-1.5">Entreprise (optionnel)</label>
            <input
              className="input-pro"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex. Manpower"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#374151] dark:text-slate-200 mb-1.5">
            Texte de l'offre (optionnel — améliore le ciblage)
          </label>
          <textarea
            className="input-pro min-h-[110px] resize-y"
            value={offerText}
            onChange={(e) => setOfferText(e.target.value)}
            placeholder="Colle ici le contenu de l'offre pour des questions encore plus ciblées."
          />
        </div>
        <button onClick={handleGenerate} disabled={loading} className="press btn btn-primary w-full sm:w-auto">
          <Sparkles size={16} /> {categories ? 'Relancer la simulation' : 'Lancer la simulation'}
        </button>
      </section>

      {/* Résultats */}
      {categories && (
        <section className="space-y-6">
          {categories.map((cat, ci) => (
            <div key={ci} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#7D5CFF]">{cat.title}</h2>
              <div className="space-y-2">
                {cat.questions.map((q, qi) => {
                  const key = `${ci}:${qi}`;
                  const open = openKey === key;
                  return (
                    <div key={qi} className="card-pro !p-0 overflow-hidden">
                      <button
                        onClick={() => setOpenKey(open ? null : key)}
                        className="w-full flex items-center gap-3 text-left px-4 py-3.5 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors"
                      >
                        <span className="text-sm font-semibold text-[#111827] dark:text-white flex-1">{q.question}</span>
                        <ChevronDown
                          size={18}
                          className={`shrink-0 text-[#9CA3AF] transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {open && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#ECEAF6] dark:border-[#1F2937]">
                          {q.intent && (
                            <div className="flex gap-2.5">
                              <Target size={16} className="shrink-0 mt-0.5 text-blue-500" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Ce que le recruteur évalue</p>
                                <p className="text-sm text-[#374151] dark:text-slate-300 mt-0.5 leading-relaxed">{q.intent}</p>
                              </div>
                            </div>
                          )}
                          {q.tip && (
                            <div className="flex gap-2.5">
                              <Lightbulb size={16} className="shrink-0 mt-0.5 text-amber-500" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Comment répondre</p>
                                <p className="text-sm text-[#374151] dark:text-slate-300 mt-0.5 leading-relaxed">{q.tip}</p>
                              </div>
                            </div>
                          )}
                          {q.sampleAnswer && (
                            <div className="flex gap-2.5">
                              <MessageSquareText size={16} className="shrink-0 mt-0.5 text-[#7D5CFF]" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-[#7D5CFF]">Exemple de réponse</p>
                                <p className="text-sm text-[#374151] dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">{q.sampleAnswer}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="text-xs text-[#9CA3AF] text-center pt-2">
            Les exemples s'appuient sur ton profil. Reformule-les avec tes propres mots le jour J. 💪
          </p>
        </section>
      )}
    </div>
  );
};

export default InterviewSimulator;
