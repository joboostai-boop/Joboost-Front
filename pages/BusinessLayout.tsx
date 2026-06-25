import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Megaphone, Users, BarChart3, Building2 } from 'lucide-react';

/* En-tête dédié à l'espace recruteur — registre « corporate » (bandeau profond,
   dense, sérieux) aux couleurs Joboost. Volontairement distinct du PageHero clair
   partagé avec les écrans candidat, pour donner à la session B2B une identité
   « logiciel professionnel ». */

const BUSINESS_TABS = [
  { name: 'Offres d\'emploi', icon: <Megaphone size={16} />, path: '/business/offers', title: 'Offres d\'emploi', subtitle: 'Créez et gérez les offres proposées à vos adhérents.' },
  { name: 'Demandeurs', icon: <Users size={16} />, path: '/business/jobseekers', title: 'Vivier de candidats', subtitle: 'Gérez votre base de candidats et suivez vos contacts.' },
  { name: 'Statistiques', icon: <BarChart3 size={16} />, path: '/business/stats', title: 'Statistiques', subtitle: 'Mesurez l\'activité et la performance de votre espace recruteur.' },
];

const tabClass = (isActive: boolean) =>
  `flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-lg transition-colors shrink-0 outline-none ${
    isActive
      ? 'bg-[#7D5CFF] text-white shadow-[0_2px_10px_-2px_rgba(124,92,255,0.7)]'
      : 'text-[#C9BEF2] hover:text-white hover:bg-white/10'
  }`;

const BusinessLayout: React.FC = () => {
  const location = useLocation();
  const active = BUSINESS_TABS.find((t) => location.pathname.startsWith(t.path)) ?? BUSINESS_TABS[0];

  return (
    <div className="min-h-full">
      {/* Bandeau corporate (pleine largeur) */}
      <div className="bg-[#1B1340] dark:bg-[#150F30] border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-7 md:pt-9 pb-0">
          <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A99CE0]">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-[#7D5CFF]/20 text-[#B9A7FF]">
              <Building2 size={14} />
            </span>
            Espace recruteur
          </div>

          <h1 className="mt-3 text-[1.7rem] md:text-[2.1rem] md:leading-[1.06] font-extrabold tracking-[-0.03em] text-white">
            {active.title}
          </h1>
          <p className="mt-1.5 text-[14px] md:text-[15px] text-[#B5A9E0] max-w-2xl leading-relaxed">
            {active.subtitle}
          </p>

          {/* Onglets ancrés au bas du bandeau */}
          <div className="mt-5 flex gap-1.5 overflow-x-auto scrollbar-none pb-3">
            {BUSINESS_TABS.map((tab) => (
              <NavLink key={tab.path} to={tab.path} className={({ isActive }) => tabClass(isActive)}>
                {tab.icon}
                {tab.name}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu — padded for mobile bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-7 pb-24 md:pb-7">
        <Outlet />
      </div>
    </div>
  );
};

export default BusinessLayout;
