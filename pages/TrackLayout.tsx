import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase } from 'lucide-react';

const TrackLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 pt-6 shrink-0 z-10 sticky top-0">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-8 h-8 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded-md flex items-center justify-center text-[#7D5CFF]">
             <span className="font-bold text-sm">3</span>
           </div>
           <div>
             <h1>Suivre</h1>
             <p>Suis tes candidatures et tes réponses.</p>
           </div>
        </div>
        
        <div className="flex gap-2 pb-[-1px] overflow-x-auto scrollbar-none">
          <NavLink
            to="/track/applications"
            className={({ isActive }) => 
              `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                isActive 
                  ? 'border-[#7D5CFF] text-[#7D5CFF]' 
                  : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
              }`
            }
          >
            <Briefcase size={18} /> Mes candidatures
          </NavLink>
          <NavLink
            to="/track/dashboard"
            className={({ isActive }) => 
              `flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none ${
                isActive 
                  ? 'border-[#7D5CFF] text-[#7D5CFF]' 
                  : 'border-transparent text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:border-[#D1D5DB] dark:hover:border-[#374151]'
              }`
            }
          >
            <LayoutDashboard size={18} /> Statistiques
          </NavLink>
        </div>
      </div>
      <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950">
        <Outlet />
      </div>
    </div>
  );
};

export default TrackLayout;
