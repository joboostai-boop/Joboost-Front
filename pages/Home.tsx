import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Zap,
  Rocket,
  CheckCircle2,
  Sparkles,
  Target,
  Cpu,
  BarChart3,
  Globe,
  ChevronDown,
  HelpCircle,
  Layers,
  Send,
  Building2,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../components/Logo';
import Reveal from '../components/Reveal';

interface HomeProps {
  onStart: () => void;
}

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="card-modern overflow-hidden border-slate-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-bold text-slate-900">{question}</span>
        <ChevronDown size={20} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#7D5CFF]' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-6 pt-0 text-slate-500 text-sm leading-relaxed font-medium">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ onStart }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // Animation pour illustrer l'envoi massif
  useEffect(() => {
    const interval = setInterval(() => {
      setDeploymentProgress(prev => (prev < 50 ? prev + 1 : 0));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Ombre / opacité du header au défilement (micro-interaction discrète).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSocialLogin = async (provider: string) => {
    if (provider === 'Google') {
      const toastId = toast.loading('Redirection vers Google...');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/google`);
        const data = await res.json();
        if (data.success && data.url) {
          toast.dismiss(toastId);
          window.location.href = data.url;
        } else {
          toast.error(data.error || 'Google OAuth non configuré.', { id: toastId });
        }
      } catch (err) {
        toast.error('Erreur de connexion au serveur.', { id: toastId });
      }
    } else if (provider === 'Apple') {
      const toastId = toast.loading('Redirection vers Apple...');
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/apple`);
        const data = await res.json();
        if (data.success && data.url) {
          toast.dismiss(toastId);
          window.location.href = data.url;
        } else {
          toast.error(data.error || 'Sign in with Apple non configuré.', { id: toastId });
        }
      } catch (err) {
        toast.error('Erreur de connexion au serveur.', { id: toastId });
      }
    }
  };

  const openAuth = (signUp: boolean) => {
    setIsSignUp(signUp);
    setShowAuth(true);
  };

  // Capacités réelles du produit (remplace l'ancien bandeau de logos de marques tierces,
  // qui laissait croire à tort à des partenariats / placements chez ces entreprises).
  const capabilities = ["CV OPTIMISÉ ATS", "LETTRES DE MOTIVATION IA", "MATCHING CV / OFFRE", "CANDIDATURES CIBLÉES", "GÉNÉRATION EN MASSE", "SUIVI DES CANDIDATURES"];

  // Offres « cibles » illustratives du moteur (libellés génériques : pas de marques
  // réelles, pour ne pas laisser croire à des partenariats).
  const targets = [
    { n: 'Développeur · Paris', s: 98 },
    { n: 'Product Manager · Lyon', s: 94 },
    { n: 'Data Analyst · Remote', s: 96 },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#7D5CFF]/15 selection:text-[#4F46E5]">
      {/* Styles inline pour l'animation du carrousel et radar */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes radar-ping {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .mask-fade {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        .radar-ping {
          animation: radar-ping 4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee, .radar-ping, .animate-float { animation: none !important; }
        }
      `}</style>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#7D5CFF 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-6 py-4 transition-all duration-300 ${scrolled ? 'border-b border-slate-100 shadow-sm' : 'border-b border-transparent'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Logo />
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/auth/login" className="hidden sm:flex items-center gap-1.5 text-slate-500 font-bold text-xs px-3 py-2 hover:text-[#7D5CFF] transition-colors rounded-lg hover:bg-[#7D5CFF]/5 border border-transparent hover:border-[#7D5CFF]/10">
              <Building2 size={14} />
              Espace Partenaires
            </Link>
            <button onClick={() => openAuth(false)} className="hidden sm:block text-slate-600 font-bold text-sm px-4 py-2 hover:text-[#7D5CFF] transition-colors">
              Connexion
            </button>
            <button onClick={() => openAuth(true)} className="press bg-[#7D5CFF] text-white px-5 sm:px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#6023C0] transition-all shadow-lg shadow-[#7D5CFF]/25">
              Démarrer l'essai
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Halo ambient violet */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#7D5CFF]/10 blur-[140px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 text-center lg:text-left space-y-8 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7D5CFF]/5 text-[#7D5CFF] text-[10px] font-black uppercase tracking-[0.2em] border border-[#7D5CFF]/15">
              <Sparkles size={14} fill="currentColor" />
              <span>Propulsé par l'IA générative</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 leading-[1.15] tracking-tight">
              l'IA au service <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7D5CFF] to-[#4F46E5]">de votre Carrière</span>
            </h1>
            <p className="text-base md:text-xl text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Joboost révolutionne votre recherche d'emploi avec une IA simple et puissante : candidatures sur-mesure, optimisation automatique et plus d'entretiens en quelques clics !
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <button onClick={() => openAuth(true)} className="press w-full sm:w-auto bg-[#7D5CFF] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-base md:text-lg hover:bg-[#6023C0] transition-all shadow-2xl shadow-[#7D5CFF]/30 flex items-center justify-center gap-3 group">
                Lancer mon optimisation <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex flex-col justify-center px-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-black text-slate-700">Essai gratuit</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Sans carte bancaire</p>
              </div>
            </div>
          </div>

          {/* Floating UI Preview */}
          <div className="relative lg:h-[600px] flex items-center justify-center scale-75 sm:scale-90 lg:scale-100 -mt-10 lg:mt-0">
            <div className="absolute inset-0 bg-[#7D5CFF]/10 blur-[120px] rounded-full"></div>

            <div className="relative w-full max-w-lg aspect-square flex items-center justify-center animate-float">

              {/* Radar Waves background */}
              <div className="absolute w-[80%] h-[80%] border border-slate-100 rounded-full"></div>
              <div className="absolute w-[60%] h-[60%] border border-slate-100 rounded-full"></div>
              <div className="absolute w-[40%] h-[40%] border border-[#7D5CFF]/20 rounded-full radar-ping"></div>

              {/* Central Master Unit Card */}
              <div className="relative z-20 w-[280px] bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_32px_64px_-16px_rgba(125,92,255,0.25)] p-8 flex flex-col gap-6 group transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#7D5CFF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#7D5CFF]/30">
                      <Layers size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#7D5CFF]">Moteur de candidatures</p>
                      <p className="text-[10px] font-bold text-slate-400">Statut : Actif</p>
                    </div>
                  </div>
                </div>

                {/* List of active transmissions */}
                <div className="space-y-3">
                  {targets.map((target, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${idx === 0 ? 'bg-[#7D5CFF]/5 border-[#7D5CFF]/15' : 'bg-slate-50/50 border-slate-100 opacity-60'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-[#7D5CFF] text-white' : 'bg-slate-200 text-slate-400'}`}>
                          <Target size={12} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 truncate">{target.n}</span>
                      </div>
                      <span className="text-[10px] font-black text-[#7D5CFF] shrink-0">{target.s}%</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center text-[9px] font-black text-[#7D5CFF] uppercase tracking-widest">
                    <span>Transmission en masse</span>
                    <span className="tabular-nums">{deploymentProgress}/50</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7D5CFF] transition-all duration-300 shadow-[0_0_10px_rgba(125,92,255,0.5)]"
                      style={{ width: `${(deploymentProgress / 50) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-2">
                  <button className="w-full py-3 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 group-hover:bg-[#7D5CFF] transition-colors">
                    Lancer le déploiement <Send size={12} />
                  </button>
                </div>
              </div>

              {/* Satellite elements */}
              <div className="absolute top-10 left-10 w-12 h-12 bg-white rounded-xl shadow-xl border border-slate-50 flex items-center justify-center text-[#7D5CFF] rotate-12 transition-transform hover:scale-110">
                <Target size={20} />
              </div>
              <div className="absolute bottom-10 right-10 w-14 h-14 bg-white rounded-2xl shadow-xl border border-slate-50 flex items-center justify-center text-emerald-500 -rotate-12 transition-transform hover:scale-110">
                <CheckCircle2 size={24} />
              </div>
              <div className="absolute top-1/2 -right-8 w-10 h-10 bg-[#7D5CFF] rounded-lg shadow-xl flex items-center justify-center text-white rotate-45">
                <Zap size={18} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section : Carrousel Défilant avec Fondu */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-12">Tout ce que l'IA fait pour votre recherche</p>

          <div className="relative mask-fade overflow-hidden">
            <div className="animate-marquee py-4">
              {capabilities.map((p, i) => (
                <span key={`p1-${i}`} className="mx-12 text-2xl font-black tracking-tighter text-slate-900/40 hover:text-[#7D5CFF]/70 transition-colors cursor-default whitespace-nowrap">
                  {p}
                </span>
              ))}
              {capabilities.map((p, i) => (
                <span key={`p2-${i}`} className="mx-12 text-2xl font-black tracking-tighter text-slate-900/40 hover:text-[#7D5CFF]/70 transition-colors cursor-default whitespace-nowrap">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
      <section id="features" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <Reveal className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Un arsenal technologique complet.</h2>
            <p className="text-slate-500 font-medium text-sm md:text-base">L'IA ne fait pas que rédiger, elle analyse, simule et automatise pour vous.</p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <Reveal as="div" className="md:col-span-2">
              <div className="card-modern p-6 md:p-10 bg-[#7D5CFF] text-white border-none relative overflow-hidden group h-full hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full group-hover:bg-white/20 transition-colors"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-white/10">
                    <BarChart3 size={24} className="md:w-7 md:h-7 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">Analyse de Convergence</h3>
                  <p className="text-white/90 leading-relaxed text-base md:text-lg max-w-md">
                    Notre algorithme scanne les offres d'emploi et note votre CV en temps réel. Découvrez exactement ce qui manque à votre profil pour atteindre les 100%.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal as="div" delay={80}>
              <div className="card-modern p-6 md:p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-slate-100 group h-full">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-emerald-100 group-hover:bg-emerald-600 transition-all">
                  <Target size={24} className="md:w-7 md:h-7 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Scanner ATS</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                  Passez les filtres automatiques des logiciels de RH. Nous injectons les bons vecteurs de mots-clés de façon organique.
                </p>
              </div>
            </Reveal>

            <Reveal as="div" delay={80}>
              <div className="card-modern p-6 md:p-10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-slate-100 group h-full">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#7D5CFF]/10 rounded-2xl flex items-center justify-center mb-6 md:mb-8 border border-[#7D5CFF]/15 group-hover:bg-[#7D5CFF] transition-all">
                  <Cpu size={24} className="md:w-7 md:h-7 text-[#7D5CFF] group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-4">Génération Bulk</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                  Envoyez 50 candidatures spontanées personnalisées en moins de 10 minutes. L'IA rédige un message unique pour chaque entreprise.
                </p>
              </div>
            </Reveal>

            <Reveal as="div" className="md:col-span-2" delay={80}>
              <div className="card-modern p-6 md:p-10 bg-[#7D5CFF]/5 border-[#7D5CFF]/15 relative overflow-hidden group h-full">
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#7D5CFF]/15 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10">
                  <div className="flex-1 space-y-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center border border-[#7D5CFF]/15 text-[#7D5CFF]">
                      <Globe size={24} className="md:w-7 md:h-7" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900">Reach Global</h3>
                    <p className="text-slate-600 font-medium text-base md:text-lg">
                      Ciblez des entreprises par secteur, taille et localisation partout en France et à l'international.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 w-full md:w-64">
                    {[
                      { l: 'Tech & SaaS', v: '92%' },
                      { l: 'Finance', v: '88%' },
                      { l: 'Marketing', v: '95%' }
                    ].map((item, i) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-[#7D5CFF]/15 flex justify-between items-center shadow-sm">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.l}</span>
                        <span className="text-[10px] font-black text-[#7D5CFF]">{item.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-6 bg-white border-t border-slate-50">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border border-slate-100">
              <HelpCircle size={14} />
              <span>Questions fréquentes</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">On répond à vos interrogations.</h2>
            <p className="text-slate-500 font-medium">Tout ce qu'il faut savoir sur l'unité JoBoost.</p>
          </Reveal>

          <div className="space-y-4">
            <FAQItem
              question="Comment l'IA optimise-t-elle mon CV ?"
              answer="Notre moteur analyse les mots-clés sémantiques des offres d'emploi et les compare à votre profil pour maximiser le score de compatibilité avec les systèmes ATS (Applicant Tracking Systems)."
            />
            <FAQItem
              question="Est-ce que JoBoost envoie des emails en mon nom ?"
              answer="Oui, via le module Bulk Apply, nous préparons et envoyons des candidatures personnalisées directement aux recruteurs identifiés. Chaque message est unique et adapté à l'entreprise."
            />
            <FAQItem
              question="Puis-je utiliser JoBoost gratuitement ?"
              answer="Absolument. Le plan gratuit vous permet de tester la puissance de notre IA avec 5 candidatures par jour et un accès limité aux outils d'édition."
            />
            <FAQItem
              question="Mes données personnelles sont-elles sécurisées ?"
              answer="JoBoost est conçu dans le respect du RGPD. Vos données ne sont jamais revendues et servent uniquement à l'optimisation de votre recherche d'emploi. Consultez notre politique de confidentialité pour le détail."
            />
            <FAQItem
              question="Comment fonctionne le score de matching ?"
              answer="Le score est calculé en analysant plus de 50 points de convergence : compétences techniques, expérience sectorielle, niveau de séniorité et adéquation culturelle détectée dans l'offre."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-6 bg-slate-50 overflow-hidden relative border-y border-slate-100">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#7D5CFF 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
        <Reveal className="max-w-4xl mx-auto text-center space-y-8 md:space-y-10 relative z-10">
          <h2 className="text-3xl md:text-6xl font-black text-slate-800 leading-tight tracking-tight">
            Prêt à changer de dimension <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#7D5CFF] to-[#4F46E5]">professionnelle ?</span>
          </h2>
          <p className="text-slate-600 text-base md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            N'attendez pas que la chance tourne. Utilisez la technologie pour forcer les portes des meilleures entreprises.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center pt-4">
            <button onClick={() => openAuth(true)} className="press w-full sm:w-auto bg-[#7D5CFF] text-white px-10 md:px-12 py-4 md:py-5 rounded-2xl font-black text-base md:text-lg hover:bg-[#6023C0] transition-all flex items-center justify-center gap-3 shadow-xl shadow-[#7D5CFF]/30">
              Démarrer gratuitement <ArrowRight size={20} />
            </button>
            <div className="flex items-center justify-center gap-4 text-slate-400 text-sm font-bold">
              <CheckCircle2 className="text-emerald-500" /> Sans carte bancaire
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="bg-white py-20 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
          <div className="col-span-2 lg:col-span-2 space-y-6">
            <div className="flex items-center group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Logo />
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs font-medium">
              L'allié des candidats ambitieux pour une recherche d'emploi assistée par l'IA : CV, lettres, candidatures ciblées et suivi.
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Produit</p>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">Scanner ATS</Link></li>
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">Candidatures spontanées</Link></li>
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">Lettre de motivation IA</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Compagnie</p>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link to="/legal/mentions" className="hover:text-[#7D5CFF] transition-colors">À propos</Link></li>
              <li><a href="#faq" className="hover:text-[#7D5CFF] transition-colors">FAQ</a></li>
              <li><a href="mailto:joboost.ai@gmail.com" className="hover:text-[#7D5CFF] transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Légal</p>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link to="/legal/mentions" className="hover:text-[#7D5CFF] transition-colors">Mentions légales</Link></li>
              <li><Link to="/legal/confidentialite" className="hover:text-[#7D5CFF] transition-colors">Confidentialité</Link></li>
              <li><Link to="/legal/cgu" className="hover:text-[#7D5CFF] transition-colors">CGU</Link></li>
              <li><Link to="/legal/cgv" className="hover:text-[#7D5CFF] transition-colors">CGV</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>© 2026 JoBoost</span>
          <div className="flex gap-4">
            <Globe size={14} /> <span>France (FR)</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowAuth(false)}>
          <div className="bg-white w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl relative border border-slate-100 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAuth(false)} aria-label="Fermer" className="absolute top-8 right-8 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={24} />
            </button>
            <div className="text-center mb-10">
              <div className="w-14 h-14 bg-[#7D5CFF]/10 rounded-2xl flex items-center justify-center text-[#7D5CFF] mx-auto mb-6">
                <Rocket size={28} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">
                {isSignUp ? 'Créer un profil' : 'Réactiver l\'unité'}
              </h2>
              <p className="text-slate-500 font-bold text-sm tracking-tight italic">
                {isSignUp ? 'Commencez votre ascension stratégique.' : 'Reprenez votre recherche haute-performance.'}
              </p>
            </div>

            <div className="space-y-4">
              <button onClick={() => handleSocialLogin('Google')} className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 hover:border-[#7D5CFF]/30 transition-all text-sm shadow-sm group">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                Continuer avec Google
              </button>

              {/* Bouton « Continuer avec Apple » masqué tant qu'aucun compte Apple Developer
                  n'est configuré (Sign in with Apple exige un Services ID + clé .p8).
                  Le flux backend (/api/auth/apple) reste prêt : poser les variables d'env
                  APPLE_* puis ré-afficher ce bouton suffira à le réactiver. */}
              {/*
              <button onClick={() => handleSocialLogin('Apple')} className="w-full flex items-center justify-center gap-3 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-all text-sm shadow-sm group">
                <svg className="w-5 h-5 mb-0.5" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
                Continuer avec Apple
              </button>
              */}

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]"><span className="bg-white px-6">Protocole Email</span></div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Vecteur d'identité</label>
                <input type="email" placeholder="votre@agence.com" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-[#7D5CFF]/15 focus:border-[#7D5CFF]/30 outline-none transition-all" />
              </div>

              <button onClick={onStart} className="press w-full py-5 bg-[#7D5CFF] text-white rounded-2xl font-black shadow-2xl shadow-[#7D5CFF]/30 hover:bg-[#6023C0] transition-all text-sm uppercase tracking-widest mt-6">
                {isSignUp ? "Lancer mon unité" : "Initialiser Connexion"}
              </button>

              {isSignUp && (
                <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-4 px-2">
                  En créant un compte, vous acceptez les{' '}
                  <Link to="/legal/cgu" className="font-bold text-[#7D5CFF] hover:underline">conditions générales</Link>
                  {' '}et la{' '}
                  <Link to="/legal/confidentialite" className="font-bold text-[#7D5CFF] hover:underline">politique de confidentialité</Link>.
                </p>
              )}

              <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-[10px] font-black text-[#7D5CFF] hover:underline mt-6 uppercase tracking-widest">
                {isSignUp ? "Déjà membre ? Se connecter" : "Nouvelle unité ? S'inscrire"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
