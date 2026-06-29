import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface AiLoadingOverlayProps {
  /** Affiche / masque l'overlay plein écran. */
  show: boolean;
  /** Titre principal (ex. « Rédaction de votre lettre… »). */
  title?: string;
  /** Messages d'étape, affichés en boucle pour faire patienter. */
  messages?: string[];
}

/**
 * Écran de chargement animé pour les générations IA (CV, lettre de motivation).
 * Overlay plein écran avec orbe animé, messages d'étape qui défilent et barre
 * de progression indéterminée. Styles dans index.css (préfixe `.ai-overlay`),
 * avec prise en charge du mode sombre et de `prefers-reduced-motion`.
 */
const AiLoadingOverlay: React.FC<AiLoadingOverlayProps> = ({
  show,
  title = 'Génération en cours…',
  messages = [],
}) => {
  const [idx, setIdx] = useState(0);

  // Fait défiler les messages d'étape tant que l'overlay est visible.
  useEffect(() => {
    if (!show || messages.length <= 1) return;
    setIdx(0);
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(id);
  }, [show, messages.length]);

  if (!show) return null;

  return (
    <div className="ai-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="ai-overlay__backdrop" />
      <div className="ai-overlay__card">
        <div className="ai-overlay__orb">
          <span className="ai-overlay__ring" />
          <span className="ai-overlay__ring ai-overlay__ring--2" />
          <Sparkles className="ai-overlay__icon" size={30} strokeWidth={2.2} />
        </div>
        <h2 className="ai-overlay__title">{title}</h2>
        {messages.length > 0 && (
          <p key={idx} className="ai-overlay__msg">{messages[idx]}</p>
        )}
        <div className="ai-overlay__bar"><span /></div>
      </div>
    </div>
  );
};

export default AiLoadingOverlay;
