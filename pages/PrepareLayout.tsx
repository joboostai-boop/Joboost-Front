import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserRound, Contact, PenLine, LayoutGrid } from 'lucide-react';
import SectionNav, { SectionTab } from '../components/SectionNav';

const PrepareLayout: React.FC = () => {
  const tabs: SectionTab[] = [
    { name: 'Mon profil', shortName: 'Profil', path: '/prepare/profile', icon: <UserRound size={17} />, description: 'Les informations qui servent à rédiger ton CV et tes lettres.' },
    { name: 'Mon CV', shortName: 'CV', path: '/prepare/cv', icon: <Contact size={17} />, description: 'Rédigé à partir de ton profil, modifiable ligne par ligne.' },
    { name: 'Lettre de motivation', shortName: 'Lettre', path: '/prepare/letter', icon: <PenLine size={17} />, description: 'Une lettre de base, à adapter ensuite à chaque offre.' },
    { name: 'Modèles', path: '/prepare/templates', icon: <LayoutGrid size={17} />, description: 'Choisis la mise en page de ton CV.' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      <SectionNav tabs={tabs} />
      <div className="flex-1 w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default PrepareLayout;
