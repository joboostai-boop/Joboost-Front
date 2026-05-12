
import React from 'react';
import { NAVIGATION, BUSINESS_NAVIGATION } from '../constants';
import { ChevronRight, UserRound, Building2 } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

import { Link } from 'react-router-dom';

interface SidebarProps {
  currentPath: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const { user } = useAuth();
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';
  const navItems = isBusinessPartner ? BUSINESS_NAVIGATION : NAVIGATION;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-[#030712] border-r border-slate-200 dark:border-slate-800 sticky top-0 left-0 z-40 shrink-0">
      <div className="p-6">
        <Link to={isBusinessPartner ? '/business/offers' : '/dashboard'} className="flex items-center cursor-pointer">
          <Logo />
        </Link>
      </div>

      {/* Role badge */}
      {isBusinessPartner && (
        <div className="mx-3 mb-3 px-3 py-2 bg-[#7D5CFF]/5 dark:bg-[#7D5CFF]/10 rounded-lg border border-[#7D5CFF]/10">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#7D5CFF]" />
            <span className="text-xs font-semibold text-[#7D5CFF]">Espace Partenaire</span>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || currentPath === `/${item.path}` || currentPath.startsWith(`/${item.path}/`) || currentPath.startsWith(`/${item.path}`);
          return (
            <Link
              key={item.path}
              to={`/${item.path}`}
              className={`w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors duration-200 font-medium group outline-none ${
                isActive
                  ? 'bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10'
                  : 'text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              <div className={`mr-3 flex items-center justify-center w-6 h-6 rounded transition-colors duration-200 ${
                isActive 
                  ? 'text-[#7D5CFF]' 
                  : 'text-[#9CA3AF] group-hover:text-[#111827] dark:group-hover:text-white'
              }`}>
                {item.icon}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E5E7EB] dark:border-[#1F2937]">
        <Link
          to={isBusinessPartner ? '/settings' : '/prepare/profile'}
          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors outline-none"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
            isBusinessPartner
              ? 'bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5]'
              : 'bg-[#F3F4F6] dark:bg-[#1F2937] text-[#6B7280]'
          }`}>
            {isBusinessPartner ? (
              <Building2 size={16} />
            ) : (
              <UserRound size={16} />
            )}
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-semibold text-[#111827] dark:text-white truncate">
              {user?.name || (isBusinessPartner ? 'Partenaire' : 'Candidat Pro')}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {isBusinessPartner ? 'Business Partner' : 'Compte Premium'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
