import React, { useId } from 'react';
import { Navigation } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────
   RadiusSelect — sélecteur de rayon de recherche.

   Remplace le <select> natif (dont la liste déroulante est imposée par l'OS,
   non stylable) par un contrôle segmenté : toutes les valeurs sont visibles
   d'un coup, un seul tap, et le style suit le langage des onglets de l'app
   (pilule active en dégradé violet marque). Accessible (radiogroup + flèches).
   ──────────────────────────────────────────────────────────────────────── */

export interface RadiusSelectProps {
  value: number;
  onChange: (km: number) => void;
  options?: number[];
  disabled?: boolean;
  /** Libellé court rendu au-dessus du contrôle. */
  label?: string;
}

const DEFAULT_OPTIONS = [10, 20, 30, 50, 100];

const RadiusSelect: React.FC<RadiusSelectProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  label = 'Rayon de recherche',
}) => {
  const groupId = useId();

  const move = (dir: -1 | 1) => {
    const i = options.indexOf(value);
    const next = options[(i + dir + options.length) % options.length];
    if (next != null) onChange(next);
  };

  return (
    <div>
      <div className="input-label flex items-center gap-1.5">
        <Navigation size={13} className="text-[#9CA3AF]" />
        {label}
        <span className="ml-auto text-xs font-bold tabular-nums text-[#7D5CFF]">{value} km</span>
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); move(1); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); move(-1); }
        }}
        className={`grid grid-cols-5 gap-1 p-1 min-h-[44px] rounded-xl bg-white dark:bg-[#111827] border border-[#E2E0EF] dark:border-[#374151] shadow-xs transition-opacity ${
          disabled ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {options.map((km) => {
          const active = value === km;
          return (
            <button
              key={km}
              type="button"
              role="radio"
              aria-checked={active}
              aria-labelledby={`${groupId}-${km}`}
              tabIndex={active ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(km)}
              className={`press tab-shine relative flex items-center justify-center rounded-lg text-sm font-semibold tabular-nums outline-none transition-all focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/40 ${
                active
                  ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#7D5CFF] hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
              }`}
            >
              <span id={`${groupId}-${km}`}>{km}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RadiusSelect;
