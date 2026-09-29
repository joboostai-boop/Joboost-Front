import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/* ════════════════════════════════════════════════════════════════════
   SectionNav — en-tête des sections internes (Offres, Documents, Suivi).

   Refonte 09/2026. Sur ordinateur, la barre latérale liste déjà toutes les
   pages : répéter des onglets ici ferait doublon. On affiche donc simplement
   le titre de la page courante et une phrase d'explication.
   Sur mobile (pas de barre latérale), on garde un défilement horizontal de
   pastilles pour passer d'une page à l'autre au sein de la section.
   ════════════════════════════════════════════════════════════════════ */

export interface SectionTab {
  name: string;
  path: string;
  icon: React.ReactNode;
  /** Libellé court pour les pastilles mobiles (sinon `name`). */
  shortName?: string;
  /** Phrase affichée sous le titre sur ordinateur. */
  description?: string;
}

interface SectionNavProps {
  tabs: SectionTab[];
  /** Actions optionnelles alignées à droite du titre. */
  right?: React.ReactNode;
}

const SectionNav: React.FC<SectionNavProps> = ({ tabs, right }) => {
  const { pathname } = useLocation();
  const current = tabs.find((t) => pathname === t.path || pathname.startsWith(t.path + '/'));

  return (
    <>
      {/* Mobile : pastilles de sous-navigation */}
      <div className="md:hidden sticky top-14 z-20 bg-canvas/90 backdrop-blur-md border-b border-line">
        <nav className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto overflow-y-hidden scrollbar-none">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `shrink-0 inline-flex items-center h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                  isActive ? 'bg-ink text-canvas' : 'text-muted bg-surface border border-line'
                }`
              }
            >
              {tab.shortName || tab.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Ordinateur : titre de page */}
      {current && (
        <header className="hidden md:flex max-w-6xl mx-auto w-full px-8 pt-10 pb-2 items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight">{current.name}</h1>
            {current.description && <p className="mt-1 text-[15px] text-muted max-w-2xl">{current.description}</p>}
          </div>
          {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
        </header>
      )}
    </>
  );
};

export default SectionNav;
