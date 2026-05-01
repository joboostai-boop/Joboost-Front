
import React from 'react';
import { NAVIGATION } from '../constants';
import { ChevronRight, UserRound } from 'lucide-react';
import Logo from './Logo';

import { Link } from 'react-router-dom';

interface SidebarProps {
  currentPath: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-[#030712] border-r border-slate-200 dark:border-slate-800 sticky top-0 left-0 z-40 shrink-0">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center cursor-pointer">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {NAVIGATION.map((item) => {
          const isActive = currentPath === item.path || currentPath === `/${item.path}`;
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
          to="/prepare/profile"
          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] dark:bg-[#1F2937] flex items-center justify-center text-[#6B7280]">
            <UserRound size={16} />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-semibold text-[#111827] dark:text-white truncate">Candidat Pro</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Compte Premium</p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
