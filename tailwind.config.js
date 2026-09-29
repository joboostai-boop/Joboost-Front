/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    // `services/` définit aussi des classes (ex. dégradés d'avatars entreprise
    // dans visual.ts) : sans ce chemin, Tailwind les purge et les avatars
    // s'affichent en blanc.
    "./services/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Refonte 09/2026 : Geist partout (UI + titres). Grotesque nette et
        // contemporaine, très lisible en petite taille, chiffres réguliers.
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Violet Joboost. DEFAULT (#6E50F5) est un cran plus profond que le violet
        // du logo (#7D5CFF) : il passe le contraste AA en texte sur fond blanc,
        // ce que #7D5CFF ne faisait pas (4,3:1).
        brand: {
          DEFAULT: '#6E50F5',
          50: '#F4F2FF',
          100: '#EAE5FF',
          200: '#D6CCFF',
          300: '#B6A5FF',
          400: '#9479FF',
          500: '#7D5CFF',
          600: '#6E50F5',
          700: '#5A3DDB',
          800: '#4830B0',
        },
        // Neutres sémantiques pilotés par variables CSS (index.css) : ils basculent
        // tout seuls en mode sombre, sans variante `dark:` à répéter partout.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 16 24 / 0.05)',
        card: '0 1px 2px 0 rgb(16 16 24 / 0.04)',
        'card-hover': '0 1px 2px 0 rgb(16 16 24 / 0.04), 0 4px 12px -4px rgb(16 16 24 / 0.08)',
        pop: '0 12px 32px -8px rgb(16 16 24 / 0.18), 0 2px 6px -2px rgb(16 16 24 / 0.06)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Respiration lente du décor aurora du hero — ambiante, jamais au premier plan.
        'aurora-drift': {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '50%': { transform: 'scale(1.09) rotate(2.5deg)' },
        },
      },
      animation: {
        // Apparitions au montage / au scroll. `backwards` et NON `both` : `forwards`
        // conserverait la dernière keyframe, or `transform: none`/`translateY(0)`/
        // `scale(1)` s'y calculent en MATRICE IDENTITÉ, pas en `none`. L'élément
        // garderait un transform à vie et deviendrait le bloc conteneur de tout
        // descendant `fixed`/`sticky` (modales tronquées, popovers mal ancrés).
        // L'état final rejoint l'état naturel : le rendu est identique.
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'fade-in': 'fade-in 0.4s ease-out backwards',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) backwards',
        // Effet de chargement (skeleton) pour les générateurs IA.
        shimmer: 'shimmer 1.5s infinite',
        'aurora-drift': 'aurora-drift 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
