import React, { useEffect, useRef } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface HeroDecorProps {
  /** Décale la composition selon le héros. */
  variant?: 'accueil' | 'prepare';
  className?: string;
}

const glow = (color: string, stop = 70) =>
  `radial-gradient(circle at 50% 50%, ${color}, transparent ${stop}%)`;

/**
 * Décor « aurore » de fond de héros : halos violets flous qui dérivent et
 * respirent lentement, avec une parallaxe douce au scroll (chaque couche se
 * déplace à une vitesse différente). Direction Linear/Stripe — lumière ambiante
 * plutôt que formes nettes.
 *
 * Purement décoratif (aria-hidden, pointer-events:none → ne bloque rien) et
 * intégralement neutralisé si prefers-reduced-motion. S'appuie sur les classes
 * .hero-decor / .hero-layer / .hero-aurora* / .hero-icon-glow de index.css.
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
      {/* Couche arrière (lente) : grand halo violet en haut à droite. */}
      <div className="hero-layer" data-speed="0.12">
        <span
          className="hero-aurora hero-aurora-a"
          style={{ top: '-120px', right: prepare ? '2%' : '6%', width: 380, height: 380, background: glow('rgba(155,123,255,0.9)') }}
        />
      </div>

      {/* Couche médiane : halo marque, centre-droite. */}
      <div className="hero-layer" data-speed="-0.07">
        <span
          className="hero-aurora hero-aurora-b"
          style={{ top: '-40px', right: prepare ? '18%' : '24%', width: 300, height: 300, background: glow('rgba(125,92,255,0.85)') }}
        />
      </div>

      {/* Couche avant (rapide) : halo clair plus bas, + lueur derrière l'icône. */}
      <div className="hero-layer" data-speed="0.05">
        <span
          className="hero-aurora hero-aurora-c"
          style={{ top: '60px', right: '-30px', width: 240, height: 240, background: glow('rgba(196,176,255,0.85)') }}
        />
        <span
          className="hero-aurora hero-icon-glow hidden sm:block"
          style={{ top: '24px', left: '2px', width: 110, height: 110, filter: 'blur(34px)', background: glow('rgba(140,109,255,0.85)', 65) }}
        />
      </div>
    </div>
  );
};

export default HeroDecor;
