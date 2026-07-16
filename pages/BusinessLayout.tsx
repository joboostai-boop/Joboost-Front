import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Users, BarChart3, Building2, CreditCard, Camera, Loader2, ChevronDown, Settings2, LogOut } from 'lucide-react';
import { BusinessAccount } from '../types';
import { businessAccountApi } from '../services/business';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import toast from 'react-hot-toast';

/* En-tête de l'espace recruteur — registre clair premium (type Stripe/Linear) :
   identité de l'entreprise (logo uploadable + nom + plan), titre de page et
   onglets soulignés fins. Le compte est chargé ici une seule fois et partagé
   aux pages enfants via le contexte de l'Outlet (avec refreshAccount). */

const BUSINESS_TABS = [
  { name: 'Tableau de bord', icon: <LayoutDashboard size={15} />, path: '/business/dashboard', title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité.' },
  { name: 'Offres d\'emploi', icon: <Megaphone size={15} />, path: '/business/offers', title: 'Offres d\'emploi', subtitle: 'Créez et gérez les offres proposées à vos adhérents.' },
  { name: 'Demandeurs', icon: <Users size={15} />, path: '/business/jobseekers', title: 'Vivier de candidats', subtitle: 'Gérez votre base de candidats et suivez vos contacts.' },
  { name: 'Statistiques', icon: <BarChart3 size={15} />, path: '/business/stats', title: 'Statistiques', subtitle: 'Mesurez l\'activité et la performance de votre espace partenaire.' },
  { name: 'Abonnement', icon: <CreditCard size={15} />, path: '/business/billing', title: 'Abonnement', subtitle: 'Une offre construite sur mesure selon les effectifs de votre organisme.' },
];

const tabClass = (isActive: boolean) =>
  `relative flex items-center gap-1.5 px-1 pb-3 pt-1 text-sm font-semibold whitespace-nowrap transition-colors outline-none shrink-0 ${
    isActive
      ? 'text-[#7D5CFF] after:absolute after:inset-x-0 after:bottom-0 after:h-[2.5px] after:rounded-t-full after:bg-[#7D5CFF]'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
  }`;

// Badge de plan pour l'en-tête. Abonné (Business/Pro) → violet ; sinon découverte,
// avec le compte à rebours des 15 jours (ambre, ou rouge une fois expirée).
const planBadge = (account: BusinessAccount | null): { label: string; cls: string } => {
  if (account?.isPaid || account?.plan?.startsWith('Business')) {
    return { label: 'Plan Business', cls: 'bg-[#7D5CFF] text-white border-transparent' };
  }
  const days = account?.discoveryDaysLeft ?? null;
  if (days !== null && days <= 0) {
    return { label: 'Découverte terminée', cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' };
  }
  const label = days !== null ? `Découverte · ${days} j` : 'Découverte';
  return { label, cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' };
};

// Compression du logo côté client : contenu dans 256 px, PNG (transparence conservée).
const compressLogo = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 256;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas indisponible.')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let out = canvas.toDataURL('image/png');
      // Filet : si le PNG est trop lourd (photo), on repasse en JPEG compressé.
      if (out.length > 400_000) out = canvas.toDataURL('image/jpeg', 0.85);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });

// Cache module-level : le compte change rarement, inutile de re-requêter
// à chaque navigation entre onglets B2B.
let accountCache: BusinessAccount | null = null;

const BusinessLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const active = BUSINESS_TABS.find((t) => location.pathname.startsWith(t.path)) ?? BUSINESS_TABS[0];
  const [account, setAccount] = useState<BusinessAccount | null>(accountCache);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshAccount = async () => {
    try {
      const a = await businessAccountApi.get();
      accountCache = a;
      setAccount(a);
    } catch { /* non bloquant */ }
  };

  useEffect(() => {
    if (accountCache) return;
    refreshAccount();
  }, []);

  const handleLogoFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choisissez une image (PNG, JPG…).'); return; }
    setUploadingLogo(true);
    try {
      const dataUrl = await compressLogo(file);
      if (dataUrl.length > 500_000) throw new Error('Logo trop lourd — choisissez une image plus simple.');
      const updated = await businessAccountApi.update({ logoUrl: dataUrl });
      accountCache = updated;
      setAccount(updated);
      toast.success('Logo mis à jour !');
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre à jour le logo.');
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const badge = planBadge(account);

  return (
    <div className="min-h-full">
      {/* ── En-tête clair premium ── */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur border-b border-[#ECEAF6] dark:border-[#1F2937]">
        {/* Liseré coloré (couleurs du logo du partenaire) en haut de chaque page — si l'organisme a un logo */}
        {account?.logoUrl && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#E4007C] via-[#F39200] to-[#95C11F] z-10" />
        )}
        {/* Lueur violette douce, ancrée hors-cadre + masquée (aucun rectangle visible) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 motion-reduce:hidden"
          style={{
            background:
              'radial-gradient(480px 220px at 88% -80px, rgba(125,92,255,0.10), transparent 70%),' +
              'radial-gradient(360px 200px at -40px -60px, rgba(125,92,255,0.06), transparent 70%)',
            maskImage: 'linear-gradient(to bottom, black, black 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, black 70%, transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-5 md:pt-7">
          {/* Identité entreprise */}
          <div className="flex items-center gap-3.5 md:gap-4">
            {/* Logo (clic = importer/remplacer) */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
            {/* Co-branding : logo JoBoost + logo du partenaire, côte à côte.
               Ne s'affiche QUE si l'organisme a un logo (account.logoUrl) — donc
               auto-scopé aux structures partenaires équipées, invisible pour les
               autres comptes qui gardent l'en-tête inchangé. */}
            {account?.logoUrl && (
              <>
                <Link to="/business/dashboard" className="shrink-0" aria-label="Accueil Joboost">
                  <Logo variant="full" className="h-8" />
                </Link>
                <span aria-hidden className="h-7 md:h-9 w-px bg-[#E6E1F5] dark:bg-[#2A3244] shrink-0" />
              </>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingLogo}
              title={account?.logoUrl ? 'Changer le logo' : 'Ajouter le logo de votre organisation'}
              className="group relative w-12 h-12 md:w-14 md:h-14 rounded-2xl shrink-0 bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-sm overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.03] outline-none"
            >
              {account?.logoUrl ? (
                <img src={account.logoUrl} alt={account.companyName || 'Logo'} className="w-full h-full object-contain p-1" />
              ) : (
                <span className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8C6DFF] to-[#5B3FD6] text-white">
                  {account?.companyName
                    ? <span className="text-base md:text-lg font-extrabold">{account.companyName.slice(0, 2).toUpperCase()}</span>
                    : <Building2 size={20} />}
                </span>
              )}
              {/* Voile d'édition au survol */}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingLogo ? <Loader2 size={16} className="text-white animate-spin" /> : <Camera size={16} className="text-white" />}
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#7D5CFF]">
                Espace partenaire
              </div>
              <div className="flex items-center gap-2.5 min-w-0 mt-0.5">
                <span className="font-display text-[15px] md:text-base font-extrabold text-[#0B0B14] dark:text-white truncate tracking-[-0.01em]">
                  {account?.companyName || 'Votre organisation'}
                </span>
                <Link
                  to="/business/billing"
                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-bold shrink-0 transition-opacity hover:opacity-80 ${badge.cls}`}
                  title="Voir l'abonnement"
                >
                  {badge.label}
                </Link>
              </div>
            </div>

            {/* Menu compte — fusionné ici (l'ancien dock est masqué pour le business) */}
            <div className="relative shrink-0 ml-1">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Menu du compte"
                className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors outline-none"
              >
                {account?.logoUrl ? (
                  <span className="w-8 h-8 rounded-full overflow-hidden bg-white border border-[#ECEAF6] dark:border-[#1F2937] flex items-center justify-center shrink-0">
                    <img src={account.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                  </span>
                ) : (
                  <span className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5] text-white shrink-0">
                    <Building2 size={15} />
                  </span>
                )}
                <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <>
                  <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setMenuOpen(false)} tabIndex={-1} />
                  <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] shadow-pop p-1.5 origin-top-right">
                    <div className="px-3 py-2.5 mb-1 border-b border-[#ECEAF6] dark:border-[#1F2937]">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Partenaire'}</p>
                      <p className="text-xs text-slate-400 truncate">{user?.email || account?.companyName || 'Espace partenaire'}</p>
                    </div>
                    <Link to="/business/billing" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
                      <CreditCard size={16} /> Abonnement
                    </Link>
                    <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] hover:text-[#7D5CFF] transition-colors">
                      <Settings2 size={16} /> Paramètres
                    </Link>
                    <div className="my-1 border-t border-[#ECEAF6] dark:border-[#1F2937]" />
                    <button role="menuitem" onClick={async () => { setMenuOpen(false); await logout?.(); navigate('/'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors">
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Titre de page */}
          <h1 className="font-display mt-4 md:mt-5 text-[1.55rem] md:text-[1.9rem] leading-[1.08] font-extrabold tracking-[-0.03em] text-[#0B0B14] dark:text-white">
            {active.title}
          </h1>
          <p className="mt-1 text-[13.5px] md:text-[14.5px] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {active.subtitle}
          </p>

          {/* Onglets soulignés */}
          <nav className="mt-4 md:mt-5 flex gap-5 md:gap-7 overflow-x-auto scrollbar-none">
            {BUSINESS_TABS.map((tab) => (
              <NavLink key={tab.path} to={tab.path} className={({ isActive }) => tabClass(isActive)}>
                {tab.icon}
                {tab.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Contenu — padded for mobile bottom bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-7 pb-24 md:pb-7">
        <Outlet context={{ account, refreshAccount }} />
      </div>
    </div>
  );
};

export default BusinessLayout;
