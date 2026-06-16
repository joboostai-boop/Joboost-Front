import React, { useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface HeroDecorProps {
  /** Décale la composition selon le héros. */
  variant?: 'accueil' | 'prepare';
  className?: string;
}

/**
 * Décor 3D flottant placé en fond de héros : orbes lumineux, panneaux inclinés
 * dans l'espace et anneaux, le tout en lévitation lente avec une parallaxe douce
 * au scroll (chaque couche se déplace à une vitesse différente).
 *
 * Purement décoratif (aria-hidden, pointer-events:none → ne bloque ni les boutons
 * ni les onglets) et intégralement neutralisé si prefers-reduced-motion.
 * S'appuie sur les classes .hero-decor / .hero-layer / .hero-orb / .hero-panel
 * / .hero-ring / .hero-anim-* de index.css.
 */
const HeroDecor: React.FC<HeroDecorProps> = ({ variant = 'accueil', className = '' }) => {
  const root = useRef<HTMLDivElement | null>(null);

  // Parallaxe : on déplace chaque couche en translateY proportionnellement au
  // scroll (data-speed), via une variable CSS, throttlé en requestAnimationFrame.
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const layers = Array.from(el.querySelectorAll('.hero-layer')) as HTMLElement[];
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY || 0;
      layers.forEach((layer) => {
        const speed = parseFloat(layer.dataset.speed || '0');
        layer.style.setProperty('--par', `${y * speed}px`);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const prepare = variant === 'prepare';

  return (
    <div ref={root} className={`hero-decor ${className}`} aria-hidden="true">
      {/* Couche arrière (lente) : grand halo violet. */}
      <div className="hero-layer" data-speed="0.12">
        <span
          className="hero-orb hero-anim-soft"
          style={{ top: prepare ? '-70px' : '-90px', right: prepare ? '4%' : '8%', width: 280, height: 280, opacity: 0.7 }}
        />
        <span
          className="hero-ring hero-anim-spin"
          style={{ top: '10px', right: prepare ? '20%' : '26%', width: 180, height: 180, opacity: 0.5 }}
        />
      </div>

      {/* Couche médiane : panneau principal incliné dans l'espace. */}
      <div className="hero-layer" data-speed="-0.06">
        <span
          className="hero-panel hero-anim-float"
          style={{ top: prepare ? '4px' : '-6px', right: prepare ? '7%' : '12%', width: 132, height: 168 }}
        />
        <span
          className="hero-orb hero-anim-float"
          style={{ top: '120px', right: '3%', width: 70, height: 70, opacity: 0.8 }}
        />
      </div>

      {/* Couche avant (rapide) : petit panneau + orbe proche. */}
      <div className="hero-layer" data-speed="-0.14">
        <span
          className="hero-panel hero-anim-soft"
          style={{ top: prepare ? '92px' : '78px', right: prepare ? '24%' : '30%', width: 92, height: 64, borderRadius: 14, opacity: 0.95 }}
        />
        <span
          className="hero-orb hero-anim-soft"
          style={{ top: '-30px', right: '2%', width: 44, height: 44, opacity: 0.9 }}
        />
      </div>
    </div>
  );
};

export default HeroDecor;
