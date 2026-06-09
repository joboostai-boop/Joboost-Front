import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Target, Navigation, PenLine, Bookmark } from 'lucide-react';

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
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-8 h-8 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded-md flex items-center justify-center text-[#7D5CFF]">
             <span className="font-bold text-sm">2</span>
           </div>
           <div>
             <h1>Postuler</h1>
             <p>Trouve des offres et candidate en quelques clics.</p>
           </div>
        </div>
        
        <div className="flex gap-2 pb-[-1px] overflow-x-auto scrollbar-none">
          <NavLink
            to="/target/offers"
            className={({ isActive }) => 
              `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                isActive 
                  ? 'border-[#7D5CFF] text-[#7D5CFF]' 
                  : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
              }`
            }
          >
            <Target size={18} /> Offres pour moi
          </NavLink>
          <NavLink
            to="/target/lbb"
            className={({ isActive }) => 
              `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                isActive 
                  ? 'border-[#7D5CFF] text-[#7D5CFF]' 
                  : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
              }`
            }
          >
            <Navigation size={18} /> Candidatures spontanées
          </NavLink>
          <NavLink
            to="/target/saved"
            className={({ isActive }) =>
              `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                isActive
                  ? 'border-[#7D5CFF] text-[#7D5CFF]'
                  : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
              }`
            }
          >
            <Bookmark size={18} /> Offres sauvegardées
          </NavLink>

          {/* L'onglet de rédaction dynamique n'apparait que quand on initie une rédaction contextuelle */}
          {showLetterTab && (
             <NavLink
             to="/target/letter"
             className={({ isActive }) => 
               `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                 isActive 
                   ? 'border-[#111827] text-[#111827] dark:border-white dark:text-white' 
                   : 'border-transparent text-[#6B7280]'
               }`
             }
           >
             <PenLine size={18} /> Lettre pour cette offre
           </NavLink>
          )}
        </div>
      </div>
      <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </div>
    </div>
  );
};

export default TargetLayout;
