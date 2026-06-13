import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Download, FileJson, 
  Layers, Target, Cpu, Gauge, Zap, FileSpreadsheet, PlusCircle, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authHeaders } from '../services/authToken';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-sm font-extrabold text-[#7D5CFF]">
          {payload[0].value} <span className="text-slate-500 font-medium">actions</span>
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/stats`, { credentials: 'include', headers: { ...authHeaders() } });
        const data = await res.json();
        if (data.success) {
           setStatsData(data.stats);
        }
      } catch (err) {
        toast.error("Impossible de charger les statistiques.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleExport = (format: 'json' | 'csv') => {
    if (!statsData) return;
    
    const data = {
      summary: statsData,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob(
      [format === 'json' ? JSON.stringify(data, null, 2) : `Metric,Value\nProfile Completion,${statsData.profileCompletion}\nCVs,${statsData.cvCount}\nLetters,${statsData.letterCount}\nSaved Offers,${statsData.savedCount}`],
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

  if (loading) {
     return (
        <div className="h-screen flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7D5CFF] rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Chargement de votre cockpit...</p>
        </div>
     );
  }

  if (!statsData) return null;

  const totalDocs = statsData.cvCount + statsData.letterCount;
  const totalOffers = statsData.recommendedCount + statsData.savedCount;

  const stats = [
    { 
      label: 'Candidatures Total', 
      value: statsData.applications?.total || '0', 
      icon: <Layers size={22} strokeWidth={2.5} />,
      color: 'text-[#7D5CFF]',
      bg: 'bg-[#F3F0FF] dark:bg-[#7D5CFF]/10',
      border: 'border-[#7D5CFF]/15 dark:border-[#7D5CFF]/20'
    },
    { 
      label: 'Offres Liées (Reco + Sauvé)', 
      value: totalOffers.toString(), 
      icon: <Target size={22} strokeWidth={2.5} />, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-100 dark:border-blue-500/20'
    },
    { 
      label: 'Documents (CV + Lettres)', 
      value: totalDocs.toString(), 
      icon: <Cpu size={22} strokeWidth={2.5} />, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-100 dark:border-emerald-500/20'
    },
    { 
      label: 'Complétion Profil', 
      value: `${statsData.profileCompletion}%`, 
      icon: <Gauge size={22} strokeWidth={2.5} />, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-100 dark:border-amber-500/20'
    },
  ];

  const appStatusData = [
    { name: 'En Attente', value: statsData.applications?.pending || 0 },
    { name: 'Envoyées', value: statsData.applications?.sent || 0 },
    { name: 'Entretiens', value: statsData.applications?.interview || 0 },
    { name: 'Offres', value: statsData.applications?.offer || 0 },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1>Tableau de Bord</h1>
          <p>Moteur alimenté par vos véritables données de navigation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
            statsData.profileCompletion === 100
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statsData.profileCompletion === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-[11px] font-medium">
               {statsData.profileCompletion === 100 ? 'Profil complet' : 'Profil à compléter'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="press btn btn-secondary px-3 py-2"
              title="Exporter JSON"
            >
              <FileJson size={16} />
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="press flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7D5CFF] to-[#9B7BFF] text-white rounded-xl text-[10px] font-bold hover:shadow-[#7D5CFF]/30 transition-all shadow-lg shadow-[#7D5CFF]/20 dark:shadow-none"
            >
              <Download size={14} /> <span>Rapport (CSV)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Statistiques d'Activité */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{ animationDelay: `${i * 60}ms` }}
            className="card-pro p-4 md:p-6 flex flex-col justify-between group overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-all animate-fade-in-up"
          >
            <div className="flex justify-between items-start mb-3 md:mb-6">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center border ${stat.border} ${stat.bg} ${stat.color} transition-colors`}>
                {React.cloneElement(stat.icon as React.ReactElement, { size: 18 })}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-2xl md:text-3xl font-bold text-[#111827] dark:text-white leading-none tracking-tight">{stat.value}</p>
              <p className="text-[9px] md:text-[10px] font-semibold text-[#6B7280] uppercase tracking-[0.15em] mt-2 md:mt-3">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-pro p-5 md:p-8">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h3>Répartition de vos candidatures</h3>
                <div className="flex items-center gap-2 text-[10px] md:text-xs font-semibold text-emerald-600 mt-1">
                  <TrendingUp size={14} /> Sur {statsData.applications?.total || 0} trackées
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appStatusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7D5CFF" stopOpacity={1} />
                      <stop offset="100%" stopColor="#B9A3FF" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={isDark ? "#1F2937" : "#F1F5F9"} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    allowDecimals={false}
                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} 
                  />
                  <Tooltip 
                    content={<CustomTooltip />} 
                    cursor={{ fill: isDark ? '#1F2937' : '#F8FAFC', radius: 8 }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]} 
                    barSize={32}
                    fill="url(#barGradient)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => navigate('/prepare/cv')} className="press p-6 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-md flex flex-col items-center justify-center gap-3 hover:border-[#7D5CFF]/40 hover:shadow-md transition-all group outline-none">
                <div className="w-12 h-12 bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 rounded flex items-center justify-center text-[#7D5CFF] group-hover:scale-110 transition-transform">
                   <PlusCircle size={24} />
                </div>
                <span className="font-semibold text-[#111827] dark:text-white">Générer un CV</span>
             </button>
             <button onClick={() => navigate('/prepare/letter')} className="press p-6 bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1F2937] rounded-md flex flex-col items-center justify-center gap-3 hover:border-emerald-300 hover:shadow-md transition-all group outline-none">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded flex items-center justify-center">
                   <PlusCircle size={24} />
                </div>
                <span className="font-semibold text-[#111827] dark:text-white">Générer une Lettre</span>
             </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-pro p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-lg surface-accent text-[#7D5CFF] flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">Complétez votre profil</h3>
                <p className="text-xs text-[#6B7280]">Un profil complet améliore le ciblage de l'IA.</p>
              </div>
            </div>
            <div className="space-y-1.5 mb-5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-[#6B7280]">Progression</span>
                <span className="text-[#7D5CFF] tabular-nums">{statsData.profileCompletion}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-[#7D5CFF] rounded-full transition-[width] duration-500" style={{ width: `${statsData.profileCompletion}%` }} />
              </div>
            </div>
            <button onClick={() => navigate('/prepare/profile')} className="press btn btn-primary w-full">
              Compléter mon profil
            </button>
          </div>

          <div className="card-pro p-6 space-y-6">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-white">Activité récente</h3>
            <div className="space-y-4">
              {[
                 { label: 'Offres Sauvegardées en attente', val: statsData.savedCount, color: 'bg-[#7D5CFF]' },
                 { label: 'CV originaux', val: statsData.cvCount, color: 'bg-emerald-500' },
                 { label: 'Lettres rédigées', val: statsData.letterCount, color: 'bg-amber-400' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-2 h-2 ${item.color} rounded-sm`} />
                  <p className="text-sm text-[#111827] dark:text-white"><strong>{item.val}</strong> {item.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
               <button onClick={() => navigate('/target/offers')} className="press btn btn-secondary w-full text-xs py-2 bg-white flex justify-center">
                 Voir Offres
               </button>
               <button onClick={() => navigate('/track/applications')} className="press btn btn-secondary w-full text-xs py-2 bg-white flex justify-center">
                 Suivi
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
