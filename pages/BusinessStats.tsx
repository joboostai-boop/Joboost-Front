import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessStats, StatsQuery, StatsPeriod, BusinessJobseeker } from '../types';
import { businessStatsApi, businessJobseekerApi } from '../services/business';
import ActionMenu from '../components/ActionMenu';
import { useModalBehavior } from '../hooks/useModalBehavior';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Target, Briefcase, TrendingUp, TrendingDown,
  Download, Loader2, BarChart3, Award, MoreVertical, SlidersHorizontal,
  X, FileSpreadsheet, ArrowUp, ArrowDown, Eye, EyeOff, Filter, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const STATUS_LABELS: Record<string, string> = {
  active: 'Actifs',
  inactive: 'Inactifs',
  suspended: 'Suspendus',
};

/* Couleur indexée par STATUT, et non par position : avec un tableau positionnel,
   un organisme n'ayant que des « Suspendus » les affichait en vert (index 0). */
const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  inactive: '#94A3B8',
  suspended: '#EF4444',
};
const FALLBACK_COLOR = '#8B5CF6';

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '12m', label: '12 mois' },
  { value: 'custom', label: 'Personnalisé' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'suspended', label: 'Suspendus' },
];

// --- Personnalisation du tableau de bord (liberté : composer son dashboard) ---
type WidgetId = 'kpis' | 'growth' | 'status' | 'offers' | 'skills';
const DEFAULT_LAYOUT: { id: WidgetId; visible: boolean }[] = [
  { id: 'kpis', visible: true },
  { id: 'growth', visible: true },
  { id: 'status', visible: true },
  { id: 'offers', visible: true },
  { id: 'skills', visible: true },
];
const WIDGET_LABELS: Record<WidgetId, string> = {
  kpis: 'Indicateurs clés',
  growth: 'Évolution des affiliations',
  status: 'Répartition par statut',
  offers: 'Offres d\'emploi',
  skills: 'Top compétences',
};
const LAYOUT_KEY = 'joboost.business.stats.layout';

const loadLayout = (): { id: WidgetId; visible: boolean }[] => {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as { id: WidgetId; visible: boolean }[];
    // Réconcilier avec les widgets connus (ajout/suppression future)
    const known = DEFAULT_LAYOUT.map((w) => w.id);
    const filtered = parsed.filter((w) => known.includes(w.id));
    const missing = DEFAULT_LAYOUT.filter((w) => !filtered.some((p) => p.id === w.id));
    return [...filtered, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
};

const BusinessStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);

  // Filtres / période
  const [period, setPeriod] = useState<StatsPeriod>('6m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Personnalisation
  const [layout, setLayout] = useState(loadLayout);
  const [showCustomize, setShowCustomize] = useState(false);

  // Drill-down
  const [drill, setDrill] = useState<{ type: 'skill' | 'status'; value: string; label: string } | null>(null);

  // Échap pour fermer + blocage du scroll de fond sur les overlays.
  useModalBehavior(showCustomize, () => setShowCustomize(false));
  useModalBehavior(showMobileActions, () => setShowMobileActions(false));
  useModalBehavior(!!drill, () => setDrill(null));

  useEffect(() => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  }, [layout]);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const query: StatsQuery = { status: statusFilter || undefined, skill: skillFilter || undefined };
      if (period === 'custom') {
        if (customFrom) query.from = new Date(customFrom).toISOString();
        if (customTo) query.to = new Date(customTo).toISOString();
        query.period = 'custom';
      } else {
        query.period = period;
      }
      const data = await businessStatsApi.getStats(query);
      setStats(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customFrom, customTo, statusFilter, skillFilter]);

  useEffect(() => {
    // Ne pas requêter une période perso incomplète
    if (period === 'custom' && (!customFrom || !customTo)) return;
    fetchStats(!loading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo, statusFilter, skillFilter]);

  // --- Données dérivées pour les graphes ---
  const chartData = useMemo(() => {
    if (!stats) return [];
    return stats.growth.map((g) => {
      const parts = g.bucket.split('-');
      const label = stats.range.granularity === 'day'
        ? `${parts[2]}/${parts[1]}`
        : (MONTH_LABELS[parts[1]] || g.bucket);
      return { ...g, label };
    });
  }, [stats]);

  const donutData = useMemo(() => {
    if (!stats) return [];
    return stats.statusBreakdown.map((s) => ({
      name: STATUS_LABELS[s.status] || s.status,
      value: s.count,
      status: s.status,
      color: STATUS_COLORS[s.status] || FALLBACK_COLOR,
    }));
  }, [stats]);

  // Le centre du donut doit porter le TOTAL des parts affichées. Il montrait
  // `totalActive` étiqueté « Actifs » alors que l'anneau agrège tous les statuts :
  // avec 3 actifs et 2 inactifs, l'anneau valait 5 mais le centre annonçait 3.
  const donutTotal = useMemo(() => donutData.reduce((sum, d) => sum + d.value, 0), [donutData]);

  // --- Export CSV (liberté : réutiliser les données) ---
  const handleExportCSV = () => {
    setShowMobileActions(false);
    if (!stats) return;
    const lines: string[] = [];
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    lines.push(`Statistiques Joboost Business — ${stats.range.from.slice(0, 10)} au ${stats.range.to.slice(0, 10)}`);
    lines.push('');
    lines.push('Indicateur,Valeur');
    lines.push(`${esc('Adhérents actifs')},${stats.kpis.totalActive}`);
    lines.push(`${esc('Nouveaux sur la période')},${stats.kpis.newInPeriod}`);
    lines.push(`${esc('Complétion profil moyenne (%)')},${stats.kpis.avgProfileCompletion}`);
    lines.push(`${esc('Candidatures sur la période')},${stats.kpis.applicationCount}`);
    lines.push(`${esc('Offres totales')},${stats.totalOffers}`);
    lines.push(`${esc('Offres publiées')},${stats.publishedOffers}`);
    lines.push('');
    lines.push('Évolution,Nouvelles affiliations');
    stats.growth.forEach((g) => lines.push(`${esc(g.bucket)},${g.total}`));
    lines.push('');
    lines.push('Statut,Adhérents');
    stats.statusBreakdown.forEach((s) => lines.push(`${esc(STATUS_LABELS[s.status] || s.status)},${s.count}`));
    lines.push('');
    lines.push('Compétence,Adhérents');
    stats.topSkills.forEach((s) => lines.push(`${esc(s.skill)},${s.count}`));

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `joboost-stats-${stats.range.from.slice(0, 10)}_${stats.range.to.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé !');
  };

  const handleExportPDF = () => {
    setShowMobileActions(false);
    window.print();
    toast.success('Impression lancée !');
  };

  // --- Personnalisation des widgets ---
  const toggleWidget = (id: WidgetId) => {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  };
  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    setLayout((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };
  const resetLayout = () => setLayout(DEFAULT_LAYOUT);

  const isVisible = (id: WidgetId) => layout.find((w) => w.id === id)?.visible ?? true;

  const hasActiveFilters = !!statusFilter || !!skillFilter;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#7D5CFF]" size={32} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card-pro text-center py-20 px-4">
        <BarChart3 className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
        <p className="text-slate-500 text-sm">Impossible de charger les statistiques.</p>
        <button onClick={() => fetchStats()} className="press btn btn-primary mt-5">
          <RefreshCw size={16} /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="print:bg-white relative">
      {/* Barre d'outils (le titre est porté par le hero du layout) */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs md:text-sm text-slate-500">
          Vue d'ensemble de vos adhérents
          {refreshing && <Loader2 className="inline ml-2 animate-spin text-[#7D5CFF]" size={12} />}
        </p>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`btn btn-secondary min-h-[44px] ${hasActiveFilters ? 'ring-2 ring-[#7D5CFF]/40' : ''}`}
          >
            <Filter size={16} /> Filtres{hasActiveFilters ? ' (actifs)' : ''}
          </button>
          <ActionMenu
            label="Actions"
            items={[
              { label: 'Personnaliser l’affichage', icon: <SlidersHorizontal size={16} />, onClick: () => setShowCustomize(true) },
              { label: 'Exporter en CSV', icon: <FileSpreadsheet size={16} />, onClick: handleExportCSV },
              { label: 'Exporter en PDF', icon: <Download size={16} />, onClick: handleExportPDF },
            ]}
          />
        </div>

        {/* Mobile actions toggle */}
        <button
          onClick={() => setShowMobileActions(true)}
          className="md:hidden p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center print:hidden"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Sélecteur de période — segmented control de l'app (conteneur + pilule
          active), et non des boutons isolés : même langage que le dock et les onglets. */}
      <div className="inline-flex gap-1 p-1 mb-3 rounded-xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-xs max-w-full overflow-x-auto scrollbar-none print:hidden">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            aria-pressed={period === opt.value}
            className={`press shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all min-h-[38px] outline-none ${
              period === opt.value
                ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_4px_14px_-3px_rgba(124,92,255,0.6)]'
                : 'text-slate-500 dark:text-slate-400 hover:text-[#7D5CFF] hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sélecteurs de dates personnalisées */}
      {period === 'custom' && (
        <div className="flex items-center gap-2 mb-3 flex-wrap print:hidden">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px]"
          />
          <span className="text-slate-400 text-xs">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[38px]"
          />
          {(!customFrom || !customTo) && (
            <span className="text-[11px] text-amber-500 font-medium">Choisissez une date de début et de fin</span>
          )}
        </div>
      )}

      {/* Panneau de filtres */}
      {showFilters && (
        <div className="card-pro mb-4 flex flex-col md:flex-row md:items-end gap-3 print:hidden">
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Statut d'adhérent</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[44px]"
            >
              {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Compétence</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 min-h-[44px]"
            >
              <option value="">Toutes les compétences</option>
              {stats.topSkills.map((s) => <option key={s.skill} value={s.skill}>{s.skill}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setStatusFilter(''); setSkillFilter(''); }}
              className="btn btn-secondary min-h-[44px]"
            >
              <X size={16} /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Mobile Actions Bottom Sheet */}
      {showMobileActions && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileActions(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full rounded-t-2xl shadow-2xl p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Actions</h3>
            <button onClick={() => { setShowFilters((s) => !s); setShowMobileActions(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]">
              <Filter size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Filtres</span>
            </button>
            <button onClick={() => { setShowCustomize(true); setShowMobileActions(false); }} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]">
              <SlidersHorizontal size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Personnaliser le tableau</span>
            </button>
            <button onClick={handleExportCSV} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]">
              <FileSpreadsheet size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Exporter en CSV</span>
            </button>
            <button onClick={handleExportPDF} className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]">
              <Download size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Exporter en PDF</span>
            </button>
            <button onClick={() => setShowMobileActions(false)} className="w-full mt-2 p-4 text-center font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl min-h-[44px]">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ====== Widgets (ordre et visibilité personnalisables) ====== */}
      {layout.map((w) => {
        if (!w.visible) return null;

        if (w.id === 'kpis') {
          return (
            <div key="kpis" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <KPICard icon={<Users size={18} />} label="Adhérents actifs" value={stats.kpis.totalActive} tone="violet" />
              <KPICard icon={<UserPlus size={18} />} label="Nouveaux (période)" value={stats.kpis.newInPeriod} delta={stats.kpis.newInPeriodDelta} tone="emerald" />
              <KPICard icon={<Target size={18} />} label="Complétion profil" value={`${stats.kpis.avgProfileCompletion}%`} tone="blue" />
              <KPICard icon={<Briefcase size={18} />} label="Candidatures (période)" value={stats.kpis.applicationCount} delta={stats.kpis.applicationCountDelta} tone="amber" />
            </div>
          );
        }

        if (w.id === 'growth') {
          return (
            <div key="growth" className="card-pro mb-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[#7D5CFF]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Évolution des affiliations</h3>
                <span className="text-[10px] text-slate-400 font-medium ml-auto uppercase">{stats.range.granularity === 'day' ? 'par jour' : 'par mois'}</span>
              </div>
              <div className="h-[220px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#94A3B8', strokeOpacity: 0.3 }} tickLine={false} dy={10} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [value, 'Nouvelles affiliations']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line type="monotone" dataKey="total" stroke="#7D5CFF" strokeWidth={3} dot={chartData.length <= 31 ? { r: 3, fill: '#7D5CFF', strokeWidth: 2, stroke: '#fff' } : false} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        }

        if (w.id === 'status') {
          return (
            <div key="status" className="card-pro mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-[#7D5CFF]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Répartition par statut</h3>
                <span className="text-[10px] text-slate-400 ml-auto hidden md:inline">Cliquez une part pour voir les adhérents</span>
              </div>
              {donutData.length > 0 ? (
                /* Le donut vit dans un carré de taille FIXE : le calque du total se
                   cale donc exactement dessus. Avec la légende Recharts (align=right),
                   la zone du graphe était rognée et le donut glissait vers la gauche,
                   pendant que le calque restait centré sur la carte — d'où le
                   décalage. La légende est désormais du HTML : alignement maîtrisé,
                   et chaque ligne devient cliquable avec son compte et sa part. */
                <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
                  <div className="relative w-[190px] h-[190px] shrink-0 mx-auto md:mx-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData} cx="50%" cy="50%"
                          innerRadius={64} outerRadius={90}
                          paddingAngle={donutData.length > 1 ? 2 : 0}
                          dataKey="value" stroke="none"
                          onClick={(d: any) => d && setDrill({ type: 'status', value: d.status, label: d.name })}
                          className="cursor-pointer"
                        >
                          {donutData.map((d) => <Cell key={d.status} fill={d.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#F9FAFB', fontSize: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[1.75rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-none tabular-nums">
                        {donutTotal}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">
                        Adhérent{donutTotal > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 min-w-0 w-full space-y-1">
                    {donutData.map((d) => {
                      const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0;
                      return (
                        <li key={d.status}>
                          <button
                            onClick={() => setDrill({ type: 'status', value: d.status, label: d.name })}
                            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors group/leg"
                          >
                            <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-600 dark:text-slate-300">{d.name}</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{d.value}</span>
                            <span className="w-10 text-right text-xs text-slate-400 tabular-nums">{pct} %</span>
                            <ChevronRight size={14} className="text-slate-300 group-hover/leg:text-[#7D5CFF] transition-colors shrink-0" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-sm text-slate-400">Aucune donnée</div>
              )}
            </div>
          );
        }

        if (w.id === 'offers') {
          return (
            <div key="offers" className="card-pro mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={16} className="text-[#7D5CFF]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Offres d'emploi</h3>
              </div>
              {/* Même échelle typographique que les KPI du haut : les chiffres
                  géants centrés juraient avec le reste de la page. */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="p-4 rounded-xl bg-[#7D5CFF]/5 dark:bg-[#7D5CFF]/10 border border-[#7D5CFF]/10">
                  <p className="text-[1.75rem] font-extrabold tracking-tight leading-none text-[#7D5CFF] dark:text-[#B9A7FF] tabular-nums">{stats.totalOffers}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-2">Total des offres</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-500/10">
                  <p className="text-[1.75rem] font-extrabold tracking-tight leading-none text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.publishedOffers}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-2">Publiées</p>
                </div>
              </div>
            </div>
          );
        }

        if (w.id === 'skills') {
          return (
            <div key="skills" className="card-pro mb-6">
              <div className="flex items-center gap-2 mb-4 md:mb-6">
                <Award size={16} className="text-[#7D5CFF]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top compétences</h3>
                <span className="text-[10px] text-slate-400 ml-auto hidden md:inline">Cliquez pour voir les candidats</span>
              </div>
              {stats.topSkills.length > 0 ? (
                <div className="space-y-3.5">
                  {stats.topSkills.map((s, i) => {
                    const maxCount = stats.topSkills[0].count;
                    const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
                    return (
                      <button
                        key={s.skill}
                        onClick={() => setDrill({ type: 'skill', value: s.skill, label: s.skill })}
                        className="w-full flex flex-col gap-1.5 text-left group/skill hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg p-1.5 -m-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="text-xs font-bold text-slate-400 w-4">{i + 1}.</span>
                            {s.skill}
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            {s.count} adh.
                            <ChevronRight size={14} className="text-slate-300 group-hover/skill:text-[#7D5CFF] transition-colors" />
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#7D5CFF] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Aucune compétence enregistrée</p>
              )}
            </div>
          );
        }
        return null;
      })}

      {/* ====== Modale de personnalisation ====== */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCustomize(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full max-w-md rounded-2xl shadow-2xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Personnaliser le tableau</h3>
              <button onClick={() => setShowCustomize(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Affichez, masquez et réordonnez les blocs. Vos préférences sont mémorisées sur cet appareil.</p>
            <div className="space-y-2">
              {layout.map((w, i) => (
                <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <button onClick={() => toggleWidget(w.id)} className={`p-1.5 rounded-lg ${w.visible ? 'text-[#7D5CFF]' : 'text-slate-300 dark:text-slate-600'}`}>
                    {w.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <span className={`flex-1 text-sm font-medium ${w.visible ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 line-through'}`}>{WIDGET_LABELS[w.id]}</span>
                  <button disabled={i === 0} onClick={() => moveWidget(w.id, -1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button disabled={i === layout.length - 1} onClick={() => moveWidget(w.id, 1)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={16} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-5">
              <button onClick={resetLayout} className="text-xs font-bold text-slate-400 hover:text-slate-600">Réinitialiser</button>
              <button onClick={() => setShowCustomize(false)} className="btn btn-primary">Terminé</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Drill-down ====== */}
      {drill && <DrillDownModal drill={drill} onClose={() => setDrill(null)} />}
    </div>
  );
};

// --- KPI Card avec delta (style corporate coloré : liseré + pastille par indicateur) ---
type KpiTone = 'violet' | 'emerald' | 'blue' | 'amber';
const KPI_TONES: Record<KpiTone, { border: string; chip: string; ring: string }> = {
  violet:  { border: 'border-l-[#7D5CFF]',  chip: 'bg-[#7D5CFF]/15 text-[#7D5CFF] dark:text-[#B9A7FF]', ring: 'dark:bg-[#7D5CFF]/[0.06]' },
  emerald: { border: 'border-l-emerald-500', chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', ring: 'dark:bg-emerald-500/[0.06]' },
  blue:    { border: 'border-l-blue-500',    chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', ring: 'dark:bg-blue-500/[0.06]' },
  amber:   { border: 'border-l-amber-500',   chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', ring: 'dark:bg-amber-500/[0.06]' },
};

const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; tone: KpiTone; delta?: number | null }> = ({ icon, label, value, tone, delta }) => {
  const t = KPI_TONES[tone];
  return (
    <div className={`bg-white dark:bg-[#111827] ${t.ring} border border-slate-200 dark:border-slate-800 border-l-[3px] ${t.border} rounded-lg p-4 md:p-5 hover:shadow-sm dark:hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.chip}`}>
          {icon}
        </div>
        {delta !== undefined && delta !== null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="font-extrabold text-slate-900 dark:text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.3rem)' }}>{value}</p>
      <p className="text-[11px] md:text-xs font-semibold text-slate-500 mt-2 uppercase tracking-wider">{label}</p>
      {delta !== undefined && delta !== null && (
        <p className="text-[10px] text-slate-400 mt-0.5">vs période précédente</p>
      )}
    </div>
  );
};

// --- Modale de drill-down : liste des candidats derrière un chiffre ---
const DrillDownModal: React.FC<{ drill: { type: 'skill' | 'status'; value: string; label: string }; onClose: () => void }> = ({ drill, onClose }) => {
  const [list, setList] = useState<BusinessJobseeker[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params = drill.type === 'skill'
          ? { search: drill.value, limit: 50 }
          : { status: drill.value, limit: 50 };
        const data = await businessJobseekerApi.list(params);
        setList(data.jobseekers);
        setTotal(data.pagination.total);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [drill]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#111827] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">
              {drill.type === 'skill' ? 'Candidats avec' : 'Adhérents'} <span className="text-[#7D5CFF]">{drill.type === 'skill' ? drill.value : (STATUS_LABELS[drill.value] || drill.value)}</span>
            </h3>
            {!loading && <p className="text-xs text-slate-500 mt-0.5">{total} adhérent{total > 1 ? 's' : ''}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-[#7D5CFF]" size={24} /></div>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Aucun adhérent correspondant.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((j) => (
                <li key={j.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-[#EFEBFF] dark:bg-[#7D5CFF]/15 text-[#5B3FD6] dark:text-[#B9A7FF] flex items-center justify-center text-xs font-bold shrink-0">
                    {(j.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{j.name || 'Sans nom'}</p>
                    <p className="text-xs text-slate-500 truncate">{j.title || j.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessStatsPage;
