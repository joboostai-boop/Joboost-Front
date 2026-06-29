import React from 'react';
import { NavLink } from 'react-router-dom';

/* ════════════════════════════════════════════════════════════════════
   SectionNav — navigation secondaire des sections internes (Préparer,
   Postuler, Suivre). Remplace l'ancien gros PageHero (titre + sous-titre).

   Parti pris « SaaS mature » : une barre fine, sticky, à onglets SOULIGNÉS,
   ancrée juste sous la navigation principale (le dock). Pas de carte flottante
   « posée sur » la page : la barre EST le chrome — fond translucide + flou +
   hairline en bas, comme un prolongement de la top-nav. Hiérarchie nette :
   nav principale = pills violettes ; nav secondaire = soulignement discret.

   Offsets sticky : sous le dock desktop (~88px) et sous la topbar mobile (56px). */

export interface SectionTab {
  name: string;
  path: string;
  icon: React.ReactNode;
  /** Libellé court pour mobile (sinon `name`). */
  shortName?: string;
}

interface SectionNavProps {
  tabs: SectionTab[];
  /** Actions optionnelles alignées à droite (boutons, filtres…). */
  right?: React.ReactNode;
}

const tabClass = (isActive: boolean) =>
  `group relative inline-flex items-center gap-2 h-12 md:h-[52px] px-1 text-[13px] font-semibold whitespace-nowrap outline-none border-b-2 -mb-px transition-colors shrink-0 ${
    isActive
      ? 'text-[#7D5CFF] border-[#7D5CFF]'
      : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-100'
  }`;

const SectionNav: React.FC<SectionNavProps> = ({ tabs, right }) => (
  <div className="sticky top-14 md:top-[88px] z-20 md:z-30 bg-[#F5F4FB]/85 dark:bg-[#030712]/85 backdrop-blur-md border-b border-[#ECEAF6] dark:border-[#1F2937]">
    <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between gap-4">
      <nav className="flex items-center gap-6 md:gap-7 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => tabClass(isActive)}
            aria-label={tab.name}
          >
            <span className="flex items-center justify-center w-[17px] h-[17px] shrink-0">{tab.icon}</span>
            {tab.shortName ? (
              <>
                <span className="sm:hidden">{tab.shortName}</span>
                <span className="hidden sm:inline">{tab.name}</span>
              </>
            ) : (
              <span>{tab.name}</span>
            )}
          </NavLink>
        ))}
      </nav>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  </div>
);

export default SectionNav;
