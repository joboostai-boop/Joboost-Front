import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { BusinessAccount } from '../types';
import { businessBillingApi } from '../services/business';
import toast from 'react-hot-toast';
import {
  Check, Sparkles, Loader2, CreditCard, ShieldCheck, Mail,
  Building2, Rocket, Crown,
} from 'lucide-react';

/* Abonnement de l'espace recruteur. Les paiements passent par Stripe Checkout
   (abonnement mensuel, prix définis côté serveur) ; la gestion (factures, carte,
   résiliation) passe par le portail client Stripe. */

type PlanKey = 'essentiel' | 'pro';

const PLANS: {
  key: PlanKey | 'enterprise';
  name: string;
  planLabel?: string;          // valeur User.plan correspondante
  price?: number;              // €/mois
  tagline: string;
  icon: React.ReactNode;
  features: string[];
  featured?: boolean;
}[] = [
  {
    key: 'essentiel',
    name: 'Essentiel',
    planLabel: 'Business Essentiel',
    price: 79,
    tagline: 'Le socle complet pour gérer votre recrutement.',
    icon: <Rocket size={18} />,
    features: [
      'Vivier de candidats illimité + fiches CRM (statuts, notes privées)',
      'Offres d\'emploi illimitées',
      'Matching offre ↔ candidats par compétences',
      'Tableau de bord & statistiques détaillées',
      'Exports CSV et PDF',
      'Support par email',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    planLabel: 'Business Pro',
    price: 199,
    tagline: 'L\'IA au service de votre recrutement.',
    icon: <Crown size={18} />,
    featured: true,
    features: [
      'Tout le plan Essentiel',
      'Assistant IA : rédaction d\'offres en un clic',
      'Suggestions de compétences par l\'IA',
      'Messages d\'approche IA personnalisés par candidat',
      'Support prioritaire',
    ],
  },
  {
    key: 'enterprise',
    name: 'Entreprise',
    tagline: 'Un déploiement adapté à votre organisation.',
    icon: <Building2 size={18} />,
    features: [
      'Volumes importants de candidats et d\'offres',
      'Accompagnement dédié à la prise en main',
      'Besoins spécifiques étudiés ensemble',
      'Échange direct avec l\'équipe Joboost',
    ],
  },
];

const BusinessBilling: React.FC = () => {
  const { account, refreshAccount } = useOutletContext<{ account: BusinessAccount | null; refreshAccount: () => Promise<void> }>();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Retour de Stripe Checkout (?payment=success|canceled)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    if (payment === 'success') {
      toast.success('Paiement confirmé ! Votre plan s\'active dans quelques secondes.', { duration: 6000 });
      refreshAccount();
      // Le webhook Stripe est asynchrone : on re-synchronise une 2e fois peu après.
      const t = setTimeout(() => refreshAccount(), 5000);
      setSearchParams({}, { replace: true });
      return () => clearTimeout(t);
    }
    toast('Paiement annulé — aucun prélèvement effectué.', { icon: 'ℹ️' });
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = async (plan: PlanKey) => {
    setLoadingPlan(plan);
    try {
      const url = await businessBillingApi.checkout(plan);
      window.location.href = url; // redirection vers Stripe Checkout (page sécurisée)
    } catch (err: any) {
      toast.error(err.message);
      setLoadingPlan(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const url = await businessBillingApi.portal();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message);
      setPortalLoading(false);
    }
  };

  const currentPlan = account?.plan || 'Essai';
  const isSubscribed = currentPlan === 'Business Essentiel' || currentPlan === 'Business Pro';

  return (
    <div className="space-y-6 md:space-y-8">

      {/* ── Situation actuelle ── */}
      <div className="card-pro flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isSubscribed ? 'bg-[#7D5CFF]/15 text-[#7D5CFF] dark:text-[#B9A7FF]' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}>
          <CreditCard size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {isSubscribed
              ? `Votre plan actuel : ${currentPlan.replace('Business ', '')}`
              : 'Vous êtes en période de découverte'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {isSubscribed
              ? 'Factures, moyen de paiement et résiliation se gèrent depuis le portail sécurisé Stripe.'
              : 'Accès complet pour explorer la plateforme, y compris l\'assistant IA. Choisissez un plan quand vous êtes prêt.'}
          </p>
        </div>
        {isSubscribed && (
          <button onClick={openPortal} disabled={portalLoading} className="btn btn-secondary min-h-[44px] shrink-0">
            {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Gérer mon abonnement
          </button>
        )}
      </div>

      {/* ── Les plans ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {PLANS.map((plan) => {
          const isCurrent = plan.planLabel === currentPlan;
          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl bg-white dark:bg-[#111827] border p-5 md:p-6 transition-shadow ${
                plan.featured
                  ? 'border-[#7D5CFF] ring-1 ring-[#7D5CFF]/40 shadow-[0_18px_45px_-18px_rgba(124,92,255,0.45)]'
                  : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#7D5CFF] text-white text-[11px] font-bold shadow-md whitespace-nowrap">
                  <Sparkles size={11} /> Recommandé
                </span>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  plan.featured ? 'bg-[#7D5CFF] text-white' : 'bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#B9A7FF]'
                }`}>
                  {plan.icon}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
              </div>

              <div className="mb-1.5">
                {plan.price !== undefined ? (
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-[2.1rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">{plan.price} €</span>
                    <span className="text-sm font-semibold text-slate-400">/ mois</span>
                  </p>
                ) : (
                  <p className="text-[1.6rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">Sur devis</p>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">{plan.tagline}</p>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 leading-snug">
                    <Check size={15} className={`shrink-0 mt-0.5 ${plan.featured ? 'text-[#7D5CFF]' : 'text-emerald-500'}`} />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.key === 'enterprise' ? (
                <a
                  href={`mailto:joboost.ai@gmail.com?subject=${encodeURIComponent('Joboost Entreprise — demande de contact')}&body=${encodeURIComponent('Bonjour,\n\nNous souhaitons échanger sur une offre Entreprise pour notre organisation.\n\nOrganisation :\nNombre de recruteurs :\nVolume de candidats estimé :\n\nCordialement,')}`}
                  className="btn btn-secondary w-full min-h-[46px]"
                >
                  <Mail size={15} /> Nous contacter
                </a>
              ) : isCurrent ? (
                <button disabled className="w-full min-h-[46px] rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-default">
                  <Check size={15} /> Plan actuel
                </button>
              ) : (
                <button
                  onClick={() => subscribe(plan.key as PlanKey)}
                  disabled={loadingPlan !== null}
                  className={`w-full min-h-[46px] ${plan.featured ? 'btn btn-primary' : 'btn btn-secondary'}`}
                >
                  {loadingPlan === plan.key ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                  Choisir {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Réassurance & questions fréquentes ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#7D5CFF]" /> Paiement sécurisé
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Les paiements sont traités par Stripe : votre carte n'est jamais stockée par Joboost. Un reçu est envoyé par email à chaque échéance.
          </p>
        </div>
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Sans engagement</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Abonnement mensuel, résiliable à tout moment depuis « Gérer mon abonnement ». La résiliation prend effet à la fin de la période en cours.
          </p>
        </div>
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Et si je résilie ?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vous conservez l'accès à votre espace et à vos données (vivier, offres, statistiques) : seul votre plan repasse en mode découverte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessBilling;
