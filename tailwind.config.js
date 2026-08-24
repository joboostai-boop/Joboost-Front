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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Titres : sans-serif moderne neutre & légèrement arrondie (Manrope ≈ Graphik/SF Pro),
        // plus premium qu'Inter brut, fidèle à la vitrine pitch.com.
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Identité Joboost — violet #7D5CFF décliné en échelle.
        // `brand` (DEFAULT = 500) sert d'alias court ; les pages peuvent
        // aussi continuer d'utiliser les valeurs hex existantes.
        brand: {
          DEFAULT: '#7D5CFF',
          50: '#F3F0FF',
          100: '#E8E1FF',
          200: '#D4C7FF',
          300: '#B9A3FF',
          400: '#9B7BFF',
          500: '#7D5CFF',
          600: '#6023C0',
          700: '#4F46E5',
        },
      },
      // Échelle d'ombres douces et présentes (élévation aérée façon pitch.com).
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        'card': '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 6px 16px -6px rgb(16 24 40 / 0.10)',
        'card-hover': '0 8px 24px -8px rgb(124 92 255 / 0.22), 0 4px 10px -4px rgb(16 24 40 / 0.08)',
        'pop': '0 20px 48px -12px rgb(16 24 40 / 0.22)',
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
