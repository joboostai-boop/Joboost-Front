import React from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Briefcase } from 'lucide-react';
import SectionNav, { SectionTab } from '../components/SectionNav';

const TrackLayout: React.FC = () => {
  const tabs: SectionTab[] = [
    { name: 'Candidatures', path: '/track/applications', icon: <Briefcase size={17} />, description: 'Où en est chacune de tes candidatures.' },
    { name: 'Statistiques', path: '/track/dashboard', icon: <LayoutDashboard size={17} />, description: 'Ton rythme de candidature et tes taux de réponse.' },
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

export default TrackLayout;
