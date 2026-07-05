import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   StatCard — carte d'indicateur (KPI) homogène pour toute l'app connectée.
   Direction Joboost conservée : card-pro (bordure 1px + ombre douce),
   pastille d'icône teintée par `tone`, valeur en chiffres tabulaires,
   label lisible. Sert de brique de référence aux pages internes.
   ════════════════════════════════════════════════════════════════════ */

export type StatTone = 'violet' | 'blue' | 'emerald' | 'amber';

const TONES: Record<StatTone, { bg: string; text: string; border: string }> = {
  violet: { bg: 'bg-[#F3F0FF] dark:bg-[#7D5CFF]/10', text: 'text-[#7D5CFF]', border: 'border-[#7D5CFF]/15 dark:border-[#7D5CFF]/20' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20' },
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: StatTone;
  /** Légende courte sous le label (ex. « Relance pour en décrocher » quand la valeur est 0).
      Quand elle est fournie, elle est toujours rendue → hauteurs de cartes alignées. */
  hint?: React.ReactNode;
  /** Rend la carte cliquable (navigation rapide). */
  onClick?: () => void;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone = 'violet', hint, onClick, className = '' }) => {
  const t = TONES[tone];
  const inner = (
    <>
      <span className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border ${t.bg} ${t.text} ${t.border}`}>
        {icon}
      </span>
      <div>
        <p className="text-2xl md:text-3xl font-bold text-[#111827] dark:text-white leading-none tracking-tight tabular-nums">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2">{label}</p>
        {hint !== undefined && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-snug">{hint}</p>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`card-pro p-4 md:p-5 flex flex-col gap-4 text-left w-full outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/45 focus-visible:ring-offset-2 ${className}`}
      >
        {inner}
      </button>
    );
  }

  return <div className={`card-pro p-4 md:p-5 flex flex-col gap-4 ${className}`}>{inner}</div>;
};

export default StatCard;
