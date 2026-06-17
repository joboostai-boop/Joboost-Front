import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Download, FileJson, Layers, Target, Cpu, Gauge,
  FileText, PenLine, CheckCircle2, RefreshCw, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';
import EmptyState from '../components/EmptyState';
import StatCard, { StatTone } from '../components/StatCard';
import SectionCard from '../components/SectionCard';
import CountUp from '../components/CountUp';

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

/* Skeleton calqué sur la mise en page réelle (pas de spinner plein écran). */
const DashboardSkeleton: React.FC = () => (
  <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="skeleton h-5 w-56" />
      <div className="flex gap-2">
        <div className="skeleton h-[42px] w-24 rounded-xl" />
        <div className="skeleton h-[42px] w-28 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface p-4 md:p-5 flex flex-col gap-4">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="surface p-6"><div className="skeleton h-64 w-full" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
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

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/stats`, {
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (data.success) {
        setStatsData(data.stats);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
      toast.error('Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleExport = (format: 'json' | 'csv') => {
    if (!statsData) return;
    const data = { summary: statsData, timestamp: new Date().toISOString() };
    const blob = new Blob(
      [format === 'json'
        ? JSON.stringify(data, null, 2)
        : `Metric,Value\nProfile Completion,${statsData.profileCompletion}\nCVs,${statsData.cvCount}\nLetters,${statsData.letterCount}\nSaved Offers,${statsData.savedCount}`],
      { type: format === 'json' ? 'application/json' : 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joboost-report-${new Date().toLocaleDateString()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Rapport ${format.toUpperCase()} généré avec succès !`);
  };

  if (loading) return <DashboardSkeleton />;

  /* État d'erreur explicite (plus de page blanche). */
  if (error || !statsData) {
    return (
      <div className="p-5 md:p-8 max-w-6xl mx-auto">
        <EmptyState
          variant="generic"
          title="Statistiques indisponibles"
          description="Nous n'avons pas pu récupérer vos données pour le moment. Vérifiez votre connexion puis réessayez."
          action={
            <button onClick={fetchStats} className="press btn btn-primary">
              <RefreshCw size={16} /> Réessayer
            </button>
          }
        />
      </div>
    );
  }

  const totalDocs = (statsData.cvCount || 0) + (statsData.letterCount || 0);
  const totalOffers = (statsData.recommendedCount || 0) + (statsData.savedCount || 0);
  const totalApplications = statsData.applications?.total || 0;
  const profileComplete = statsData.profileCompletion === 100;

  const stats: { label: string; value: number; suffix?: string; icon: React.ReactNode; tone: StatTone }[] = [
    { label: 'Candidatures totales', value: totalApplications, icon: <Layers size={20} strokeWidth={2.4} />, tone: 'violet' },
    { label: 'Offres liées (reco + sauvées)', value: totalOffers, icon: <Target size={20} strokeWidth={2.4} />, tone: 'blue' },
    { label: 'Documents IA (CV + lettres)', value: totalDocs, icon: <Cpu size={20} strokeWidth={2.4} />, tone: 'emerald' },
    { label: 'Profil complété', value: statsData.profileCompletion || 0, suffix: '%', icon: <Gauge size={20} strokeWidth={2.4} />, tone: 'amber' },
  ];

  const appStatusData = [
    { name: 'En attente', value: statsData.applications?.pending || 0 },
    { name: 'Envoyées', value: statsData.applications?.sent || 0 },
    { name: 'Entretiens', value: statsData.applications?.interview || 0 },
    { name: 'Offres', value: statsData.applications?.offer || 0 },
  ];

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toolbar — le titre est porté par le hero du layout. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
            profileComplete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${profileComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {profileComplete ? 'Profil complet' : 'Profil à compléter'}
          </span>
          <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400">
            Données calculées à partir de votre activité réelle.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('json')} className="press btn btn-secondary" aria-label="Exporter en JSON">
            <FileJson size={16} /> JSON
          </button>
          <button onClick={() => handleExport('csv')} className="press btn btn-secondary" aria-label="Exporter en CSV">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={<><CountUp value={s.value} />{s.suffix}</>}
            icon={s.icon}
            tone={s.tone}
          />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard
            title="Répartition de vos candidatures"
            caption={
              totalApplications > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={14} /> Sur {totalApplications} trackée(s)
                </span>
              ) : 'Aucune candidature suivie pour le moment.'
            }
          >
            {totalApplications > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7D5CFF" stopOpacity={1} />
                        <stop offset="100%" stopColor="#B9A3FF" stopOpacity={0.85} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? '#1F2937' : '#F1F5F9'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#1F2937' : '#F8FAFC', radius: 8 }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} fill="url(#barGradient)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                bare
                compact
                variant="applications"
                title="Pas encore de candidature"
                description="Dès que vous suivrez vos premières candidatures, leur répartition s'affichera ici."
                action={
                  <button onClick={() => navigate('/track/applications')} className="press btn btn-primary">
                    Suivre une candidature <ArrowRight size={16} />
                  </button>
                }
              />
            )}
          </SectionCard>

          {/* Actions rapides */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/prepare/cv')}
              className="press surface p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/45 focus-visible:ring-offset-2"
            >
              <span className="w-12 h-12 surface-accent rounded-xl flex items-center justify-center text-[#7D5CFF] group-hover:scale-105 transition-transform">
                <FileText size={22} />
              </span>
              <span className="font-semibold text-[#111827] dark:text-white">Générer un CV</span>
            </button>
            <button
              onClick={() => navigate('/prepare/letter')}
              className="press surface p-5 flex flex-col items-center justify-center text-center gap-3 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF]/45 focus-visible:ring-offset-2"
            >
              <span className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                <PenLine size={22} />
              </span>
              <span className="font-semibold text-[#111827] dark:text-white">Générer une lettre</span>
            </button>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <SectionCard
            title="Complétez votre profil"
            caption="Un profil complet améliore le ciblage de l'IA."
            action={
              <span className="w-10 h-10 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center">
                <CheckCircle2 size={20} />
              </span>
            }
          >
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">Progression</span>
                <span className="text-[#7D5CFF] tabular-nums">{statsData.profileCompletion}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#7D5CFF] rounded-full transition-[width] duration-500" style={{ width: `${statsData.profileCompletion}%` }} />
              </div>
            </div>
            <button onClick={() => navigate('/prepare/profile')} className="press btn btn-primary w-full">
              {profileComplete ? 'Voir mon profil' : 'Compléter mon profil'}
            </button>
          </SectionCard>

          <SectionCard title="Activité récente">
            <div className="space-y-3.5">
              {[
                { label: 'Offres sauvegardées en attente', val: statsData.savedCount || 0, color: 'bg-[#7D5CFF]' },
                { label: 'CV originaux', val: statsData.cvCount || 0, color: 'bg-emerald-500' },
                { label: 'Lettres rédigées', val: statsData.letterCount || 0, color: 'bg-amber-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 ${item.color} rounded-sm shrink-0`} />
                  <p className="text-sm text-[#111827] dark:text-white">
                    <strong className="tabular-nums">{item.val}</strong> {item.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <button onClick={() => navigate('/target/offers')} className="press btn btn-secondary w-full text-sm">
                Voir offres
              </button>
              <button onClick={() => navigate('/track/applications')} className="press btn btn-secondary w-full text-sm">
                Suivi
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
