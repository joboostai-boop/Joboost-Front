
import React, { useState } from 'react';
import { NAVIGATION } from '../constants';
import { Menu, X } from 'lucide-react';

import { Link } from 'react-router-dom';

interface MobileNavProps {
  currentPath: string;
  onClose?: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleNavigate = () => {
    setIsMenuOpen(false);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Drawer Menu Overlay */}
      <div 
        className={`md:hidden fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMenuOpen(false)}
      />
      
      <div 
        className={`md:hidden fixed bottom-20 left-4 right-4 z-[70] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 transition-all duration-500 ease-out ${
          isMenuOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Toutes les rubriques</h3>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {NAVIGATION.map((item) => {
            const isActive = currentPath === item.path || currentPath === `/${item.path}`;
            return (
              <Link
                key={item.path}
                onClick={handleNavigate}
                to={`/${item.path}`}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                  isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                  isActive ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/50'
                }`}>
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                </div>
                <span className="text-[10px] font-bold text-center leading-tight">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Floating Menu Button - Top Right (Minimalist & Transparent) */}
      <div className="md:hidden fixed top-4 right-4 z-[80]">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500 ${
            isMenuOpen 
              ? 'bg-indigo-600 text-white rotate-90 shadow-xl shadow-indigo-500/20' 
              : 'bg-transparent text-slate-400 dark:text-slate-500 hover:text-indigo-600'
          }`}
        >
          <div className="relative z-10">
            {isMenuOpen ? (
              <X size={24} strokeWidth={2.5} />
            ) : (
              <Menu size={24} strokeWidth={2} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </button>
      </div>
    </>
  );
};

export default MobileNav;
