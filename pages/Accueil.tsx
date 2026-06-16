import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import PageHero from '../components/PageHero';
import HeroDecor from '../components/HeroDecor';
import Tilt from '../components/Tilt';
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

  // KPIs alignés sur les statuts du suivi (mêmes couleurs que le Kanban).
  const kpis = [
    { label: 'Candidatures', value: stats?.applications.total ?? 0, icon: <Send size={16} />, tint: 'text-[#7D5CFF] bg-[#7D5CFF]/10' },
    { label: 'En attente', value: stats?.applications.pending ?? 0, icon: <Clock size={16} />, tint: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Entretiens', value: stats?.applications.interview ?? 0, icon: <CalendarCheck size={16} />, tint: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Offres', value: stats?.applications.offer ?? 0, icon: <Award size={16} />, tint: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  const pct = stats?.profileCompletion ?? 0;

  return (
    <>
      <PageHero
        tone="violet"
        eyebrow="Accueil"
        icon={<Sparkles size={22} />}
        decor={<HeroDecor variant="accueil" />}
        title={`Bonjour ${firstName}`}
        subtitle="Voici l'état de votre recherche aujourd'hui."
        actions={
          !loading && pct < 100 ? (
            <Link to="/prepare/profile" className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-500 dark:text-slate-300 bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] hover:border-[#7D5CFF]/40 hover:text-[#7D5CFF] rounded-full px-3.5 py-2 shadow-xs transition-colors">
              <span className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <span className="block h-full bg-[#7D5CFF] rounded-full" style={{ width: `${pct}%` }} />
              </span>
              Profil {pct}%
            </Link>
          ) : undefined
        }
      />

      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6 pb-28 md:pb-10">
      {showOnboarding ? (
        /* Compte neuf : parcours de démarrage guidé (remplit l'écran utilement). */
        <section className="card-pro !p-6 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7D5CFF]">Bien démarrer</p>
              <h2 className="text-lg font-bold text-[#111827] dark:text-white mt-0.5">Lance ta recherche en {steps.length} étapes</h2>
              <p className="text-[13px] text-[#6B7280] dark:text-slate-400 mt-0.5">Quelques minutes pour des candidatures qui sortent du lot.</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-[#7D5CFF] tabular-nums leading-none">{doneCount}/{steps.length}</p>
              <p className="text-[11px] text-[#9CA3AF] mt-1">terminées</p>
            </div>
          </div>

          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-5">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8C6DFF] to-[#7D5CFF] transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>

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
        /* Compte actif : prochaine action contextuelle. */
        <Tilt glare className="animate-fade-in-up" max={8}>
        <Link
          to={next.to}
          className="press group relative overflow-hidden flex items-center justify-between gap-4 card-pro hover:shadow-card-hover hover:-translate-y-0.5 transition-all"
        >
          <div className="relative flex items-center gap-4 min-w-0">
            <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8C6DFF] to-[#6D28D9] text-white flex items-center justify-center shrink-0 shadow-[0_6px_16px_-6px_rgba(124,92,255,0.6)]">
              {loading ? <Loader2 size={22} className="animate-spin" /> : next.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7D5CFF]">Prochaine étape</p>
              <p className="font-bold text-lg truncate text-[#111827] dark:text-white">{next.title}</p>
              <p className="text-[#6B7280] dark:text-slate-400 text-[13px] truncate">{next.desc}</p>
            </div>
          </div>
          <ArrowRight size={22} className="relative shrink-0 text-[#7D5CFF] group-hover:translate-x-1 transition-transform" />
        </Link>
        </Tilt>
      )}

      {/* KPIs — masqués sur un compte neuf (évite un mur de zéros) */}
      {!showOnboarding && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k, i) => (
            <Tilt key={k.label} className="h-full" max={9}>
              <div className="card-pro !p-4 h-full animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${k.tint}`}>{k.icon}</span>
                <p className="text-2xl font-bold text-[#111827] dark:text-white tabular-nums leading-none">
                  {loading ? '–' : k.value}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1.5">{k.label}</p>
              </div>
            </Tilt>
          ))}
        </section>
      )}

      {/* Parcours + rail — mise en page app premium (remplit la largeur, densifie) */}
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Mon parcours */}
        <section className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Mon parcours</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {spaces.map((s, i) => (
              <Tilt key={s.to} glare className="h-full" max={8}>
              <Link
                to={s.to}
                style={{ animationDelay: `${i * 60}ms` }}
                className="press card-pro h-full group hover:border-[#7D5CFF]/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col gap-3 animate-fade-in-up"
              >
                <span className="w-10 h-10 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center">
                  {s.icon}
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[#111827] dark:text-white flex items-center gap-1.5">
                    {s.title}
                    <ArrowRight size={15} className="text-[#9CA3AF] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />
                  </h3>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </Link>
              </Tilt>
            ))}
          </div>
        </section>

        {/* Rail latéral : actions rapides + astuce */}
        <aside className="space-y-4">
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
            <p className="text-sm text-[#374151] dark:text-slate-300 leading-relaxed">Une lettre adaptée à chaque offre fait vraiment la différence. JobBoost la rédige à partir de l'offre — tu n'as plus qu'à relire.</p>
            <Link to="/prepare/letter" className="press inline-flex items-center gap-1.5 text-sm font-semibold text-[#7D5CFF] mt-3 hover:gap-2.5 transition-all">Rédiger une lettre <ArrowRight size={15} /></Link>
          </div>
        </aside>
      </div>
      </div>
    </>
  );
};

export default Accueil;
