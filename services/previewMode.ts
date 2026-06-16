import React from 'react';

/* Mode de rendu d'un aperçu de modèle (CV / lettre) :
   - 'full'  : le document remplit la largeur dispo et affiche TOUTE sa hauteur
               réelle (éditeur — « CV ouvert »).
   - 'thumb' : vignette de taille fixe (ratio A4), contenu rogné — pour les
               grilles de modèles / exemples (petites « cases » uniformes). */
export type PreviewMode = 'full' | 'thumb';

export const PreviewModeContext = React.createContext<PreviewMode>('full');
