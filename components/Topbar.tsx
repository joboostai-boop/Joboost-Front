import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import PlanBadge from './PlanBadge';
import { User } from '../types';

interface TopbarProps {
  user: User;
}

const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JB';

/* Barre supérieure de l'app : chrome global discret.
   - sur mobile, porte le logo (la sidebar y est masquée) ;
   - à droite : pastille d'upgrade (plan gratuit) + avatar vers le compte. */
const Topbar: React.FC<TopbarProps> = ({ user }) => {
  const isBusiness = user?.role === 'BUSINESS_PARTNER';

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      {/* Logo mobile (la sidebar est masquée < md) */}
      <Link to={isBusiness ? '/business/dashboard' : '/home'} className="md:hidden flex items-center" aria-label="Accueil">
        <Logo className="h-7" />
      </Link>
      {/* Espace à gauche sur desktop */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Pastille de plan : essai en cours, solde restant ou abonnement. Remplace
            l'ancien « Passer à Élite » fixe, qui s'affichait même pendant l'essai. */}
        {!isBusiness && <PlanBadge />}
        <Link
          to="/settings"
          aria-label="Mon compte"
          className="w-9 h-9 rounded-full bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#A78BFA] flex items-center justify-center text-xs font-bold border border-[#7D5CFF]/20 hover:bg-[#7D5CFF]/15 transition-colors"
        >
          {initials(user?.name)}
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
