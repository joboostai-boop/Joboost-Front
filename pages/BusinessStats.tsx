import React, { useState, useEffect } from 'react';
import { BusinessStats } from '../types';
import { businessStatsApi } from '../services/business';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Target, Briefcase, TrendingUp,
  Download, Loader2, BarChart3, Award, MoreVertical
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

const BusinessStatsPage: React.FC = () => {
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showMobileActions, setShowMobileActions] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await businessStatsApi.getStats();
        setStats(data);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleExportPDF = () => {
    setShowMobileActions(false);
    window.print();
    toast.success('Impression lancée !');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#7D5CFF]" size={32} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card-pro text-center py-20">
        <BarChart3 className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
        <p className="text-slate-500 text-sm">Impossible de charger les statistiques.</p>
      </div>
    );
  }

  const chartData = stats.monthlyGrowth.map((m) => ({
    ...m,
    label: MONTH_LABELS[m.month.split('-')[1]] || m.month,
    fullLabel: m.month, // YYYY-MM
  }));

  const donutData = stats.statusBreakdown.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
  }));

  return (
    <div className="print:bg-white relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Statistiques</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Vue d'ensemble de vos adhérents</p>
        </div>
        
        {/* Desktop Export */}
        <button onClick={handleExportPDF} className="hidden md:flex btn btn-secondary min-h-[44px] print:hidden">
          <Download size={16} /> Export PDF
        </button>

        {/* Mobile Actions Toggle */}
        <button 
          onClick={() => setShowMobileActions(true)}
          className="md:hidden p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center print:hidden"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Mobile Actions Bottom Sheet */}
      {showMobileActions && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileActions(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full rounded-t-2xl shadow-2xl p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Actions</h3>
            <button 
              onClick={handleExportPDF} 
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-left min-h-[44px]"
            >
              <Download size={20} className="text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-white">Exporter en PDF</span>
            </button>
            <button 
              onClick={() => setShowMobileActions(false)}
              className="w-full mt-4 p-4 text-center font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl min-h-[44px]"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <KPICard
          icon={<Users size={20} />}
          label="Adhérents actifs"
          value={stats.totalActive}
          color="from-[#7D5CFF] to-[#6023C0]"
        />
        <KPICard
          icon={<UserPlus size={20} />}
          label="Nouveaux ce mois"
          value={stats.newThisMonth}
          color="from-emerald-500 to-emerald-600"
        />
        <KPICard
          icon={<Target size={20} />}
          label="Complétion profil"
          value={`${stats.avgProfileCompletion}%`}
          color="from-blue-500 to-blue-600"
        />
        <KPICard
          icon={<Briefcase size={20} />}
          label="Candidatures (30j)"
          value={stats.applicationCount}
          color="from-amber-500 to-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Line Chart — 2/3 width */}
        <div className="lg:col-span-2 card-pro">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-[#7D5CFF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Évolution des affiliations (6 mois)</h3>
          </div>
          <div className="h-[220px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey={isMobile ? "label" : "fullLabel"}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                  formatter={(value: number) => [value, 'Nouvelles affiliations']}
                  labelFormatter={(label) => `Mois : ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#7D5CFF"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#7D5CFF', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart — 1/3 width */}
        <div className="card-pro">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#7D5CFF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Répartition par statut</h3>
          </div>
          <div className="h-[220px] md:h-[300px] relative">
            {/* Total Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6 md:pb-0">
              <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">{stats.totalActive}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 mt-1">Total</span>
            </div>
            
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy={isMobile ? "45%" : "50%"}
                    innerRadius={isMobile ? 55 : 70}
                    outerRadius={isMobile ? 75 : 95}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign={isMobile ? "bottom" : "middle"}
                    align={isMobile ? "center" : "right"}
                    layout={isMobile ? "horizontal" : "vertical"}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={isMobile ? { paddingTop: '20px' } : { paddingLeft: '20px' }}
                    formatter={(value: string) => (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-1">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F9FAFB',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Aucune donnée</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Offers Stats + Top Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Offers summary */}
        <div className="card-pro">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-[#7D5CFF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Offres d'emploi</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-center">
              <p className="font-black text-slate-900 dark:text-white" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                {stats.totalOffers}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mt-2">Total des offres</p>
            </div>
            <div className="p-4 md:p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl text-center">
              <p className="font-black text-emerald-600 dark:text-emerald-400" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
                {stats.publishedOffers}
              </p>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500 mt-2">Publiées</p>
            </div>
          </div>
        </div>

        {/* Top Skills */}
        <div className="card-pro">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Award size={16} className="text-[#7D5CFF]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Top compétences</h3>
          </div>
          
          {stats.topSkills.length > 0 ? (
            <>
              {/* Mobile View: Progress bars */}
              <div className="md:hidden space-y-3.5">
                {stats.topSkills.map((s, i) => {
                  const maxCount = stats.topSkills[0].count;
                  const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
                  return (
                    <div key={s.skill} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span className="text-xs font-bold text-slate-400 w-3">{i + 1}.</span>
                          {s.skill}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{s.count} adh.</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#7D5CFF] to-[#4F46E5] rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs font-semibold text-slate-500 uppercase">
                      <th className="pb-3 w-10 text-center">#</th>
                      <th className="pb-3">Compétence</th>
                      <th className="pb-3 text-right">Adhérents</th>
                      <th className="pb-3 text-right w-24">Proportion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.topSkills.map((s, i) => {
                      const maxCount = stats.topSkills[0].count;
                      const pct = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0;
                      return (
                        <tr key={s.skill}>
                          <td className="py-3 text-center text-slate-400 font-mono text-xs">{i + 1}</td>
                          <td className="py-3 font-medium text-slate-700 dark:text-slate-300">{s.skill}</td>
                          <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{s.count}</td>
                          <td className="py-3 text-right text-xs text-slate-500">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Aucune compétence enregistrée</p>
          )}
        </div>
      </div>
    </div>
  );
};

// KPI Card sub-component
const KPICard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string }> = ({ icon, label, value, color }) => (
  <div className="card-pro relative overflow-hidden group hover:shadow-md transition-shadow p-4 md:p-5">
    <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} opacity-10 rounded-bl-[2rem] group-hover:opacity-20 transition-opacity`} />
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 md:mb-4 shadow-sm`}>
      {icon}
    </div>
    <p className="font-black text-slate-900 dark:text-white leading-none tracking-tight" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)' }}>
      {value}
    </p>
    <p className="text-[11px] md:text-xs font-semibold text-slate-500 mt-1.5 uppercase tracking-wider">{label}</p>
  </div>
);

export default BusinessStatsPage;
