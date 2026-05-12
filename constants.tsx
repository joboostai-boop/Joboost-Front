import React from 'react';
import { 
  Home, 
  Target, 
  Star, 
  Contact, 
  PenLine, 
  Briefcase, 
  UserRound, 
  Crown, 
  Settings2,
  Navigation,
  Megaphone,
  Users,
  BarChart3
} from 'lucide-react';

// Fix: Added missing junoGradient property used in Home.tsx
export const COLORS = {
  primary: '#4F46E5',
  secondary: '#6366F1',
  accent: '#4F46E5',
  slate900: '#0F172A',
  slate500: '#64748B',
  slate50: '#F8FAFC',
  junoGradient: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
};

// Navigation candidat (jobseeker)
export const NAVIGATION = [
  { name: '1. Préparation', icon: <UserRound size={18} />, path: 'prepare' },
  { name: '2. Cibler & Candidater', icon: <Target size={18} />, path: 'target' },
  { name: '3. Suivi & Dashboard', icon: <Home size={18} />, path: 'track' },
  { name: 'Abonnement', icon: <Crown size={18} />, path: 'pricing' },
  { name: 'Paramètres', icon: <Settings2 size={18} />, path: 'settings' },
];

// Navigation business partner
export const BUSINESS_NAVIGATION = [
  { name: 'Offres d\'emploi', icon: <Megaphone size={18} />, path: 'business/offers' },
  { name: 'Demandeurs d\'emploi', icon: <Users size={18} />, path: 'business/jobseekers' },
  { name: 'Statistiques', icon: <BarChart3 size={18} />, path: 'business/stats' },
  { name: 'Paramètres', icon: <Settings2 size={18} />, path: 'settings' },
];
