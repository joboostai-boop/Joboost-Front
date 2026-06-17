import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleProps {
  title: React.ReactNode;
  /** Petit numéro d'étape affiché dans une pastille à gauche. */
  step?: number;
  /** Icône (à la place du numéro) — pastille teintée marque. */
  icon?: React.ReactNode;
  /** Sous-titre discret sous le titre (ex. modèle courant). */
  subtitle?: React.ReactNode;
  /** Pastille à droite (ex. compteur d'éléments). */
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  /** Si false : section TOUJOURS visible (pas de repli, pas de chevron). */
  collapsible?: boolean;
  /** Padding du contenu (surchargeable). */
  bodyClassName?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Section repliable (accordéon) au langage visuel Joboost (.surface).
 * Réduit la surcharge : on n'affiche que l'en-tête, le contenu se déplie au clic.
 * Animation de hauteur fluide via grid-template-rows (0fr → 1fr), sans mesure JS,
 * neutralisée par prefers-reduced-motion (transitions globales coupées).
 */
const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  step,
  icon,
  subtitle,
  badge,
  defaultOpen = false,
  collapsible = true,
  bodyClassName,
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const Pill = (step !== undefined || icon) ? (
    <span className="shrink-0 w-8 h-8 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center text-sm font-bold">
      {icon ?? step}
    </span>
  ) : null;

  const Heading = (
    <>
      {Pill}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-[#111827] dark:text-white truncate">{title}</span>
        {subtitle && <span className="block text-xs text-[#9CA3AF] truncate mt-0.5">{subtitle}</span>}
      </span>
      {badge}
    </>
  );

  // Mode statique « épuré » : section TOUJOURS visible, SANS carte.
  // En-tête léger numéroté + contenu directement sur la page → moins de « blocs »,
  // beaucoup plus d'air (direction Linear/Notion). Aucune donnée n'est masquée.
  if (!collapsible) {
    return (
      <section className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-3">{Heading}</div>
        <div className={bodyClassName}>{children}</div>
      </section>
    );
  }

  return (
    <div className={`surface overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press w-full flex items-center gap-3 p-4 md:p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/40"
      >
        {Heading}
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#9CA3AF] transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className={bodyClassName ?? 'px-4 md:px-5 pb-5'}>{children}</div>
        </div>
      </div>
    </div>
  );
};

/** Pastille compteur réutilisable pour le `badge` d'un Collapsible. */
export const CountBadge: React.FC<{ n: number }> = ({ n }) => (
  <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] text-xs font-bold flex items-center justify-center tabular-nums">
    {n}
  </span>
);

export default Collapsible;
