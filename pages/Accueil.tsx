import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import PageHero from '../components/PageHero';
import {
  UserRound, Send, LineChart, Plus, ArrowRight,
  FileText, Search, Bell, Loader2, Clock, CalendarCheck, Award, PenLine, Sparkles
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
        title={`Bonjour ${firstName}`}
        subtitle="Voici l'état de votre recherche aujourd'hui."
        actions={
          !loading && pct < 100 ? (
            <Link to="/prepare/profile" className="inline-flex items-center gap-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/20 rounded-full px-3.5 py-2 transition-colors">
              <span className="w-20 h-1.5 rounded-full bg-white/25 overflow-hidden">
                <span className="block h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
              </span>
              Profil {pct}%
            </Link>
          ) : undefined
        }
      />

      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6 pb-28 md:pb-10 -mt-4">
      {/* Prochaine action (focale) — carte blanche pour ne pas redoubler le violet du hero */}
      <Link
        to={next.to}
        className="press group relative overflow-hidden flex items-center justify-between gap-4 card-pro hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-fade-in-up"
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

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <div key={k.label} className="card-pro !p-4 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${k.tint}`}>{k.icon}</span>
            <p className="text-2xl font-bold text-[#111827] dark:text-white tabular-nums leading-none">
              {loading ? '–' : k.value}
            </p>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-1.5">{k.label}</p>
          </div>
        ))}
      </section>

      {/* Actions rapides */}
      <section className="flex flex-wrap gap-2.5">
        {quickActions.map((a) => (
          <Link key={a.to} to={a.to} className="press inline-flex items-center gap-2 text-sm font-medium text-[#374151] dark:text-slate-200 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-lg px-3.5 py-2 hover:border-[#7D5CFF]/40 hover:text-[#7D5CFF] transition-colors">
            <span className="text-[#7D5CFF]">{a.icon}</span> {a.label}
          </Link>
        ))}
      </section>

      {/* Mon parcours */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Mon parcours</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {spaces.map((s, i) => (
            <Link
              key={s.to}
              to={s.to}
              style={{ animationDelay: `${i * 60}ms` }}
              className="press card-pro group hover:border-[#7D5CFF]/40 hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col gap-3 animate-fade-in-up"
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
          ))}
        </div>
      </section>
      </div>
    </>
  );
};

export default Accueil;
