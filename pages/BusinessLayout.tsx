import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Megaphone, Users, BarChart3, Building2 } from 'lucide-react';
import PageHero, { heroTab } from '../components/PageHero';

const BUSINESS_TABS = [
  { name: 'Offres d\'emploi', icon: <Megaphone size={18} />, path: '/business/offers', title: 'Offres d\'emploi', subtitle: 'Créez et gérez les offres proposées à vos adhérents.' },
  { name: 'Demandeurs', icon: <Users size={18} />, path: '/business/jobseekers', title: 'Demandeurs d\'emploi', subtitle: 'Explorez votre vivier de talents et suivez vos contacts.' },
  { name: 'Statistiques', icon: <BarChart3 size={18} />, path: '/business/stats', title: 'Statistiques', subtitle: 'Mesurez l\'activité et la performance de votre espace recruteur.' },
];

const BusinessLayout: React.FC = () => {
  const location = useLocation();
  const active = BUSINESS_TABS.find((t) => location.pathname.startsWith(t.path)) ?? BUSINESS_TABS[0];

  return (
    <div className="min-h-full">
      <PageHero
        tone="slate"
        eyebrow="Espace recruteur"
        icon={<Building2 size={22} />}
        title={active.title}
        subtitle={active.subtitle}
        maxWidth="max-w-7xl"
        tabs={BUSINESS_TABS.map((tab) => (
          <NavLink key={tab.path} to={tab.path} className={({ isActive }) => heroTab(isActive)}>
            {tab.icon}
            {tab.name}
          </NavLink>
        ))}
      />

      {/* Page content — padded for mobile bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-7 pb-24 md:pb-7">
        <Outlet />
      </div>
    </div>
  );
};

export default BusinessLayout;
