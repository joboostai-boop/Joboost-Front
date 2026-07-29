import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModalBehavior } from '../hooks/useModalBehavior';

/** Lien de paiement Élite mensuel (même Payment Link que la page Tarifs). */
const ELITE_MONTHLY = 'https://buy.stripe.com/7sYfZi7xhaXxewu3657ok04';

/** Ajoute l'attribution Stripe (client_reference_id) pour créditer le bon compte. */
const withRef = (url: string, user: any): string =>
  !user?.id
    ? url
    : `${url}${url.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(user.id)}` +
      `&prefilled_email=${encodeURIComponent(user.email || '')}`;

/** Vrai si l'erreur correspond à un quota épuisé (402). */
export const isQuotaError = (e: any): boolean =>
  e?.code === 'QUOTA_EXCEEDED' || e?.status === 402;

/** Vrai si l'erreur correspond à une fonction réservée aux abonnés (403). */
export const isSubscriptionError = (e: any): boolean =>
  e?.code === 'SUBSCRIPTION_REQUIRED' || e?.status === 403;

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'quota' = plus de lettres ce mois-ci · 'feature' = fonction réservée aux abonnés. */
  reason?: 'quota' | 'feature';
  /** Message du serveur, affiché tel quel s'il est fourni. */
  message?: string;
}

/**
 * Fenêtre d'abonnement, ouverte AU MOMENT DU BLOCAGE.
 *
 * Parti pris de vente, décidé avec Sana :
 *  – on liste d'abord ce que l'utilisateur GAGNE, le prix vient après ;
 *  – « résiliable en un clic » lève la vraie objection, qui est la peur de
 *    l'engagement plus que les 14,99 € ;
 *  – une comparaison honnête et vérifiable remet le prix à son échelle ;
 *  – une sortie « Continuer sans » existe toujours : un mur sans issue fait
 *    fermer l'onglet au lieu de faire payer ;
 *  – le bouton mène DIRECTEMENT au paiement, pas à la page tarifs — chaque écran
 *    intermédiaire perd du monde. L'annuel n'est pas proposé ici : deux options
 *    créent de l'hésitation, et personne ne s'engage un an pour une recherche
 *    d'emploi de deux mois.
 */
const UpgradeDialog: React.FC<Props> = ({ open, onClose, reason = 'quota', message }) => {
  const { user } = useAuth();
  useModalBehavior(open, onClose);
  if (!open) return null;

  const titre =
    reason === 'feature'
      ? 'Les candidatures spontanées sont réservées à Élite'
      : "Il ne te reste plus de lettre ce mois-ci";

  const gains = [
    '150 lettres par mois, adaptées à chaque offre',
    'Les candidatures spontanées, envoyées pour toi',
    'Les relances automatiques de tes candidatures',
    "Le simulateur d'entretien, sans limite",
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className="relative w-full sm:max-w-lg bg-white dark:bg-[#111827] rounded-t-3xl sm:rounded-3xl shadow-2xl
                   p-6 sm:p-8 animate-fade-in-up max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={20} />
        </button>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] text-xs font-black uppercase tracking-widest">
          <Zap size={13} strokeWidth={2.8} /> Élite
        </span>

        <h2 className="mt-4 text-2xl sm:text-[28px] font-black tracking-tight text-slate-900 dark:text-white leading-tight">
          {titre}
        </h2>

        {message && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>}

        {/* Ce qu'on gagne, AVANT le prix. */}
        <ul className="mt-6 space-y-3">
          {gains.map((g) => (
            <li key={g} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="text-[15px] font-medium text-slate-700 dark:text-slate-200">{g}</span>
            </li>
          ))}
        </ul>

        {/* Le prix, ensuite — avec la levée d'objection collée dessus. */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900 dark:text-white">14,99 €</span>
            <span className="text-sm font-semibold text-slate-500">/ mois</span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-emerald-600">
            Résiliable en un clic, à tout moment
          </p>
          <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Un mois d'abonnement coûte moins qu'une heure payée au SMIC. Vous cherchez un poste à
            plusieurs milliers d'euros par mois.
          </p>
        </div>

        <a
          href={withRef(ELITE_MONTHLY, user)}
          className="press btn btn-primary btn-lg w-full mt-5"
        >
          Débloquer maintenant
        </a>

        {/* Sortie explicite : un mur sans issue fait partir, il ne fait pas payer. */}
        <button
          onClick={onClose}
          className="w-full mt-3 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          Continuer sans
        </button>
      </div>
    </div>,
    document.body
  );
};

export default UpgradeDialog;
