import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft, FileText, Mail, Moon, Sun, Settings2, Crown, LogOut, Send } from 'lucide-react';
import { CANDIDATE_NAV_GROUPS } from '../constants';
import { useAuth } from '../context/AuthContext';

/* ════════════════════════════════════════════════════════════════════
   CommandPalette — Ctrl+K / ⌘K. Aller n'importe où ou lancer une action
   au clavier, sans chercher dans les menus. Refonte 09/2026.
   ════════════════════════════════════════════════════════════════════ */

interface Command {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  keywords?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

// Recherche tolérante : insensible à la casse et aux accents.
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const CommandPalette: React.FC<Props> = ({ open, onClose, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const go = (path: string) => () => navigate(path);

  const commands: Command[] = useMemo(() => [
    { id: 'new-cv', label: 'Créer ou modifier mon CV', group: 'Actions', icon: <FileText size={16} />, keywords: 'cv curriculum', run: go('/prepare/cv') },
    { id: 'new-letter', label: 'Écrire une lettre de motivation', group: 'Actions', icon: <Mail size={16} />, keywords: 'lettre motivation', run: go('/prepare/letter') },
    { id: 'apply', label: 'Postuler à des offres', group: 'Actions', icon: <Send size={16} />, keywords: 'emploi job candidature', run: go('/target/offers') },
    ...CANDIDATE_NAV_GROUPS.flatMap((g) =>
      g.items.map((it) => ({ id: it.path, label: it.name, group: 'Aller à', icon: it.icon, keywords: g.label, run: go(it.path) })),
    ),
    { id: 'theme', label: isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre', group: 'Préférences', icon: isDarkMode ? <Sun size={16} /> : <Moon size={16} />, keywords: 'theme sombre clair dark', run: toggleDarkMode },
    { id: 'pricing', label: 'Abonnement', group: 'Préférences', icon: <Crown size={16} />, keywords: 'elite prix tarif', run: go('/pricing') },
    { id: 'settings', label: 'Paramètres', group: 'Préférences', icon: <Settings2 size={16} />, keywords: 'compte mot de passe', run: go('/settings') },
    { id: 'logout', label: 'Se déconnecter', group: 'Préférences', icon: <LogOut size={16} />, run: async () => { await logout?.(); navigate('/'); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [isDarkMode]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return commands;
    return commands.filter((c) => norm(`${c.label} ${c.keywords || ''}`).includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  // Garde l'élément actif visible pendant la navigation au clavier.
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const runAt = (i: number) => {
    const c = results[i];
    if (!c) return;
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(index); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let lastGroup = '';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Palette de commandes" className="relative w-full max-w-lg rounded-2xl bg-surface border border-line shadow-pop overflow-hidden animate-scale-in">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search size={18} className="text-faint shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Aller à une page ou lancer une action…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ink placeholder:text-faint"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[index] ? `cmdk-${results[index].id}` : undefined}
          />
          <kbd className="hidden sm:inline-flex h-6 items-center px-1.5 rounded-md border border-line text-[11px] text-faint">Échap</kbd>
        </div>

        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">Aucun résultat pour « {query} »</p>
          )}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const active = i === index;
            return (
              <React.Fragment key={c.id}>
                {header && <p className="eyebrow px-3 pt-3 pb-1.5">{header}</p>}
                <button
                  id={`cmdk-${c.id}`}
                  data-idx={i}
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => setIndex(i)}
                  onClick={() => runAt(i)}
                  className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm text-left transition-colors ${active ? 'bg-subtle text-ink' : 'text-muted'}`}
                >
                  <span className={active ? 'text-brand dark:text-brand-300' : 'text-faint'}>{c.icon}</span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {active && <CornerDownLeft size={14} className="text-faint" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPalette;
