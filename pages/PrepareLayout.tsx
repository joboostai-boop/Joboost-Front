import React from 'react';
import { Outlet } from 'react-router-dom';
import { UserRound, Contact, PenLine, LayoutGrid, Mic } from 'lucide-react';
import SectionNav, { SectionTab } from '../components/SectionNav';

const PrepareLayout: React.FC = () => {
  const tabs: SectionTab[] = [
    { name: 'Mon profil', path: '/prepare/profile', icon: <UserRound size={17} /> },
    { name: 'Mon CV', path: '/prepare/cv', icon: <Contact size={17} /> },
    { name: 'Ma lettre type', path: '/prepare/letter', icon: <PenLine size={17} /> },
    { name: 'Entretien', path: '/prepare/interview', icon: <Mic size={17} /> },
    { name: 'Modèles', path: '/prepare/templates', icon: <LayoutGrid size={17} /> },
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
