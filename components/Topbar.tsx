import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import PlanBadge from './PlanBadge';
import { User } from '../types';

interface TopbarProps {
  user: User;
  /** Ouvre la palette de commandes (candidat). */
  onOpenSearch?: () => void;
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
const Topbar: React.FC<TopbarProps> = ({ user, onOpenSearch }) => {
  const isBusiness = user?.role === 'BUSINESS_PARTNER';

  return (
    <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 bg-canvas/85 backdrop-blur-md border-b border-line">
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
        {onOpenSearch && (
          <button onClick={onOpenSearch} aria-label="Rechercher" className="w-8 h-8 rounded-full grid place-items-center text-muted hover:bg-subtle">
            <Search size={17} />
          </button>
        )}
        <Link
          to="/settings"
          aria-label="Mon compte"
          className="rounded-full">
          <Avatar name={user?.name} photoUrl={user?.photoUrl} size={32} />
        </Link>
      </div>
    </header>
  );
};

export default Topbar;
