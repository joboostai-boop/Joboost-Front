import React from 'react';

/* Badge de compatibilité — remplace l'ancienne jauge circulaire (MatchRing),
   jugée trop envahissante sur les cartes d'offres. Pilule compacte, couleur
   par niveau : violet = excellent, bleu = bon, vert = correct, ambre = à étudier. */

const LEVELS = [
  { min: 85, cls: 'bg-gradient-to-r from-[#8C6DFF] to-[#6D28D9] text-white shadow-[0_2px_8px_rgba(125,92,255,0.35)]', label: 'Excellent match' },
  { min: 70, cls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/25', label: 'Bon match' },
  { min: 50, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25', label: 'Match correct' },
  { min: 0, cls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/25', label: 'À étudier' },
];

export interface MatchBadgeProps {
  score: number;
  /** Version longue (panneau de détail) : « 96% · Excellent match ». */
  detailed?: boolean;
  className?: string;
}

const MatchBadge: React.FC<MatchBadgeProps> = ({ score, detailed = false, className = '' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const level = LEVELS.find((l) => pct >= l.min) || LEVELS[LEVELS.length - 1];
  return (
    <span
      title={`${pct}% de pertinence pour ton profil`}
      className={`inline-flex items-center gap-1 rounded-full font-black tabular-nums whitespace-nowrap ${
        detailed ? 'px-3 py-1.5 text-xs' : 'px-2 py-0.5 text-[11px]'
      } ${level.cls} ${className}`}
    >
      {pct}%{detailed && <span className="font-bold">&nbsp;· {level.label}</span>}
    </span>
  );
};

export default MatchBadge;
