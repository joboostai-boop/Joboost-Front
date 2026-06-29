import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
   FilterSelect — menu déroulant personnalisé pour les filtres (rayon, type
   de contrat…). Remplace le <select> natif dont la liste déroulante est
   imposée par l'OS (style « système », non raccord avec la charte).

   Déclencheur calé sur `input-pro` (même hauteur/rayon/bordure) ; panneau au
   langage du menu compte (rounded-2xl, shadow-pop, scale-in, actif violet +
   coche). Ferme au clic extérieur / Échap. Accessible (listbox/option).
   ──────────────────────────────────────────────────────────────────────── */

export interface FilterOption {
  value: string | number;
  label: string;
}

interface FilterSelectProps {
  value: string | number;
  options: FilterOption[];
  onChange: (value: string | number) => void;
  icon?: React.ReactNode;
  /** Affiché si la valeur courante ne correspond à aucune option. */
  placeholder?: string;
  ariaLabel?: string;
  /** Appliqué au conteneur (largeur, etc.). */
  className?: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  value,
  options,
  onChange,
  icon,
  placeholder,
  ariaLabel,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? placeholder ?? '';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`press group min-h-[44px] w-full inline-flex items-center gap-2 rounded-xl border bg-white dark:bg-[#111827] pl-3.5 pr-2.5 py-2 text-sm font-semibold text-[#111827] dark:text-white shadow-xs transition-all outline-none ${
          open
            ? 'border-[#7D5CFF] ring-4 ring-[#7D5CFF]/15'
            : 'border-[#E2E0EF] dark:border-[#374151] hover:border-[#7D5CFF]/45'
        }`}
      >
        {icon && (
          <span className={`shrink-0 transition-colors ${open ? 'text-[#7D5CFF]' : 'text-[#9CA3AF] group-hover:text-[#7D5CFF]'}`}>
            {icon}
          </span>
        )}
        <span className="truncate">{label}</span>
        <ChevronDown
          size={16}
          className={`ml-auto shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-[#7D5CFF]' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 z-50 mt-2 min-w-full w-max max-w-[16rem] rounded-2xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-pop p-1.5 animate-scale-in origin-top max-h-72 overflow-auto scrollbar-none"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors ${
                  active
                    ? 'bg-[#7D5CFF]/10 text-[#7D5CFF]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF]'
                }`}
              >
                <span className="flex-1 truncate">{opt.label}</span>
                {active && <Check size={16} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterSelect;
