import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   PageHero — en-tête d'écran, direction pitch.com (claire & aérée).

   Pitch = fond clair, beaucoup de blanc, couleur par PETITES touches.
   On abandonne donc l'ancien bloc coloré plein cadre : ici le fond reste
   neutre (celui de la page), le titre est en encre charbon, et la couleur
   n'apparaît que sur la pastille d'icône (accent discret par section).

   Emplacements optionnels :
     - `actions` : contrôles à droite (boutons, recherche, KPI compacts) ;
     - `tabs`    : barre d'onglets « pilule » (segmented control) rendue sous le titre.

   `tone` ne colore plus qu'un accent (pastille + onglet actif reste violet marque),
   ce qui garde une identité par section sans saturer l'écran. */

type Tone = 'violet' | 'indigo' | 'emerald' | 'amber' | 'slate';

const ACCENT: Record<Tone, string> = {
  violet: 'bg-[#7D5CFF]/10 text-[#7D5CFF]',
  indigo: 'bg-[#6366F1]/10 text-[#6366F1]',
  emerald: 'bg-[#10B981]/12 text-[#0EA371]',
  amber: 'bg-[#F59E0B]/12 text-[#D97706]',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

export interface PageHeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Contrôles alignés à droite du titre (boutons, recherche, stats compactes). */
  actions?: React.ReactNode;
  /** Barre d'onglets / contenu rendu sous le titre (segmented control). */
  tabs?: React.ReactNode;
  /** Décor de fond (ex. <HeroDecor/>) rendu derrière le contenu, non cliquable. */
  decor?: React.ReactNode;
  /** Largeur max du contenu interne. */
  maxWidth?: string;
  className?: string;
}

const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  eyebrow,
  icon,
  tone = 'violet',
  actions,
  tabs,
  decor,
  maxWidth = 'max-w-6xl',
  className = '',
}) => (
  <div className={`relative ${maxWidth} mx-auto px-5 md:px-8 pt-8 md:pt-10 pb-4 animate-fade-in-up ${className}`}>
    {decor}
    <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      <div className="flex items-start gap-3.5 min-w-0">
        {icon && (
          <span className={`hidden sm:flex w-11 h-11 rounded-2xl items-center justify-center shrink-0 ${ACCENT[tone]}`}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">{eyebrow}</p>
          )}
          <h1 className="text-[1.9rem] md:text-[2.4rem] md:leading-[1.04] font-extrabold tracking-[-0.03em] text-[#0B0B14] dark:text-white">
            {title}
          </h1>
          {subtitle && <p className="text-slate-500 dark:text-slate-400 text-[15px] mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>

    {tabs && (
      <div className="relative z-10 mt-6 flex gap-1 p-1 rounded-xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-xs w-fit max-w-full overflow-x-auto scrollbar-none">
        {tabs}
      </div>
    )}
  </div>
);

/* Onglet « pilule » (segmented control) — identique au dock de navigation
   pour un langage visuel unifié dans toute l'app. */
export const heroTab = (isActive: boolean) =>
  `press flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap outline-none transition-all shrink-0 ${
    isActive
      ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
      : 'text-slate-500 dark:text-slate-400 hover:text-[#7D5CFF] hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
  }`;

export default PageHero;
