
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
  ShieldAlert,
  ZapOff,
  Loader2
} from 'lucide-react';
import { User, Plan } from '../types';
import toast from 'react-hot-toast';
import { useSubscription } from '../hooks/useSubscription';

interface PricingProps {
  user: User;
}

const Pricing: React.FC<PricingProps> = ({ user }) => {
  const { isActive, status, loading: subLoading, startCheckout, error: subError } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Afficher les erreurs Stripe
  useEffect(() => {
    if (subError) toast.error(subError);
  }, [subError]);

  // Détecter le retour de Stripe Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success('Abonnement activé avec succès ! Bienvenue dans le protocole Pro.');
    } else if (params.get('payment') === 'canceled') {
      toast('Paiement annulé. Vous pouvez réessayer à tout moment.', { icon: '↩️' });
    }
  }, []);

  const plans = [
    {
      name: Plan.FREE,
      monthlyPrice: 0,
      description: 'Découverte du moteur JoBoost. Idéal pour un premier scan.',
      features: ['5 candidatures / jour', 'Analyse de matching basique', 'Modèles de lettres standards', 'Accès communauté'],
      buttonText: 'Plan Actuel',
      current: user.plan === Plan.FREE && !isActive,
      icon: <Layers size={22} strokeWidth={2.5} />,
      accent: 'slate'
    },
    {
      name: Plan.PRO,
      monthlyPrice: 15,
      description: "L'arsenal complet pour ceux qui veulent des résultats immédiats.",
      features: ['100 candidatures / mois', 'IA Générative illimitée', 'Accès Offres VIP (> 90%)', 'Support prioritaire 24h', 'Analyse de profil bi-mensuelle'],
      buttonText: isActive ? '✓ Abonnement Actif' : 'Activer la Puissance Pro',
      current: isActive,
      popular: true,
      icon: <Zap size={22} strokeWidth={2.5} />,
      accent: 'indigo'
    },
    {
      name: Plan.PREMIUM,
      monthlyPrice: 29,
      description: "L'unité d'élite. Automatisation totale pour cadres et experts.",
      features: ['Candidatures illimitées', 'Automatisation complète (Bulk)', 'Tracking des emails ouvertures', 'Consultant IA dédié 1-on-1', 'Export PDF Ultra-HD sans watermark'],
      buttonText: 'Bientôt disponible',
      current: false,
      disabled: true,
      icon: <ShieldCheck size={22} strokeWidth={2.5} />,
      accent: 'slate'
    }
  ];

  const handleSubscribe = async (planName: string) => {
    if (planName === Plan.PRO && !isActive) {
      setCheckoutLoading(true);
      await startCheckout();
      setCheckoutLoading(false);
    } else {
      toast.success(`Initialisation du protocole sécurisé pour ${planName}...`);
    }
  };

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto space-y-16 md:space-y-24 pb-32 animate-in fade-in duration-700">
      
      {/* Hero Section : Focus sur le ROI */}
      <header className="text-center space-y-4 md:space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <Sparkles size={12} /> Une recherche d'emploi assistée par l'IA
        </div>
        <h1 className="text-3xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight md:leading-[1.1]">
          Passez de candidat à <br /> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Recruté d'élite.</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg font-medium">
          Choisissez le protocole adapté à vos ambitions.
          <span className="block text-indigo-600 dark:text-indigo-400 font-bold">Plus de candidatures ciblées, mieux optimisées, en moins de temps.</span>
        </p>
      </header>

      {/* Grid de Prix Dynamique */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
        {plans.map((plan) => (
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

            <div className={`flex flex-col h-full bg-white dark:bg-[#030712] p-6 md:p-10 rounded-[2.4rem] transition-all duration-500 ${
              plan.popular ? 'dark:bg-slate-950/90' : ''
            }`}>
              
              {/* Plan Header */}
              <div className="flex justify-between items-start mb-6 md:mb-8">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                  plan.popular 
                    ? 'bg-indigo-600 text-white border-indigo-400' 
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800'
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
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{plan.name}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed italic">{plan.description}</p>
              </div>

              <div className="mb-8 md:mb-10">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{plan.monthlyPrice}€</span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">/ mois</span>
                </div>
                {plan.monthlyPrice > 0 && (
                  <p className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-wider">Sans engagement • Annulable à tout moment</p>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-12 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300 font-bold">
                    <div className={`mt-0.5 rounded-full p-1 ${
                      plan.popular ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button 
                onClick={() => handleSubscribe(plan.name)}
                disabled={plan.current || (plan as Record<string, unknown>).disabled === true || checkoutLoading}
                className={`w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
                  plan.current 
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800 cursor-default' 
                    : (plan as Record<string, unknown>).disabled === true
                      ? 'bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-100 dark:border-slate-800 cursor-not-allowed'
                      : plan.popular 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 hover:-translate-y-1'
                        : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-black dark:hover:bg-slate-700 transition-colors'
                }`}
              >
                {checkoutLoading && plan.name === Plan.PRO ? (
                  <><Loader2 size={14} className="animate-spin" /> Redirection vers Stripe...</>
                ) : (
                  <>{plan.buttonText}{!plan.current && !(plan as Record<string, unknown>).disabled && <ArrowRight size={14} strokeWidth={3} />}</>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau de Comparaison "Deep-Dive" */}
      <section className="space-y-8 md:space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Analyse des Capacités</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.2em]">Comparatif technique détaillé</p>
          <div className="md:hidden text-[10px] text-indigo-600 font-black uppercase tracking-widest animate-pulse">
            Glissez pour voir →
          </div>
        </div>
        
        <div className="card-modern overflow-x-auto border-none shadow-2xl bg-white dark:bg-slate-900/50">
          <div className="min-w-[600px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Protocole</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Gratuit</th>
                  <th className="px-8 py-6 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] text-center">Pro</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Elite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ['Candidatures Quotidiennes', '5', '30', 'Illimité'],
                  ['Moteur IA (Version)', 'JoBoost Lite', 'JoBoost 3.5 Pro', 'Elite Custom'],
                  ['Analyse Sémantique ATS', 'Basique', 'Avancée', 'Chirurgicale'],
                  ['Envoi Groupé (Bulk)', '—', '—', 'Inclus'],
                  ['Support Prioritaire', '—', '24h', 'Dédié (Instant)'],
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-6 text-sm font-bold text-slate-700 dark:text-slate-300">{row[0]}</td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-400 text-center">{row[1]}</td>
                    <td className="px-8 py-6 text-xs font-black text-indigo-600 text-center">{row[2]}</td>
                    <td className="px-8 py-6 text-xs font-black text-slate-900 dark:text-white text-center">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust & Guarantees */}
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

      {/* Call to action final - COULEUR MISE À JOUR : Indigo Gradient High-Conversion */}
      <div className="text-center p-8 md:p-14 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 rounded-[2.5rem] md:rounded-[3rem] text-white relative overflow-hidden group shadow-2xl shadow-indigo-500/20">
        {/* Animated Orbs for Depth */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse duration-[4000ms]"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 space-y-6 md:space-y-8">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 group-hover:scale-110 transition-transform duration-500">
             <Zap size={28} className="md:w-8 md:h-8" fill="white" />
          </div>
          <div className="space-y-3 md:space-y-4">
            <h3 className="text-2xl md:text-5xl font-black tracking-tighter relative">Toujours un doute ?</h3>
            <p className="text-indigo-100 text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
              Rejoignez les candidats qui boostent leur recherche d'emploi grâce à l'IA et activez votre avantage stratégique.
            </p>
          </div>
          <button className="w-full md:w-auto px-12 py-5 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] hover:bg-indigo-50 transition-all shadow-xl hover:-translate-y-1 relative group/btn">
            Démarrer mon Ascension
          </button>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300/80">Essai gratuit disponible sans engagement</p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
