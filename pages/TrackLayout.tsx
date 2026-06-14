import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, LineChart } from 'lucide-react';
import PageHero, { heroTab } from '../components/PageHero';

const TrackLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-full">
      <PageHero
        tone="emerald"
        eyebrow="Étape 3 · Suivre"
        icon={<LineChart size={22} />}
        title="Suivre mes candidatures"
        subtitle="Garde un œil sur chaque candidature, de la préparation à l'offre — et tes statistiques."
        tabs={
          <>
            <NavLink to="/track/applications" className={({ isActive }) => heroTab(isActive)}>
              <Briefcase size={18} /> Mes candidatures
            </NavLink>
            <NavLink to="/track/dashboard" className={({ isActive }) => heroTab(isActive)}>
              <LayoutDashboard size={18} /> Statistiques
            </NavLink>
          </>
        }
      />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default TrackLayout;
