import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import { Toaster } from 'react-hot-toast';
import { Plan, User } from './types';

// Lazy-loaded pages for code splitting
const PrepareLayout = React.lazy(() => import('./pages/PrepareLayout'));
const TargetLayout = React.lazy(() => import('./pages/TargetLayout'));
const TrackLayout = React.lazy(() => import('./pages/TrackLayout'));
const Home = React.lazy(() => import('./pages/Home'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CVGenerator = React.lazy(() => import('./pages/CVGenerator'));
const LetterGenerator = React.lazy(() => import('./pages/LetterGenerator'));
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
const BusinessLayout = React.lazy(() => import('./pages/BusinessLayout'));
const BusinessOffers = React.lazy(() => import('./pages/BusinessOffers'));
const BusinessJobseekers = React.lazy(() => import('./pages/BusinessJobseekers'));
const BusinessStatsPage = React.lazy(() => import('./pages/BusinessStats'));

const App: React.FC = () => {
  const { user, loading: isAppLoading } = useAuth();
  const isAuthenticated = !!user;
  const isBusinessPartner = user?.role === 'BUSINESS_PARTNER';
  const hasCompletedOnboarding = !!user?.name; // Simple fallback
  
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('joboost-theme') === 'dark';
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('joboost-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('joboost-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleOnboardingComplete = async (data: any) => {
    // ...
    navigate('/dashboard');
  };

  if (isAppLoading) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-indigo-600"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  // Permettre l'accès aux pages d'authentification
  if (!isAuthenticated && (location.pathname.startsWith('/auth/login') || location.pathname.startsWith('/auth/register'))) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
         <Toaster position="top-right" />
         <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
           <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
           </Routes>
         </Suspense>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
        <Toaster position="top-right" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          <Home onStart={() => navigate('/auth/register')} />
        </Suspense>
      </div>
    );
  }

  if (!isBusinessPartner && !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Toaster position="top-right" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          <Onboarding onComplete={handleOnboardingComplete} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      <Toaster position="top-right" />
      
      {/* Static Sidebar */}
      <Sidebar currentPath={location.pathname} />

      {/* Main Fluid Content */}
      <main className="flex-1 min-w-0 md:pb-0 pb-20 overflow-y-auto">
        <div className="min-h-full">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
          <Routes>
            {/* NOUVEAUX CHEMINS (Phase 10 UX) */}
            
            {/* 1. Préparation */}
            <Route path="/prepare" element={<PrepareLayout />}>
               <Route index element={<Navigate to="profile" replace />} />
               <Route path="profile" element={<Profile user={user} />} />
               <Route path="cv" element={<CVGenerator />} />
               <Route path="letter" element={<LetterGenerator />} />
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
               <Route index element={<Navigate to="offers" replace />} />
               <Route path="offers" element={<BusinessOffers />} />
               <Route path="jobseekers" element={<BusinessJobseekers />} />
               <Route path="stats" element={<BusinessStatsPage />} />
            </Route>

            {/* Configurations transverses */}
            <Route path="/pricing" element={<Pricing user={user} />} />
            <Route path="/settings" element={<Settings user={user} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
            
            {/* Redirection Legacy ou par défaut vers la 1ere étape */}
            <Route path="*" element={<Navigate to={isBusinessPartner ? '/business/offers' : '/prepare/profile'} replace />} />
          </Routes>
          </Suspense>
        </div>
      </main>

      <MobileNav currentPath={location.pathname} />
    </div>
  );
};

export default App;
