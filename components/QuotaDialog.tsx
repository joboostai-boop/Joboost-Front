import React from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';

/** Vrai si l'erreur remontée correspond à un dépassement de quota de candidatures. */
export const isQuotaError = (e: any): boolean =>
  e?.code === 'QUOTA_EXCEEDED' || e?.status === 402;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Message contextualisé renvoyé par le serveur (sinon message par défaut). */
  message?: string;
}

/**
 * Boîte qui PROPOSE l'offre adaptée lorsqu'un quota de candidatures est atteint,
 * au lieu d'un simple toast d'erreur. « Voir les offres » redirige vers /pricing.
 * Réutilisable partout où une action peut être bloquée par le quota (lettre,
 * candidature spontanée…).
 */
const QuotaDialog: React.FC<Props> = ({ open, onClose, message }) => {
  const navigate = useNavigate();
  return (
    <ConfirmDialog
      open={open}
      variant="default"
      title="Limite de candidatures atteinte"
      message={
        message ||
        "Vous avez utilisé toutes vos candidatures de ce mois-ci. Passez à l'abonnement Élite ou ajoutez un pack de crédits pour continuer."
      }
      confirmLabel="Voir les offres"
      cancelLabel="Plus tard"
      onConfirm={() => {
        onClose();
        navigate('/pricing');
      }}
      onCancel={onClose}
    />
  );
};

export default QuotaDialog;
