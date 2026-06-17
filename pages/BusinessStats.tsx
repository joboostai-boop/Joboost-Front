import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BusinessStats, StatsQuery, StatsPeriod, BusinessJobseeker } from '../types';
import { businessStatsApi, businessJobseekerApi } from '../services/business';
import ActionMenu from '../components/ActionMenu';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Target, Briefcase, TrendingUp, TrendingDown,
  Download, Loader2, BarChart3, Award, MoreVertical, SlidersHorizontal,
  X, FileSpreadsheet, ArrowUp, ArrowDown, Eye, EyeOff, Filter, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const DONUT_COLORS = ['#10B981', '#6B7280', '#EF4444', '#F59E0B', '#8B5CF6'];
const STATUS_LABELS: Record<string, string> = {
  active: 'Actifs',
  inactive: 'Inactifs',
  suspended: 'Suspendus',
};

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    }));
  }, [stats]);

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

      {/* Sélecteur de période (segmented control) */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 print:hidden">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-colors min-h-[38px] ${
              period === opt.value
                ? 'bg-[#7D5CFF] text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
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
              <KPICard icon={<Users size={20} />} label="Adhérents actifs" value={stats.kpis.totalActive} color="from-[#7D5CFF] to-[#6023C0]" />
              <KPICard icon={<UserPlus size={20} />} label="Nouveaux (période)" value={stats.kpis.newInPeriod} delta={stats.kpis.newInPeriodDelta} color="from-emerald-500 to-emerald-600" />
              <KPICard icon={<Target size={20} />} label="Complétion profil" value={`${stats.kpis.avgProfileCompletion}%`} color="from-blue-500 to-blue-600" />
              <KPICard icon={<Briefcase size={20} />} label="Candidatures (période)" value={stats.kpis.applicationCount} delta={stats.kpis.applicationCountDelta} color="from-amber-500 to-amber-600" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} dy={10} interval="preserveStartEnd" minTickGap={20} />
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
              <div className="h-[240px] md:h-[300px] relative">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6 md:pb-0">
                  <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.kpis.totalActive}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Actifs</span>
                </div>
                {donutData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData} cx="50%" cy={isMobile ? '45%' : '50%'}
                        innerRadius={isMobile ? 55 : 70} outerRadius={isMobile ? 75 : 95}
                        paddingAngle={2} dataKey="value" stroke="none"
                        onClick={(d: any) => d && setDrill({ type: 'status', value: d.status, label: d.name })}
                        className="cursor-pointer"
                      >
                        {donutData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        verticalAlign={isMobile ? 'bottom' : 'middle'} align={isMobile ? 'center' : 'right'}
                        layout={isMobile ? 'horizontal' : 'vertical'} iconType="circle" iconSize={8}
                        wrapperStyle={isMobile ? { paddingTop: '20px' } : { paddingLeft: '20px' }}
                        formatter={(value: string) => <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-1">{value}</span>}
                      />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#F9FAFB', fontSize: '12px' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400">Aucune donnée</div>
                )}
              </div>
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
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
                  <p className="font-black text-slate-900 dark:text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{stats.totalOffers}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mt-2">Total des offres</p>
                </div>
                <div className="p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl text-center">
                  <p className="font-black text-emerald-600 dark:text-emerald-400" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{stats.publishedOffers}</p>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500 mt-2">Publiées</p>
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
                          <div className="h-full bg-gradient-to-r from-[#7D5CFF] to-[#4F46E5] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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

// --- KPI Card avec delta ---
const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string; delta?: number | null }> = ({ icon, label, value, color, delta }) => (
  <div className="card-pro relative overflow-hidden group hover:shadow-md transition-shadow p-4 md:p-5">
    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} opacity-10 rounded-bl-[2rem] group-hover:opacity-20 transition-opacity`} />
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 md:mb-4 shadow-sm`}>
      {icon}
    </div>
    <div className="flex items-end gap-2">
      <p className="font-black text-slate-900 dark:text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>{value}</p>
      {delta !== undefined && delta !== null && (
        <span className={`flex items-center gap-0.5 text-[11px] font-bold mb-0.5 ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(delta)}%
        </span>
      )}
    </div>
    <p className="text-[11px] md:text-xs font-semibold text-slate-500 mt-1.5 uppercase tracking-wider">{label}</p>
    {delta !== undefined && delta !== null && (
      <p className="text-[10px] text-slate-400 mt-0.5">vs période précédente</p>
    )}
  </div>
);

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
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#7D5CFF] to-[#6023C0] flex items-center justify-center text-white text-xs font-bold shrink-0">
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
