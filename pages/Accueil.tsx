import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import PageHero from '../components/PageHero';
import HeroDecor from '../components/HeroDecor';
import Tilt from '../components/Tilt';
import CountUp from '../components/CountUp';
import StatCard, { StatTone } from '../components/StatCard';
import {
  UserRound, Send, LineChart, Plus, ArrowRight,
  FileText, Search, Bell, Loader2, Clock, CalendarCheck, Award, PenLine, Sparkles, Bookmark,
  Building2, MapPin, Briefcase, Rocket, Crown
} from 'lucide-react';

interface AccueilProps {
  user: User;
}

// Offre publiée par un organisme partenaire auquel le candidat est affilié.
interface PartnerOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  partner?: { name: string; logoUrl?: string | null };
}

interface DashboardStats {
  profileCompletion: number;
  /** Libellés lisibles des champs de profil encore vides (ex. « tes langues »). */
  profileMissing?: string[];
  /** Le profil contient-il le minimum pour générer un CV utile (métier + matière) ? */
  canGenerateCV?: boolean;
  cvCount: number;
  letterCount: number;
  savedCount: number;
  applications: {
    total: number;
    pending: number;
    sent: number;
    interview: number;
    offer: number;
    rejected: number;
  };
}

/* Parcours en 3 étapes — chaque espace a sa teinte (repère visuel), le numéro
   d'étape matérialise la progression Préparer → Postuler → Suivre. */
const spaces = [
  { to: '/prepare/profile', icon: <UserRound size={20} />, title: 'Préparer', desc: 'Ton profil, ton CV et ta lettre type.',
    iconCls: 'bg-[#7D5CFF]/10 text-[#7D5CFF] border border-[#7D5CFF]/15' },
  { to: '/target/offers', icon: <Send size={20} />, title: 'Postuler', desc: 'Trouve des offres et candidate avec l’IA.',
    iconCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15' },
  { to: '/track/applications', icon: <LineChart size={20} />, title: 'Suivre', desc: 'Tes candidatures et tes réponses.',
    iconCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15' },
];

// Détermine LA prochaine action la plus pertinente selon l'état du compte.
const getNextAction = (stats: DashboardStats | null) => {
  const fallback = {
    to: '/target/offers',
    icon: <Plus size={22} strokeWidth={2.5} />,
    title: 'Nouvelle candidature',
    desc: 'Lance-toi : trouve une offre et postule.',
  };
  if (!stats) return fallback;

  // Repli si le backend n'expose pas encore canGenerateCV (front déployé avant le back) :
  // on déduit le minimum vital de la liste des manques.
  const canGenerateCV = stats.canGenerateCV
    ?? !(stats.profileMissing ?? []).includes('ton métier cible');

  // Le premier CV passe AVANT la complétion du profil.
  // Auparavant, tout profil sous 50 % renvoyait vers « complète ton profil » : un nouvel
  // inscrit sortait de l'onboarding pour s'entendre redemander de remplir son profil, sans
  // avoir rien vu de ce que l'outil sait faire. Le CV généré est le moment où la valeur
  // apparaît — on y va dès qu'il y a de quoi le rédiger, le profil se complète ensuite.
  if (!canGenerateCV) {
    return { to: '/prepare/profile', icon: <UserRound size={22} />, title: 'Complète ton profil', desc: 'Ton métier visé et tes expériences suffisent pour générer un premier CV.' };
  }
  if (stats.cvCount === 0) {
    return { to: '/prepare/cv', icon: <FileText size={22} />, title: 'Génère ton premier CV', desc: 'L’IA le rédige à partir de ton profil, en une minute.' };
  }
  if (stats.profileCompletion < 50) {
    return { to: '/prepare/profile', icon: <UserRound size={22} />, title: 'Complète ton profil', desc: `Profil rempli à ${stats.profileCompletion}%. Plus il est complet, meilleurs sont tes documents.` };
  }
  if (stats.applications.total === 0) {
    return { to: '/target/offers', icon: <Search size={22} />, title: 'Postule à ta première offre', desc: 'Tes documents sont prêts, passe à l’action.' };
  }
  if (stats.applications.pending > 0) {
    return { to: '/track/applications', icon: <Bell size={22} />, title: `Relance ${stats.applications.pending} candidature${stats.applications.pending > 1 ? 's' : ''}`, desc: 'Une relance double souvent tes chances de réponse.' };
  }
  return { to: '/target/offers', icon: <Plus size={22} strokeWidth={2.5} />, title: 'Trouve de nouvelles offres', desc: 'Continue sur ta lancée, vise plus large.' };
};

const Accueil: React.FC<AccueilProps> = ({ user }) => {
  const firstName = user?.name?.split(' ')[0] || 'à toi';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerOffers, setPartnerOffers] = useState<PartnerOffer[]>([]);
  // Abonnement (pour le bandeau de paiement mis en avant — voir plus bas). Chargé à
  // part de /dashboard/stats, qui ne connaît pas le plan.
  const [usage, setUsage] = useState<{ isSubscribed: boolean; unlimited: boolean; inTrial: boolean; trialDaysLeft: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/usage`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (alive && data.success) setUsage(data.usage);
      } catch {
        /* silencieux : pas de bandeau plutôt qu'une erreur visible */
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/stats`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (alive && data.success) setStats(data.stats);
      } catch {
        /* silencieux : on retombe sur l'action générique */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Offres des organismes du candidat (adhérent) : chargées à part, sans bloquer le reste.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/opportunities/partner-offers`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (alive && data.success) setPartnerOffers(data.offers || []);
      } catch {
        /* silencieux : la section ne s'affiche simplement pas */
      }
    })();
    return () => { alive = false; };
  }, []);

  const next = getNextAction(stats);
  const pct = stats?.profileCompletion ?? 0;

  // Salutation vivante : varie selon l'heure + date du jour en français.
  const hour = new Date().getHours();
  const greeting = hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Arsenal du candidat : documents & favoris déjà comptés par /dashboard/stats
  // mais jusqu'ici jamais montrés sur l'Accueil. Chips compactes → richesse utile.
  const arsenal = [
    { to: '/prepare/cv', icon: <FileText size={14} />, count: stats?.cvCount ?? 0, label: 'CV' },
    { to: '/prepare/letter', icon: <PenLine size={14} />, count: stats?.letterCount ?? 0, label: stats?.letterCount === 1 ? 'lettre' : 'lettres' },
    { to: '/target/saved', icon: <Bookmark size={14} />, count: stats?.savedCount ?? 0, label: stats?.savedCount === 1 ? 'sauvegardée' : 'sauvegardées' },
  ];

  // KPIs alignés sur les statuts du suivi (mêmes couleurs que le Kanban).
  // Même composant StatCard que le Dashboard → cohérence visuelle inter-pages.
  // `hint` : légende contextuelle. Un compteur à 0 devient une invitation plutôt
  // qu'un « vide » (ex. « Relance pour en décrocher » au lieu d'un 0 muet).
  const kpis: { label: string; value: number; icon: React.ReactNode; tone: StatTone; hint: string }[] = [
    { label: 'Candidatures', value: stats?.applications.total ?? 0, icon: <Send size={20} strokeWidth={2.4} />, tone: 'violet',
      hint: (stats?.applications.total ?? 0) > 0 ? 'Total envoyé' : 'Postule pour démarrer' },
    { label: 'En attente', value: stats?.applications.pending ?? 0, icon: <Clock size={20} strokeWidth={2.4} />, tone: 'blue',
      hint: (stats?.applications.pending ?? 0) > 0 ? 'Réponse en cours' : 'Rien en attente' },
    { label: 'Entretiens', value: stats?.applications.interview ?? 0, icon: <CalendarCheck size={20} strokeWidth={2.4} />, tone: 'amber',
      hint: (stats?.applications.interview ?? 0) > 0 ? 'Décrochés 🎉' : 'Relance pour en décrocher' },
    { label: 'Offres', value: stats?.applications.offer ?? 0, icon: <Award size={20} strokeWidth={2.4} />, tone: 'emerald',
      hint: (stats?.applications.offer ?? 0) > 0 ? 'Reçues 🎉' : 'Continue, ça arrive' },
  ];

  // Écran « premiers pas » — tant qu'aucun CV n'a été généré, l'Accueil habituel
  // (8 blocs : arsenal, carte étape, anneau profil, KPIs, parcours, actions rapides,
  // astuce) noie la seule chose qui compte sous une richesse que personne n'a encore
  // gagnée. Revue produit du 28/09 : sur 54 inscrits, ~1 CV généré — la dispersion de
  // cet écran y est pour beaucoup. Ici, une seule carte, une seule action ; le reste
  // (KPIs, astuces, actions rapides) réapparaît naturellement dès le premier CV, sans
  // rien avoir été supprimé pour les comptes actifs.
  if (!loading && stats && stats.cvCount === 0) {
    const stepIndex = next.to === '/prepare/profile' ? 0 : 1; // « Complète ton profil » ou « Génère ton CV »
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-5 md:p-8">
        <div className="max-w-lg w-full animate-fade-in-up">
          <div className="relative overflow-hidden rounded-[2rem] p-8 sm:p-11 text-center bg-gradient-to-br from-[#9B7BFF] via-[#7D5CFF] to-[#6D28D9] text-white shadow-card">
            <span aria-hidden className="pointer-events-none absolute -right-10 -bottom-14 w-52 h-52 rounded-full bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute -left-12 -top-16 w-40 h-40 rounded-full bg-white/[0.07]" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            />
            <div className="relative">
              <span className="icon-shine inline-flex w-16 h-16 rounded-2xl bg-white/15 items-center justify-center shadow-lg">
                <Rocket size={28} />
              </span>
              <h1 className="mt-6 text-2xl sm:text-[1.75rem] font-black tracking-tight !text-white">
                {greeting} {firstName} 👋
              </h1>
              <p className="mt-3 text-white/85 leading-relaxed max-w-sm mx-auto">{next.desc}</p>
              <Link
                to={next.to}
                className="press mt-8 inline-flex items-center gap-2 bg-white text-[#6D28D9] font-bold text-sm rounded-xl px-6 py-3.5 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(0,0,0,0.35)] transition-all"
              >
                {next.title} <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Repère du parcours — minimal, orientation seulement, pas de nouvelles cartes. */}
          <div className="mt-7 flex items-center justify-center gap-2.5 text-xs font-semibold text-[#9CA3AF]">
            <span className={stepIndex === 0 ? 'text-[#7D5CFF]' : ''}>1 · Préparer</span>
            <ArrowRight size={12} />
            <span>2 · Postuler</span>
            <ArrowRight size={12} />
            <span>3 · Suivre</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        tone="violet"
        eyebrow={<span className="capitalize">{today}</span>}
        icon={<Sparkles size={22} />}
        decor={<HeroDecor variant="accueil" />}
        title={<>{greeting} <span className="bg-gradient-to-r from-[#7D5CFF] via-[#8C6DFF] to-[#B49CFF] bg-clip-text text-transparent">{firstName}</span> <span className="inline-block origin-[70%_70%] animate-[wave_1.8s_ease-in-out_1]">👋</span></>}
        subtitle="Voici l'état de ta recherche aujourd'hui."
        actions={
          !loading && stats ? (
            <div className="flex flex-wrap items-center gap-2">
              {arsenal.map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-white/5 backdrop-blur border border-[#ECEAF6] dark:border-[#1F2937] text-xs font-semibold text-[#374151] dark:text-slate-300 hover:border-[#7D5CFF]/40 hover:text-[#7D5CFF] transition-colors"
                >
                  <span className="text-[#7D5CFF]">{a.icon}</span>
                  <span className="tabular-nums">{a.count}</span> {a.label}
                </Link>
              ))}
            </div>
          ) : undefined
        }
      />

      <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8 md:space-y-6 pb-28 md:pb-10">
        {/* Bloc focal : grande carte « prochaine étape » + anneau de profil. */}
        <div className="grid lg:grid-cols-3 gap-4 items-stretch">
          <Tilt glare className="lg:col-span-2 h-full" max={6}>
            <Link
              to={next.to}
              className="press group relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between gap-5 rounded-2xl p-6 bg-gradient-to-br from-[#9B7BFF] via-[#7D5CFF] to-[#6D28D9] text-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-fade-in-up"
            >
              {/* Décor : halos + trame de points façon pitch deck (purement décoratif) */}
              <span aria-hidden className="pointer-events-none absolute -right-8 -bottom-12 w-44 h-44 rounded-full bg-white/10" />
              <span aria-hidden className="pointer-events-none absolute -left-10 -top-14 w-36 h-36 rounded-full bg-white/[0.07]" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
              />
              <div className="relative flex items-start gap-4 min-w-0">
                <span className="icon-shine w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  {loading ? <Loader2 size={22} className="animate-spin" /> : next.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-white/75">Prochaine étape</p>
                  <p className="font-bold text-lg md:text-xl leading-snug mt-0.5 !text-white">{next.title}</p>
                  <p className="text-white/80 text-sm mt-1 max-w-md leading-relaxed">{next.desc}</p>
                </div>
              </div>
              <span className="tab-shine relative self-start inline-flex items-center gap-2 bg-white text-[#6D28D9] font-semibold text-sm rounded-xl px-4 py-2.5 shadow-[0_4px_14px_rgba(0,0,0,0.12)] group-hover:gap-3 group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-all">
                Continuer <ArrowRight size={16} />
              </span>
            </Link>
          </Tilt>

          <Tilt max={6} className="h-full">
            <Link
              to="/prepare/profile"
              className="press card-pro h-full flex flex-col items-center justify-center text-center gap-3 hover:-translate-y-0.5 animate-fade-in-up"
            >
              {/* Anneau conic : dégradé + halo doux ; vert quand le profil est complet. */}
              <div className="relative">
                <span aria-hidden className={`pointer-events-none absolute inset-0 m-auto w-20 h-20 rounded-full blur-2xl ${pct >= 100 ? 'bg-emerald-400/30' : 'bg-[#7D5CFF]/25'}`} />
                <div
                  className="relative w-[92px] h-[92px] rounded-full grid place-items-center"
                  style={{
                    background: pct >= 100
                      ? `conic-gradient(#34D399, #0D9488 ${pct * 3.6}deg, rgba(16,185,129,0.15) ${pct * 3.6}deg)`
                      : `conic-gradient(#B49CFF, #7D5CFF ${pct * 3.6}deg, rgba(125,92,255,0.14) ${pct * 3.6}deg)`,
                  }}
                >
                  <div className="w-[70px] h-[70px] rounded-full bg-white dark:bg-[#111827] grid place-items-center">
                    <span className="text-xl font-black text-[#111827] dark:text-white tabular-nums tracking-tight">
                      {loading ? '–' : `${pct}%`}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white">Profil complété</p>
                <p className={`text-xs font-medium ${pct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#9CA3AF]'}`}>
                  {pct >= 100 ? 'Profil au top ✨' : pct >= 80 ? 'Presque parfait !' : pct >= 50 ? 'Bien parti, continue' : 'Pose les fondations'}
                </p>
                {/* Fini le pourcentage muet : on dit QUOI compléter (3 premiers manques). */}
                {!loading && pct < 100 && (stats?.profileMissing?.length ?? 0) > 0 && (
                  <p className="text-[11px] text-[#9CA3AF] mt-1.5 leading-snug max-w-[210px] mx-auto">
                    Il manque&nbsp;:{' '}
                    <span className="text-[#7D5CFF] font-semibold">
                      {stats!.profileMissing!.slice(0, 3).join(', ')}{stats!.profileMissing!.length > 3 ? '…' : ''}
                    </span>
                  </p>
                )}
              </div>
            </Link>
          </Tilt>
        </div>

        {/* Bandeau paiement — mis en avant (demande explicite du 28/09 : la pastille de
            nav ne suffisait pas). Visible pour tout compte non abonné, essai compris :
            c'est justement pendant l'essai, quand la personne voit la valeur complète,
            que « passer à Élite » convertit le mieux — plus facile à décider qu'après,
            quand l'accès s'est déjà refermé. Pas de bandeau pour les comptes abonnés
            (rien à vendre) ni les comptes illimités (internes). */}
        {!loading && usage && !usage.isSubscribed && !usage.unlimited && (
          <Link
            to="/pricing"
            className="press group relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl p-5 bg-gradient-to-r from-[#8C6DFF] to-[#6D28D9] text-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all animate-fade-in-up"
          >
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
            <span className="relative w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Crown size={22} />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="font-bold !text-white leading-tight">
                {usage.inTrial ? `Essai Élite · ${usage.trialDaysLeft} jour${usage.trialDaysLeft > 1 ? 's' : ''} restant${usage.trialDaysLeft > 1 ? 's' : ''}` : 'Passe à Élite'}
              </p>
              <p className="text-sm text-white/80 mt-0.5">
                {usage.inTrial
                  ? "Garde l'accès complet après l'essai : candidatures spontanées, CV et lettres sans limite."
                  : '150 candidatures IA par mois, CV et lettres illimités, candidatures spontanées débloquées.'}
              </p>
            </div>
            <span className="relative shrink-0 inline-flex items-center gap-2 bg-white text-[#6D28D9] font-semibold text-sm rounded-xl px-4 py-2.5 group-hover:gap-3 transition-all">
              Voir les tarifs <ArrowRight size={16} />
            </span>
          </Link>
        )}

        {/* Offres de l'organisme du candidat (adhérent) — mises en avant sur l'Accueil.
            Bandeau violet clair pour bien les distinguer des offres externes. */}
        {partnerOffers.length > 0 && (
          <section className="card-pro !p-5 animate-fade-in-up border border-[#7D5CFF]/20">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#111827] dark:text-white leading-tight">Offres de votre organisme</h2>
                <p className="text-xs text-[#9CA3AF]">Publiées spécialement pour vous par vos organismes partenaires.</p>
              </div>
              <Link to="/target/offers" className="press ml-auto hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#7D5CFF] hover:gap-1.5 transition-all shrink-0">
                Tout voir <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partnerOffers.slice(0, 4).map((o) => (
                <Link
                  key={o.id}
                  to="/target/offers"
                  className="press group flex items-start gap-3 p-3.5 rounded-xl border border-[#ECEAF6] dark:border-[#1F2937] bg-white/60 dark:bg-[#111827]/60 hover:border-[#7D5CFF]/40 hover:bg-white dark:hover:bg-[#111827] transition-all"
                >
                  {o.partner?.logoUrl ? (
                    <span className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-[#ECEAF6] dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={o.partner.logoUrl} alt={o.partner.name} className="w-full h-full object-contain p-1" />
                    </span>
                  ) : (
                    <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8C6DFF] to-[#5B3FD6] text-white flex items-center justify-center font-bold shrink-0">
                      {(o.partner?.name || o.company || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6D28D9] dark:text-[#B9A7FF] mb-0.5">
                      <Building2 size={10} /> {o.partner?.name || o.company}
                    </span>
                    <p className="text-sm font-bold text-[#111827] dark:text-white leading-tight truncate">{o.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-[#9CA3AF]">
                      {o.type && <span className="inline-flex items-center gap-1"><Briefcase size={10} />{o.type}</span>}
                      {o.location && <span className="inline-flex items-center gap-1"><MapPin size={10} />{o.location}</span>}
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-[#C4C4CC] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all mt-1" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* KPIs de suivi — ou état vide encourageant tant qu'aucune candidature n'existe
            (évite l'écran « 0 · 0 · 0 · 0 » qui paraît mort au tout premier lancement). */}
        {!loading && stats && stats.applications.total === 0 ? (
          <section className="card-pro !p-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left animate-fade-in-up">
            <span className="w-14 h-14 rounded-2xl surface-accent text-[#7D5CFF] flex items-center justify-center shrink-0">
              <Send size={26} strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[#111827] dark:text-white">Ton tableau de bord t'attend</p>
              <p className="text-sm text-[#6B7280] dark:text-slate-400 mt-0.5">
                Candidatures, entretiens, offres… tes statistiques s'animeront ici dès ta première candidature. 🚀
              </p>
            </div>
            <Link to="/target/offers" className="press btn btn-primary shrink-0 w-full sm:w-auto">
              Postuler maintenant <ArrowRight size={16} />
            </Link>
          </section>
        ) : (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {kpis.map((k) => (
              <Tilt key={k.label} className="h-full" max={9}>
                <StatCard
                  className="h-full"
                  label={k.label}
                  value={loading ? '–' : <CountUp value={k.value} />}
                  icon={k.icon}
                  tone={k.tone}
                  hint={loading ? '' : k.hint}
                />
              </Tilt>
            ))}
          </section>
        )}

        {/* Mon parcours — plein largeur. Avant, ce bloc partageait l'écran avec
            « Actions rapides » (redondant : ses 4 liens mènent dans ces 3 mêmes
            étapes) et une « Astuce du jour » figée. Les deux retirés (28/09) —
            rien de perdu : chaque action reste à un clic, dans l'étape qui la
            contient déjà, sans une troisième carte permanente pour y accéder. */}
        <section className="card-pro !p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3">Mon parcours</h2>
          <div className="grid sm:grid-cols-3 gap-1.5">
            {spaces.map((s, i) => (
              <Link
                key={s.to}
                to={s.to}
                className="press group relative flex items-center gap-3 rounded-xl p-2.5 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937] transition-colors"
              >
                <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconCls}`}>
                  {s.icon}
                  <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full bg-white dark:bg-[#111827] border border-[#ECEAF6] dark:border-[#1F2937] text-[9px] font-black text-[#9CA3AF] grid place-items-center">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">{s.title}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{s.desc}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-[#C4C4CC] group-hover:text-[#7D5CFF] group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Accueil;
