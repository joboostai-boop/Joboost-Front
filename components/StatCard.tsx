import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   StatCard — carte d'indicateur (KPI) homogène pour toute l'app connectée.
   Direction Joboost conservée : card-pro (bordure 1px + ombre douce),
   pastille d'icône teintée par `tone`, valeur en chiffres tabulaires,
   label lisible. Sert de brique de référence aux pages internes.
   ════════════════════════════════════════════════════════════════════ */

export type StatTone = 'violet' | 'blue' | 'emerald' | 'amber';

/* Pastille d'icône en dégradé (icône blanche) : plus de relief que l'ancienne
   teinte plate — cohérent avec les avatars d'offres et les badges d'étapes. */
const TONES: Record<StatTone, { grad: string; shadow: string }> = {
  violet: { grad: 'from-[#8C6DFF] to-[#6D28D9]', shadow: 'shadow-[0_3px_10px_rgba(125,92,255,0.35)]' },
  blue: { grad: 'from-sky-400 to-blue-600', shadow: 'shadow-[0_3px_10px_rgba(59,130,246,0.35)]' },
  emerald: { grad: 'from-emerald-400 to-teal-600', shadow: 'shadow-[0_3px_10px_rgba(16,185,129,0.35)]' },
  amber: { grad: 'from-amber-400 to-orange-500', shadow: 'shadow-[0_3px_10px_rgba(245,158,11,0.35)]' },
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
      <span className={`w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br text-white ${t.grad} ${t.shadow}`}>
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
