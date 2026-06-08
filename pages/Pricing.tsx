
import React, { useState, useEffect } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  Lock,
  ArrowRight,
  Target,
  Layers,
  Sparkles,
  TrendingUp,
  Loader2,
  Ticket,
  Coins,
  Building2,
  Mail,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { User, Plan } from '../types';
import toast from 'react-hot-toast';
import { useSubscription } from '../hooks/useSubscription';

interface PricingProps {
  user: User;
}

// ⚠️ À COMPLÉTER : email pro réel pour les demandes B2B (recruteurs/entreprises).
const B2B_CONTACT_EMAIL = 'contact@joboost.fr';

// Liens de paiement Stripe (Payment Links). Laisser '' = bouton « Bientôt disponible ».
// ⚠️ Pour chaque lien, dans le dashboard Stripe :
//   • rediriger après paiement vers .../pricing?payment=success
//   • collecter l'email du client
//   • PACKS uniquement : ajouter la metadata "grant_credits" = nb de candidatures (10 / 30 / 100)
// Le client_reference_id (= ID utilisateur) est ajouté automatiquement à l'URL ci-dessous,
// le webhook backend l'utilise pour créditer le bon compte.
const PAYMENT_LINKS = {
  eliteMonthly: 'https://buy.stripe.com/7sYfZi7xhaXxewu3657ok04',   // abonnement mensuel 14,99 €
  eliteAnnual: 'https://buy.stripe.com/fZueVe4l53v5dsqayx7ok03',    // abonnement annuel 119 €
  packDecouverte: 'https://buy.stripe.com/6oU28sbNx9Tt9ca6ih7ok00', // 10 candidatures (7,99 €)
  packBooster: 'https://buy.stripe.com/aFa6oI18T1mXfAy5ed7ok01',    // 30 candidatures (19,99 €)
  packMarathon: 'https://buy.stripe.com/cNi14o4l53v5bki5ed7ok02',   // 100 candidatures (49,99 €)
};

// Ajoute l'identité de l'utilisateur connecté au lien de paiement pour l'attribution automatique.
const withRef = (url: string, user: User) =>
  `${url}${url.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(user.id)}&prefilled_email=${encodeURIComponent(user.email)}`;

type BillingPeriod = 'monthly' | 'annual';

const Pricing: React.FC<PricingProps> = ({ user }) => {
  const { isActive, error: subError } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billing, setBilling] = useState<BillingPeriod>('monthly');

  // Afficher les erreurs Stripe
  useEffect(() => {
    if (subError) toast.error(subError);
  }, [subError]);

  // Détecter le retour de Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success('Abonnement activé avec succès ! Bienvenue dans le protocole Élite.');
    } else if (params.get('payment') === 'canceled') {
      toast('Paiement annulé. Vous pouvez réessayer à tout moment.', { icon: '↩️' });
    }
  }, []);

  // --- Abonnements ---
  const subscriptionPlans = [
    {
      name: Plan.FREE,
      displayName: 'Gratuit',
      monthlyPrice: 0,
      annualPrice: 0,
      description: 'Découverte du moteur JoBoost. Testez l\'IA, sans engagement.',
      features: [
        '1 candidature IA / mois',
        'Accès au moteur JoBoost',
        'Modèles de lettres standards',
        'Accès communauté',
      ],
      icon: <Layers size={22} strokeWidth={2.5} />,
      accent: 'slate',
      current: user.plan === Plan.FREE && !isActive,
      popular: false,
    },
    {
      name: Plan.PRO, // abonnement payant unique câblé côté Stripe
      displayName: 'Élite',
      monthlyPrice: 14.99,
      annualPrice: 119,
      description: 'L\'arsenal complet pour une recherche intensive et sans limite.',
      features: [
        '150 candidatures / mois',
        'IA générative illimitée',
        'Envoi groupé (Bulk)',
        'Tracking des ouvertures d\'emails',
        'Support prioritaire 24h',
      ],
      icon: <Zap size={22} strokeWidth={2.5} />,
      accent: 'indigo',
      current: isActive,
      popular: true,
    },
  ];

  // --- Packs de crédits (sans engagement) ---
  const packs = [
    { name: 'Découverte', credits: 10, price: 7.99, unit: '0,80 €', icon: <Ticket size={20} strokeWidth={2.5} />, popular: false, link: PAYMENT_LINKS.packDecouverte },
    { name: 'Booster', credits: 30, price: 19.99, unit: '0,67 €', icon: <Coins size={20} strokeWidth={2.5} />, popular: true, link: PAYMENT_LINKS.packBooster },
    { name: 'Marathon', credits: 100, price: 49.99, unit: '0,50 €', icon: <Sparkles size={20} strokeWidth={2.5} />, popular: false, link: PAYMENT_LINKS.packMarathon },
  ];

  const handleSubscribe = (plan: typeof subscriptionPlans[number]) => {
    if (plan.name !== Plan.PRO || isActive) return;
    // Mensuel et annuel passent par un Payment Link Stripe (attribution via client_reference_id).
    const link = billing === 'annual' ? PAYMENT_LINKS.eliteAnnual : PAYMENT_LINKS.eliteMonthly;
    if (!link) {
      toast('L\'abonnement arrive très bientôt.', { icon: '🗓️' });
      return;
    }
    setCheckoutLoading(true);
    window.location.href = withRef(link, user);
  };

  const handleBuyPack = (pack: typeof packs[number]) => {
    if (pack.link) {
      window.location.href = withRef(pack.link, user);
      return;
    }
    // Lien pas encore configuré — message honnête plutôt qu'un faux achat.
    toast(`Les packs de crédits arrivent très bientôt (${pack.name}).`, { icon: '🎟️' });
  };

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto space-y-16 md:space-y-24 pb-32 animate-in fade-in duration-700">

      {/* Hero */}
      <header className="text-center space-y-4 md:space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <Sparkles size={12} /> Une recherche d'emploi assistée par l'IA
        </div>
        <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight md:leading-[1.1]">
          Passez de candidat à <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Recruté d'élite.</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg font-medium">
          Abonnez-vous pour une recherche intensive, ou prenez un pack ponctuel.
          <span className="block text-indigo-600 dark:text-indigo-400 font-bold">Vous payez selon votre rythme de recherche.</span>
        </p>

        {/* Toggle Mensuel / Annuel */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          {(['monthly', 'annual'] as BillingPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setBilling(p)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                billing === p ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              {p === 'monthly' ? 'Mensuel' : 'Annuel'}
              {p === 'annual' && <span className="ml-1.5 text-emerald-500">-2 mois</span>}
            </button>
          ))}
        </div>
      </header>

      {/* Abonnements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-stretch max-w-4xl mx-auto">
        {subscriptionPlans.map((plan) => {
          const price = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice;
          const suffix = plan.monthlyPrice === 0 ? '/ mois' : billing === 'annual' ? '/ an' : '/ mois';
          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-[2.5rem] transition-all duration-500 group ${
                plan.popular
                  ? 'bg-indigo-600 p-[2px] shadow-2xl shadow-indigo-500/20 md:scale-105 z-10'
                  : 'bg-slate-200 dark:bg-slate-800 p-[1px] md:mt-4 md:mb-4'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 border border-indigo-400">
                  <Target size={12} /> Recommandé
                </div>
              )}

              <div className={`flex flex-col h-full bg-white dark:bg-[#030712] p-6 md:p-10 rounded-[2.4rem] transition-all duration-500 ${plan.popular ? 'dark:bg-slate-950/90' : ''}`}>
                <div className="flex justify-between items-start mb-6 md:mb-8">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                    plan.popular ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'
                  }`}>
                    {plan.icon}
                  </div>
                  {plan.current && (
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Actuel
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{plan.displayName}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{plan.description}</p>
                </div>

                <div className="mb-8 md:mb-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {price === 0 ? '0' : price.toString().replace('.', ',')}€
                    </span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{suffix}</span>
                  </div>
                  {plan.monthlyPrice > 0 && billing === 'annual' && (
                    <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase tracking-wider">Soit ~9,92 €/mois • 2 mois offerts</p>
                  )}
                  {plan.monthlyPrice > 0 && billing === 'monthly' && (
                    <p className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-wider">Sans engagement • Annulable à tout moment</p>
                  )}
                </div>

                <ul className="space-y-4 mb-12 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-bold">
                      <div className={`mt-0.5 rounded-full p-1 ${plan.popular ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={plan.current || plan.monthlyPrice === 0 || checkoutLoading}
                  className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
                    plan.current
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800 cursor-default'
                      : plan.monthlyPrice === 0
                        ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 cursor-default'
                        : plan.popular
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 hover:-translate-y-1'
                          : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700'
                  }`}
                >
                  {checkoutLoading && plan.name === Plan.PRO ? (
                    <><Loader2 size={14} className="animate-spin" /> Redirection vers Stripe...</>
                  ) : plan.current ? (
                    '✓ Abonnement Actif'
                  ) : plan.monthlyPrice === 0 ? (
                    'Plan Actuel'
                  ) : (
                    <>Activer la Puissance Élite <ArrowRight size={14} strokeWidth={3} /></>
                  )}
                </button>

                {plan.monthlyPrice > 0 && (
                  <p className="text-[9px] text-slate-400 leading-relaxed mt-4 text-center px-2">
                    Abonnement sans engagement, résiliable à tout moment. En activant l'accès immédiat, vous acceptez de
                    renoncer à votre droit de rétractation de 14&nbsp;jours (art. L221-28 C. conso). Voir les{' '}
                    <Link to="/legal/cgv" className="font-bold text-indigo-500 hover:underline">CGV</Link>.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Packs de crédits */}
      <section className="space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Pas envie de vous abonner&nbsp;?</h2>
          <p className="text-sm text-slate-500 font-medium">
            Prenez un <span className="font-bold text-indigo-600">pack de crédits</span>, payez une fois, utilisez quand vous voulez.
            <span className="block text-[11px] text-slate-400 mt-1">Crédits valables 12 mois. Au-delà de votre quota d'abonnement&nbsp;: 0,99 € / candidature.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
          {packs.map((pack) => (
            <div
              key={pack.name}
              className={`relative card-modern p-6 md:p-8 flex flex-col items-center text-center border ${
                pack.popular ? 'border-indigo-300 dark:border-indigo-700 shadow-xl shadow-indigo-500/10' : 'border-slate-100 dark:border-slate-800'
              }`}
            >
              {pack.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                  Meilleur rapport
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mb-4">
                {pack.icon}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{pack.name}</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">{pack.credits} candidatures</p>
              <div className="my-5">
                <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{pack.price.toString().replace('.', ',')}€</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">soit {pack.unit} / candidature</p>
              </div>
              <button
                onClick={() => handleBuyPack(pack)}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  pack.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700'
                }`}
              >
                Choisir ce pack
              </button>
              {!pack.link && <p className="text-[9px] text-slate-400 mt-3 uppercase tracking-wider">Bientôt disponible</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Bloc B2B Recruteurs */}
      <section className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 dark:bg-slate-950 border border-slate-800 p-8 md:p-12 text-white flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10 flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em]">
              <Building2 size={12} /> Recruteurs & Entreprises
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">Recrutez dans notre vivier de talents.</h3>
            <p className="text-slate-300 text-sm md:text-base font-medium max-w-xl leading-relaxed">
              Diffusez vos offres, accédez aux profils qualifiés et suivez vos recrutements depuis un tableau de bord dédié.
              Offres sur mesure pour cabinets, PME et grands comptes — avec essai gratuit de 7 jours.
            </p>
          </div>
          <div className="relative z-10 shrink-0">
            <a
              href={`mailto:${B2B_CONTACT_EMAIL}?subject=Demande%20Joboost%20Business%20(Recruteur)`}
              className="inline-flex items-center gap-2 px-8 py-5 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1"
            >
              <Mail size={16} /> Nous contacter
            </a>
          </div>
        </div>
      </section>

      {/* Comparaison Gratuit vs Élite */}
      <section className="space-y-8 md:space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gratuit ou Élite&nbsp;?</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">Comparatif détaillé</p>
        </div>

        <div className="card-modern overflow-x-auto border-none shadow-2xl bg-white dark:bg-slate-900/50">
          <div className="min-w-[480px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Capacité</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Gratuit</th>
                  <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] text-center">Élite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ['Candidatures IA', '1 / mois', '150 / mois'],
                  ['Moteur IA', 'JoBoost', 'JoBoost Pro'],
                  ['Analyse sémantique ATS', 'Basique', 'Avancée'],
                  ['Envoi groupé (Bulk)', '—', 'Inclus'],
                  ['Support prioritaire', '—', '24h'],
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6 text-sm font-bold text-slate-700 dark:text-slate-300">{row[0]}</td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-400 text-center">{row[1]}</td>
                    <td className="px-8 py-6 text-xs font-black text-indigo-600 text-center">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: <Lock className="text-indigo-600" />, title: 'Paiement Sécurisé', desc: 'Paiements traités de façon sécurisée par Stripe.' },
          { icon: <TrendingUp className="text-emerald-500" />, title: 'Candidatures optimisées', desc: 'Des CV et lettres conçus pour passer les filtres ATS.' },
          { icon: <ShieldCheck className="text-blue-500" />, title: 'Respect du RGPD', desc: 'Vos données vous appartiennent et ne sont jamais revendues.' },
        ].map((item, i) => (
          <div key={i} className="card-modern p-6 flex items-start gap-4">
            <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              {item.icon}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
};

export default Pricing;
