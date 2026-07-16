import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { BusinessStats, BusinessOffer, BusinessJobseeker, BusinessAccount } from '../types';
import { businessStatsApi, businessOfferApi, businessJobseekerApi } from '../services/business';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Briefcase, Megaphone, TrendingUp, TrendingDown,
  ArrowRight, Plus, BarChart3, Building2, CheckCircle2, Circle,
  AlertTriangle, Clock, PenLine, Puzzle, Sparkles, ChevronRight,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* Tableau de bord de l'espace recruteur : vue d'ensemble 30 jours, points
   d'attention sur les offres, derniers candidats, actions rapides et
   checklist de démarrage. Registre « corporate » sobre (violet marque). */

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { account } = useOutletContext<{ account: BusinessAccount | null }>();

  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [offers, setOffers] = useState<BusinessOffer[]>([]);
  const [recent, setRecent] = useState<BusinessJobseeker[]>([]);
  const [vivierTotal, setVivierTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, o, j] = await Promise.all([
          businessStatsApi.getStats({ period: '30d' }),
          businessOfferApi.list(1, 100),
          businessJobseekerApi.list({ page: 1, limit: 5 }),
        ]);
        if (cancelled) return;
        setStats(s);
        setOffers(o.offers);
        setRecent(j.jobseekers);
        setVivierTotal(j.pagination.total);
      } catch (err: any) {
        if (!cancelled) toast.error(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // --- Données graphe (30 jours, par jour) ---
  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.growth.map((g) => {
      const parts = g.bucket.split('-');
      return { label: `${parts[2]}/${parts[1]}`, total: g.total };
    });
  }, [stats]);

  const hasActivity = useMemo(() => chartData.some((d) => d.total > 0), [chartData]);

  // --- Points d'attention sur les offres ---
  const attention = useMemo(() => {
    const now = new Date();
    const in7days = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const drafts = offers.filter((o) => !o.isPublished);
    const expired = offers.filter((o) => o.expiresAt && new Date(o.expiresAt) < now);
    const expiringSoon = offers.filter((o) =>
      o.isPublished && o.expiresAt && new Date(o.expiresAt) >= now && new Date(o.expiresAt) <= in7days);
    const noSkills = offers.filter((o) => o.isPublished && (!o.requiredSkills || o.requiredSkills.length === 0));
    return { drafts, expired, expiringSoon, noSkills };
  }, [offers]);

  // --- Checklist de démarrage ---
  const checklist = useMemo(() => {
    const steps = [
      {
        done: !!account?.companyName,
        label: 'Renseigner le nom de votre entreprise',
        to: '/settings',
      },
      {
        done: offers.length > 0,
        label: 'Créer votre première offre d\'emploi',
        to: '/business/offers?new=1',
      },
      {
        done: vivierTotal > 0,
        label: 'Ajouter un premier candidat au vivier',
        to: '/business/jobseekers?new=1',
      },
      {
        done: offers.some((o) => o.isPublished),
        label: 'Publier une offre',
        to: '/business/offers',
      },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    return { steps, doneCount, complete: doneCount === steps.length };
  }, [account, offers, vivierTotal]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-pro p-4 space-y-3">
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="skeleton h-7 w-16 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-pro"><div className="skeleton h-[260px] w-full rounded-xl" /></div>
          <div className="card-pro space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">

      {/* ── Bandeau de bienvenue à la marque du partenaire — visible uniquement
           si l'organisme a posé son logo (auto-scopé, comme le co-branding). ── */}
      {account?.logoUrl && (
        <div className="relative overflow-hidden rounded-2xl border border-[#ECEAF6] dark:border-[#1F2937] bg-white dark:bg-[#0B1120] p-5 md:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(460px 220px at 92% -70px, rgba(125,92,255,0.12), transparent 70%)',
              maskImage: 'linear-gradient(to bottom, black, black 68%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black, black 68%, transparent)',
            }}
          />
          <div className="relative flex items-center gap-4 md:gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-sm shrink-0 flex items-center justify-center p-2.5">
              <img src={account.logoUrl} alt={account.companyName || 'Logo'} className="max-w-full max-h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl md:text-[1.65rem] leading-tight font-extrabold text-[#0B0B14] dark:text-white tracking-[-0.02em]">
                Bienvenue, {account.companyName}
              </h2>
              <p className="text-[13px] md:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xl">
                Votre espace partenaire sur-mesure : vos adhérents, vos offres et votre suivi, réunis au même endroit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist de démarrage (tant que tout n'est pas fait) ── */}
      {!checklist.complete && (
        <div className="card-pro border-l-[3px] border-l-[#7D5CFF]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[#7D5CFF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bien démarrer</h3>
            <span className="ml-auto text-xs font-bold text-[#7D5CFF]">{checklist.doneCount}/{checklist.steps.length}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-[#7D5CFF] rounded-full transition-all duration-500"
              style={{ width: `${(checklist.doneCount / checklist.steps.length) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklist.steps.map((step) => (
              <button
                key={step.label}
                onClick={() => navigate(step.to)}
                disabled={step.done}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left text-sm transition-colors ${
                  step.done
                    ? 'text-slate-400 cursor-default'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-[#7D5CFF]/5 dark:hover:bg-[#7D5CFF]/10 font-medium'
                }`}
              >
                {step.done
                  ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                  : <Circle size={18} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                <span className={step.done ? 'line-through' : ''}>{step.label}</span>
                {!step.done && <ChevronRight size={14} className="ml-auto text-slate-300 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs (30 derniers jours) ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard icon={<Users size={18} />} label="Adhérents actifs" value={stats.kpis.totalActive} tone="violet" />
          <KpiCard icon={<UserPlus size={18} />} label="Nouveaux (30 j)" value={stats.kpis.newInPeriod} delta={stats.kpis.newInPeriodDelta} tone="emerald" />
          <KpiCard icon={<Megaphone size={18} />} label="Offres publiées" value={`${stats.publishedOffers}/${stats.totalOffers}`} tone="blue" />
          <KpiCard icon={<Briefcase size={18} />} label="Candidatures (30 j)" value={stats.kpis.applicationCount} delta={stats.kpis.applicationCountDelta} tone="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 items-start">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-4 md:space-y-5">

          {/* Activité du vivier */}
          <div className="card-pro">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-[#7D5CFF]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Activité du vivier</h3>
              <span className="text-[10px] text-slate-400 font-medium ml-auto uppercase">30 derniers jours</span>
            </div>
            {hasActivity ? (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7D5CFF" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#7D5CFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.3 }} tickLine={false} dy={8} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB', fontSize: '12px' }}
                      formatter={(value: number) => [value, 'Nouveaux candidats']}
                    />
                    <Area type="monotone" dataKey="total" stroke="#7D5CFF" strokeWidth={2.5} fill="url(#dashGrowth)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[160px] flex flex-col items-center justify-center text-center px-4">
                <BarChart3 size={32} className="text-slate-200 dark:text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">Aucune entrée dans le vivier ces 30 derniers jours.</p>
                <Link to="/business/jobseekers?new=1" className="text-xs font-bold text-[#7D5CFF] hover:underline mt-1">
                  Ajouter un candidat →
                </Link>
              </div>
            )}
          </div>

          {/* Derniers candidats */}
          <div className="card-pro">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-[#7D5CFF]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Derniers candidats ajoutés</h3>
              {vivierTotal > 0 && (
                <Link to="/business/jobseekers" className="ml-auto text-xs font-bold text-[#7D5CFF] hover:underline flex items-center gap-1">
                  Tout le vivier ({vivierTotal}) <ArrowRight size={12} />
                </Link>
              )}
            </div>
            {recent.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-slate-500">Votre vivier est vide pour le moment.</p>
                <button onClick={() => navigate('/business/jobseekers?new=1')} className="btn btn-primary mt-3 min-h-[40px] text-sm">
                  <UserPlus size={15} /> Ajouter un candidat
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 -mx-2">
                {recent.map((js) => (
                  <li key={js.affiliationId}>
                    <button
                      onClick={() => navigate(`/business/jobseekers?open=${js.id}`)}
                      className="w-full flex items-center gap-3 px-2 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#EFEBFF] dark:bg-[#7D5CFF]/15 text-[#5B3FD6] dark:text-[#B9A7FF] flex items-center justify-center text-xs font-bold shrink-0">
                        {(js.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{js.name}</p>
                        <p className="text-xs text-slate-500 truncate">{js.title || js.city || '—'}</p>
                      </div>
                      <div className="hidden sm:flex flex-wrap gap-1 max-w-[180px] justify-end">
                        {(js.skills || []).slice(0, 2).map((s) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#7D5CFF]/10 text-[#7D5CFF] font-medium">{s}</span>
                        ))}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 hidden md:block">
                        {new Date(js.affiliatedAt).toLocaleDateString('fr-FR')}
                      </span>
                      <ChevronRight size={15} className="text-slate-300 group-hover:text-[#7D5CFF] transition-colors shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Colonne latérale ── */}
        <div className="space-y-4 md:space-y-5">

          {/* Actions rapides */}
          <div className="card-pro">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Actions rapides</h3>
            <div className="space-y-2">
              <QuickAction icon={<Plus size={16} />} label="Nouvelle offre d'emploi" onClick={() => navigate('/business/offers?new=1')} primary />
              <QuickAction icon={<UserPlus size={16} />} label="Ajouter un candidat" onClick={() => navigate('/business/jobseekers?new=1')} />
              <QuickAction icon={<BarChart3 size={16} />} label="Voir les statistiques" onClick={() => navigate('/business/stats')} />
              <QuickAction icon={<Building2 size={16} />} label="Mon entreprise" onClick={() => navigate('/settings')} />
            </div>
          </div>

          {/* À surveiller */}
          <div className="card-pro">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">À surveiller</h3>
            {attention.drafts.length === 0 && attention.expired.length === 0 &&
             attention.expiringSoon.length === 0 && attention.noSkills.length === 0 ? (
              <div className="flex items-center gap-2.5 text-sm text-slate-500 py-2">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                Rien à signaler sur vos offres.
              </div>
            ) : (
              <div className="space-y-1.5">
                {attention.expired.length > 0 && (
                  <WatchItem
                    icon={<Clock size={15} />}
                    tone="amber"
                    label={`${attention.expired.length} offre${attention.expired.length > 1 ? 's' : ''} expirée${attention.expired.length > 1 ? 's' : ''}`}
                    hint="Prolongez la date ou dépubliez-les."
                    onClick={() => navigate('/business/offers')}
                  />
                )}
                {attention.expiringSoon.length > 0 && (
                  <WatchItem
                    icon={<AlertTriangle size={15} />}
                    tone="amber"
                    label={`${attention.expiringSoon.length} offre${attention.expiringSoon.length > 1 ? 's' : ''} expire${attention.expiringSoon.length > 1 ? 'nt' : ''} sous 7 jours`}
                    hint="Pensez à prolonger si le poste est toujours ouvert."
                    onClick={() => navigate('/business/offers')}
                  />
                )}
                {attention.drafts.length > 0 && (
                  <WatchItem
                    icon={<PenLine size={15} />}
                    tone="slate"
                    label={`${attention.drafts.length} brouillon${attention.drafts.length > 1 ? 's' : ''} non publié${attention.drafts.length > 1 ? 's' : ''}`}
                    hint="Une offre non publiée n'est pas visible."
                    onClick={() => navigate('/business/offers?status=draft')}
                  />
                )}
                {attention.noSkills.length > 0 && (
                  <WatchItem
                    icon={<Puzzle size={15} />}
                    tone="violet"
                    label={`${attention.noSkills.length} offre${attention.noSkills.length > 1 ? 's' : ''} sans compétences`}
                    hint="Ajoutez des compétences pour activer le matching."
                    onClick={() => navigate('/business/offers')}
                  />
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// --- Carte KPI (même registre corporate que la page Statistiques) ---
type KpiTone = 'violet' | 'emerald' | 'blue' | 'amber';
const KPI_TONES: Record<KpiTone, { border: string; chip: string }> = {
  violet:  { border: 'border-l-[#7D5CFF]',  chip: 'bg-[#7D5CFF]/15 text-[#7D5CFF] dark:text-[#B9A7FF]' },
  emerald: { border: 'border-l-emerald-500', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  blue:    { border: 'border-l-blue-500',    chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  amber:   { border: 'border-l-amber-500',   chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

const KpiCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; tone: KpiTone; delta?: number | null }> = ({ icon, label, value, tone, delta }) => {
  const t = KPI_TONES[tone];
  return (
    <div className={`bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 border-l-[3px] ${t.border} rounded-lg p-4 hover:shadow-sm dark:hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.chip}`}>{icon}</div>
        {delta !== undefined && delta !== null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="font-extrabold text-slate-900 dark:text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)' }}>{value}</p>
      <p className="text-[11px] font-semibold text-slate-500 mt-2 uppercase tracking-wider">{label}</p>
    </div>
  );
};

const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }> = ({ icon, label, onClick, primary }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
      primary
        ? 'bg-[#7D5CFF] text-white hover:bg-[#6B4AE8] shadow-[0_2px_10px_-2px_rgba(124,92,255,0.5)]'
        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {icon}
    {label}
    <ChevronRight size={15} className={`ml-auto ${primary ? 'text-white/70' : 'text-slate-400'}`} />
  </button>
);

const WATCH_TONES: Record<string, string> = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  slate: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
  violet: 'bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#B9A7FF]',
};

const WatchItem: React.FC<{ icon: React.ReactNode; tone: string; label: string; hint: string; onClick: () => void }> = ({ icon, tone, label, hint, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
  >
    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${WATCH_TONES[tone]}`}>{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{label}</span>
      <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">{hint}</span>
    </span>
    <ChevronRight size={14} className="text-slate-300 group-hover:text-[#7D5CFF] transition-colors shrink-0 mt-1.5" />
  </button>
);

export default BusinessDashboard;
