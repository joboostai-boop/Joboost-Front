import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  /** Délai d'apparition en ms (pour staggered lists). */
  delay?: number;
  /** Balise rendue (div par défaut). */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

/**
 * Révèle son contenu (fondu + translation) quand il entre dans le viewport.
 * S'appuie sur la classe `.reveal` / `.is-visible` de index.css, qui neutralise
 * elle-même l'effet si l'utilisateur a activé `prefers-reduced-motion`.
 * Le contenu reste toujours dans le DOM : aucune fonctionnalité n'est conditionnée
 * à l'animation (dégradation gracieuse si IntersectionObserver indisponible).
 */
const Reveal: React.FC<RevealProps> = ({ children, delay = 0, as = 'div', className = '' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Filet de sécurité : si l'API manque, on affiche directement.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
