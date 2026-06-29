import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  TrendingUp, RefreshCw, ArrowRight, Building2, MapPin, Sparkles, Gauge,
  Briefcase, CalendarCheck, Award, Flame, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import EmptyState from '../components/EmptyState';
import StatCard, { StatTone } from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import CountUp from '../components/CountUp';

const API = import.meta.env.VITE_API_URL || '';

/* Tooltip du graphe — identité conservée (encre + violet marque). */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-extrabold text-[#7D5CFF]">
          {payload[0].value} <span className="text-slate-500 font-medium">candidature(s)</span>
        </p>
      </div>
    );
  }
  return null;
};

/* Comptage par clé, trié par fréquence décroissante. */
const tally = (arr: (string | undefined | null)[]): [string, number][] => {
  const m = new Map<string, number>();
  arr.forEach((raw) => {
    const key = (raw || '').trim();
    if (key) m.set(key, (m.get(key) || 0) + 1);
  });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

/* Skeleton calqué sur la mise en page réelle. */
const DashboardSkeleton: React.FC = () => (
  <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="skeleton h-5 w-56" />
      <div className="skeleton h-[42px] w-24 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface p-4 md:p-5 flex flex-col gap-4">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="space-y-2"><div className="skeleton h-7 w-16" /><div className="skeleton h-3 w-24" /></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="surface p-6"><div className="skeleton h-64 w-full" /></div>
        <div className="surface p-6"><div className="skeleton h-40 w-full" /></div>
      </div>
      <div className="space-y-6">
        <div className="surface p-6"><div className="skeleton h-32 w-full" /></div>
        <div className="surface p-6"><div className="skeleton h-40 w-full" /></div>
      </div>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statsData, setStatsData] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [offerSource, setOfferSource] = useState<string | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Stats perso (obligatoire) + offres réelles pour le pouls du marché (best-effort).
      const [statsResp, offersResp] = await Promise.all([
        fetch(`${API}/api/dashboard/stats`, { credentials: 'include', headers: { ...authHeaders() } }),
        fetch(`${API}/api/opportunities/recommendations?distance=50`, { credentials: 'include', headers: { ...authHeaders() } }),
      ]);

      const statsJson = await statsResp.json();
      if (!statsJson.success) { setError(true); return; }
      setStatsData(statsJson.stats);

      try {
        const oj = await offersResp.json();
        if (oj.success) {
          setOffers(Array.isArray(oj.recommendations) ? oj.recommendations : []);
          setOfferSource(oj.source || null);
        }
      } catch { /* le marché est optionnel : on garde les stats perso */ }
    } catch {
      setError(true);
      toast.error('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Agrégations « marché » à partir des vraies offres recommandées.
  const market = useMemo(() => {
    const companies = tally(offers.map((o) => o.company)).slice(0, 6);
    const skills = tally(offers.flatMap((o) => (Array.isArray(o.tags) ? o.tags : []))).slice(0, 12);
    const locations = tally(offers.map((o) => (o.location || '').split(',')[0])).slice(0, 5);
    const scores = offers.map((o) => Number(o.matchScore)).filter((n) => !Number.isNaN(n) && n > 0);
    const avgMatch = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { companies, skills, locations, avgMatch, count: offers.length };
  }, [offers]);

  if (loading) return <DashboardSkeleton />;

  if (error || !statsData) {
    return (
      <div className="p-5 md:p-8 max-w-6xl mx-auto">
        <EmptyState
          variant="generic"
          title="Statistiques indisponibles"
          description="Nous n'avons pas pu récupérer vos données pour le moment. Vérifiez votre connexion puis réessayez."
          action={<button onClick={fetchAll} className="press btn btn-primary"><RefreshCw size={16} /> Réessayer</button>}
        />
      </div>
    );
  }

  const a = statsData.applications || {};
  const pending = a.pending || 0, sent = a.sent || 0, interview = a.interview || 0, offer = a.offer || 0, rejected = a.rejected || 0;
  const totalApplications = a.total || 0;
  // Candidatures réellement envoyées (hors « à préparer ») → base du taux d'entretien.
  const activeSent = sent + interview + offer + rejected;
  const interviewRate = activeSent ? Math.round(((interview + offer) / activeSent) * 100) : 0;
  const profileCompletion = statsData.profileCompletion || 0;
  const profileComplete = profileCompletion === 100;
  const isDemo = offerSource === 'demo' || offerSource === null;

  const kpis: { label: string; value: number; suffix?: string; icon: React.ReactNode; tone: StatTone }[] = [
    { label: 'Candidatures totales', value: totalApplications, icon: <Briefcase size={20} strokeWidth={2.4} />, tone: 'violet' },
    { label: "Taux d'entretien", value: interviewRate, suffix: '%', icon: <TrendingUp size={20} strokeWidth={2.4} />, tone: 'blue' },
    { label: 'Entretiens décrochés', value: interview, icon: <CalendarCheck size={20} strokeWidth={2.4} />, tone: 'amber' },
    { label: 'Offres reçues', value: offer, icon: <Award size={20} strokeWidth={2.4} />, tone: 'emerald' },
  ];

  const funnel = [
    { name: 'À préparer', value: pending, color: '#94A3B8' },
    { name: 'Envoyées', value: sent, color: '#3B82F6' },
    { name: 'Entretiens', value: interview, color: '#F59E0B' },
    { name: 'Offres', value: offer, color: '#10B981' },
  ];

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
            profileComplete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profileComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            Profil {profileCompletion}%
          </span>
          <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
            Votre activité + le pouls du marché de l'emploi.
          </span>
        </div>
        <button onClick={fetchAll} className="press btn btn-secondary shrink-0" aria-label="Actualiser">
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      {/* KPIs perso */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((s) => (
          <StatCard key={s.label} label={s.label} value={<><CountUp value={s.value} />{s.suffix}</>} icon={s.icon} tone={s.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Votre tunnel de candidatures"
            caption={
              totalApplications > 0
                ? <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400"><TrendingUp size={14} /> {activeSent} envoyée(s) · {interviewRate}% d'entretien</span>
                : 'Aucune candidature suivie pour le moment.'
            }
          >
            {totalApplications > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? '#1F2937' : '#F1F5F9'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1F2937' : '#F8FAFC', radius: 8 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                      {funnel.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                bare compact variant="applications"
                title="Pas encore de candidature"
                description="Dès que vous suivrez vos premières candidatures, leur progression s'affichera ici."
                action={<button onClick={() => navigate('/target/offers')} className="press btn btn-primary">Trouver des offres <ArrowRight size={16} /></button>}
              />
            )}
          </SectionCard>

          {/* Pouls du marché — entreprises qui recrutent le plus */}
          <SectionCard
            title="Entreprises qui recrutent pour votre profil"
            caption={
              <span className="inline-flex items-center gap-1.5">
                <Flame size={14} className="text-[#F97316]" />
                {market.count > 0
                  ? <>{market.count} offres analysées{isDemo ? ' · démo' : ' · temps réel'}</>
                  : 'Complétez votre profil pour révéler les recruteurs actifs.'}
              </span>
            }
          >
            {market.companies.length > 0 ? (
              <div className="space-y-2.5">
                {market.companies.map(([company, n], i) => (
                  <button
                    key={company}
                    onClick={() => navigate('/target/offers')}
                    className="press w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors text-left group outline-none"
                  >
                    <span className="w-7 text-center text-sm font-extrabold tabular-nums text-slate-300 dark:text-slate-600 shrink-0">{i + 1}</span>
                    <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {company.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 flex items-center gap-1.5 text-sm font-semibold text-[#111827] dark:text-white truncate">
                      <Building2 size={13} className="text-slate-400 shrink-0" /> <span className="truncate">{company}</span>
                    </span>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-[#7D5CFF]/10 text-[#7D5CFF] text-xs font-bold tabular-nums">
                      {n} offre{n > 1 ? 's' : ''}
                    </span>
                    <ArrowRight size={15} className="text-slate-300 group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                bare compact variant="generic"
                title="Pas encore de signal marché"
                description="Renseignez votre poste et vos compétences pour que JoBoost détecte les entreprises qui recrutent autour de vous."
                action={<button onClick={() => navigate('/prepare/profile')} className="press btn btn-primary">Compléter mon profil <ArrowRight size={16} /></button>}
              />
            )}
          </SectionCard>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Profil */}
          <SectionCard title="Complétez votre profil" caption="Un profil complet améliore le ciblage de l'IA.">
            <div className="flex items-center gap-4 mb-5">
              <div
                className="relative w-16 h-16 rounded-full grid place-items-center shrink-0"
                style={{ background: `conic-gradient(#7D5CFF ${profileCompletion * 3.6}deg, rgba(125,92,255,0.15) ${profileCompletion * 3.6}deg)` }}
              >
                <div className="w-[52px] h-[52px] rounded-full bg-white dark:bg-[#111827] grid place-items-center text-sm font-bold text-[#111827] dark:text-white tabular-nums">
                  {profileCompletion}%
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827] dark:text-white">{profileComplete ? 'Profil complet' : 'Profil à compléter'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{profileComplete ? 'Bravo, tout est rempli !' : "Améliore le ciblage de l'IA."}</p>
              </div>
            </div>
            <button onClick={() => navigate('/prepare/profile')} className="press btn btn-primary w-full">
              {profileComplete ? 'Voir mon profil' : 'Compléter mon profil'}
            </button>
          </SectionCard>

          {/* Compétences les plus demandées (marché) */}
          {market.skills.length > 0 && (
            <SectionCard title="Compétences les plus demandées" caption={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-[#7D5CFF]" /> D'après les offres en cours</span>}>
              <div className="flex flex-wrap gap-2">
                {market.skills.map(([skill, n]) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] text-xs font-semibold">
                    {skill}
                    <span className="text-[10px] font-bold text-[#7D5CFF]/60 tabular-nums">{n}</span>
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Où ça recrute (marché) + score moyen */}
          {market.locations.length > 0 && (
            <SectionCard title="Où ça recrute" caption={market.avgMatch > 0 ? <span className="inline-flex items-center gap-1.5"><Gauge size={14} className="text-emerald-500" /> Match moyen {market.avgMatch}%</span> : undefined}>
              <div className="space-y-2.5">
                {market.locations.map(([loc, n]) => {
                  const max = market.locations[0][1] || 1;
                  return (
                    <div key={loc} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 text-[#111827] dark:text-white font-medium truncate">
                          <MapPin size={13} className="text-slate-400 shrink-0" /> <span className="truncate">{loc}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-400 tabular-nums shrink-0">{n}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#7D5CFF] to-[#B9A3FF]" style={{ width: `${Math.round((n / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate('/target/offers')} className="press btn btn-secondary w-full mt-4 text-sm">
                <Send size={14} /> Voir les offres
              </button>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
