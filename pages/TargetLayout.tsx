import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Target, Navigation, PenLine, Bookmark, GraduationCap } from 'lucide-react';
import SectionNav, { SectionTab } from '../components/SectionNav';

const TargetLayout: React.FC = () => {
  const location = useLocation();
  // L'onglet « lettre » n'apparaît que lorsqu'on rédige depuis une offre (route contextuelle).
  const showLetterTab = location.pathname.includes('/target/letter');

  const tabs: SectionTab[] = [
    { name: 'Offres pour moi', path: '/target/offers', icon: <Target size={17} /> },
    { name: 'Candidatures spontanées', shortName: 'Spontanées', path: '/target/lbb', icon: <Navigation size={17} /> },
    { name: 'Alternance', path: '/target/alternance', icon: <GraduationCap size={17} /> },
    { name: 'Offres sauvegardées', shortName: 'Sauvegardées', path: '/target/saved', icon: <Bookmark size={17} /> },
    ...(showLetterTab
      ? [{ name: 'Lettre pour cette offre', shortName: 'Lettre', path: '/target/letter', icon: <PenLine size={17} /> }]
      : []),
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

export default TargetLayout;
