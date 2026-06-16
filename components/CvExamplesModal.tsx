import React, { useEffect, useMemo, useState } from 'react';
import { X, Search, FileText } from 'lucide-react';
import { CV_EXAMPLES, CV_EXAMPLE_CATEGORIES, CvExample } from '../services/cvExamples';
import { getCvTemplate } from '../services/cvTemplates';
import { PreviewModeContext } from '../services/previewMode';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (example: CvExample) => void;
}

// Modèle utilisé pour les vignettes d'aperçu de la librairie (sobre, ATS).
const ThumbPreview = getCvTemplate('vertex').Preview;

const CvExamplesModal: React.FC<Props> = ({ open, onClose, onPick }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const list = useMemo(
    () => CV_EXAMPLES.filter((e) => {
      const matchCat = category === 'all' || e.category === category;
      const matchQ = !q || e.role.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) ||
        e.data.skills.some((s) => s.toLowerCase().includes(q));
      return matchCat && matchQ;
    }),
    [q, category]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[85vh] flex flex-col bg-white dark:bg-[#0B1120] rounded-t-2xl sm:rounded-2xl shadow-pop border border-[#ECEAF6] dark:border-[#1F2937] animate-fade-in-up overflow-hidden">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#ECEAF6] dark:border-[#1F2937]">
          <div>
            <h2 className="text-lg font-bold text-[#111827] dark:text-white">Exemples de CV par métier</h2>
            <p className="text-[13px] text-[#6B7280] dark:text-slate-400 mt-0.5">
              Choisis un exemple proche de ton métier, puis remplace par tes vraies informations.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="press shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]">
            <X size={18} />
          </button>
        </div>

        {/* Recherche + catégories */}
        <div className="p-5 pb-3 space-y-3 border-b border-[#ECEAF6] dark:border-[#1F2937]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un métier ou une compétence…"
              className="input-pro pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
            <button onClick={() => setCategory('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${category === 'all' ? 'bg-[#7D5CFF] text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500'}`}>
              Tous
            </button>
            {CV_EXAMPLE_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${category === c ? 'bg-[#7D5CFF] text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grille d'exemples */}
        <div className="flex-1 overflow-y-auto p-5">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-12 text-slate-400">
              <FileText size={28} />
              <p className="text-sm font-medium">Aucun exemple ne correspond à ta recherche.</p>
            </div>
          ) : (
            <PreviewModeContext.Provider value="thumb">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((ex) => (
                <button key={ex.id} onClick={() => { onPick(ex); onClose(); }} className="press group text-left">
                  <div className="relative rounded-xl overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 shadow-sm transition-all group-hover:ring-[#7D5CFF]/60 group-hover:shadow-md">
                    <ThumbPreview data={ex.data} />
                    <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#7D5CFF] text-white shadow">{ex.category}</span>
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-2 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="inline-block text-[11px] font-bold text-white">Utiliser cet exemple →</span>
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] font-bold text-[#111827] dark:text-white truncate">{ex.role}</div>
                </button>
              ))}
            </div>
            </PreviewModeContext.Provider>
          )}
        </div>
      </div>
    </div>
  );
};

export default CvExamplesModal;
