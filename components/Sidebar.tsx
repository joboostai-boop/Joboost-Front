import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronsUpDown, LogOut, Settings2, Crown, UserRound, Search, Moon, Sun } from 'lucide-react';
import Logo from './Logo';
import Avatar from './Avatar';
import PlanBadge from './PlanBadge';
import { CANDIDATE_NAV_GROUPS } from '../constants';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';

/* ════════════════════════════════════════════════════════════════════
   Sidebar — navigation principale du candidat sur ordinateur (≥ md).

   Refonte 09/2026 : remplace le dock flottant + la barre d'onglets
   secondaire. Toutes les destinations sont visibles d'un coup d'œil,
   sur un seul niveau, regroupées par intention (chercher / documents /
   suivi). Plus besoin d'ouvrir « Préparer » pour découvrir qu'il
   contient la lettre de motivation.
   ════════════════════════════════════════════════════════════════════ */

export const initials = (name?: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'JB';

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `group flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13.5px] font-medium outline-none transition-colors
   focus-visible:ring-2 focus-visible:ring-brand/40 ${
     isActive
       ? 'bg-surface text-ink shadow-xs border border-line'
       : 'text-muted hover:text-ink hover:bg-subtle border border-transparent'
   }`;

interface SidebarProps {
  user: User;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onOpenSearch: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

const Sidebar: React.FC<SidebarProps> = ({ user, isDarkMode, toggleDarkMode, onOpenSearch }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[248px] flex-col border-r border-line bg-canvas">
      <div className="h-16 flex items-center justify-between pl-5 pr-3 shrink-0">
        <Link to="/home" aria-label="Accueil Joboost" className="flex items-center">
          <Logo className="h-7" />
        </Link>
        <button
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
          title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          className="w-8 h-8 rounded-lg grid place-items-center text-faint hover:text-ink hover:bg-subtle transition-colors"
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      <div className="px-3 pb-4 shrink-0">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg border border-line bg-surface text-[13px] text-faint hover:border-line-strong transition-colors"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="text-[11px] font-medium text-faint">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-none px-3 pb-4 space-y-5" aria-label="Navigation principale">
        {CANDIDATE_NAV_GROUPS.map((group) => (
          <div key={group.label ?? 'root'}>
            {group.label && <p className="eyebrow px-2.5 mb-1.5">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink to={item.path} className={itemClass}>
                    {({ isActive }) => (
                      <>
                        <span className={`shrink-0 ${isActive ? 'text-brand' : 'text-faint group-hover:text-muted'}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 p-3 border-t border-line space-y-2">
        <PlanBadge variant="card" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-subtle transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <Avatar name={user?.name} photoUrl={user?.photoUrl} size={32} />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[13px] font-medium text-ink truncate">{user?.name || 'Mon compte'}</span>
              <span className="block text-xs text-faint truncate">{user?.email}</span>
            </span>
            <ChevronsUpDown size={15} className="text-faint shrink-0" />
          </button>

          {menuOpen && (
            <div role="menu" className="absolute left-0 right-0 bottom-[calc(100%+6px)] z-50 rounded-xl bg-surface border border-line shadow-pop p-1 animate-scale-in origin-bottom">
              {[
                { to: '/prepare/profile', icon: <UserRound size={15} />, label: 'Mon profil' },
                { to: '/pricing', icon: <Crown size={15} />, label: 'Abonnement' },
                { to: '/settings', icon: <Settings2 size={15} />, label: 'Paramètres' },
              ].map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm text-ink hover:bg-subtle transition-colors"
                >
                  <span className="text-faint">{m.icon}</span> {m.label}
                </Link>
              ))}
              <div className="my-1 border-t border-line" />
              <button
                role="menuitem"
                onClick={async () => { setMenuOpen(false); await logout?.(); navigate('/'); }}
                className="w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={15} /> Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
