import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, ChevronDown } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  /** Texte du bouton. Si absent → bouton « … » (kebab) compact. */
  label?: string;
  items: ActionItem[];
  /** Alignement du panneau sous le bouton. */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Menu déroulant d'actions secondaires (regroupe Sauvegarder, Imprimer, etc.
 * pour désencombrer l'en-tête d'une page). Se ferme au clic extérieur et à Échap.
 * Accessible (aria-haspopup/expanded, focus-visible).
 */
const ActionMenu: React.FC<ActionMenuProps> = ({ label, items, align = 'right', className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`press btn btn-secondary ${label ? '' : '!px-3'}`}
      >
        {label ? (
          <>
            {label}
            <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        ) : (
          <MoreHorizontal size={18} aria-label="Plus d'actions" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-2 min-w-[210px] p-1.5 surface !rounded-xl shadow-pop animate-scale-in origin-top ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick?.(); }}
              className={`press w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors disabled:opacity-40 disabled:pointer-events-none ${
                it.danger
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10'
                  : 'text-[#374151] dark:text-slate-200 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
              }`}
            >
              {it.icon && <span className="shrink-0 text-[#7D5CFF]">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
