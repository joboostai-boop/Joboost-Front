import React from 'react';

/* ════════════════════════════════════════════════════════════════════
   SectionCard — bloc de section homogène (header titre + caption + action).
   Standardise la structure des cartes de contenu dans l'app connectée :
   même rythme d'espacement, même hiérarchie de titre, même emplacement
   d'action. Brique de référence à propager sur les pages internes.
   ════════════════════════════════════════════════════════════════════ */

export interface SectionCardProps {
  title: React.ReactNode;
  caption?: React.ReactNode;
  /** Contrôle aligné à droite du titre (bouton, menu, pastille). */
  action?: React.ReactNode;
  className?: string;
  /** Padding interne réduit pour les contenus denses (listes). */
  bodyClassName?: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, caption, action, className = '', bodyClassName = '', children }) => (
  <section className={`card-pro p-5 md:p-6 ${className}`}>
    <header className="flex items-start justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[#111827] dark:text-white tracking-[-0.01em]">{title}</h3>
        {caption && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{caption}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
    <div className={bodyClassName}>{children}</div>
  </section>
);

export default SectionCard;
