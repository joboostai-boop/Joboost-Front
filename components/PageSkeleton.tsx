import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   PageSkeleton — écran d'attente pendant le chargement d'une page (lazy).

   Remplace l'ancien spinner sur fond blanc : au lieu d'un vide, on préfigure
   la structure de la page (titre + cartes) avec des blocs gris animés. C'est
   la pratique « premium » (perçu comme plus rapide, moins cassé au 1er rendu).

   Volontairement NEUTRE (gris, aucun branding) : c'est une base fonctionnelle,
   le style final passera par Fable. Compatible mode sombre. */

const Block: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl bg-slate-200/70 dark:bg-slate-800/70 ${className}`} />
);

export interface PageSkeletonProps {
  /** Nombre de cartes larges à préfigurer sous l'en-tête. */
  rows?: number;
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({ rows = 3 }) => (
  <div className="mx-auto w-full max-w-5xl px-4 py-8 animate-pulse" role="status" aria-label="Chargement…">
    {/* En-tête : petit label + gros titre */}
    <Block className="h-3 w-24 mb-4" />
    <Block className="h-8 w-2/3 max-w-sm mb-8" />

    {/* Bandeau de stats (4 tuiles) */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Block key={i} className="h-24" />
      ))}
    </div>

    {/* Cartes de contenu */}
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Block key={i} className="h-28 w-full" />
      ))}
    </div>

    <span className="sr-only">Chargement…</span>
  </div>
);

export default PageSkeleton;
