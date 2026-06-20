import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, LineChart } from 'lucide-react';
import PageHero, { heroTab } from '../components/PageHero';

const TrackLayout: React.FC = () => {
  const { pathname } = useLocation();

  // Le hero épouse la largeur du contenu : Statistiques est en 6xl,
  // Mes candidatures (kanban large) en 1500px → bord gauche toujours aligné.
  const heroWidth = pathname.includes('/dashboard') ? 'max-w-6xl' : 'max-w-[1500px]';

  return (
    <div className="flex flex-col min-h-full">
      <PageHero
        tone="emerald"
        eyebrow="Étape 3 · Suivre"
        icon={<LineChart size={22} />}
        maxWidth={heroWidth}
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
