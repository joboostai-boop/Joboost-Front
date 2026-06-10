
import React from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Mail, 
  Phone, 
  Globe, 
  CheckCircle2,
  Lock,
  CreditCard,
  Moon,
  Sun,
  Palette,
  Target,
  Database,
  Link,
  Trash2,
  Download,
  AlertCircle
} from 'lucide-react';
import { User as UserType } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import toast from 'react-hot-toast';

interface SettingsProps { 
  user: UserType;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleDarkMode }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/'); // retour à la landing page publique
  };

  // RGPD — Export des données personnelles (art. 15 & 20)
  const handleExportData = async () => {
    const toastId = toast.loading('Préparation de votre export...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me/export`, {
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error('Export impossible');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'joboost-mes-donnees.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Vos données ont été exportées.', { id: toastId });
    } catch (err) {
      toast.error("Erreur lors de l'export des données.", { id: toastId });
    }
  };

  // RGPD — Suppression définitive du compte (art. 17)
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Cette action supprime DÉFINITIVEMENT votre compte et toutes vos données (CV, lettres, candidatures). Cette opération est irréversible. Confirmer ?"
    );
    if (!confirmed) return;
    const toastId = toast.loading('Suppression de votre compte...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Suppression impossible');
      toast.success('Compte supprimé. À bientôt.', { id: toastId });
      await logout();
      navigate('/'); // retour à la landing page publique
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.', { id: toastId });
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-12 pb-24">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <SettingsIcon size={28} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Paramètres</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium italic">Gérez les protocoles et les préférences de votre unité JoBoost.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10 animate-in slide-in-from-left duration-500">
          
          {/* Section Interface */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 italic">Interface & Expérience</h3>
            <div className="card-modern overflow-hidden">
              <div className="flex items-center justify-between p-6 group">
                <div className="flex items-center gap-5">
                  <div className="text-slate-400 group-hover:text-indigo-600 transition-colors bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Vecteur Visuel</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Mode Sombre</p>
                  </div>
                </div>
                <button 
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    isDarkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Section Préférences de Recherche */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 italic">Préférences de Recherche</h3>
            <div className="card-modern p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Périmètre Géographique</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Globe size={16} className="text-indigo-600" />
                  <span className="text-sm font-bold">Paris, Lyon + Full Remote</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prétention Salariale (Min)</label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <Target size={16} className="text-indigo-600" />
                  <span className="text-sm font-bold">55,000 € / an</span>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Statut de Visibilité</label>
                <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-400">Ouvert aux opportunités IA</span>
                  </div>
                  <button className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Modifier</button>
                </div>
              </div>
            </div>
          </section>

          {/* Section Intégrations */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 italic">Réseaux & Intégrations</h3>
            <div className="card-modern divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#0A66C2] rounded-lg flex items-center justify-center text-white">
                    <Link size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">LinkedIn Connect</p>
                    <p className="text-xs text-slate-500">Synchronisation des expériences active</p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded uppercase">Connecté</span>
              </div>
              <div className="flex items-center justify-between p-6 opacity-60 grayscale">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Google Calendar</p>
                    <p className="text-xs text-slate-500">Planification des entretiens</p>
                  </div>
                </div>
                <button className="text-[10px] font-black uppercase text-indigo-600">Lier</button>
              </div>
            </div>
          </section>

          {/* Section Données & RGPD */}
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 italic">Sécurité & Données</h3>
            <div className="card-modern p-6 space-y-4">
              <button onClick={handleExportData} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 transition-all cursor-pointer text-left">
                <div className="flex items-center gap-4">
                  <Download size={18} className="text-slate-400" />
                  <p className="text-sm font-bold">Exporter mes données (JSON)</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
              <button onClick={handleDeleteAccount} className="w-full flex items-center justify-between p-4 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-50 transition-all cursor-pointer group text-left">
                <div className="flex items-center gap-4">
                  <Trash2 size={18} className="text-red-400" />
                  <p className="text-sm font-bold text-red-600 dark:text-red-400">Supprimer définitivement mon compte</p>
                </div>
                <AlertCircle size={16} className="text-red-300 group-hover:text-red-500" />
              </button>
            </div>
          </section>
        </div>

        {/* Barre Latérale */}
        <div className="lg:col-span-4 space-y-10">
          <section className="bg-indigo-600 p-8 rounded-[2.5rem] border border-white/20 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-6">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md">
                <CreditCard size={24} />
              </div>
              <h4 className="text-2xl font-black text-white leading-tight">Protocole {user.plan}</h4>
              <p className="text-indigo-100 text-xs font-medium italic">Votre unité est optimisée pour des performances maximales.</p>
              <div className="pt-4 border-t border-white/10 flex justify-between items-center text-[10px] font-black uppercase text-indigo-200">
                <span>Prochain cycle</span>
                <span>12/10/2025</span>
              </div>
              <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">
                Gérer la facturation
              </button>
            </div>
          </section>

          <section className="card-modern p-6 space-y-6">
             <div className="flex items-center gap-3 px-1">
                <Bell size={18} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Notifications</h4>
             </div>
             <div className="space-y-4">
                {[
                  { label: 'Alertes de match > 90%', default: true },
                  { label: 'Réponses des recruteurs', default: true },
                  { label: 'Rapports IA hebdomadaires', default: false },
                ].map((notif, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{notif.label}</span>
                    <input type="checkbox" defaultChecked={notif.default} className="w-4 h-4 accent-indigo-600" />
                  </div>
                ))}
             </div>
          </section>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 py-5 bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
