import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { authHeaders, getToken } from './services/authToken';
import TopNav from './components/TopNav';
import Topbar from './components/Topbar';
import MobileNav from './components/MobileNav';
import PageSkeleton from './components/PageSkeleton';
import { Toaster } from 'react-hot-toast';
import { Plan, User } from './types';

// Lazy-loaded pages for code splitting
const PrepareLayout = React.lazy(() => import('./pages/PrepareLayout'));
const TargetLayout = React.lazy(() => import('./pages/TargetLayout'));
const TrackLayout = React.lazy(() => import('./pages/TrackLayout'));
const Home = React.lazy(() => import('./pages/Home'));
const Accueil = React.lazy(() => import('./pages/Accueil'));
const Legal = React.lazy(() => import('./pages/Legal'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CVGenerator = React.lazy(() => import('./pages/CVGenerator'));
const LetterGenerator = React.lazy(() => import('./pages/LetterGenerator'));
const Templates = React.lazy(() => import('./pages/Templates'));
const InterviewSimulator = React.lazy(() => import('./pages/InterviewSimulator'));
const Applications = React.lazy(() => import('./pages/Applications'));
const PersonalizedOffers = React.lazy(() => import('./pages/PersonalizedOffers'));
const SavedOffers = React.lazy(() => import('./pages/SavedOffers'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const Spontaneous = React.lazy(() => import('./pages/Spontaneous'));
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Register = React.lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = React.lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/Auth/ResetPassword'));
const BusinessLayout = React.lazy(() => import('./pages/BusinessLayout'));
const BusinessDashboard = React.lazy(() => import('./pages/BusinessDashboard'));
const BusinessBilling = React.lazy(() => import('./pages/BusinessBilling'));
const BusinessOffers = React.lazy(() => import('./pages/BusinessOffers'));
const BusinessJobseekers = React.lazy(() => import('./pages/BusinessJobseekers'));
const BusinessStatsPage = React.lazy(() => import('./pages/BusinessStats'));

const App: React.FC = () => {
  const { user, loading: isAppLoading, checkAuth } = useAuth();
  const isAuthenticated = !!user;
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('joboost-theme') === 'dark';
  });
  // L'utilisateur peut choisir de remplir son profil plus tard ; on mémorise ce choix.
  const [onboardingSkipped, setOnboardingSkipped] = useState<boolean>(() => {
    return localStorage.getItem('joboost-onboarding-skipped') === 'true';
  });

  // Onboarding considéré fait dès que le poste recherché est renseigné, OU si
  // l'utilisateur a choisi de le remplir plus tard. (Le nom seul ne suffit pas :
  // il est posé automatiquement par l'inscription et par Google.)
  const hasCompletedOnboarding = !!user?.title || onboardingSkipped;

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // La préférence de thème est persistée indépendamment de l'écran courant.
    localStorage.setItem('joboost-theme', isDarkMode ? 'dark' : 'light');
    // La landing et les pages publiques (login, inscription) sont conçues pour le
    // mode clair : on force le clair tant que l'utilisateur n'est pas connecté,
    // pour éviter un affichage cassé (texte clair sur fond clair). Le mode sombre
    // reste actif dans l'app une fois connecté.
    const applyDark = isDarkMode && isAuthenticated;
    document.documentElement.classList.toggle('dark', applyDark);
  }, [isDarkMode, isAuthenticated]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleOnboardingComplete = async (data: any) => {
    // Persiste les infos d'onboarding sur le profil, puis rafraîchit l'utilisateur
    // pour que le gate (user.title) bascule et qu'on entre dans l'app.
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(data),
      });
      await checkAuth();
    } catch {
      /* en cas d'échec réseau, on laisse l'utilisateur réessayer */
    }
    navigate('/home');
  };

  // « Je remplirai plus tard » : on entre dans l'app sans forcer le profil.
  // L'Accueil rappellera ensuite de le compléter (carte « prochaine action »).
  const handleSkipOnboarding = () => {
    localStorage.setItem('joboost-onboarding-skipped', 'true');
    setOnboardingSkipped(true);
    navigate('/home');
  };

  // On ne bloque l'app derrière le spinner d'auth QUE si une session existe à
  // vérifier (utilisateur déjà connecté, token en localStorage). Pour un visiteur
  // anonyme, on affiche la landing/les pages publiques IMMÉDIATEMENT — sans attendre
  // /api/auth/me, qui peut être lent si le backend Render gratuit s'est endormi (~50s).
  const hasStoredSession = !!getToken();
  if (isAppLoading && hasStoredSession) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-[#7D5CFF]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D5CFF]"></div></div>;
  }

  // Permettre l'accès aux pages d'authentification
  if (!isAuthenticated && location.pathname.startsWith('/auth/')) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
         <Toaster position="top-right" />
         <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D5CFF]"></div></div>}>
           <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot" element={<ForgotPassword />} />
              <Route path="/auth/reset" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
           </Routes>
         </Suspense>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 selection:bg-[#7D5CFF]/15 selection:text-[#4F46E5] transition-colors duration-300">
        <Toaster position="top-right" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D5CFF]"></div></div>}>
          <Routes>
            <Route path="/" element={<Home onStart={() => navigate('/auth/register')} />} />
            <Route path="/legal/:page" element={<Legal />} />
            {/* Déconnecté sur une page interne (ex. /home, /track…) → on renvoie vers la
                connexion plutôt que d'afficher un 404 déroutant. Seule la racine "/" garde
                la vitrine ; les vraies pages inexistantes tombent aussi sur la connexion. */}
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  if (!isBusinessPartner && !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Toaster position="top-right" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7D5CFF]"></div></div>}>
          <Onboarding user={user} onComplete={handleOnboardingComplete} onSkip={handleSkipOnboarding} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen flex flex-col bg-[#F5F4FB] dark:bg-[#030712] text-slate-900 dark:text-slate-100 selection:bg-[#7D5CFF]/15 selection:text-[#4F46E5] transition-colors duration-300">
      <Toaster position="top-right" />

      {/* Navigation : dock flottant en haut (desktop) — barre mobile flottante en bas.
          Le business a sa barre unique (en-tête co-brandé) → on masque le dock pour lui. */}
      {user?.role !== 'BUSINESS_PARTNER' && <TopNav user={user} currentPath={location.pathname} />}
      <Topbar user={user} />

      {/* Contenu fluide */}
      <main className="flex-1 min-w-0 pb-28 md:pb-12">
        <div key={location.pathname} className="min-h-full animate-page">
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            {/* Accueil (hub) */}
            <Route path="/home" element={<Accueil user={user} />} />

            {/* NOUVEAUX CHEMINS (Phase 10 UX) */}

            {/* 1. Préparation */}
            <Route path="/prepare" element={<PrepareLayout />}>
               <Route index element={<Navigate to="profile" replace />} />
               <Route path="profile" element={<Profile user={user} />} />
               <Route path="cv" element={<CVGenerator />} />
               <Route path="letter" element={<LetterGenerator />} />
               <Route path="interview" element={<InterviewSimulator user={user} />} />
               <Route path="templates" element={<Templates />} />
            </Route>

            {/* 2. Cibler & Générer */}
            <Route path="/target" element={<TargetLayout />}>
               <Route index element={<Navigate to="offers" replace />} />
               <Route path="offers" element={<PersonalizedOffers />} />
               <Route path="lbb" element={<Spontaneous />} />
               <Route path="saved" element={<SavedOffers />} />
               <Route path="letter" element={<LetterGenerator />} />
            </Route>

            {/* 3. Suivre mes candidatures */}
            <Route path="/track" element={<TrackLayout />}>
               <Route index element={<Navigate to="applications" replace />} />
               <Route path="dashboard" element={<Dashboard />} />
               <Route path="applications" element={<Applications />} />
            </Route>
            
            {/* 4. Espace Business Partner */}
            <Route path="/business" element={<BusinessLayout />}>
               <Route index element={<Navigate to="dashboard" replace />} />
               <Route path="dashboard" element={<BusinessDashboard />} />
               <Route path="offers" element={<BusinessOffers />} />
               <Route path="jobseekers" element={<BusinessJobseekers />} />
               <Route path="stats" element={<BusinessStatsPage />} />
               <Route path="billing" element={<BusinessBilling />} />
            </Route>

            {/* Configurations transverses */}
            <Route path="/legal/:page" element={<Legal />} />
            <Route path="/pricing" element={<Pricing user={user} />} />
            <Route path="/settings" element={<Settings user={user} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
            
            {/* Redirection Legacy ou par défaut vers l'accueil */}
            <Route path="*" element={<Navigate to={isBusinessPartner ? '/business/dashboard' : '/home'} replace />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <MobileNav currentPath={location.pathname} />
    </div>
  );
};

export default App;
