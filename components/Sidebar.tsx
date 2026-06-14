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

/* Barre latérale sombre « outil pro » : présente sur tous les écrans (desktop/tablette).
   Fond ardoise constant (quel que soit le thème) pour une identité forte, accent
   violet réservé à l'état actif. */
const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const { user } = useAuth();
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';

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
        className={`group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 outline-none
          px-3 py-2.5 lg:py-2 justify-center lg:justify-start
          ${active
            ? 'bg-[#7D5CFF]/15 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
      >
        {/* Barre d'accent à gauche quand actif */}
        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#7D5CFF] hidden lg:block" />}
        <span className={`flex items-center justify-center w-5 h-5 shrink-0 transition-all duration-150 group-hover:scale-110 ${
          active ? 'text-[#A78BFA]' : 'text-slate-500 group-hover:text-white'
        }`}>
          {item.icon}
        </span>
        <span className="hidden lg:inline truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-64 h-screen bg-[#0F172A] border-r border-white/[0.06] sticky top-0 left-0 z-40 shrink-0 transition-[width] duration-200">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-5 shrink-0 border-b border-white/[0.06]">
        <Link to={homeLink} className="flex items-center" aria-label="Accueil JobBoost">
          <Logo variant="icon" onDark className="h-8 lg:hidden" />
          <Logo variant="full" onDark className="h-8 hidden lg:flex" />
        </Link>
      </div>

      {/* Badge rôle (recruteur, PC uniquement) */}
      {isBusinessPartner && (
        <div className="hidden lg:flex items-center gap-2 mx-3 mt-4 px-3 py-2 bg-[#7D5CFF]/10 rounded-lg border border-[#7D5CFF]/20">
          <Building2 size={14} className="text-[#A78BFA]" />
          <span className="text-xs font-semibold text-[#A78BFA]">Espace recruteur</span>
        </div>
      )}

      {/* Parcours principal */}
      <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto scrollbar-none">
        <p className="hidden lg:block px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {isBusinessPartner ? 'Recrutement' : 'Parcours'}
        </p>
        {primary.map(renderItem)}
      </nav>

      {/* Compte (Abonnement / Paramètres) */}
      {secondary.length > 0 && (
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-1">
          <p className="hidden lg:block px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Compte</p>
          {secondary.map(renderItem)}
        </div>
      )}

      {/* Carte utilisateur */}
      <div className="p-3 border-t border-white/[0.06]">
        <Link
          to={isBusinessPartner ? '/settings' : '/prepare/profile'}
          title="Mon profil"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors outline-none justify-center lg:justify-start"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 ${
            isBusinessPartner ? 'bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5]' : 'bg-white/10'
          }`}>
            {isBusinessPartner ? <Building2 size={16} /> : <UserRound size={16} className="text-slate-300" />}
          </div>
          <div className="hidden lg:block text-left overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">
              {user?.name || (isBusinessPartner ? 'Partenaire' : 'Mon compte')}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {isBusinessPartner ? 'Espace recruteur' : 'Voir mon profil'}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
