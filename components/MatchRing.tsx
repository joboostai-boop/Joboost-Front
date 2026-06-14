import React from 'react';

/* Jauge circulaire de pertinence (SVG, sans dépendance) — réutilisée sur les
   écrans d'offres. Accent violet de marque. */
const MatchRing: React.FC<{ score: number; size?: number }> = ({ score, size = 48 }) => {
  const stroke = 4;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;
  const center = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} title={`${score}% de pertinence`}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={center} cy={center} r={r} fill="none" stroke="#7D5CFF" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#7D5CFF] tabular-nums">{score}%</span>
    </div>
  );
};

export default MatchRing;
