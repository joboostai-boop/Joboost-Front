import React from 'react';
import { PRIMARY_NAV } from '../constants';
import { Megaphone, Users, BarChart3, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  currentPath: string;
  onClose?: () => void;
}

/* ─────────── Business bottom bar items ─────────── */
const BUSINESS_BOTTOM_ITEMS = [
  { label: 'Accueil', icon: <LayoutDashboard size={20} />, path: '/business/dashboard' },
  { label: 'Offres', icon: <Megaphone size={20} />, path: '/business/offers' },
  { label: 'Demandeurs', icon: <Users size={20} />, path: '/business/jobseekers' },
  { label: 'Stats', icon: <BarChart3 size={20} />, path: '/business/stats' },
];

const isActivePath = (currentPath: string, path: string) =>
  currentPath === path || currentPath.startsWith(path + '/');

const MobileNav: React.FC<MobileNavProps> = ({ currentPath }) => {
  const { user } = useAuth();
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';

  /* ═════════ BUSINESS : barre du bas ═════════ */
  if (isBusinessPartner) {
    return (
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pointer-events-none" style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))' }}>
        <div className="pointer-events-auto mx-auto max-w-md flex items-stretch justify-around rounded-2xl bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-lg border border-slate-200 dark:border-slate-800 shadow-pop" style={{ height: '64px' }}>
          {BUSINESS_BOTTOM_ITEMS.map((item) => {
            const active = isActivePath(currentPath, item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-colors duration-200 min-h-[44px] ${
                  active ? 'text-[#7D5CFF]' : 'text-slate-400 dark:text-slate-500 active:text-[#7D5CFF]'
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {active && <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-[#7D5CFF] rounded-full" />}
                </div>
                <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  /* ═════════ CANDIDAT : barre du bas ═════════ */
  // 4 onglets de parcours, répartis uniformément.
  //
  // Le bouton « + » central a été retiré : il pointait vers /target/offers,
  // c'est-à-dire exactement la destination de l'onglet « Postuler » situé juste
  // à sa droite. Deux commandes d'aspect très différent menaient au même écran,
  // et lui seul n'avait aucun libellé — les quatre autres en ont un. Source de
  // confusion pour rien, aucune fonction perdue.

  const renderTab = (item: { name: string; icon: React.ReactNode; path: string }) => {
    const active = isActivePath(currentPath, `/${item.path}`);
    return (
      <Link
        key={item.path}
        to={`/${item.path}`}
        className={`flex flex-col items-center justify-center flex-1 gap-1 min-h-[44px] transition-colors duration-200 ${
          active ? 'text-[#7D5CFF]' : 'text-slate-400 dark:text-slate-500 active:text-[#7D5CFF]'
        }`}
      >
        <span className="relative flex items-center justify-center">
          {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
          {active && <span className="absolute -top-1.5 -right-2 w-1.5 h-1.5 bg-[#7D5CFF] rounded-full" />}
        </span>
        <span className="text-[10px] font-semibold leading-tight">{item.name}</span>
      </Link>
    );
  };

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 px-3 pt-2 pointer-events-none" style={{ paddingBottom: 'calc(0.6rem + env(safe-area-inset-bottom))' }}>
      <div className="pointer-events-auto mx-auto max-w-md flex items-stretch justify-around rounded-2xl bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-lg border border-slate-200 dark:border-slate-800 shadow-pop" style={{ height: '64px' }}>
        {PRIMARY_NAV.map(renderTab)}
      </div>
    </nav>
  );
};

export default MobileNav;
