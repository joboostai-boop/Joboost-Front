import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Bell, LogOut, ChevronRight, UserRound, Moon, Sun,
  Crown, Download, Trash2, Linkedin, Calendar, ShieldAlert, X, Check
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

/* Carte de section réutilisable */
const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; desc?: string }> = ({ title, icon, children, desc }) => (
  <section className="card-pro !p-0 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
      <span className="w-8 h-8 rounded-lg bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10 flex items-center justify-center">{icon}</span>
      <div>
        <h3 className="text-sm font-bold text-[#111827] dark:text-white">{title}</h3>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
  </section>
);

const Row: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <div onClick={onClick} className={`flex items-center justify-between gap-4 px-5 py-4 ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''}`}>
    {children}
  </div>
);

const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#7D5CFF]' : 'bg-slate-200 dark:bg-slate-700'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleDarkMode }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [notifs, setNotifs] = useState({ offers: true, replies: true, weekly: false });
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleExportData = async () => {
    const toastId = toast.loading('Préparation de ton export...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me/export`, {
        credentials: 'include',
        headers: { ...authHeaders() },
      });
      if (!res.ok) throw new Error('Export impossible');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'joboost-mes-donnees.json';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tes données ont été exportées.', { id: toastId });
    } catch {
      toast.error("Erreur lors de l'export.", { id: toastId });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const toastId = toast.loading('Suppression de ton compte...');
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
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression.', { id: toastId });
      setDeleting(false);
    }
  };

  const planLabel = user.plan && user.plan !== 'Gratuit' ? `JoBoost ${user.plan}` : 'Forfait Gratuit';

  return (
    <div className="p-5 md:p-10 max-w-2xl mx-auto space-y-6 pb-16">
      {/* En-tête */}
      <header className="flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10 flex items-center justify-center">
          <SettingsIcon size={24} />
        </span>
        <div>
          <h1>Paramètres</h1>
          <p className="text-sm text-[#6B7280]">Gère ton compte, tes préférences et tes notifications.</p>
        </div>
      </header>

      {/* Compte */}
      <Card title="Compte" icon={<UserRound size={16} />}>
        <Row>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <button onClick={() => navigate('/prepare/profile')} className="text-sm font-semibold text-[#7D5CFF] hover:underline shrink-0">
            Modifier mon profil
          </button>
        </Row>
        <Row onClick={() => navigate('/prepare/profile')}>
          <span className="text-sm text-slate-600 dark:text-slate-300">Préférences de recherche (poste, lieux, salaire, mobilité)</span>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </Row>
      </Card>

      {/* Apparence */}
      <Card title="Apparence" icon={isDarkMode ? <Moon size={16} /> : <Sun size={16} />}>
        <Row>
          <div>
            <p className="text-sm font-semibold text-[#111827] dark:text-white">Mode sombre</p>
            <p className="text-xs text-slate-400">Confort visuel en faible luminosité</p>
          </div>
          <Toggle on={isDarkMode} onChange={toggleDarkMode} />
        </Row>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" icon={<Bell size={16} />}>
        {[
          { key: 'offers' as const, label: 'Nouvelles offres pour moi', desc: 'Quand des offres correspondent à ton profil' },
          { key: 'replies' as const, label: 'Réponses des recruteurs', desc: 'Quand une candidature reçoit une réponse' },
          { key: 'weekly' as const, label: 'Récap hebdomadaire', desc: 'Un résumé de ta semaine de recherche' },
        ].map((n) => (
          <Row key={n.key}>
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-white">{n.label}</p>
              <p className="text-xs text-slate-400">{n.desc}</p>
            </div>
            <Toggle on={notifs[n.key]} onChange={() => setNotifs((p) => ({ ...p, [n.key]: !p[n.key] }))} />
          </Row>
        ))}
      </Card>

      {/* Intégrations */}
      <Card title="Intégrations" icon={<Linkedin size={16} />}>
        <Row>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center"><Linkedin size={18} /></span>
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-white">LinkedIn</p>
              <p className="text-xs text-slate-400">Importer ton profil et tes expériences</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 text-[11px] font-bold rounded-full shrink-0">Connecté</span>
        </Row>
        <Row>
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center"><Calendar size={18} /></span>
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-white">Google Calendar</p>
              <p className="text-xs text-slate-400">Planifier tes entretiens</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 shrink-0">Bientôt</span>
        </Row>
      </Card>

      {/* Abonnement */}
      <Card title="Abonnement" icon={<Crown size={16} />}>
        <Row onClick={() => navigate('/pricing')}>
          <div>
            <p className="text-sm font-semibold text-[#111827] dark:text-white">{planLabel}</p>
            <p className="text-xs text-slate-400">Voir les forfaits et gérer mon abonnement</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </Row>
      </Card>

      {/* Données */}
      <Card title="Confidentialité & données" icon={<Download size={16} />}>
        <Row onClick={handleExportData}>
          <div>
            <p className="text-sm font-semibold text-[#111827] dark:text-white">Exporter mes données</p>
            <p className="text-xs text-slate-400">Télécharge tout ton compte au format JSON (RGPD)</p>
          </div>
          <ChevronRight size={18} className="text-slate-300 shrink-0" />
        </Row>
      </Card>

      {/* Déconnexion */}
      <button onClick={handleLogout} className="btn btn-secondary w-full">
        <LogOut size={16} /> Se déconnecter
      </button>

      {/* Zone de danger (discrète, en bas) */}
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors py-2">
          <ShieldAlert size={14} /> Options avancées
        </summary>
        <div className="mt-3 rounded-2xl border border-red-200 dark:border-red-900/40 p-5 space-y-3">
          <div>
            <p className="text-sm font-bold text-red-600 dark:text-red-400">Supprimer mon compte</p>
            <p className="text-xs text-slate-500 mt-1">Supprime définitivement ton compte et toutes tes données (CV, lettres, candidatures). Cette action est irréversible.</p>
          </div>
          <button onClick={() => { setShowDelete(true); setConfirmText(''); }} className="btn btn-secondary !border-red-200 !text-red-600 hover:!bg-red-50 dark:hover:!bg-red-900/10 text-sm">
            <Trash2 size={16} /> Supprimer mon compte
          </button>
        </div>
      </details>

      {/* Modal de confirmation de suppression */}
      {showDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center"><ShieldAlert size={20} /></span>
                <h2 className="text-lg font-bold text-[#111827] dark:text-white">Supprimer ton compte ?</h2>
              </div>
              <button onClick={() => setShowDelete(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Cette action est <strong className="text-red-600">irréversible</strong>. Toutes tes données seront définitivement supprimées.
              Pour confirmer, écris <strong>SUPPRIMER</strong> ci-dessous.
            </p>
            <input
              className="input-pro"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDelete(false)} className="btn btn-secondary">Annuler</button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'SUPPRIMER' || deleting}
                className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
