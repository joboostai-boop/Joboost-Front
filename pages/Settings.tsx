import React, { useState } from 'react';
import {
  Bell, LogOut, ChevronRight, UserRound, Moon, Sun,
  Crown, Download, Trash2, Linkedin, Calendar, ShieldAlert, X, KeyRound, SlidersHorizontal, LifeBuoy, Mail, Building2,
  Camera, Loader2
} from 'lucide-react';

const SUPPORT_EMAIL = 'joboost.ai@gmail.com';
import { User as UserType } from '../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import toast from 'react-hot-toast';
import PageHero from '../components/PageHero';

interface SettingsProps {
  user: UserType;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const API = import.meta.env.VITE_API_URL || '';

/* Rogne les marges vides autour du logo (transparentes, ou d'une couleur de fond
   unie). Sans ça, centrer l'IMAGE ne centre pas le LOGO : les fichiers fournis par
   les organismes contiennent presque toujours un cadre vide asymétrique, et le
   glyphe apparaît décalé dans sa pastille quoi qu'on fasse en CSS. On recadre donc
   sur le contenu réel : le logo devient son image, et le centrage tombe juste. */
const trimCanvas = (source: HTMLCanvasElement): HTMLCanvasElement => {
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;
  const { width, height } = source;
  const { data } = ctx.getImageData(0, 0, width, height);
  const px = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  // La couleur de fond n'est retenue que si les 4 coins concordent : sinon le
  // fichier n'a pas de cadre uni et on se contente de rogner la transparence.
  const corners = [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)];
  const bg = corners[0];
  const uniformBg = corners.every((c) => c.every((v, k) => Math.abs(v - bg[k]) < 8));
  const isBlank = (p: number[]) =>
    p[3] < 10 || (uniformBg && bg[3] > 10 && p.slice(0, 3).every((v, k) => Math.abs(v - bg[k]) < 12));

  const rowBlank = (y: number) => { for (let x = 0; x < width; x++) if (!isBlank(px(x, y))) return false; return true; };
  const colBlank = (x: number) => { for (let y = 0; y < height; y++) if (!isBlank(px(x, y))) return false; return true; };

  let top = 0, bottom = height - 1, left = 0, right = width - 1;
  while (top < bottom && rowBlank(top)) top++;
  while (bottom > top && rowBlank(bottom)) bottom--;
  while (left < right && colBlank(left)) left++;
  while (right > left && colBlank(right)) right--;

  const w = right - left + 1;
  const h = bottom - top + 1;
  // Filet : rien à rogner, ou résultat absurde (image quasi vide) → on garde l'original.
  if ((w === width && h === height) || w < 8 || h < 8) return source;

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d')?.drawImage(source, left, top, w, h, 0, 0, w, h);
  return out;
};

// Préparation du logo côté client : recadrage sur le contenu, puis contenu dans
// 256 px. Le backend stocke une data URL, plafonnée à 500 Ko (cf. Organization.logoUrl).
const compressLogo = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        // 1. Taille naturelle : nécessaire pour analyser les pixels avant réduction.
        const src = document.createElement('canvas');
        src.width = img.naturalWidth || img.width;
        src.height = img.naturalHeight || img.height;
        const sctx = src.getContext('2d');
        if (!sctx) throw new Error('Canvas indisponible.');
        sctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // 2. Recadrage sur le logo réel.
        const trimmed = trimCanvas(src);

        // 3. Mise à l'échelle dans 256 px, ratio préservé.
        const max = 256;
        const scale = Math.min(max / trimmed.width, max / trimmed.height, 1);
        const out = document.createElement('canvas');
        out.width = Math.max(1, Math.round(trimmed.width * scale));
        out.height = Math.max(1, Math.round(trimmed.height * scale));
        const octx = out.getContext('2d');
        if (!octx) throw new Error('Canvas indisponible.');
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(trimmed, 0, 0, out.width, out.height);

        let dataUrl = out.toDataURL('image/png');
        // Filet : si le PNG est trop lourd (photo), on repasse en JPEG compressé.
        if (dataUrl.length > 400_000) dataUrl = out.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (err: any) {
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error('Image illisible.'));
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });

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

/* Ligne de carte. `href` rend un vrai <a> (mailto, lien externe) tout en gardant
   EXACTEMENT la meme geometrie que les lignes cliquables : c'est ce qui manquait
   au lien du support, ecrit a la main sans padding horizontal — il debordait donc
   de sa carte pendant que les autres lignes s'alignaient. */
const Row: React.FC<{ children: React.ReactNode; onClick?: () => void; href?: string }> = ({ children, onClick, href }) => {
  const interactive = !!onClick || !!href;
  const cls = `group flex items-center justify-between gap-4 px-5 py-4 ${
    interactive ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors' : ''
  }`;
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <div onClick={onClick} className={cls}>{children}</div>;
};

const Toggle: React.FC<{ on: boolean; onChange: () => void }> = ({ on, onChange }) => (
  <button onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-[#7D5CFF]' : 'bg-slate-200 dark:bg-slate-700'}`}>
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const Settings: React.FC<SettingsProps> = ({ user, isDarkMode, toggleDarkMode }) => {
  const { logout, checkAuth } = useAuth();
  const navigate = useNavigate();

  // Compte (identité de connexion, distinct du Profil/CV)
  const [account, setAccount] = useState({ name: user.name || '', email: user.email || '' });
  const [savingAccount, setSavingAccount] = useState(false);

  // Espace recruteur : identité de l'organisation (nom + logo).
  // Le logo est le SEUL élément de marque du partenaire affiché dans l'app
  // (dock de navigation + bandeau de bienvenue) ; la palette reste celle de Joboost.
  const isBusiness = user.role === 'BUSINESS_PARTNER';
  const [companyName, setCompanyName] = useState('');
  const [companyLoaded, setCompanyLoaded] = useState('');
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isBusiness) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/business/account`, { credentials: 'include', headers: { ...authHeaders() } });
        const data = await res.json();
        if (data.success) {
          setCompanyName(data.account.companyName || '');
          setCompanyLoaded(data.account.companyName || '');
          setCompanyLogo(data.account.logoUrl || null);
        }
      } catch { /* silencieux */ }
    })();
  }, [isBusiness]);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image (PNG, JPG…).'); return; }
    setUploadingLogo(true);
    try {
      const dataUrl = await compressLogo(file);
      if (dataUrl.length > 500_000) throw new Error('Logo trop lourd — choisissez une image plus simple.');
      const res = await fetch(`${API}/api/business/account`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ logoUrl: dataUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Échec de la mise à jour.');
      setCompanyLogo(data.account.logoUrl || null);
      toast.success('Logo mis à jour ! Rechargez pour le voir dans la barre de navigation.');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour le logo.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    try {
      const res = await fetch(`${API}/api/business/account`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ companyName }),
      });
      const data = await res.json();
      if (data.success) { setCompanyLoaded(data.account.companyName || ''); toast.success('Entreprise mise à jour.'); }
      else toast.error(data.error || 'Échec de la mise à jour.');
    } catch { toast.error('Erreur réseau.'); }
    finally { setSavingCompany(false); }
  };

  // Alertes emploi par email (réellement persistées côté serveur)
  const [jobAlert, setJobAlert] = useState<{ optIn: boolean; frequency: 'daily' | 'weekly' }>({
    optIn: user.jobAlertOptIn ?? false,
    frequency: (user.jobAlertFrequency as 'daily' | 'weekly') || 'daily',
  });
  const [savingAlert, setSavingAlert] = useState(false);

  // Mot de passe
  const [showPwd, setShowPwd] = useState(false);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Suppression
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Pas de await : logout() déconnecte l'UI immédiatement et prévient le serveur
  // en arrière-plan. Attendre la réponse ferait passer par /auth/login (cf. AuthContext).
  const handleLogout = () => { logout(); navigate('/'); };

  const connectLinkedIn = async () => {
    const toastId = toast.loading('Redirection vers LinkedIn...');
    try {
      const res = await fetch(`${API}/api/auth/linkedin`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success && data.url) { toast.dismiss(toastId); window.location.href = data.url; }
      else toast.error(data.error || 'Connexion LinkedIn non configurée.', { id: toastId });
    } catch { toast.error('Erreur de connexion au serveur.', { id: toastId }); }
  };

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    try {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: account.name, email: account.email }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Compte mis à jour.'); await checkAuth(); }
      else toast.error(data.error || 'Erreur lors de la mise à jour.');
    } catch { toast.error('Erreur réseau.'); }
    finally { setSavingAccount(false); }
  };

  const saveJobAlert = async (next: { optIn: boolean; frequency: 'daily' | 'weekly' }) => {
    const prev = jobAlert;
    setJobAlert(next);          // mise à jour optimiste (l'UI répond tout de suite)
    setSavingAlert(true);
    try {
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ jobAlertOptIn: next.optIn, jobAlertFrequency: next.frequency }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(next.optIn ? 'Alertes emploi activées.' : 'Alertes emploi désactivées.');
        await checkAuth();
      } else { setJobAlert(prev); toast.error(data.error || 'Erreur lors de la mise à jour.'); }
    } catch { setJobAlert(prev); toast.error('Erreur réseau.'); }
    finally { setSavingAlert(false); }
  };

  const handleChangePassword = async () => {
    if (pwd.next.length < 6) return toast.error('Le mot de passe doit faire au moins 6 caractères.');
    if (pwd.next !== pwd.confirm) return toast.error('Les mots de passe ne correspondent pas.');
    setSavingPwd(true);
    try {
      const res = await fetch(`${API}/api/users/me/password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword: pwd.current, newPassword: pwd.next }),
      });
      const data = await res.json();
      if (data.success) { toast.success('Mot de passe mis à jour.'); setShowPwd(false); setPwd({ current: '', next: '', confirm: '' }); }
      else toast.error(data.error || 'Erreur.');
    } catch { toast.error('Erreur réseau.'); }
    finally { setSavingPwd(false); }
  };

  const handleExportData = async () => {
    const toastId = toast.loading('Préparation de ton export...');
    try {
      const res = await fetch(`${API}/api/users/me/export`, { credentials: 'include', headers: { ...authHeaders() } });
      if (!res.ok) throw new Error('Export impossible');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'joboost-mes-donnees.json';
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tes données ont été exportées.', { id: toastId });
    } catch { toast.error("Erreur lors de l'export.", { id: toastId }); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const toastId = toast.loading('Suppression de ton compte...');
    try {
      const res = await fetch(`${API}/api/users/me`, { method: 'DELETE', credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Suppression impossible');
      toast.success('Compte supprimé. À bientôt.', { id: toastId });
      logout(); navigate('/');
    } catch (err: any) { toast.error(err.message || 'Erreur lors de la suppression.', { id: toastId }); setDeleting(false); }
  };

  const planLabel = user.plan && user.plan !== 'Gratuit' ? `Joboost ${user.plan}` : 'Forfait Gratuit';
  const accountChanged = account.name !== (user.name || '') || account.email !== (user.email || '');

  return (
    <>
      <PageHero
        tone="slate"
        eyebrow="Mon compte"
        icon={<SlidersHorizontal size={22} />}
        title="Paramètres"
        subtitle="Gère ton compte, tes préférences et tes notifications."
      />
      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-6 pb-16">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ───────── Colonne gauche ───────── */}
        <div className="space-y-6">
          {/* Mon entreprise (recruteurs uniquement) */}
          {isBusiness && (
            <Card title="Mon entreprise" icon={<Building2 size={16} />} desc="L'entité affichée sur vos offres">
              <div className="px-5 py-4 space-y-4">
                {/* Logo — enregistré immédiatement au choix du fichier (pas de
                    bouton « Enregistrer » : le nom, lui, garde le sien). */}
                <div>
                  <label className="input-label">Logo de l'organisation</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleLogoFile(e.target.files?.[0])}
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      title={companyLogo ? 'Changer le logo' : 'Ajouter le logo de votre organisation'}
                      className="group relative w-14 h-14 rounded-2xl shrink-0 bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-sm overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.03] outline-none"
                    >
                      {companyLogo ? (
                        <img src={companyLogo} alt={companyName || 'Logo'} className="w-full h-full object-contain p-1.5" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center bg-[#7D5CFF]/10 text-[#7D5CFF]">
                          <Building2 size={20} />
                        </span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                        {uploadingLogo ? <Loader2 size={15} className="text-white animate-spin" /> : <Camera size={15} className="text-white" />}
                      </span>
                    </button>
                    <div className="min-w-0">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="text-sm font-semibold text-[#7D5CFF] hover:underline disabled:opacity-40"
                      >
                        {companyLogo ? 'Changer le logo' : 'Ajouter un logo'}
                      </button>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        Affiché dans la barre de navigation et sur votre tableau de bord.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="input-label">Nom de l'entreprise</label>
                  <input className="input-pro" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex : Mission Locale de Paris" />
                </div>
                <button onClick={handleSaveCompany} disabled={savingCompany || !companyName.trim() || companyName.trim() === companyLoaded} className="btn btn-primary w-full disabled:opacity-40">
                  {savingCompany ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </Card>
          )}

          {/* Compte */}
          <Card title="Compte" icon={<UserRound size={16} />} desc="Tes identifiants de connexion">
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="input-label">Nom affiché</label>
                <input className="input-pro" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="input-label">Email de connexion</label>
                <input className="input-pro" type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="jean@email.com" />
              </div>
              <button onClick={handleSaveAccount} disabled={!accountChanged || savingAccount} className="btn btn-primary w-full disabled:opacity-40">
                {savingAccount ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
            <Row onClick={() => setShowPwd(true)}>
              <div className="flex items-center gap-3">
                <KeyRound size={18} className="text-slate-400" />
                <span className="text-sm font-semibold text-[#111827] dark:text-white">Mot de passe</span>
              </div>
              <span className="text-sm font-semibold text-[#7D5CFF]">Modifier</span>
            </Row>
            <Row onClick={() => navigate('/prepare/profile')}>
              <span className="text-sm text-slate-600 dark:text-slate-300">Mon profil & préférences de recherche</span>
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </Row>
          </Card>

          {/* Notifications */}
          <Card title="Notifications" icon={<Bell size={16} />}>
            <Row>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white">Alertes emploi par email</p>
                <p className="text-xs text-slate-400">Reçois par email une sélection d'offres qui correspondent à ton profil</p>
              </div>
              <Toggle on={jobAlert.optIn} onChange={() => saveJobAlert({ ...jobAlert, optIn: !jobAlert.optIn })} />
            </Row>
            {jobAlert.optIn && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 mb-2">Fréquence</p>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                  {([['daily', 'Quotidienne'], ['weekly', 'Hebdomadaire']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      disabled={savingAlert}
                      onClick={() => jobAlert.frequency !== val && saveJobAlert({ ...jobAlert, frequency: val })}
                      className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors disabled:opacity-60 ${
                        jobAlert.frequency === val
                          ? 'bg-white dark:bg-slate-700 text-[#7D5CFF] shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ───────── Colonne droite ───────── */}
        <div className="space-y-6">
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

          {/* Intégrations */}
          <Card title="Intégrations" icon={<Linkedin size={16} />}>
            <Row>
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-[#0A66C2] text-white flex items-center justify-center"><Linkedin size={18} /></span>
                <div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">LinkedIn</p>
                  <p className="text-xs text-slate-400">Connecte ton compte pour récupérer ta photo et ton identité</p>
                </div>
              </div>
              <button onClick={connectLinkedIn} className="press btn btn-secondary !min-h-0 !py-1.5 !px-3 text-xs !text-[#0A66C2] !border-[#0A66C2]/30 hover:!bg-[#0A66C2]/5 shrink-0">
                Connecter
              </button>
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

          {/* Aide & support */}
          <Card title="Aide & support" icon={<LifeBuoy size={16} />}>
            <Row href={`mailto:${SUPPORT_EMAIL}`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center shrink-0"><Mail size={18} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">Contacter le support</p>
                  <p className="text-xs text-slate-400 truncate">Une question, un souci ? On répond à {SUPPORT_EMAIL}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300 shrink-0 group-hover:text-[#7D5CFF] transition-colors" />
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
        </div>
      </div>

      {/* Déconnexion (pleine largeur) */}
      <button onClick={handleLogout} className="press btn btn-secondary w-full max-w-md mx-auto flex">
        <LogOut size={16} /> Se déconnecter
      </button>

      {/* Zone de danger (discrète) */}
      <details className="group max-w-md mx-auto">
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

      {/* Modal mot de passe */}
      {showPwd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] w-full max-w-md p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#F3F0FF] text-[#7D5CFF] flex items-center justify-center"><KeyRound size={20} /></span>
                <h2 className="text-lg font-bold text-[#111827] dark:text-white">Changer mon mot de passe</h2>
              </div>
              <button onClick={() => setShowPwd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div>
              <label className="input-label">Mot de passe actuel</label>
              <input className="input-pro" type="password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} placeholder="Laisse vide si tu n'en as pas (compte Google)" />
            </div>
            <div>
              <label className="input-label">Nouveau mot de passe</label>
              <input className="input-pro" type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} placeholder="Au moins 6 caractères" />
            </div>
            <div>
              <label className="input-label">Confirmer</label>
              <input className="input-pro" type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} placeholder="Retape le nouveau mot de passe" />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setShowPwd(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleChangePassword} disabled={savingPwd} className="btn btn-primary">{savingPwd ? 'Enregistrement…' : 'Mettre à jour'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal suppression */}
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
            <input className="input-pro" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" autoFocus />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDelete(false)} className="btn btn-secondary">Annuler</button>
              <button onClick={handleDeleteAccount} disabled={confirmText !== 'SUPPRIMER' || deleting} className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default Settings;
