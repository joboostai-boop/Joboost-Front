import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Crown, Zap } from 'lucide-react';
import { authHeaders } from '../services/authToken';

/* Pastille de plan — visible en PERMANENCE dans les barres du haut (desktop et mobile).
   Jusqu'ici, l'essai de 7 jours et le solde de candidatures n'apparaissaient que sur la
   page Profil : l'utilisateur découvrait la limite au moment d'être bloqué. Un mur qu'on
   voit venir fait payer, un mur qui surprend fait partir.

   Elle remplace l'ancienne pilule « Passer à Élite », qui s'affichait aussi pendant
   l'essai — alors que l'utilisateur avait déjà l'accès complet. */

interface Usage {
  planLabel: string;
  remainingQuota: number;
  credits: number;
  unlimited: boolean;
  isSubscribed: boolean;
  inTrial: boolean;
  trialDaysLeft: number;
}

// Délai minimum entre deux appels. Le solde change après une génération, donc on
// rafraîchit au changement de page — mais jamais plus d'une fois par demi-minute.
// L'état est volontairement LOCAL au composant (et non un cache de module) : au
// changement de compte, un cache partagé aurait affiché le plan du compte précédent.
const MIN_INTERVAL = 30_000;

const PlanBadge: React.FC<{ variant?: 'pill' | 'card' }> = ({ variant = 'pill' }) => {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [fetchedAt, setFetchedAt] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (fetchedAt && Date.now() - fetchedAt < MIN_INTERVAL) return;
    let alive = true;
    fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/usage`, {
      credentials: 'include',
      headers: { ...authHeaders() },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d?.success) return;
        setUsage(d.usage);
        setFetchedAt(Date.now());
      })
      .catch(() => {
        /* silencieux : une pastille d'information ne doit jamais gêner la navigation */
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Rien tant qu'on ne sait pas, et rien pour les comptes illimités : inutile
  // d'encombrer la barre de ceux qui n'ont aucune limite à surveiller.
  if (!usage || usage.unlimited) return null;

  const days = usage.trialDaysLeft;
  const left = usage.remainingQuota + usage.credits;

  /* ── Carte de barre latérale (ordinateur) ── */
  if (variant === 'card') {
    if (usage.isSubscribed) {
      return (
        <Link to="/pricing" className="flex items-center gap-2 px-2.5 h-9 rounded-lg text-[13px] font-medium text-muted hover:bg-subtle hover:text-ink transition-colors">
          <Crown size={15} className="text-brand" /> Abonnement Élite
        </Link>
      );
    }
    // Essai : barre de progression des 7 jours. Hors essai : le solde + l'offre.
    const trialPct = Math.max(0, Math.min(100, ((7 - days) / 7) * 100));
    return (
      <Link to="/pricing" className="block rounded-xl border border-line bg-surface p-3 hover:border-line-strong transition-colors">
        {usage.inTrial ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-medium text-ink">Essai gratuit</p>
              <p className={`text-xs tabular-nums ${days <= 2 ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-faint'}`}>
                {days} jour{days > 1 ? 's' : ''}
              </p>
            </div>
            <div className="mt-2 h-1 rounded-full bg-subtle overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${trialPct}%` }} />
            </div>
            <p className="mt-2.5 text-xs font-medium text-brand dark:text-brand-300">Passer à Élite →</p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-medium text-ink">Formule gratuite</p>
            <p className="text-xs text-faint mt-0.5">
              {left > 0 ? `${left} candidature${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Quota du mois atteint'}
            </p>
            <span className="mt-2.5 btn btn-primary w-full !min-h-[34px] !py-1.5 text-[13px]">
              <Crown size={14} /> Passer à Élite
            </span>
          </>
        )}
      </Link>
    );
  }

  /* ── Pastille de la barre du haut (mobile) ── */
  const base =
    'inline-flex items-center gap-1.5 text-xs font-medium rounded-full h-8 px-3 transition-colors whitespace-nowrap';

  if (usage.isSubscribed) {
    return (
      <Link to="/pricing" className={`${base} text-brand dark:text-brand-300 border border-brand/20 bg-brand/[0.06]`}>
        <Crown size={14} /> Élite
      </Link>
    );
  }

  if (usage.inTrial) {
    const urgent = days <= 2;
    return (
      <Link
        to="/pricing"
        title={`Essai gratuit : ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`}
        className={`${base} border ${
          urgent
            ? 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40'
            : 'text-muted border-line bg-surface'
        }`}
      >
        <Zap size={13} />
        Essai · {days} j
      </Link>
    );
  }

  // Hors essai et sans abonnement : seul cas où l'on veut vendre, donc un vrai bouton.
  return (
    <Link
      to="/pricing"
      title={left > 0 ? `${left} candidature${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : 'Plus de candidature disponible ce mois-ci'}
      className={`${base} text-white bg-brand hover:bg-brand-700`}
    >
      <Crown size={13} />
      Passer à Élite
    </Link>
  );
};

export default PlanBadge;
