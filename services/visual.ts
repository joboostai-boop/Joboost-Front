/* Aides visuelles partagées entre pages (offres, suivi, favoris…). */

/* Avatar entreprise : dégradé stable par entreprise (hash du nom → palette).
   Même société = même couleur, sur tous les écrans. */
export const AVATAR_GRADIENTS = [
  'from-[#8C6DFF] to-[#6D28D9]', // violet marque
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-indigo-400 to-violet-600',
];

export const companyGradient = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};
