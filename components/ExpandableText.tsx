import React, { useState } from 'react';

interface Props {
  text: string;
  className?: string;
  /** Nombre de lignes affichées en mode replié (2, 3 ou 4). */
  clamp?: 2 | 3 | 4;
}

/**
 * Paragraphe repliable : affiche un aperçu tronqué (line-clamp) avec un bouton
 * « Voir plus / Voir moins ». Le bouton n'apparaît que si le texte est assez
 * long pour être réellement coupé — sinon on affiche tout, sans bouton inutile.
 */
const ExpandableText: React.FC<Props> = ({ text, className = '', clamp = 3 }) => {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 180;
  // Classes littérales (et non interpolées) pour que Tailwind les détecte.
  const clampClass = clamp === 2 ? 'line-clamp-2' : clamp === 4 ? 'line-clamp-4' : 'line-clamp-3';

  return (
    <>
      <p className={`${className} ${!open && isLong ? clampClass : ''}`}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="press mt-1 text-[12px] font-semibold text-[#7D5CFF] hover:underline"
        >
          {open ? 'Voir moins' : 'Voir plus'}
        </button>
      )}
    </>
  );
};

export default ExpandableText;
