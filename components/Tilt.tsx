import React, { useCallback, useRef } from 'react';

interface TiltProps {
  children: React.ReactNode;
  /** Classe du conteneur (sert de cellule de grille le cas échéant). */
  className?: string;
  /** Amplitude max de l'inclinaison, en degrés. */
  max?: number;
  /** Reflet lumineux qui suit le pointeur. */
  glare?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Inclinaison 3D au survol : la carte s'oriente vers le pointeur (perspective).
 * Dégradation gracieuse — neutralisé au tactile et si prefers-reduced-motion,
 * et le contenu reste cliquable (le reflet est pointer-events:none).
 * S'appuie sur les classes .tilt / .tilt-layer / .tilt-glare de index.css.
 */
const Tilt: React.FC<TiltProps> = ({ children, className = '', max = 7, glare = false }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || e.pointerType === 'touch' || prefersReducedMotion()) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height; // 0..1
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.dataset.active = 'true';
        el.style.setProperty('--ry', `${(px - 0.5) * 2 * max}deg`);
        el.style.setProperty('--rx', `${(0.5 - py) * 2 * max}deg`);
        if (glare) {
          el.style.setProperty('--gx', `${px * 100}%`);
          el.style.setProperty('--gy', `${py * 100}%`);
        }
      });
    },
    [max, glare]
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.dataset.active = 'false';
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-active="false"
    >
      <div className="tilt-layer">
        {glare && <span className="tilt-glare" aria-hidden="true" />}
        {children}
      </div>
    </div>
  );
};

export default Tilt;
