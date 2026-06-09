import React from 'react';
import { PRIMARY_NAV, SECONDARY_NAV, BUSINESS_NAVIGATION } from '../constants';
import { UserRound, Building2 } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface SidebarProps {
  currentPath: string;
}

const isItemActive = (currentPath: string, path: string) =>
  currentPath === `/${path}` || currentPath.startsWith(`/${path}/`);

const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const { user } = useAuth();
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';

  // Groupes de navigation : parcours (haut) + système (bas).
  const primary = isBusinessPartner ? BUSINESS_NAVIGATION : PRIMARY_NAV;
  const secondary = isBusinessPartner ? [] : SECONDARY_NAV;
  const homeLink = isBusinessPartner ? '/business/offers' : '/home';

  const renderItem = (item: { name: string; icon: React.ReactNode; path: string }) => {
    const active = isItemActive(currentPath, item.path);
    return (
      <Link
        key={item.path}
        to={`/${item.path}`}
        title={item.name}
        className={`group flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200 outline-none
          px-3 py-2.5 lg:py-2 justify-center lg:justify-start
          ${active
            ? 'bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10'
            : 'text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] hover:text-[#111827] dark:hover:text-white'}`}
      >
        <span className={`flex items-center justify-center w-6 h-6 shrink-0 transition-colors duration-200 ${
          active ? 'text-[#7D5CFF]' : 'text-[#9CA3AF] group-hover:text-[#111827] dark:group-hover:text-white'
        }`}>
          {item.icon}
        </span>
        <span className="hidden lg:inline truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen bg-white dark:bg-[#030712] border-r border-slate-200 dark:border-slate-800 sticky top-0 left-0 z-40 shrink-0 transition-[width] duration-200">
      {/* Logo : icône sur le rail (tablette), complet sur PC */}
      <div className="h-[72px] flex items-center justify-center lg:justify-start lg:px-6 shrink-0">
        <Link to={homeLink} className="flex items-center" aria-label="Accueil JoBoost">
          <Logo variant="icon" className="h-8 lg:hidden" />
          <Logo variant="full" className="h-8 hidden lg:flex" />
        </Link>
      </div>

      {/* Role badge (PC uniquement) */}
      {isBusinessPartner && (
        <div className="hidden lg:block mx-3 mb-3 px-3 py-2 bg-[#7D5CFF]/5 dark:bg-[#7D5CFF]/10 rounded-lg border border-[#7D5CFF]/10">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#7D5CFF]" />
            <span className="text-xs font-semibold text-[#7D5CFF]">Espace Partenaire</span>
          </div>
        </div>
      )}

      {/* Parcours principal */}
      <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto scrollbar-none">
        {primary.map(renderItem)}
      </nav>

      {/* Système (Abonnement / Paramètres) */}
      {secondary.length > 0 && (
        <div className="px-3 py-3 border-t border-[#E5E7EB] dark:border-[#1F2937] space-y-1">
          {secondary.map(renderItem)}
        </div>
      )}

      {/* Carte utilisateur */}
      <div className="p-3 lg:p-4 border-t border-[#E5E7EB] dark:border-[#1F2937]">
        <Link
          to={isBusinessPartner ? '/settings' : '/prepare/profile'}
          title="Mon profil"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937] transition-colors outline-none justify-center lg:justify-start"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
            isBusinessPartner
              ? 'bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5]'
              : 'bg-[#F3F4F6] dark:bg-[#1F2937] text-[#6B7280]'
          }`}>
            {isBusinessPartner ? <Building2 size={16} /> : <UserRound size={16} />}
          </div>
          <div className="hidden lg:block text-left overflow-hidden">
            <p className="text-xs font-semibold text-[#111827] dark:text-white truncate">
              {user?.name || (isBusinessPartner ? 'Partenaire' : 'Mon compte')}
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {isBusinessPartner ? 'Business Partner' : 'Voir mon profil'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
