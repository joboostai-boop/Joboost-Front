import React, { useState } from 'react';
import { NAVIGATION, BUSINESS_NAVIGATION } from '../constants';
import { Menu, X, Megaphone, Users, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  currentPath: string;
  onClose?: () => void;
}

/* ─────────── Business bottom bar items ─────────── */
const BUSINESS_BOTTOM_ITEMS = [
  { label: 'Offres', icon: <Megaphone size={20} />, path: '/business/offers' },
  { label: 'Demandeurs', icon: <Users size={20} />, path: '/business/jobseekers' },
  { label: 'Stats', icon: <BarChart3 size={20} />, path: '/business/stats' },
];

const MobileNav: React.FC<MobileNavProps> = ({ currentPath, onClose }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';

  const handleNavigate = () => {
    setIsMenuOpen(false);
    if (onClose) onClose();
  };

  /* ═════════ BUSINESS: Fixed bottom navigation bar ═════════ */
  if (isBusinessPartner) {
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#030712]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 safe-area-bottom">
        <div className="flex items-stretch justify-around" style={{ height: '64px' }}>
          {BUSINESS_BOTTOM_ITEMS.map((item) => {
            const isActive =
              currentPath === item.path ||
              currentPath.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors duration-200 min-h-[44px] ${
                  isActive
                    ? 'text-[#7D5CFF]'
                    : 'text-slate-400 dark:text-slate-500 active:text-[#7D5CFF]'
                }`}
              >
                {/* Active indicator dot */}
                <div className="relative">
                  {item.icon}
                  {isActive && (
                    <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-[#7D5CFF] rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-[#7D5CFF]' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ═════════ JOBSEEKER: Original drawer navigation ═════════ */
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
            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all min-h-[44px] ${
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

      {/* Floating Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-[80]">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500 min-h-[44px] min-w-[44px] ${
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
