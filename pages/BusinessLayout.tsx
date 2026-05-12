import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Megaphone, Users, BarChart3 } from 'lucide-react';

const BUSINESS_TABS = [
  { name: 'Offres d\'emploi', icon: <Megaphone size={16} />, path: '/business/offers' },
  { name: 'Demandeurs', icon: <Users size={16} />, path: '/business/jobseekers' },
  { name: 'Statistiques', icon: <BarChart3 size={16} />, path: '/business/stats' },
];

const BusinessLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-full">
      {/* Sub-navigation — HIDDEN on mobile, shown md+ (bottom bar handles mobile nav) */}
      <div className="hidden md:block sticky top-0 z-20 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 py-2 overflow-x-auto scrollbar-hide">
            {BUSINESS_TABS.map((tab) => {
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 min-h-[44px] ${
                    isActive
                      ? 'bg-[#7D5CFF]/10 text-[#7D5CFF] dark:bg-[#7D5CFF]/20'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.icon}
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Page content — padded for mobile bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 pb-24 md:pb-6">
        <Outlet />
      </div>
    </div>
  );
};

export default BusinessLayout;
