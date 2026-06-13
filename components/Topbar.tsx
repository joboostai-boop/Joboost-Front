import React from 'react';
import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import Logo from './Logo';
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
  const isFree = !isBusiness && (!user?.plan || user.plan === 'Gratuit');

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 md:px-8 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      {/* Logo mobile (la sidebar est masquée < md) */}
      <Link to={isBusiness ? '/business/offers' : '/home'} className="md:hidden flex items-center" aria-label="Accueil">
        <Logo className="h-7" />
      </Link>
      {/* Espace à gauche sur desktop */}
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        {isFree && (
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D5CFF] border border-[#7D5CFF]/25 bg-[#7D5CFF]/[0.06] hover:bg-[#7D5CFF]/10 rounded-full px-3 py-1.5 transition-colors"
          >
            <Crown size={14} /> Passer à Élite
          </Link>
        )}
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
