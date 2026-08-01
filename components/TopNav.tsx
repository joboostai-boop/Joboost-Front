import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, UserRound, Settings2, Building2, ChevronDown, LogOut } from 'lucide-react';
import { PRIMARY_NAV, BUSINESS_NAVIGATION } from '../constants';
import Logo from './Logo';
import PlanBadge from './PlanBadge';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { businessAccountApi } from '../services/business';

// Logo d'entreprise du recruteur (affiché dans le dock) — chargé une fois par session.
let bizLogoCache: string | null | undefined; // undefined = pas encore chargé

interface TopNavProps {
  user: User;
  currentPath: string;
}

const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JB';

const isItemActive = (currentPath: string, path: string) =>
  currentPath === `/${path}` || currentPath.startsWith(`/${path}/`);

/* Nouvelle navigation « dock flottant » (desktop/tablette ≥ md) — remplace l'ancienne
   sidebar sombre. Barre arrondie en verre dépoli, centrée, avec un onglet actif violet
   façon segmented-control. Le compte (profil, abonnement, paramètres) passe dans un
   menu déroulant à droite, l'upgrade reste une pilule visible. */
const TopNav: React.FC<TopNavProps> = ({ user, currentPath }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isBusiness = user?.role === 'BUSINESS_PARTNER';
  const items = isBusiness ? BUSINESS_NAVIGATION : PRIMARY_NAV;
  const homeLink = isBusiness ? '/business/dashboard' : '/home';

  // Logo d'entreprise dans la pastille compte (session recruteur).
  const [bizLogo, setBizLogo] = useState<string | null>(bizLogoCache ?? null);
  useEffect(() => {
    if (!isBusiness || bizLogoCache !== undefined) return;
    let cancelled = false;
    businessAccountApi.get()
      .then((a) => { bizLogoCache = a.logoUrl || null; if (!cancelled) setBizLogo(bizLogoCache); })
      .catch(() => { bizLogoCache = null; });
    return () => { cancelled = true; };
  }, [isBusiness]);

  return (
    <header className="hidden md:block sticky top-0 z-40 px-6 pt-4 pb-2 bg-[#F5F4FB]/70 dark:bg-[#030712]/70 backdrop-blur-md">
      <div className="max-w-6xl mx-auto h-16 rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur border border-[#ECEAF6] dark:border-[#1F2937] shadow-card px-3 flex items-center justify-between gap-3">
        {/* Marque — badge « Espace recruteur » pour bien distinguer le portail business */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to={homeLink} className="flex items-center pl-1" aria-label="Accueil Joboost">
            <Logo variant="full" className="h-7" />
          </Link>
          {isBusiness && (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7D5CFF]/10 border border-[#7D5CFF]/20 text-[#6023C0] dark:text-[#A78BFA] text-[11px] font-bold">
              <Building2 size={12} /> Espace partenaire
            </span>
          )}
        </div>

        {/* Navigation centrale — segmented control en pilules */}
        <nav className="flex items-center gap-1 rounded-xl bg-[#F5F4FB] dark:bg-[#0B1120] p-1">
          {items.map((item) => {
            const active = isItemActive(currentPath, item.path);
            return (
              <Link
                key={item.path}
                to={`/${item.path}`}
                title={item.name}
                className={`press relative flex items-center gap-2 rounded-lg px-3 lg:px-4 py-2 text-sm font-semibold transition-all duration-150 outline-none
                  ${active
                    ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-[#7D5CFF] hover:bg-white dark:hover:bg-[#1F2937]'}`}
              >
                <span className="flex items-center justify-center w-[18px] h-[18px] shrink-0">{item.icon}</span>
                <span className="hidden lg:inline whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions compte */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Pastille de plan : essai en cours, solde restant ou abonnement. Remplace
              l'ancien « Passer à Élite » fixe, qui s'affichait même pendant l'essai. */}
          {!isBusiness && <PlanBadge />}

          {/* Menu déroulant compte */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="press flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors outline-none"
            >
              {isBusiness && bizLogo ? (
                <span className="w-8 h-8 rounded-full overflow-hidden bg-white border border-[#ECEAF6] dark:border-[#1F2937] flex items-center justify-center shrink-0">
                  <img src={bizLogo} alt="Logo entreprise" className="w-full h-full object-contain p-0.5" />
                </span>
              ) : (
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isBusiness
                    ? 'bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5] text-white'
                    : 'bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#A78BFA] border border-[#7D5CFF]/20'
                }`}>
                  {isBusiness ? <Building2 size={15} /> : initials(user?.name)}
                </span>
              )}
              <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <>
                {/* Voile de fermeture au clic extérieur */}
                <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setMenuOpen(false)} tabIndex={-1} />
                <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-pop p-1.5 animate-scale-in origin-top-right">
                  <div className="px-3 py-2.5 mb-1 border-b border-[#ECEAF6] dark:border-[#1F2937]">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || (isBusiness ? 'Partenaire' : 'Mon compte')}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email || (isBusiness ? 'Espace partenaire' : 'Candidat')}</p>
                  </div>

                  {!isBusiness && (
                    <Link to="/prepare/profile" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
                      <UserRound size={16} /> Mon profil
                    </Link>
                  )}
                  <Link to={isBusiness ? '/business/billing' : '/pricing'} role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
                    <Crown size={16} /> Abonnement
                  </Link>
                  <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
                    <Settings2 size={16} /> Paramètres
                  </Link>

                  <div className="my-1 border-t border-[#ECEAF6] dark:border-[#1F2937]" />
                  <button
                    role="menuitem"
                    onClick={async () => { setMenuOpen(false); await logout?.(); navigate('/'); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} /> Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
