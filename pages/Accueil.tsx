import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import PageHero from '../components/PageHero';
import HeroDecor from '../components/HeroDecor';
import Tilt from '../components/Tilt';
import CountUp from '../components/CountUp';
import StatCard, { StatTone } from '../components/StatCard';
import {
  UserRound, Send, LineChart, Plus, ArrowRight,
  FileText, Search, Bell, Loader2, Clock, CalendarCheck, Award, PenLine, Sparkles, Check
} from 'lucide-react';

interface AccueilProps {
  user: User;
}

interface DashboardStats {
  profileCompletion: number;
  cvCount: number;
  letterCount: number;
  savedCount: number;
  applications: {
    total: number;
    pending: number;
    sent: number;
    interview: number;
    offer: number;
    rejected: number;
  };
}

const spaces = [
  { to: '/prepare/profile', icon: <UserRound size={20} />, title: 'Préparer', desc: 'Ton profil, ton CV et ta lettre type.' },
  { to: '/target/offers', icon: <Send size={20} />, title: 'Postuler', desc: 'Trouve des offres et candidate avec l’IA.' },
  { to: '/track/applications', icon: <LineChart size={20} />, title: 'Suivre', desc: 'Tes candidatures et tes réponses.' },
];

const quickActions = [
  { to: '/prepare/cv', icon: <FileText size={16} />, label: 'Générer un CV' },
  { to: '/prepare/letter', icon: <PenLine size={16} />, label: 'Rédiger une lettre' },
  { to: '/target/offers', icon: <Search size={16} />, label: 'Trouver des offres' },
];

// Détermine LA prochaine action la plus pertinente selon l'état du compte.
const getNextAction = (stats: DashboardStats | null) => {
  const fallback = {
    to: '/target/offers',
    icon: <Plus size={22} strokeWidth={2.5} />,
    title: 'Nouvelle candidature',
    desc: 'Lance-toi : trouve une offre et postule.',
  };
  if (!stats) return fallback;

  if (stats.profileCompletion < 50) {
    return { to: '/prepare/profile', icon: <UserRound size={22} />, title: 'Complète ton profil', desc: `Profil rempli à ${stats.profileCompletion}%. C’est la base pour de bons documents.` };
  }
  if (stats.cvCount === 0) {
    return { to: '/prepare/cv', icon: <FileText size={22} />, title: 'Génère ton premier CV', desc: 'L’IA crée un CV optimisé à partir de ton profil.' };
  }
  if (stats.applications.total === 0) {
    return { to: '/target/offers', icon: <Search size={22} />, title: 'Postule à ta première offre', desc: 'Tes documents sont prêts, passe à l’action.' };
  }
  if (stats.applications.pending > 0) {
    return { to: '/track/applications', icon: <Bell size={22} />, title: `Relance ${stats.applications.pending} candidature${stats.applications.pending > 1 ? 's' : ''}`, desc: 'Une relance double souvent tes chances de réponse.' };
  }
  return { to: '/target/offers', icon: <Plus size={22} strokeWidth={2.5} />, title: 'Trouve de nouvelles offres', desc: 'Continue sur ta lancée, vise plus large.' };
};

// Étapes de démarrage (onboarding du nouveau compte) — chaque étape est « faite »
// dès que la donnée réelle correspondante existe. Donne un cap à un compte vide.
const getStartupSteps = (stats: DashboardStats | null) => {
  const profileDone = (stats?.profileCompletion ?? 0) >= 60;
  const cvDone = (stats?.cvCount ?? 0) > 0;
  const offersDone = (stats?.savedCount ?? 0) > 0 || (stats?.applications.total ?? 0) > 0;
  const applyDone = (stats?.applications.total ?? 0) > 0;
  return [
    { to: '/prepare/profile', icon: <UserRound size={18} />, title: 'Complète ton profil', desc: 'La base de tous tes documents.', done: profileDone },
    { to: '/prepare/cv', icon: <FileText size={18} />, title: 'Génère ton premier CV', desc: 'Un CV optimisé ATS en un clic.', done: cvDone },
    { to: '/target/offers', icon: <Search size={18} />, title: 'Trouve des offres', desc: 'Des offres ciblées sur ton profil.', done: offersDone },
    { to: '/target/offers', icon: <Send size={18} />, title: 'Postule à ta première offre', desc: "L'IA prépare ta candidature.", done: applyDone },
  ];
};

const Accueil: React.FC<AccueilProps> = ({ user }) => {
  const firstName = user?.name?.split(' ')[0] || 'à toi';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/stats`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (alive && data.success) setStats(data.stats);
      } catch {
        /* silencieux : on retombe sur l'action générique */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const next = getNextAction(stats);

  // Onboarding : tant que toutes les étapes ne sont pas faites, on met en avant
  // la checklist de démarrage (et on masque les KPIs à zéro) plutôt qu'un dashboard vide.
  const steps = getStartupSteps(stats);
  const doneCount = steps.filter((s) => s.done).length;
  const showOnboarding = !loading && doneCount < steps.length;
  const onboardingPct = Math.round((doneCount / steps.length) * 100);

  // KPIs alignés sur les statuts du suivi (mêmes couleurs que le Kanban).
  // Même composant StatCard que le Dashboard → cohérence visuelle inter-pages.
  const kpis: { label: string; value: number; icon: React.ReactNode; tone: StatTone }[] = [
    { label: 'Candidatures', value: stats?.applications.total ?? 0, icon: <Send size={20} strokeWidth={2.4} />, tone: 'violet' },
    { label: 'En attente', value: stats?.applications.pending ?? 0, icon: <Clock size={20} strokeWidth={2.4} />, tone: 'blue' },
    { label: 'Entretiens', value: stats?.applications.interview ?? 0, icon: <CalendarCheck size={20} strokeWidth={2.4} />, tone: 'amber' },
    { label: 'Offres', value: stats?.applications.offer ?? 0, icon: <Award size={20} strokeWidth={2.4} />, tone: 'emerald' },
  ];

  const pct = stats?.profileCompletion ?? 0;
  // L'anneau latéral montre la progression la plus parlante selon l'état du compte :
  // l'avancée de l'onboarding pour un compte neuf, la complétion du profil ensuite.
  const ringPct = showOnboarding ? onboardingPct : pct;
  const ringTo = showOnboarding ? next.to : '/prepare/profile';
  const ringTitle = showOnboarding ? 'Démarrage' : 'Profil complété';
  const ringSub = showOnboarding ? `${doneCount}/${steps.length} étapes faites` : (pct >= 100 ? 'Profil complet' : 'Continue à le remplir');

  return (
    <>
      <PageHero
        tone="violet"
        eyebrow="Accueil"
        icon={<Sparkles size={22} />}
        decor={<HeroDecor variant="accueil" />}
        title={`Bonjour ${firstName}`}
        subtitle="Voici l'état de votre recherche aujourd'hui."
      />

      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6 pb-28 md:pb-10">
        {/* Bloc focal — toujours présent : grande carte « prochaine étape » + anneau de progression.
            C'est le point d'accroche commun aux comptes neufs et actifs. */}
        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          <Tilt glare className="lg:col-span-2 h-full" max={6}>
            <Link
              to={next.to}
              className="press group relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between gap-5 rounded-2xl p-6 bg-gradient-to-br from-[#8C6DFF] to-[#6D28D9] text-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-fade-in-up"
            >
              <span aria-hidden className="pointer-events-none absolute -right-8 -bottom-12 w-44 h-44 rounded-full bg-white/10" />
              <div className="relative flex items-start gap-4 min-w-0">
                <span className="icon-shine w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  {loading ? <Loader2 size={22} className="animate-spin" /> : next.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-white/75">Prochaine étape</p>
                  <p className="font-bold text-lg md:text-xl leading-snug mt-0.5">{next.title}</p>
                  <p className="text-white/80 text-sm mt-1 max-w-md leading-relaxed">{next.desc}</p>
                </div>
              </div>
              <span className="relative self-start inline-flex items-center gap-2 bg-white text-[#6D28D9] font-semibold text-sm rounded-xl px-4 py-2.5 group-hover:gap-3 transition-all">
                Continuer <ArrowRight size={16} />
              </span>
            </Link>
          </Tilt>

          <Tilt max={6} className="h-full">
            <Link
              to={ringTo}
              className="press card-pro h-full flex flex-col items-center justify-center text-center gap-3 hover:-translate-y-0.5 animate-fade-in-up"
            >
              <div
                className="relative w-[84px] h-[84px] rounded-full grid place-items-center"
                style={{ background: `conic-gradient(#7D5CFF ${ringPct * 3.6}deg, rgba(125,92,255,0.15) ${ringPct * 3.6}deg)` }}
              >
                <div className="w-[64px] h-[64px] rounded-full bg-white dark:bg-[#111827] grid place-items-center text-lg font-bold text-[#111827] dark:text-white tabular-nums">
                  {loading ? '–' : `${ringPct}%`}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white">{ringTitle}</p>
                <p className="text-xs text-[#9CA3AF]">{ringSub}</p>
              </div>
            </Link>
          </Tilt>
        </div>

        {showOnboarding ? (
          /* Compte neuf : les 4 étapes de démarrage (la progression est portée par l'anneau ci-dessus). */
          <section className="card-pro !p-5 md:!p-6 animate-fade-in-up">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7D5CFF] mb-1">Bien démarrer</p>
            <h2 className="text-lg font-bold text-[#111827] dark:text-white mb-4">Lance ta recherche en {steps.length} étapes</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {steps.map((s, i) => (
                <Link
                  key={i}
                  to={s.to}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={`press group flex items-center gap-3 rounded-xl border p-3.5 transition-all animate-fade-in-up ${
                    s.done
                      ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-500/[0.06]'
                      : 'border-[#ECEAF6] dark:border-[#1F2937] hover:border-[#7D5CFF]/40 hover:-translate-y-0.5 hover:shadow-card-hover'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    s.done ? 'bg-emerald-500 text-white' : 'surface-accent text-[#7D5CFF]'
                  }`}>
                    {s.done ? <Check size={18} strokeWidth={3} /> : s.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${s.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#111827] dark:text-white'}`}>{s.title}</p>
                    <p className="text-[12px] text-[#6B7280] dark:text-slate-400 truncate">{s.done ? 'Terminé' : s.desc}</p>
                  </div>
                  {!s.done && <ArrowRight size={16} className="shrink-0 text-[#9CA3AF] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          /* Compte actif : KPIs de suivi. */
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {kpis.map((k) => (
              <Tilt key={k.label} className="h-full" max={9}>
                <StatCard
                  className="h-full"
                  label={k.label}
                  value={loading ? '–' : <CountUp value={k.value} />}
                  icon={k.icon}
                  tone={k.tone}
                />
              </Tilt>
            ))}
          </section>
        )}

        {/* Bento bas : parcours (large) + colonne actions rapides / astuce */}
        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <section className="lg:col-span-2 card-pro !p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">Mon parcours</h2>
            <div className="space-y-1.5">
              {spaces.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="press group flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors"
                >
                  <span className="w-10 h-10 rounded-xl surface-accent text-[#7D5CFF] flex items-center justify-center shrink-0">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#111827] dark:text-white">{s.title}</p>
                    <p className="text-xs text-[#9CA3AF] truncate">{s.desc}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-[#C4C4CC] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            <div className="card-pro !p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">Actions rapides</h2>
              <div className="space-y-1">
                {quickActions.map((a) => (
                  <Link key={a.to} to={a.to} className="press group flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors">
                    <span className="w-8 h-8 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center shrink-0">{a.icon}</span>
                    <span className="text-sm font-medium text-[#374151] dark:text-slate-200 flex-1">{a.label}</span>
                    <ArrowRight size={15} className="text-[#9CA3AF] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="card-pro !p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center shrink-0"><PenLine size={15} /></span>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Astuce</h2>
              </div>
              <p className="text-sm text-[#374151] dark:text-slate-300 leading-relaxed">Une lettre adaptée à chaque offre fait vraiment la différence. JoBoost la rédige à partir de l'offre — tu n'as plus qu'à relire.</p>
              <Link to="/prepare/letter" className="press inline-flex items-center gap-1.5 text-sm font-semibold text-[#7D5CFF] mt-3 hover:gap-2.5 transition-all">Rédiger une lettre <ArrowRight size={15} /></Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Accueil;
