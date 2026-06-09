import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import {
  UserRound, Send, LineChart, Plus, Crown, Settings2, ArrowRight,
  FileText, Search, Bell, Loader2
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
  { to: '/prepare/profile', icon: <UserRound size={22} />, title: 'Préparer', desc: 'Ton profil, ton CV et ta lettre type.' },
  { to: '/target/offers', icon: <Send size={22} />, title: 'Postuler', desc: 'Trouve des offres et candidate avec l’IA.' },
  { to: '/track/applications', icon: <LineChart size={22} />, title: 'Suivre', desc: 'Tes candidatures et tes réponses.' },
];

// Détermine LA prochaine action la plus pertinente selon l'état du compte.
const getNextAction = (stats: DashboardStats | null) => {
  const fallback = {
    to: '/target/offers',
    icon: <Plus size={24} strokeWidth={2.75} />,
    title: 'Nouvelle candidature',
    desc: 'Lance-toi : trouve une offre et postule.',
  };
  if (!stats) return fallback;

  if (stats.profileCompletion < 50) {
    return { to: '/prepare/profile', icon: <UserRound size={24} />, title: 'Complète ton profil', desc: `Profil rempli à ${stats.profileCompletion}%. C’est la base pour de bons documents.` };
  }
  if (stats.cvCount === 0) {
    return { to: '/prepare/cv', icon: <FileText size={24} />, title: 'Génère ton premier CV', desc: 'L’IA crée un CV optimisé à partir de ton profil.' };
  }
  if (stats.applications.total === 0) {
    return { to: '/target/offers', icon: <Search size={24} />, title: 'Postule à ta première offre', desc: 'Tes documents sont prêts, passe à l’action.' };
  }
  if (stats.applications.pending > 0) {
    return { to: '/track/applications', icon: <Bell size={24} />, title: `Relance ${stats.applications.pending} candidature${stats.applications.pending > 1 ? 's' : ''}`, desc: 'Une relance double souvent tes chances de réponse.' };
  }
  return { to: '/target/offers', icon: <Plus size={24} strokeWidth={2.75} />, title: 'Trouve de nouvelles offres', desc: 'Continue sur ta lancée, vise plus large.' };
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

  const tiles = [
    { label: 'Candidatures', value: stats?.applications.total ?? 0 },
    { label: 'En attente', value: stats?.applications.pending ?? 0 },
    { label: 'Entretiens', value: stats?.applications.interview ?? 0 },
  ];

  return (
    <div className="p-5 md:p-10 max-w-5xl mx-auto space-y-8 md:space-y-10 pb-28 md:pb-12">
      {/* En-tête */}
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#111827] dark:text-white">
          Bonjour {firstName} 👋
        </h1>
        <p className="text-sm md:text-base text-[#6B7280] dark:text-slate-400">
          Que veux-tu faire aujourd'hui&nbsp;?
        </p>
      </header>

      {/* Prochaine action (contextuelle) */}
      <Link
        to={next.to}
        className="group flex items-center justify-between gap-4 rounded-2xl bg-[#7D5CFF] text-white p-5 md:p-6 shadow-lg shadow-[#7D5CFF]/20 hover:bg-[#6023C0] transition-colors"
      >
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            {loading ? <Loader2 size={22} className="animate-spin" /> : next.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-white/70">Ta prochaine étape</p>
            <p className="font-bold text-base md:text-lg truncate">{next.title}</p>
            <p className="text-white/80 text-xs md:text-sm truncate">{next.desc}</p>
          </div>
        </div>
        <ArrowRight size={22} className="shrink-0 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* 3 chiffres clés */}
      <section className="grid grid-cols-3 gap-3 md:gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="card-pro !p-4 md:!p-5 text-center">
            <p className="text-2xl md:text-3xl font-bold text-[#111827] dark:text-white tabular-nums">
              {loading ? '–' : t.value}
            </p>
            <p className="text-[11px] md:text-xs font-medium text-[#6B7280] dark:text-slate-400 mt-1">{t.label}</p>
          </div>
        ))}
      </section>

      {/* Les 3 espaces */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#9CA3AF]">Mon parcours</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="card-pro group hover:border-[#7D5CFF]/40 hover:shadow-md transition-all flex flex-col gap-3"
            >
              <span className="w-11 h-11 rounded-xl bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center">
                {s.icon}
              </span>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                  {s.title}
                  <ArrowRight size={15} className="text-[#9CA3AF] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Liens secondaires (compte) */}
      <section className="flex flex-wrap gap-3">
        <Link to="/pricing" className="btn btn-secondary">
          <Crown size={16} className="text-[#7D5CFF]" /> Mon abonnement
        </Link>
        <Link to="/settings" className="btn btn-secondary">
          <Settings2 size={16} /> Paramètres
        </Link>
      </section>
    </div>
  );
};

export default Accueil;
