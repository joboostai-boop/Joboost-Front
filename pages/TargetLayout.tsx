import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Target, Navigation, PenLine, Bookmark, Send } from 'lucide-react';
import PageHero, { heroTab } from '../components/PageHero';

const TargetLayout: React.FC = () => {
  const location = useLocation();
  const [showLetterTab, setShowLetterTab] = useState(false);

  useEffect(() => {
    // Affiche temporairement l'onglet si on route dessus avec un contexte state
    if (location.pathname.includes('/target/letter')) {
      setShowLetterTab(true);
    } else {
      setShowLetterTab(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-full">
      <PageHero
        tone="indigo"
        eyebrow="Étape 2 · Postuler"
        icon={<Send size={22} />}
        title="Trouver & postuler"
        subtitle="Des offres choisies pour ton profil, des candidatures spontanées ciblées, et l'IA qui rédige pour toi."
        tabs={
          <>
            <NavLink to="/target/offers" className={({ isActive }) => heroTab(isActive)}>
              <Target size={18} /> Offres pour moi
            </NavLink>
            <NavLink to="/target/lbb" className={({ isActive }) => heroTab(isActive)}>
              <Navigation size={18} /> Candidatures spontanées
            </NavLink>
            <NavLink to="/target/saved" className={({ isActive }) => heroTab(isActive)}>
              <Bookmark size={18} /> Offres sauvegardées
            </NavLink>
            {/* L'onglet de rédaction dynamique n'apparait que quand on initie une rédaction contextuelle */}
            {showLetterTab && (
              <NavLink to="/target/letter" className={({ isActive }) => heroTab(isActive)}>
                <PenLine size={18} /> Lettre pour cette offre
              </NavLink>
            )}
          </>
        }
      />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default TargetLayout;
