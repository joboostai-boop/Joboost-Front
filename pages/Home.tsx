import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Building2,
  FileText,
  PenLine,
  Search,
  LineChart,
  Check,
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
    <div className="surface overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-slate-900 text-sm">{question}</span>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#7D5CFF]' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm text-slate-500 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
};

/* Aperçu produit : mini « Suivi des candidatures » fidèle à l'app réelle.
   Profondeur sobre (bordure + ombre douce), animation d'entrée légère,
   un seul indicateur « live » qui pulse. Aucune animation lourde permanente. */
const ProductPreview: React.FC = () => {
  const rows = [
    { role: 'Développeur Front-end', company: 'Atlas Digital', status: 'Entretien', tone: 'amber' as const },
    { role: 'Product Manager', company: 'Nova Studio', status: 'Envoyée', tone: 'blue' as const },
    { role: 'Data Analyst', company: 'Lumen Group', status: 'Offre', tone: 'emerald' as const },
  ];
  const toneClass: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const stats = [
    { label: 'Envoyées', value: 24 },
    { label: 'Entretiens', value: 5 },
    { label: 'Offres', value: 2 },
  ];

  return (
    <div className="surface shadow-card p-4 sm:p-5 w-full max-w-md mx-auto animate-fade-in-up">
      {/* En-tête du panneau */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg surface-accent flex items-center justify-center text-[#7D5CFF]">
            <LineChart size={16} />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-slate-900">Suivi des candidatures</p>
            <p className="text-[11px] text-slate-400">Mis à jour à l'instant</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Synchronisé
        </span>
      </div>

      {/* Mini-stats */}
      <div className="grid grid-cols-3 gap-2 py-4">
        {stats.map((s, i) => (
          <div key={s.label} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-2.5 text-center animate-fade-in-up" style={{ animationDelay: `${100 + i * 70}ms` }}>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lignes de candidatures */}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={r.company}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 animate-fade-in-up"
            style={{ animationDelay: `${300 + i * 90}ms` }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 text-[11px] font-semibold">
                {r.company.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{r.role}</p>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <Building2 size={10} /> {r.company}
                </p>
              </div>
            </div>
            <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${toneClass[r.tone]}`}>
              {r.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home: React.FC<HomeProps> = ({ onStart }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Ombre / bordure du header au défilement (micro-interaction discrète).
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

  // Capacités réelles du produit (factuelles, sans marques tierces).
  const capabilities = ['CV optimisé ATS', 'Lettres de motivation', 'Offres ciblées', 'Suivi des candidatures', 'Candidatures spontanées'];

  const features = [
    { icon: <FileText size={18} />, title: 'CV optimisé pour les ATS', desc: 'Un CV structuré, lisible par les logiciels de recrutement, généré à partir de votre profil.' },
    { icon: <PenLine size={18} />, title: 'Lettres de motivation', desc: 'Des lettres adaptées à chaque offre, à partir de votre expérience — relues et modifiables.' },
    { icon: <Search size={18} />, title: 'Offres ciblées', desc: 'Des offres pertinentes issues de France Travail, filtrées selon votre recherche.' },
    { icon: <LineChart size={18} />, title: 'Suivi des candidatures', desc: 'Un tableau clair pour suivre chaque candidature, de l\'envoi à la réponse.' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-[#7D5CFF]/15 selection:text-[#4F46E5]">
      {/* Header */}
      <nav className={`fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md px-5 sm:px-6 py-3.5 transition-shadow duration-200 ${scrolled ? 'border-b border-slate-200 shadow-xs' : 'border-b border-transparent'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button className="flex items-center" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Haut de page">
            <Logo />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link to="/auth/login" className="hidden sm:flex items-center gap-1.5 text-slate-500 font-medium text-sm px-3 py-2 hover:text-[#7D5CFF] transition-colors rounded-lg hover:bg-slate-50">
              <Building2 size={15} />
              Espace recruteurs
            </Link>
            <button onClick={() => openAuth(false)} className="hidden sm:block text-slate-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
              Connexion
            </button>
            <button onClick={() => openAuth(true)} className="press btn btn-primary !min-h-0 px-4 py-2 text-sm">
              Commencer
            </button>
          </div>
        </div>
      </nav>

      {/* Hero — direction « Pitch » (palette Joboost) : titre ultra-bold à gauche,
          produit qui « pop » devant un grand panneau violet arrondi & incliné à droite,
          stickers ludiques + encarts flottants factuels.
          ⚠️ Éléments interactifs conservés à l'identique (boutons openAuth, slogan, ProductPreview). */}
      <section className="relative overflow-hidden px-5 sm:px-6 pt-32 sm:pt-40 pb-20 sm:pb-28">
        {/* Décor de fond léger (purement visuel) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-44 -left-32 w-[42rem] h-[42rem] rounded-full bg-[#7D5CFF]/12 blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.04)_1px,transparent_0)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_70%_55%_at_55%_35%,#000_50%,transparent_100%)]" />
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.02fr_0.98fr] gap-16 lg:gap-12 items-center">
          {/* Colonne gauche : message */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D5CFF]/[0.07] border border-[#7D5CFF]/20 text-[#6023C0] text-xs font-semibold mb-7 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#7D5CFF] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7D5CFF]" />
              </span>
              Recherche d'emploi propulsée par l'IA
            </span>

            <h1 className="font-extrabold text-[#0B0B14] dark:text-white tracking-[-0.04em] leading-[0.98] text-[3rem] sm:text-[4rem] lg:text-[5rem] animate-fade-in-up" style={{ animationDelay: '60ms' }}>
              L'IA au service de votre{' '}
              <span className="relative inline-block text-[#7D5CFF]">
                carrière
                <svg aria-hidden viewBox="0 0 220 16" className="absolute left-0 -bottom-1.5 w-full h-3 text-[#7D5CFF]/45" preserveAspectRatio="none">
                  <path d="M3 11 C 60 3, 160 3, 217 9" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              JobBoost prépare vos candidatures sur-mesure — CV optimisé pour les ATS, lettres adaptées à chaque offre et suivi clair de vos démarches. Pour décrocher <span className="text-slate-700 font-semibold">plus d'entretiens</span>, avec moins d'efforts.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '180ms' }}>
              <button onClick={() => openAuth(true)} className="press btn btn-primary btn-lg group text-base px-7 shadow-[0_10px_28px_-8px_rgba(124,92,255,0.6)]">
                Commencer gratuitement
                <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button onClick={() => openAuth(false)} className="press btn btn-secondary btn-lg text-base">
                J'ai déjà un compte
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 justify-center lg:justify-start text-sm text-slate-500 animate-fade-in-up" style={{ animationDelay: '220ms' }}>
              <CheckCircle2 size={16} className="text-emerald-500" />
              Gratuit pour commencer · sans carte bancaire
            </div>
          </div>

          {/* Colonne droite : grand panneau violet + produit en relief (signature Pitch) */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#9B7BFF] via-[#7D5CFF] to-[#6023C0] p-7 sm:p-12 lg:p-14 shadow-[0_30px_70px_-25px_rgba(96,35,192,0.6)] overflow-hidden">
              {/* Stickers décoratifs (purement visuels) */}
              <span aria-hidden className="absolute top-7 right-9 w-3.5 h-3.5 rounded-full bg-amber-300" />
              <span aria-hidden className="absolute bottom-8 left-9 w-2.5 h-2.5 rounded-full bg-white/70" />
              <span aria-hidden className="absolute top-1/3 left-6 w-2 h-2 rounded-full bg-white/40" />
              <svg aria-hidden viewBox="0 0 24 24" className="absolute bottom-12 right-12 w-5 h-5 text-amber-300" fill="currentColor">
                <path d="M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.6L5.7 20l2.3-7-6-4.4h7.6z" />
              </svg>
              {/* Glow doux derrière la carte */}
              <span aria-hidden className="absolute inset-x-10 top-10 bottom-10 rounded-[2rem] bg-white/10 blur-2xl" />

              {/* Carte produit existante — légèrement inclinée, façon « capture qui pop » */}
              <div className="relative [transform:rotate(-2.5deg)] hover:[transform:rotate(0deg)] transition-transform duration-500 drop-shadow-[0_24px_48px_rgba(20,10,60,0.35)]">
                <ProductPreview />
              </div>
            </div>

            {/* Encart flottant haut-gauche (capacité réelle) */}
            <div className="absolute -left-2 sm:-left-7 top-10 z-10 hidden sm:flex items-center gap-2.5 rounded-2xl bg-white border border-slate-100 shadow-pop px-3.5 py-2.5 [transform:rotate(-3deg)] animate-fade-in-up" style={{ animationDelay: '360ms' }}>
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><FileText size={15} /></span>
              <div className="leading-tight text-left">
                <p className="text-[12px] font-bold text-slate-900">CV optimisé ATS</p>
                <p className="text-[11px] text-slate-400">Lisible par les recruteurs</p>
              </div>
            </div>

            {/* Encart flottant bas-droite (capacité réelle) */}
            <div className="absolute -right-2 sm:-right-6 bottom-12 z-10 hidden sm:flex items-center gap-2.5 rounded-2xl bg-white border border-slate-100 shadow-pop px-3.5 py-2.5 [transform:rotate(3deg)] animate-fade-in-up" style={{ animationDelay: '460ms' }}>
              <span className="w-8 h-8 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center shrink-0"><PenLine size={15} /></span>
              <div className="leading-tight text-left">
                <p className="text-[12px] font-bold text-slate-900">Lettre sur-mesure</p>
                <p className="text-[11px] text-slate-400">Adaptée à chaque offre</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau capacités (statique, sobre) */}
      <section className="px-5 sm:px-6 py-10 border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Tout au même endroit</p>
          <div className="flex flex-wrap gap-2">
            {capabilities.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5">
                <Check size={13} className="text-[#7D5CFF]" /> {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="features" className="px-5 sm:px-6 py-24 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl mx-auto mb-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0B0B14] dark:text-white tracking-tight">Un outil complet, du CV à l'entretien</h2>
            <p className="mt-4 text-lg text-slate-500">Chaque étape de votre recherche, dans une interface claire et structurée.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f, i) => {
              const tints = [
                'bg-[#7D5CFF]/10 text-[#7D5CFF]',
                'bg-blue-500/10 text-blue-600',
                'bg-emerald-500/10 text-emerald-600',
                'bg-amber-500/10 text-amber-600',
              ];
              return (
                <Reveal as="div" key={f.title} delay={i * 70}>
                  <div className="surface h-full p-7 hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${tints[i % tints.length]}`}>
                      {f.icon}
                    </span>
                    <h3 className="text-lg font-semibold text-[#0B0B14] dark:text-white">{f.title}</h3>
                    <p className="mt-2 text-[15px] text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 sm:px-6 py-20 sm:py-24 bg-slate-50/60 border-y border-slate-100">
        <div className="max-w-3xl mx-auto">
          <Reveal className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-medium">
              <HelpCircle size={14} /> Questions fréquentes
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0B0B14] dark:text-white tracking-tight">Vous vous demandez peut-être…</h2>
          </Reveal>

          <div className="space-y-3">
            <FAQItem
              question="Comment l'IA optimise-t-elle mon CV ?"
              answer="JobBoost structure votre CV pour qu'il soit lisible par les logiciels de recrutement (ATS) et met en avant les éléments pertinents par rapport à l'offre visée. Vous gardez la main : tout reste modifiable."
            />
            <FAQItem
              question="Les lettres sont-elles vraiment personnalisées ?"
              answer="Oui. Chaque lettre est rédigée à partir de votre profil et de l'offre concernée. Vous pouvez ensuite la relire et l'ajuster avant de l'envoyer."
            />
            <FAQItem
              question="Puis-je utiliser JobBoost gratuitement ?"
              answer="Oui. Le plan gratuit permet de tester l'outil avec une candidature par mois. Vous pouvez passer à l'offre Élite ou prendre un pack de crédits selon votre rythme."
            />
            <FAQItem
              question="Mes données sont-elles protégées ?"
              answer="JobBoost respecte le RGPD. Vos données ne sont jamais revendues et servent uniquement à vous aider dans votre recherche. Vous pouvez les exporter ou les supprimer à tout moment."
            />
            <FAQItem
              question="D'où viennent les offres d'emploi ?"
              answer="Les offres proviennent de France Travail, filtrées selon votre recherche. Vous candidatez ensuite directement depuis votre espace."
            />
          </div>
        </div>
      </section>

      {/* CTA — bande pleine couleur (signature pitch) */}
      <section className="px-5 sm:px-6 py-24 sm:py-28">
        <Reveal className="max-w-5xl mx-auto rounded-3xl bg-[#7D5CFF] px-6 py-14 sm:px-12 sm:py-20 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
            Prêt à décrocher plus d'entretiens ?
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
            Créez votre profil en quelques minutes et générez votre première candidature dès aujourd'hui.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => openAuth(true)} className="press btn btn-lg bg-white text-[#7D5CFF] hover:bg-white/90 border-transparent text-base px-6 group">
              Commencer gratuitement <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <p className="mt-4 text-sm text-white/70">Sans carte bancaire</p>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-6 py-16 border-t border-slate-100">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <button className="flex items-center" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Haut de page">
              <Logo />
            </button>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              L'allié des candidats pour une recherche d'emploi assistée par l'IA : CV, lettres, offres ciblées et suivi.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Produit</p>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">CV optimisé ATS</Link></li>
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">Lettres de motivation</Link></li>
              <li><Link to="/auth/register" className="hover:text-[#7D5CFF] transition-colors">Suivi des candidatures</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Entreprise</p>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/legal/mentions" className="hover:text-[#7D5CFF] transition-colors">À propos</Link></li>
              <li><a href="#faq" className="hover:text-[#7D5CFF] transition-colors">FAQ</a></li>
              <li><a href="mailto:joboost.ai@gmail.com" className="hover:text-[#7D5CFF] transition-colors">Contact</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Légal</p>
            <ul className="space-y-2.5 text-sm text-slate-500">
              <li><Link to="/legal/mentions" className="hover:text-[#7D5CFF] transition-colors">Mentions légales</Link></li>
              <li><Link to="/legal/confidentialite" className="hover:text-[#7D5CFF] transition-colors">Confidentialité</Link></li>
              <li><Link to="/legal/cgu" className="hover:text-[#7D5CFF] transition-colors">CGU</Link></li>
              <li><Link to="/legal/cgv" className="hover:text-[#7D5CFF] transition-colors">CGV</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>© 2026 JobBoost</span>
          <span>France</span>
        </div>
      </footer>

      {/* Modale d'authentification */}
      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowAuth(false)}>
          <div className="bg-white w-full max-w-md p-7 sm:p-8 rounded-2xl shadow-pop relative border border-slate-200 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAuth(false)} aria-label="Fermer" className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={20} />
            </button>

            <div className="mb-7">
              <Logo />
              <h2 className="mt-5 text-xl font-bold text-slate-900">
                {isSignUp ? 'Créer un compte' : 'Se connecter'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isSignUp ? 'Gratuit pour commencer, sans carte bancaire.' : 'Content de vous revoir.'}
              </p>
            </div>

            <div className="space-y-3">
              <button onClick={() => handleSocialLogin('Google')} className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 transition-colors text-sm">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="" />
                Continuer avec Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center text-xs text-slate-400"><span className="bg-white px-3">ou avec votre e-mail</span></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Adresse e-mail</label>
                <input type="email" placeholder="vous@exemple.com" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#7D5CFF]/40 focus:border-[#7D5CFF] outline-none transition-all" />
              </div>

              <button onClick={onStart} className="press btn btn-primary w-full mt-2">
                {isSignUp ? 'Créer mon compte' : 'Se connecter'}
              </button>

              {isSignUp && (
                <p className="text-xs text-slate-400 text-center leading-relaxed mt-3">
                  En créant un compte, vous acceptez les{' '}
                  <Link to="/legal/cgu" className="font-medium text-[#7D5CFF] hover:underline">conditions générales</Link>
                  {' '}et la{' '}
                  <Link to="/legal/confidentialite" className="font-medium text-[#7D5CFF] hover:underline">politique de confidentialité</Link>.
                </p>
              )}

              <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-sm font-medium text-[#7D5CFF] hover:underline mt-4">
                {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? S\'inscrire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
