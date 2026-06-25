import { useEffect } from 'react';

/**
 * Comportements standard d'une fenêtre modale / drawer :
 *  - touche Échap pour fermer,
 *  - blocage du défilement de l'arrière-plan tant que la modale est ouverte.
 *
 * À appeler inconditionnellement (règles des hooks) en passant l'état `isOpen`.
 */
export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Blocage du scroll de fond (restauré à la fermeture / au démontage).
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);
}
