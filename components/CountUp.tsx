import React, { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface CountUpProps {
  value: number;
  /** Durée de l'animation en ms. */
  duration?: number;
  className?: string;
}

/**
 * Anime un entier de 0 jusqu'à `value` (easing out cubic). Se rejoue si la
 * valeur change (ex. arrivée des stats). Respecte prefers-reduced-motion :
 * affiche directement la valeur finale, sans animation.
 */
const CountUp: React.FC<CountUpProps> = ({ value, duration = 900, className }) => {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(value * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className={className}>{display}</span>;
};

export default CountUp;
