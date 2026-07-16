import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BusinessAccount } from '../types';
import { businessAccountApi } from '../services/business';
import PageHero from '../components/PageHero';

/* Espace partenaire — même direction artistique que l'espace candidat : la
   navigation est portée par le dock flottant (TopNav), le titre par PageHero.
   L'ancien en-tête co-brandé maison a été retiré : il vivait dans l'Outlet, donc
   à l'intérieur de `.animate-page`, dont l'animation transform/opacity cassait
   son `sticky` et neutralisait son `backdrop-blur` (texte fantôme au scroll).
   Le compte est chargé ici une seule fois et partagé aux pages enfants via le
   contexte de l'Outlet (avec refreshAccount). */

const BUSINESS_PAGES = [
  { path: '/business/dashboard', title: 'Tableau de bord', subtitle: 'Vue d\'ensemble de votre activité.' },
  { path: '/business/offers', title: 'Offres d\'emploi', subtitle: 'Créez et gérez les offres proposées à vos adhérents.' },
  { path: '/business/jobseekers', title: 'Vivier de candidats', subtitle: 'Gérez votre base de candidats et suivez vos contacts.' },
  { path: '/business/stats', title: 'Statistiques', subtitle: 'Mesurez l\'activité et la performance de votre espace partenaire.' },
  { path: '/business/billing', title: 'Abonnement', subtitle: 'Une offre construite sur mesure selon les effectifs de votre organisme.' },
];

// Pastille de plan — même vocabulaire visuel que les chips de l'Accueil candidat
// (rounded-full, bordure discrète). Abonné (Business/Pro) → violet marque ; sinon
// découverte, avec le compte à rebours des 15 jours (ambre, rouge une fois expirée).
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

// Cache module-level : le compte change rarement, inutile de re-requêter
// à chaque navigation entre onglets B2B.
let accountCache: BusinessAccount | null = null;

const BusinessLayout: React.FC = () => {
  const location = useLocation();
  const active = BUSINESS_PAGES.find((p) => location.pathname.startsWith(p.path)) ?? BUSINESS_PAGES[0];
  const [account, setAccount] = useState<BusinessAccount | null>(accountCache);

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

  const badge = planBadge(account);

  return (
    <>
      <PageHero
        tone="violet"
        eyebrow={account?.companyName || 'Espace partenaire'}
        title={active.title}
        subtitle={active.subtitle}
        actions={
          <Link
            to="/business/billing"
            title="Voir l'abonnement"
            className={`press inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-bold transition-opacity hover:opacity-80 ${badge.cls}`}
          >
            {badge.label}
          </Link>
        }
      />

      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6 pb-28 md:pb-10">
        <Outlet context={{ account, refreshAccount }} />
      </div>
    </>
  );
};

export default BusinessLayout;
