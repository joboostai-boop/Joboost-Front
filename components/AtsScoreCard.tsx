import React from 'react';
import { Check, AlertCircle, ShieldCheck } from 'lucide-react';
import type { AtsResult } from '../services/atsScore';

const LEVEL: Record<AtsResult['level'], { color: string; label: string }> = {
  faible: { color: '#EF4444', label: 'À renforcer' },
  moyen: { color: '#F59E0B', label: 'Correct' },
  bon: { color: '#7D5CFF', label: 'Bon' },
  excellent: { color: '#10B981', label: 'Excellent' },
};

/* Jauge circulaire dédiée au score ATS (couleur selon le niveau, distincte de
   la jauge violette de pertinence des offres). */
const Gauge: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const size = 96, stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const center = size / 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx={center} cy={center} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-2xl font-extrabold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-400 mt-0.5">/ 100</span>
      </span>
    </div>
  );
};

const AtsScoreCard: React.FC<{ result: AtsResult }> = ({ result }) => {
  const lvl = LEVEL[result.level];
  // On affiche les critères non satisfaits en premier (ce sont les axes d'amélioration).
  const sorted = [...result.checks].sort((a, b) => Number(a.ok) - Number(b.ok));

  return (
    <div className="surface p-5 space-y-4">
      <div className="flex items-center gap-4">
        <Gauge score={result.score} color={lvl.color} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
            <ShieldCheck size={13} /> Score ATS
          </div>
          <p className="text-lg font-bold mt-0.5" style={{ color: lvl.color }}>{lvl.label}</p>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed mt-0.5">
            Indicateur de lisibilité par les robots de recrutement, basé sur les bonnes pratiques.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {sorted.map((c) => (
          <li key={c.label} className="flex items-start gap-2.5">
            <span className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
              c.ok ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15'
            }`}>
              {c.ok ? <Check size={11} strokeWidth={3} /> : <AlertCircle size={11} />}
            </span>
            <div className="min-w-0">
              <p className={`text-[13px] font-semibold ${c.ok ? 'text-[#374151] dark:text-slate-300' : 'text-[#111827] dark:text-white'}`}>
                {c.label}
              </p>
              {!c.ok && c.tip && <p className="text-[12px] text-[#6B7280] dark:text-slate-400 leading-snug">{c.tip}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AtsScoreCard;
