import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   PageHero — en-tête « hero » signature (direction pitch.com).

   Bloc coloré affirmé, plein cadre, qui coiffe chaque écran de l'app :
   gros titre extrabold, eyebrow, sous-titre, monogramme/icône en pastille
   givrée, halos décoratifs, et deux emplacements optionnels :
     - `actions` : contrôles à droite (boutons, recherche, KPI compacts) ;
     - `tabs`    : barre d'onglets rendue DANS le hero (pour les layouts).

   C'est ce composant qui règle le « double en-tête » : l'en-tête riche est
   porté une seule fois (par le layout pour les espaces, par la page pour les
   écrans isolés), les pages ne réaffichent plus de <h1> redondant.

   `tone` décline l'aplat coloré par section (densité visuelle pitch) tout en
   restant dans la famille de marque violette. */

type Tone = 'violet' | 'indigo' | 'emerald' | 'amber' | 'slate';

const TONES: Record<Tone, string> = {
  violet: 'from-[#8C6DFF] via-[#7D5CFF] to-[#6D28D9]',
  indigo: 'from-[#6366F1] via-[#5B5BF0] to-[#4338CA]',
  emerald: 'from-[#10B981] via-[#0EA371] to-[#047857]',
  amber: 'from-[#F59E0B] via-[#F0890B] to-[#C2660A]',
  slate: 'from-[#334155] via-[#1E293B] to-[#0F172A]',
};

export interface PageHeroProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  /** Contrôles alignés à droite du titre (boutons, recherche, stats compactes). */
  actions?: React.ReactNode;
  /** Barre d'onglets / contenu rendu sous le titre, dans le bloc coloré. */
  tabs?: React.ReactNode;
  /** Largeur max du contenu interne (le fond reste plein cadre). */
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
  maxWidth = 'max-w-[1500px]',
  className = '',
}) => (
  <div className={`relative overflow-hidden bg-gradient-to-br ${TONES[tone]} text-white ${className}`}>
    {/* Halos décoratifs — signature pitch, profondeur sans surcharge. */}
    <span className="pointer-events-none absolute -right-20 -top-28 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
    <span className="pointer-events-none absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-black/10 blur-3xl" />

    <div className={`relative ${maxWidth} mx-auto px-5 md:px-8 pt-9 pb-7`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          {icon && (
            <span className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25 items-center justify-center shrink-0">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 mb-1.5">{eyebrow}</p>
            )}
            <h1 className="text-3xl md:text-[2.5rem] md:leading-[1.05] font-extrabold tracking-[-0.03em] text-white">
              {title}
            </h1>
            {subtitle && <p className="text-white/80 text-[15px] mt-2 max-w-2xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {tabs && <div className="mt-7 flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">{tabs}</div>}
    </div>
  </div>
);

/* Classes d'onglet « pilule » à utiliser dans le slot `tabs` (NavLink),
   pensées pour le contraste sur l'aplat coloré du hero. */
export const heroTab = (isActive: boolean) =>
  `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap outline-none transition-colors shrink-0 ${
    isActive
      ? 'bg-white text-[#6D28D9] shadow-sm'
      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
  }`;

export default PageHero;
