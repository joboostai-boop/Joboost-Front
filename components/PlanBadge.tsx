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

const PlanBadge: React.FC = () => {
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

  const base =
    'press inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 md:py-2 transition-colors whitespace-nowrap';

  if (usage.isSubscribed) {
    return (
      <Link to="/profile" className={`${base} text-[#7D5CFF] border border-[#7D5CFF]/25 bg-[#7D5CFF]/[0.06] hover:bg-[#7D5CFF]/12`}>
        <Crown size={14} /> Élite
      </Link>
    );
  }

  if (usage.inTrial) {
    const urgent = usage.trialDaysLeft <= 2;
    return (
      <Link
        to="/pricing"
        title={`Essai gratuit : ${usage.trialDaysLeft} jour${usage.trialDaysLeft > 1 ? 's' : ''} restant${usage.trialDaysLeft > 1 ? 's' : ''}`}
        className={`${base} ${
          urgent
            ? 'text-rose-700 dark:text-rose-300 border border-rose-300/60 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100'
            : 'text-amber-700 dark:text-amber-300 border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100'
        }`}
      >
        <Zap size={14} />
        Essai · {usage.trialDaysLeft} j
      </Link>
    );
  }

  // Hors essai et sans abonnement : on montre ce qu'il reste plutôt qu'un slogan.
  const left = usage.remainingQuota + usage.credits;
  return (
    <Link
      to="/pricing"
      title={left > 0 ? `${left} candidature IA restante${left > 1 ? 's' : ''}` : 'Plus de candidature IA disponible'}
      className={`${base} text-[#7D5CFF] border border-[#7D5CFF]/25 bg-[#7D5CFF]/[0.06] hover:bg-[#7D5CFF]/12`}
    >
      <Crown size={14} />
      {left > 0 ? `${left} restante${left > 1 ? 's' : ''}` : 'Passer à Élite'}
    </Link>
  );
};

export default PlanBadge;
