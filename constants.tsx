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
  LayoutDashboard,
  Search,
  GraduationCap,
  Building,
  Bookmark,
  FileText,
  Mail,
  LayoutGrid,
  SquareKanban,
  FolderOpen,
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

// Navigation candidat — barre du bas MOBILE (4 onglets). Refonte 09/2026 :
// libellés par OBJET (ce qu'on y trouve) plutôt que par verbe d'étape, plus
// faciles à scanner. Les routes restent inchangées.
export const PRIMARY_NAV = [
  { name: 'Accueil', icon: <Home size={18} />, path: 'home' },
  { name: 'Offres', icon: <Search size={18} />, path: 'target' },
  { name: 'Documents', icon: <FolderOpen size={18} />, path: 'prepare' },
  { name: 'Suivi', icon: <SquareKanban size={18} />, path: 'track' },
];

// Navigation candidat — barre latérale ORDINATEUR : toutes les pages sur un seul niveau.
export const CANDIDATE_NAV_GROUPS: { label?: string; items: { name: string; path: string; icon: React.ReactNode }[] }[] = [
  { items: [{ name: 'Accueil', path: '/home', icon: <Home size={17} /> }] },
  {
    label: 'Chercher',
    items: [
      { name: 'Offres pour moi', path: '/target/offers', icon: <Search size={17} /> },
      { name: 'Alternance', path: '/target/alternance', icon: <GraduationCap size={17} /> },
      { name: 'Candidatures spontanées', path: '/target/lbb', icon: <Building size={17} /> },
      { name: 'Sauvegardées', path: '/target/saved', icon: <Bookmark size={17} /> },
    ],
  },
  {
    label: 'Documents',
    items: [
      { name: 'Mon profil', path: '/prepare/profile', icon: <UserRound size={17} /> },
      { name: 'Mon CV', path: '/prepare/cv', icon: <FileText size={17} /> },
      { name: 'Lettre de motivation', path: '/prepare/letter', icon: <Mail size={17} /> },
      { name: 'Modèles', path: '/prepare/templates', icon: <LayoutGrid size={17} /> },
    ],
  },
  { items: [{ name: 'Suivi', path: '/track', icon: <SquareKanban size={17} /> }] },
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
