import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   EmptyState — états vides « accueillants » propres à Joboost.

   Illustrations SVG sur-mesure (légères, nettes, dark-mode), déclinées par
   contexte métier : candidatures suivies, offre + score de match, favori,
   radar d'entreprises. Objectif : un écran neuf ne doit pas paraître « mort »
   mais inviter à l'action. */

type Variant = 'applications' | 'offers' | 'saved' | 'companies' | 'generic';

const BRAND = '#7D5CFF';

/* Carte « offre/candidature » réutilisée comme base des illustrations. */
const MiniCard: React.FC<{ children?: React.ReactNode; rotate?: number }> = ({ children, rotate = 0 }) => (
  <g transform={`rotate(${rotate} 68 72)`}>
    <rect x="28" y="38" width="80" height="68" rx="12" fill="#FFFFFF" stroke="#E6E3F5" />
    <rect x="40" y="50" width="22" height="22" rx="7" fill={BRAND} opacity="0.14" />
    <rect x="70" y="52" width="28" height="6" rx="3" fill="#0B0B14" opacity="0.78" />
    <rect x="70" y="63" width="18" height="5" rx="2.5" fill="#94A3B8" />
    {children}
  </g>
);

const Art: React.FC<{ variant: Variant }> = ({ variant }) => (
  <div className="relative">
    <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 m-auto h-24 w-24 rounded-full bg-[#7D5CFF]/15 blur-2xl" />
    <svg viewBox="0 0 136 130" className="w-36 h-32" role="img" aria-hidden="true">
      <ellipse cx="68" cy="74" rx="58" ry="46" fill={BRAND} opacity="0.06" />

      {variant === 'applications' && (
        <>
          <rect x="44" y="30" width="78" height="64" rx="12" fill="#FFFFFF" stroke="#ECEAF6" transform="rotate(7 83 62)" />
          <MiniCard rotate={-5}>
            <rect x="40" y="84" width="44" height="13" rx="6.5" fill="#10B981" opacity="0.12" />
            <circle cx="48" cy="90.5" r="2.5" fill="#10B981" />
            <rect x="54" y="88" width="24" height="5" rx="2.5" fill="#10B981" />
          </MiniCard>
          <g transform="translate(102 30)">
            <circle r="14" fill={BRAND} />
            <path d="M-5 0 l3.5 4 l7 -8.5" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </>
      )}

      {variant === 'offers' && (
        <>
          <rect x="44" y="30" width="78" height="64" rx="12" fill="#FFFFFF" stroke="#ECEAF6" transform="rotate(7 83 62)" />
          <MiniCard rotate={-5}>
            <rect x="40" y="86" width="30" height="5" rx="2.5" fill="#CBD5E1" />
          </MiniCard>
          <g transform="translate(101 33)">
            <circle r="16" fill="#FFFFFF" stroke="#E6E3F5" />
            <circle r="16" fill="none" stroke={BRAND} strokeWidth="3" strokeLinecap="round" strokeDasharray="78 100" transform="rotate(-90)" />
            <text x="0" y="3.5" textAnchor="middle" fontSize="9" fontWeight="700" fill={BRAND}>92%</text>
          </g>
        </>
      )}

      {variant === 'saved' && (
        <>
          <rect x="44" y="30" width="78" height="64" rx="12" fill="#FFFFFF" stroke="#ECEAF6" transform="rotate(7 83 62)" />
          <MiniCard rotate={-5}>
            <rect x="40" y="86" width="30" height="5" rx="2.5" fill="#CBD5E1" />
          </MiniCard>
          <g transform="translate(98 26)">
            <circle r="15" fill={BRAND} />
            <path d="M-4.5 -6 h9 a1.5 1.5 0 0 1 1.5 1.5 v11 l-6 -3.6 l-6 3.6 v-11 a1.5 1.5 0 0 1 1.5 -1.5 z" fill="#fff" />
          </g>
        </>
      )}

      {variant === 'companies' && (
        <>
          {/* Immeuble */}
          <rect x="34" y="48" width="46" height="58" rx="8" fill="#FFFFFF" stroke="#E6E3F5" />
          <rect x="43" y="58" width="9" height="9" rx="2" fill={BRAND} opacity="0.18" />
          <rect x="58" y="58" width="9" height="9" rx="2" fill={BRAND} opacity="0.18" />
          <rect x="43" y="73" width="9" height="9" rx="2" fill={BRAND} opacity="0.18" />
          <rect x="58" y="73" width="9" height="9" rx="2" fill={BRAND} opacity="0.18" />
          <rect x="50" y="90" width="13" height="16" rx="2" fill={BRAND} opacity="0.28" />
          {/* Avion en papier */}
          <g transform="translate(92 40) rotate(8)">
            <circle r="17" fill={BRAND} />
            <path d="M-7 -1.5 l14 -5 l-5 13 l-3.5 -5 z" fill="#fff" />
            <path d="M-7 -1.5 l5.5 3 l3.5 4.5 z" fill="#fff" opacity="0.7" />
          </g>
        </>
      )}

      {variant === 'generic' && <MiniCard rotate={-4} />}
    </svg>
  </div>
);

export interface EmptyStateProps {
  variant?: Variant;
  title: string;
  description?: string;
  /** CTA(s) — généralement un <button>/<Link> aux styles .btn existants. */
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ variant = 'generic', title, description, action, className = '' }) => (
  <div className={`surface flex flex-col items-center text-center gap-3 px-6 py-12 animate-fade-in-up ${className}`}>
    <Art variant={variant} />
    <div>
      <h3 className="text-base font-bold text-[#111827] dark:text-white">{title}</h3>
      {description && <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
