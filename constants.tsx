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
  BarChart3,
  Send,
  LineChart,
  LayoutDashboard
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

// Navigation candidat (jobseeker) — PARCOURS principal.
// Libellés courts et humains (verbes), c'est le coeur de la nav (sidebar PC/tablette + bottom-bar mobile).
export const PRIMARY_NAV = [
  { name: 'Accueil', icon: <Home size={18} />, path: 'home' },
  { name: 'Préparer', icon: <UserRound size={18} />, path: 'prepare' },
  { name: 'Postuler', icon: <Send size={18} />, path: 'target' },
  { name: 'Suivre', icon: <LineChart size={18} />, path: 'track' },
];

// Navigation candidat — entrées SYSTÈME (séparées du parcours, en bas de sidebar / dans le compte).
export const SECONDARY_NAV = [
  { name: 'Abonnement', icon: <Crown size={18} />, path: 'pricing' },
  { name: 'Paramètres', icon: <Settings2 size={18} />, path: 'settings' },
];

// Conservé pour compatibilité (anciens imports éventuels).
export const NAVIGATION = [...PRIMARY_NAV, ...SECONDARY_NAV];

// Navigation business partner — libellés volontairement COURTS : les intitulés longs
// se cassaient sur deux lignes (moche) et faisaient déborder la barre.
// Symétrique de PRIMARY_NAV : 4 entrées de parcours dans le dock, les entrées SYSTÈME
// (Abonnement, Paramètres) vivent dans le menu du compte — comme côté candidat.
export const BUSINESS_NAVIGATION = [
  { name: 'Accueil', icon: <LayoutDashboard size={18} />, path: 'business/dashboard' },
  { name: 'Offres', icon: <Megaphone size={18} />, path: 'business/offers' },
  { name: 'Demandeurs', icon: <Users size={18} />, path: 'business/jobseekers' },
  { name: 'Statistiques', icon: <BarChart3 size={18} />, path: 'business/stats' },
];
