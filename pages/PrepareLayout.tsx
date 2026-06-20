import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserRound, Contact, PenLine, Sparkles, LayoutGrid } from 'lucide-react';
import PageHero, { heroTab } from '../components/PageHero';

const PrepareLayout: React.FC = () => {
  const { pathname } = useLocation();
  const tabs = [
    { name: 'Mon profil', path: '/prepare/profile', icon: <UserRound size={18} /> },
    { name: 'Mon CV', path: '/prepare/cv', icon: <Contact size={18} /> },
    { name: 'Ma lettre type', path: '/prepare/letter', icon: <PenLine size={18} /> },
    { name: 'Modèles', path: '/prepare/templates', icon: <LayoutGrid size={18} /> },
  ];

  // Le hero épouse la largeur du contenu affiché dessous : Profil est en 5xl,
  // les autres onglets (CV, lettre, modèles) en 6xl → bord gauche toujours aligné.
  const heroWidth = pathname.endsWith('/profile') ? 'max-w-5xl' : 'max-w-6xl';

  return (
    <div className="flex flex-col min-h-full">
      <PageHero
        tone="violet"
        eyebrow="Étape 1 · Préparer"
        icon={<Sparkles size={22} />}
        maxWidth={heroWidth}
        title="Préparer ma candidature"
        subtitle="Ton profil, ton CV et ta lettre type — la base d'une candidature qui décroche des entretiens."
        tabs={tabs.map((tab) => (
          <NavLink key={tab.path} to={tab.path} className={({ isActive }) => heroTab(isActive)}>
            {tab.icon}
            {tab.name}
          </NavLink>
        ))}
      />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default PrepareLayout;
