import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Sparkles, ArrowRight, Check } from 'lucide-react';
import { CV_TEMPLATES } from '../services/cvTemplates';
import { LETTER_TEMPLATES } from '../services/letterTemplates';
import { PreviewModeContext } from '../services/previewMode';

type Kind = 'cv' | 'letter';
type Filter = 'all' | 'ats' | 'creative';

// Exemple d'aperçu — volontairement riche (~1 page A4) pour que chaque vignette
// ressemble à un vrai CV rempli, sans grande zone blanche.
const CV_SAMPLE = {
  name: 'Léa Dubois',
  title: 'Chargée de clientèle',
  email: 'lea.dubois@email.com',
  phone: '06 34 56 78 90',
  city: 'Nantes',
  summary:
    "Commerciale orientée résultats avec 6 ans d'expérience en B2B, à l'aise en prospection comme en fidélisation. Sens de l'écoute, de la négociation et suivi rigoureux des objectifs commerciaux.",
  skills: ['Prospection', 'Négociation', 'Relation client', 'CRM (Salesforce)', 'Vente B2B', 'Reporting', 'Fidélisation', 'Gestion de portefeuille'],
  experiences: [
    { role: 'Chargée de clientèle', company: 'Atlas Distribution', city: 'Nantes', period: "2021 – Aujourd'hui",
      desc: "Gestion d'un portefeuille de 120 clients B2B.\n+18 % de chiffre d'affaires sur la zone en 2 ans.\nNégociation des contrats annuels et relances.\nSuivi de la satisfaction et fidélisation client." },
    { role: 'Conseillère de vente', company: 'Boutique Horizon', city: 'Nantes', period: '2019 – 2021',
      desc: "Accueil et conseil client en boutique.\nMise en avant des produits et merchandising.\nAtteinte régulière des objectifs mensuels." },
    { role: 'Vendeuse (saisonnier)', company: 'Maison Léa', city: 'Nantes', period: '2018 – 2019',
      desc: "Vente et encaissement.\nGestion des stocks et réassort des rayons." },
  ],
  education: [
    { degree: 'BTS NDRC (Négociation et Digitalisation de la Relation Client)', school: 'Lycée La Colinière', city: 'Nantes', date: '2019' },
    { degree: 'Baccalauréat STMG', school: 'Lycée Nelson Mandela', city: 'Nantes', date: '2017' },
  ],
};
const LETTER_SAMPLE = {
  name: 'Léa Dubois', email: 'lea.dubois@email.com', phone: '06 34 56 78 90', city: 'Nantes',
  company: 'Atlas Distribution', jobTitle: 'Chargée de clientèle',
  body:
    "Madame, Monsieur,\n\nVivement intéressée par le poste de Chargée de clientèle au sein d'Atlas Distribution, je vous adresse ma candidature. Mon expérience de six ans en relation client et en négociation m'a permis de développer un portefeuille fidèle et d'atteindre régulièrement mes objectifs commerciaux.\n\nAu cours de mes précédentes fonctions, j'ai appris à conjuguer écoute, rigueur et sens du résultat. Votre entreprise, reconnue pour la qualité de sa relation client, correspond pleinement au cadre dans lequel je souhaite m'investir durablement.\n\nJe serais ravie d'échanger avec vous sur la façon dont je pourrais contribuer au développement de votre clientèle.\n\nDans l'attente de votre retour, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
};

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const [kind, setKind] = useState<Kind>('cv');
  const [filter, setFilter] = useState<Filter>('all');

  const items = useMemo(() => {
    const base = kind === 'cv'
      ? CV_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={CV_SAMPLE} /> }))
      : LETTER_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={LETTER_SAMPLE} /> }));
    return base.filter((i) => (filter === 'all' ? true : filter === 'ats' ? i.ats : !i.ats));
  }, [kind, filter]);

  // Sélectionner un modèle ouvre l'éditeur correspondant avec le modèle pré-appliqué.
  const use = (id: string) =>
    navigate(kind === 'cv' ? '/prepare/cv' : '/prepare/letter', { state: { template: id } });

  const KindBtn: React.FC<{ id: Kind; label: string }> = ({ id, label }) => (
    <button
      onClick={() => { setKind(id); setFilter('all'); }}
      className={`press flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
        kind === id
          ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
          : 'text-slate-500 dark:text-slate-400 hover:text-[#7D5CFF] hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
      }`}
    >
      {label}
    </button>
  );

  const FilterBtn: React.FC<{ id: Filter; label: string; icon?: React.ReactNode }> = ({ id, label, icon }) => (
    <button
      onClick={() => setFilter(id)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
        filter === id ? 'bg-[#7D5CFF] text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Barre d'outils : type de document + filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1 p-1 rounded-xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-xs w-full sm:w-fit">
          <KindBtn id="cv" label="Modèles de CV" />
          <KindBtn id="letter" label="Modèles de lettre" />
        </div>
        <div className="flex items-center gap-2">
          <FilterBtn id="all" label="Tous" />
          <FilterBtn id="ats" label="ATS" icon={<ShieldCheck size={13} />} />
          <FilterBtn id="creative" label="Créatifs" icon={<Sparkles size={13} />} />
        </div>
      </div>

      <p className="text-sm text-[#6B7280] dark:text-slate-400">
        {items.length} modèle{items.length > 1 ? 's' : ''} · aperçu rempli avec un exemple. Choisis-en un pour ouvrir l'éditeur — tu pourras le changer à tout moment.
      </p>

      {/* Grille de modèles (showcase) — vignettes (mode thumb), re-montée à chaque bascule pour rejouer l'entrée */}
      <PreviewModeContext.Provider value="thumb">
      <div key={`${kind}-${filter}`} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 items-start">
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            className="group rounded-xl border border-[#ECEAF6] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-card p-2.5 animate-fade-in-up hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200"
          >
            <button onClick={() => use(it.id)} className="press block w-full text-left" aria-label={`Utiliser le modèle ${it.name}`}>
              <div className="relative aspect-[210/297] bg-white rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 group-hover:ring-[#7D5CFF]/50 transition-all">
                <div className="absolute inset-x-0 top-0">{it.node}</div>
                <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow ${
                  it.ats ? 'bg-emerald-500 text-white' : 'bg-[#7D5CFF] text-white'
                }`}>
                  {it.ats ? <><ShieldCheck size={11} /> ATS</> : <><Sparkles size={11} /> Créatif</>}
                </span>
                {/* Survol : appel à l'action */}
                <span className="absolute inset-0 bg-[#0B0B14]/0 group-hover:bg-[#0B0B14]/40 transition-colors flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-[#111827] text-xs font-bold shadow">
                    <Check size={13} className="text-[#7D5CFF]" /> Utiliser ce modèle
                  </span>
                </span>
              </div>
            </button>
            <div className="flex items-center justify-between gap-1 mt-2 px-0.5">
              <span className="text-xs font-bold text-[#111827] dark:text-white truncate">{it.name}</span>
              <button onClick={() => use(it.id)} className="press text-[#7D5CFF] hover:translate-x-0.5 transition-transform shrink-0" aria-label="Utiliser ce modèle">
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      </PreviewModeContext.Provider>
    </div>
  );
};

export default Templates;
