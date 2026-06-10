import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, ShieldCheck, Sparkles } from 'lucide-react';

export interface GalleryItem {
  id: string;
  name: string;
  ats: boolean;
  node: React.ReactNode; // aperçu déjà rendu avec les données de l'utilisateur
}

interface Props {
  items: GalleryItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

type Filter = 'all' | 'ats' | 'creative';

const TemplateGallery: React.FC<Props> = ({ items, selectedId, onSelect }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(
    () => items.filter((i) => (filter === 'all' ? true : filter === 'ats' ? i.ats : !i.ats)),
    [items, filter]
  );
  const [index, setIndex] = useState(0);

  // Recentre l'index quand le filtre change ou pour pointer sur le modèle sélectionné.
  useEffect(() => {
    const sel = list.findIndex((i) => i.id === selectedId);
    setIndex(sel >= 0 ? sel : 0);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (list.length === 0) return null;
  const safeIndex = Math.min(index, list.length - 1);
  const current = list[safeIndex];
  const go = (d: number) => setIndex((i) => (i + d + list.length) % list.length);
  const isSelected = current.id === selectedId;

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
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-2">
        <FilterBtn id="all" label="Tous" />
        <FilterBtn id="ats" label="ATS" icon={<ShieldCheck size={13} />} />
        <FilterBtn id="creative" label="Créatifs" icon={<Sparkles size={13} />} />
      </div>

      {/* Carrousel : un modèle à la fois */}
      <div className="relative flex items-center justify-center gap-2 sm:gap-4">
        <button onClick={() => go(-1)} aria-label="Modèle précédent"
          className="shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-[#7D5CFF] hover:text-[#7D5CFF] transition-colors">
          <ChevronLeft size={20} />
        </button>

        <div className="relative w-full max-w-[300px]">
          <div className={`rounded-xl overflow-hidden ring-2 transition-shadow ${isSelected ? 'ring-[#7D5CFF] shadow-xl' : 'ring-slate-200 dark:ring-slate-700 shadow-md'}`}>
            {current.node}
          </div>
          {/* Badge ATS / Créatif */}
          <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow ${
            current.ats ? 'bg-emerald-500 text-white' : 'bg-[#7D5CFF] text-white'
          }`}>
            {current.ats ? <><ShieldCheck size={11} /> ATS</> : <><Sparkles size={11} /> Créatif</>}
          </span>
          {isSelected && (
            <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#7D5CFF] text-white flex items-center justify-center shadow"><Check size={14} /></span>
          )}
        </div>

        <button onClick={() => go(1)} aria-label="Modèle suivant"
          className="shrink-0 w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-[#7D5CFF] hover:text-[#7D5CFF] transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Nom + compteur + action */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm font-bold text-[#111827] dark:text-white">
          {current.name} <span className="text-slate-400 font-medium">· {safeIndex + 1}/{list.length}</span>
        </div>
        <button
          onClick={() => onSelect(current.id)}
          disabled={isSelected}
          className={`btn ${isSelected ? 'btn-secondary cursor-default' : 'btn-primary'}`}
        >
          {isSelected ? <><Check size={16} /> Modèle sélectionné</> : 'Utiliser ce modèle'}
        </button>
      </div>

      {/* Pastilles */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {list.map((it, i) => (
          <button key={it.id} onClick={() => setIndex(i)} aria-label={it.name}
            className={`w-2 h-2 rounded-full transition-colors ${i === safeIndex ? 'bg-[#7D5CFF]' : 'bg-slate-300 dark:bg-slate-600'}`} />
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;
