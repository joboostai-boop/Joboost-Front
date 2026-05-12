import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import PrepareLayout from './pages/PrepareLayout';
import TargetLayout from './pages/TargetLayout';
import TrackLayout from './pages/TrackLayout';
import MobileNav from './components/MobileNav';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CVGenerator from './pages/CVGenerator';
import LetterGenerator from './pages/LetterGenerator';
import Applications from './pages/Applications';
import PersonalizedOffers from './pages/PersonalizedOffers';
import SavedOffers from './pages/SavedOffers';
import Pricing from './pages/Pricing';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import Spontaneous from './pages/Spontaneous';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import BusinessLayout from './pages/BusinessLayout';
import BusinessOffers from './pages/BusinessOffers';
import BusinessJobseekers from './pages/BusinessJobseekers';
import BusinessStatsPage from './pages/BusinessStats';
import { Toaster } from 'react-hot-toast';
import { Plan, User } from './types';

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
         <Routes>
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/auth/login" replace />} />
         </Routes>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
        <Toaster position="top-right" />
        <Home onStart={() => navigate('/auth/register')} />
      </div>
    );
  }

  if (!isBusinessPartner && !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Toaster position="top-right" />
        <Onboarding onComplete={handleOnboardingComplete} />
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
        </div>
      </main>

      <MobileNav currentPath={location.pathname} />
    </div>
  );
};

export default App;
