import React, { useEffect, useId, useState } from 'react';

/* Jauge circulaire de pertinence (SVG, sans dépendance) — réutilisée sur les
   écrans d'offres.

   v2 : couleur par niveau de score (violet = excellent, bleu = bon, ambre = moyen),
   trait en dégradé, halo doux et remplissage ANIMÉ à l'apparition (le pourcentage
   « se dessine », ce qui attire l'œil sur l'info n°1 de la carte). */

const LEVELS = [
  { min: 85, from: '#8C6DFF', to: '#6D28D9', text: 'text-[#7D5CFF]', track: 'stroke-[#7D5CFF]/15' },
  { min: 70, from: '#38BDF8', to: '#2563EB', text: 'text-blue-600 dark:text-blue-400', track: 'stroke-blue-500/15' },
  { min: 50, from: '#34D399', to: '#0D9488', text: 'text-emerald-600 dark:text-emerald-400', track: 'stroke-emerald-500/15' },
  { min: 0, from: '#FBBF24', to: '#F97316', text: 'text-amber-600 dark:text-amber-400', track: 'stroke-amber-500/15' },
];

const MatchRing: React.FC<{ score: number; size?: number }> = ({ score, size = 52 }) => {
  const gradId = useId();
  const stroke = 4.5;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const level = LEVELS.find((l) => pct >= l.min) || LEVELS[LEVELS.length - 1];

  // Remplissage animé : on démarre à 0 puis on transitionne vers la vraie valeur.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setDrawn(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  const offset = c - (drawn / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${score}% de pertinence`}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={level.from} />
            <stop offset="100%" stopColor={level.to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={level.track} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)', filter: `drop-shadow(0 1px 4px ${level.from}55)` }}
        />
      </svg>
      <span className={`absolute inset-0 flex flex-col items-center justify-center leading-none ${level.text}`}>
        <span className="text-[12px] font-black tabular-nums">{score}%</span>
        <span className="text-[7px] font-bold uppercase tracking-wider opacity-70 mt-0.5">match</span>
      </span>
    </div>
  );
};

export default MatchRing;
