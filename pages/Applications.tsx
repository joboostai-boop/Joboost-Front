import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, Calendar, MapPin, Search, PlusCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Application {
  id: string;
  company: string;
  title: string;
  source: string;
  status: 'PENDING' | 'SENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  appliedAt: string;
  notes: string | null;
}

const KANBAN_COLUMNS = [
  { id: 'PENDING', label: 'À préparer', color: 'border-slate-200 dark:border-slate-800', bg: 'bg-slate-50 dark:bg-slate-900/40', text: 'text-slate-600 dark:text-slate-400' },
  { id: 'SENT', label: 'Envoyées', color: 'border-blue-200 dark:border-blue-900/50', bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-400' },
  { id: 'INTERVIEW', label: 'Entretiens', color: 'border-amber-200 dark:border-amber-900/50', bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'OFFER', label: 'Offres', color: 'border-emerald-200 dark:border-emerald-900/50', bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'REJECTED', label: 'Refus', color: 'border-red-200 dark:border-red-900/50', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-500 dark:text-red-400' }
];

const Applications: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications?limit=100'); // Fetch max for Kanban board MVP
      const data = await res.json();
      if (data.success) {
        setApplications(data.data);
      } else {
        toast.error("Impossible de charger les candidatures.");
      }
    } catch (error) {
      toast.error("Erreur serveur de synchronisation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    // Optimistic Update
    setApplications(apps => apps.map(app => app.id === id ? { ...app, status: newStatus as any } : app));
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
         toast.error("Erreur lors du changement de statut");
         fetchApplications(); // Revert
      } else {
         toast.success("Statut mis à jour !");
      }
    } catch {
      toast.error("Hors ligne.");
      fetchApplications();
    }
  };

  const filteredApps = applications.filter(app => 
    app.company.toLowerCase().includes(search.toLowerCase()) || 
    app.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto h-[calc(100vh-80px)] flex flex-col">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E5E7EB] dark:border-[#1F2937] pb-6 shrink-0">
        <div>
          <h1 className="flex items-center gap-3">
            <Briefcase className="text-[#7D5CFF]" />
            Suivi des Candidatures
          </h1>
          <p>Gérez votre pipeline de recrutement en temps réel.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:w-64 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
             <input 
               type="text" 
               placeholder="Filtrer entreprise, poste..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="input-pro pl-9 w-full"
             />
          </div>
          <button 
             onClick={fetchApplications}
             className="btn btn-secondary px-3"
             title="Synchroniser"
          >
             <RefreshCw size={18} className={loading ? "animate-spin text-[#7D5CFF]" : ""} />
          </button>
        </div>
      </header>

      {/* Vue Kanban / Boards */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pt-8 pb-4">
         <div className="flex gap-6 h-full items-start min-w-max pb-8 snap-x">
            {KANBAN_COLUMNS.map(column => {
              const columnApps = filteredApps.filter(app => app.status === column.id);
              
              return (
                <div key={column.id} className="w-80 flex flex-col max-h-full snap-start">
                   {/* Column Header */}
                   <div className={`mb-4 px-4 py-3 rounded-xl border ${column.color} ${column.bg} flex items-center justify-between`}>
                     <h3 className={`font-bold text-sm tracking-wide ${column.text}`}>{column.label}</h3>
                     <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20 ${column.text}`}>
                       {columnApps.length}
                     </span>
                   </div>

                   {/* Cards Container */}
                   <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                      {columnApps.map(app => (
                        <div key={app.id} className="card-pro p-4 cursor-default group relative overflow-visible">
                           <div className="flex justify-between items-start mb-3">
                              <h4 className="font-semibold text-[#111827] dark:text-white text-sm leading-tight pr-4">{app.title}</h4>
                           </div>
                           <div className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-4">
                              <Building2 size={14} />
                              <span className="truncate">{app.company}</span>
                           </div>

                           {app.notes && (
                              <div className="mb-4 p-2 bg-[#F3F4F6] dark:bg-[#1F2937] rounded-md text-xs text-[#6B7280] dark:text-[#9CA3AF] border border-[#E5E7EB] dark:border-[#374151]">
                                <p className="line-clamp-2 italic">{app.notes}</p>
                              </div>
                           )}

                           <div className="flex flex-col gap-3 pt-3 border-t border-[#E5E7EB] dark:border-[#1F2937] mt-auto">
                              <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] font-semibold uppercase tracking-widest">
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(app.appliedAt).toLocaleDateString()}</span>
                                <span className="truncate max-w-[90px]">{app.source}</span>
                              </div>

                              <select 
                                value={app.status}
                                onChange={(e) => handleUpdateStatus(app.id, e.target.value)}
                                className={`w-full text-xs font-semibold p-2 bg-[#F3F4F6] dark:bg-[#1F2937] border border-[#E5E7EB] dark:border-[#374151] rounded outline-none cursor-pointer focus:ring-1 focus:ring-[#7D5CFF] transition-colors ${column.text}`}
                              >
                                {KANBAN_COLUMNS.map(opt => (
                                  <option key={opt.id} value={opt.id} className="text-[#111827] dark:text-gray-200 bg-white dark:bg-[#111827]">{opt.label}</option>
                                ))}
                              </select>
                           </div>
                        </div>
                      ))}

                      {columnApps.length === 0 && !loading && (
                        <div className="h-32 border-2 border-dashed border-[#E5E7EB] dark:border-[#1F2937] rounded-md flex flex-col items-center justify-center text-[#9CA3AF] gap-2 p-2">
                           <AlertCircle size={20} />
                           <span className="text-xs font-medium">Vide</span>
                        </div>
                      )}
                   </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default Applications;
