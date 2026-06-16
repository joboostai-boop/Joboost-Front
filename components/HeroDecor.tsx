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

  // Parallaxe 3D à la souris : chaque couche se décale selon sa profondeur
  // (data-depth) quand le curseur survole le hero → sensation de relief.
  useEffect(() => {
    const el = root.current;
    const host = el?.parentElement; // racine du PageHero (reçoit les events)
    if (!el || !host || prefersReducedMotion()) return;
    const layers = Array.from(el.querySelectorAll('.hero-layer')) as HTMLElement[];
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = host.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
        const ny = (e.clientY - r.top) / r.height - 0.5;
        layers.forEach((layer) => {
          const d = parseFloat(layer.dataset.depth || '0');
          layer.style.setProperty('--mx', `${(nx * d).toFixed(1)}px`);
          layer.style.setProperty('--my', `${(ny * d).toFixed(1)}px`);
        });
      });
    };
    const onLeave = () => {
      layers.forEach((layer) => {
        layer.style.setProperty('--mx', '0px');
        layer.style.setProperty('--my', '0px');
      });
    };
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);
    return () => {
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const prepare = variant === 'prepare';

  return (
    <div ref={root} className={`hero-decor ${className}`} aria-hidden="true">
      {/* Couche arrière (lente) : grand halo violet en haut à droite. */}
      <div className="hero-layer" data-speed="0.12" data-depth="-12">
        <span
          className="hero-aurora hero-aurora-a"
          style={{ top: '-120px', right: prepare ? '2%' : '6%', width: 380, height: 380, background: glow('rgba(155,123,255,0.9)') }}
        />
      </div>

      {/* Couche médiane : halo marque, centre-droite. */}
      <div className="hero-layer" data-speed="-0.07" data-depth="20">
        <span
          className="hero-aurora hero-aurora-b"
          style={{ top: '-40px', right: prepare ? '18%' : '24%', width: 300, height: 300, background: glow('rgba(125,92,255,0.85)') }}
        />
      </div>

      {/* Couche avant (rapide) : halo clair plus bas, + lueur derrière l'icône. */}
      <div className="hero-layer" data-speed="0.05" data-depth="34">
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
