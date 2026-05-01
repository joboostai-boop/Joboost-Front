import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { UserRound, Contact, PenLine } from 'lucide-react';

const PrepareLayout: React.FC = () => {
  const tabs = [
    { name: 'Compléter mon profil', path: '/prepare/profile', icon: <UserRound size={18} /> },
    { name: 'Générer mon CV', path: '/prepare/cv', icon: <Contact size={18} /> },
    { name: 'Lettre de base', path: '/prepare/letter', icon: <PenLine size={18} /> }
  ];

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-8 h-8 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded-md flex items-center justify-center text-[#7D5CFF]">
             <span className="font-bold text-sm">1</span>
           </div>
           <div>
             <h1>Préparer mon profil</h1>
             <p>L'étape clé pour que l'IA puisse générer vos documents sur-mesure.</p>
           </div>
        </div>
        
        <div className="flex gap-2 pb-[-1px] overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) => 
                `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                  isActive 
                    ? 'border-[#7D5CFF] text-[#7D5CFF]' 
                    : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
                }`
              }
            >
              {tab.icon}
              {tab.name}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </div>
    </div>
  );
};

export default PrepareLayout;
