import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { authHeaders } from '../services/authToken';
import CountUp from '../components/CountUp';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';
import {
  UserRound, Plus, ArrowRight, FileText, Search, Bell, Loader2, PenLine, Bookmark,
  Building2, MapPin, Briefcase, Check, ChevronRight, BellRing, Target
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

// Détermine LA prochaine action la plus pertinente selon l'état du compte.
const getNextAction = (stats: DashboardStats | null) => {
  const fallback = {
    to: '/target/offers',
    icon: <Plus size={20} />,
    title: 'Nouvelle candidature',
    desc: 'Parcours les offres sélectionnées pour toi.',
  };
  if (!stats) return fallback;

  // Repli si le backend n'expose pas encore canGenerateCV : on déduit le minimum
  // vital de la liste des manques.
  const canGenerateCV = stats.canGenerateCV
    ?? !(stats.profileMissing ?? []).includes('ton métier cible');

  // Le premier CV passe AVANT la complétion du profil : c'est le moment où la
  // valeur apparaît. Le profil se complète ensuite.
  if (!canGenerateCV) {
    return { to: '/prepare/profile', icon: <UserRound size={20} />, title: 'Complète ton profil', desc: 'Ton métier visé et quelques lignes sur ton parcours suffisent pour un premier CV.' };
  }
  if (stats.cvCount === 0) {
    return { to: '/prepare/cv', icon: <FileText size={20} />, title: 'Crée ton premier CV', desc: 'Il est rédigé à partir de ton profil. Compte une minute, tu pourras tout modifier ensuite.' };
  }
  if (stats.profileCompletion < 50) {
    return { to: '/prepare/profile', icon: <UserRound size={20} />, title: 'Complète ton profil', desc: `Rempli à ${stats.profileCompletion} %. Plus il est précis, plus tes documents le seront.` };
  }
  if (stats.applications.total === 0) {
    return { to: '/target/offers', icon: <Search size={20} />, title: 'Postule à ta première offre', desc: 'Ton CV est prêt. Les offres qui correspondent à ton profil t’attendent.' };
  }
  if (stats.applications.pending > 0) {
    const n = stats.applications.pending;
    return { to: '/track', icon: <Bell size={20} />, title: `Relance ${n} candidature${n > 1 ? 's' : ''}`, desc: 'Sans nouvelles après une semaine, une relance polie augmente nettement les chances de réponse.' };
  }
  return { to: '/target/offers', icon: <Plus size={20} />, title: 'Trouve de nouvelles offres', desc: 'De nouvelles annonces arrivent chaque jour.' };
};

interface AppLite {
  id: string;
  company: string;
  title: string;
  status: 'PENDING' | 'SENT' | 'INTERVIEW' | 'OFFER' | 'REJECTED';
  appliedAt: string;
}

const DAY = 86_400_000;
const WEEKS = 8;

/* Candidatures par semaine sur les 8 dernières semaines (lundi → dimanche). */
const weeklyCounts = (apps: AppLite[]) => {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: WEEKS }, (_, i) => {
    const start = monday.getTime() - (WEEKS - 1 - i) * 7 * DAY;
    const end = start + 7 * DAY;
    const count = apps.filter((a) => { const t = new Date(a.appliedAt).getTime(); return t >= start && t < end; }).length;
    return { start: new Date(start), count, current: i === WEEKS - 1 };
  });
};

/* Dernière visite de l'Accueil (lue une fois au montage, puis mise à jour). */
const readLastVisit = (): number | null => {
  try {
    const v = Number(localStorage.getItem('joboost-last-visit'));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};

const Accueil: React.FC<AccueilProps> = ({ user }) => {
  const firstName = user?.name?.split(' ')[0] || '';
  const [lastVisit] = useState<number | null>(readLastVisit);
  useEffect(() => {
    try { localStorage.setItem('joboost-last-visit', String(Date.now())); } catch { /* stockage indisponible */ }
  }, []);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerOffers, setPartnerOffers] = useState<PartnerOffer[]>([]);
  const [apps, setApps] = useState<AppLite[]>([]);
  // Abonnement (encart « Passer à Élite ») — chargé à part de /dashboard/stats, qui ne connaît pas le plan.
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
        /* silencieux : pas d'encart plutôt qu'une erreur visible */
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

  // Candidatures (graphique d'activité + relances) : chargées à part, sans bloquer.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/applications?limit=100`, {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        const data = await res.json();
        if (alive && data.success) setApps(data.data || []);
      } catch {
        /* silencieux : les deux blocs ne s'affichent simplement pas */
      }
    })();
    return () => { alive = false; };
  }, []);

  const next = getNextAction(stats);
  const pct = stats?.profileCompletion ?? 0;

  const hour = new Date().getHours();
  const awayHours = lastVisit ? (Date.now() - lastVisit) / 3_600_000 : 0;
  // Salutation : « Te revoilà » après une absence, sinon selon l'heure.
  const greeting = awayHours >= 20 ? 'Te revoilà' : hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
  const greetingLine = `${greeting}${firstName ? ` ${firstName}` : ''}`;
  // Ce que la personne cherche, tel qu'indiqué dans son profil.
  const target = [user?.title, user?.city?.split(',')[0]].filter(Boolean).join(' · ');
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const showUpgrade = !loading && usage && !usage.isSubscribed && !usage.unlimited;

  /* ───────── Premiers pas : aucun CV encore ─────────
     Revue produit du 28/09 : sur 54 inscrits, ~1 CV généré. Tant qu'aucun CV
     n'existe, on montre 3 étapes et une seule action possible : celle de
     l'étape en cours. Le tableau de bord complet apparaît au premier CV. */
  if (!loading && stats && stats.cvCount === 0) {
    const profileDone = next.to !== '/prepare/profile';
    const steps = [
      { title: 'Indique le métier que tu vises', desc: 'Et quelques lignes sur ton parcours.', done: profileDone, to: '/prepare/profile', cta: 'Compléter mon profil' },
      { title: 'Crée ton premier CV', desc: 'Rédigé à partir de ton profil, en une minute.', done: false, to: '/prepare/cv', cta: 'Créer mon CV' },
      { title: 'Postule à une première offre', desc: 'Des annonces choisies selon ton métier et ta ville.', done: false, to: '/target/offers', cta: 'Voir les offres' },
    ];
    const current = steps.findIndex((st) => !st.done);

    return (
      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-16 animate-fade-in">
        <div className="flex items-center gap-4">
          <ProfilePhotoPicker layout="avatar" size={64} />
          <div className="min-w-0">
            <p className="eyebrow capitalize">{today}</p>
            <h1 className="mt-1 text-[28px] md:text-[34px] leading-tight">Bienvenue{firstName ? ` ${firstName}` : ''}</h1>
          </div>
        </div>
        <p className="mt-5 text-[15px] text-muted">
          {user?.title
            ? <>Trouvons ton prochain poste de <span className="text-ink font-medium">{user.title.toLowerCase()}</span>. Trois étapes pour envoyer ta première candidature, compte une dizaine de minutes.</>
            : 'Trois étapes pour envoyer ta première candidature. Compte une dizaine de minutes.'}
        </p>
        {!user?.photoUrl && (
          <p className="mt-2 text-[13px] text-faint">Astuce : clique sur le rond pour ajouter ta photo. Elle apparaîtra aussi sur tes CV avec photo.</p>
        )}

        <ol className="mt-8 surface divide-y divide-line">
          {steps.map((st, i) => {
            const active = i === current;
            return (
              <li key={st.title} className={`flex gap-4 p-5 ${active || st.done ? '' : 'opacity-60'}`}>
                <span
                  className={`mt-0.5 w-7 h-7 rounded-full grid place-items-center text-[13px] font-semibold shrink-0 ${
                    st.done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-brand text-white'
                        : 'border border-line-strong text-faint'
                  }`}
                >
                  {st.done ? <Check size={15} strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${st.done ? 'text-muted' : 'text-ink'}`}>{st.title}</p>
                  <p className="text-sm text-muted mt-0.5">{st.done ? 'Fait.' : st.desc}</p>
                  {active && (
                    <Link to={st.to} className="btn btn-primary mt-4">
                      {st.cta} <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  /* ───────── Compte actif ───────── */
  const appStats = stats?.applications;
  const weeks = weeklyCounts(apps);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.count));
  const thisWeek = weeks[WEEKS - 1].count;
  const lastWeek = weeks[WEEKS - 2].count;
  const followUps = apps
    .filter((a) => a.status === 'SENT' && Date.now() - new Date(a.appliedAt).getTime() >= 7 * DAY)
    .sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime())
    .slice(0, 3);
  // Une phrase qui parle de SA recherche, pas une formule générique.
  const interviews = appStats?.interview ?? 0;
  const dailyLine = (() => {
    if (interviews > 0) return `Tu as ${interviews} entretien${interviews > 1 ? 's' : ''} en cours. C’est le moment de bien te préparer.`;
    if (followUps.length > 0) return `${followUps.length} candidature${followUps.length > 1 ? 's attendent' : ' attend'} une relance depuis plus d’une semaine.`;
    if (thisWeek > 0) return `${thisWeek} candidature${thisWeek > 1 ? 's envoyées' : ' envoyée'} cette semaine. Continue sur ce rythme.`;
    if (usage?.inTrial && usage.trialDaysLeft <= 2) return `Ton essai se termine dans ${usage.trialDaysLeft} jour${usage.trialDaysLeft > 1 ? 's' : ''}.`;
    if (awayHours >= 72) return 'De nouvelles offres sont arrivées depuis ta dernière visite.';
    return 'Voici où en est ta recherche aujourd’hui.';
  })();

  const kpis = [
    { label: 'Candidatures', value: appStats?.total ?? 0 },
    { label: 'En attente', value: appStats?.pending ?? 0 },
    { label: 'Entretiens', value: appStats?.interview ?? 0 },
    { label: 'Offres reçues', value: appStats?.offer ?? 0 },
  ];
  const docs = [
    { to: '/prepare/cv', icon: <FileText size={16} />, label: 'CV', count: stats?.cvCount ?? 0 },
    { to: '/prepare/letter', icon: <PenLine size={16} />, label: 'Lettres', count: stats?.letterCount ?? 0 },
    { to: '/target/saved', icon: <Bookmark size={16} />, label: 'Offres sauvegardées', count: stats?.savedCount ?? 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 pt-8 md:pt-10 pb-16 animate-fade-in">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <ProfilePhotoPicker layout="avatar" size={64} />
          <div className="min-w-0">
            <p className="eyebrow capitalize">{today}</p>
            <h1 className="mt-1 text-[26px] md:text-[30px] leading-tight truncate">{greetingLine}</h1>
            <p className="mt-1 text-[15px] text-muted">{loading ? '\u00a0' : dailyLine}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {target ? (
            <Link to="/prepare/profile" className="chip hover:border-line-strong hover:text-ink transition-colors" title="Modifier ce que tu recherches">
              <Target size={13} className="text-brand dark:text-brand-300" /> {target}
            </Link>
          ) : (
            <Link to="/prepare/profile" className="chip hover:border-line-strong hover:text-ink transition-colors">
              <Target size={13} /> Indiquer le poste recherché
            </Link>
          )}
          <Link to="/target/offers" className="btn btn-secondary">
            <Search size={16} /> Chercher des offres
          </Link>
        </div>
      </header>

      <div className="mt-8 grid lg:grid-cols-3 gap-5 items-start">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          {/* Prochaine étape */}
          <section className="surface p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="w-11 h-11 rounded-xl bg-brand/10 text-brand dark:text-brand-300 grid place-items-center shrink-0">
              {loading ? <Loader2 size={20} className="animate-spin" /> : next.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Prochaine étape</p>
              <p className="mt-1 text-[17px] font-semibold text-ink leading-snug">{next.title}</p>
              <p className="text-sm text-muted mt-0.5">{next.desc}</p>
            </div>
            <Link to={next.to} className="btn btn-primary shrink-0">
              Continuer <ArrowRight size={16} />
            </Link>
          </section>

          {/* Chiffres clés */}
          <section className="surface">
            <div className="flex items-center justify-between px-5 pt-4">
              <h2 className="text-[15px]">Tes candidatures</h2>
              <Link to="/track" className="text-[13px] font-medium text-muted hover:text-ink inline-flex items-center gap-0.5">
                Tout voir <ChevronRight size={15} />
              </Link>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 mt-1">
              {kpis.map((k, i) => (
                <div
                  key={k.label}
                  className={`px-5 py-4 border-line ${i % 2 === 1 ? 'border-l' : ''} ${i === 2 ? 'sm:border-l' : ''} ${i > 1 ? 'border-t sm:border-t-0' : ''}`}
                >
                  <dt className="text-[13px] text-muted">{k.label}</dt>
                  <dd className="mt-1 text-[28px] font-semibold tracking-tight tabular-nums text-ink">
                    {loading ? '–' : <CountUp value={k.value} />}
                  </dd>
                </div>
              ))}
            </dl>
            {!loading && (appStats?.total ?? 0) === 0 && (
              <div className="border-t border-line px-5 py-3.5 flex items-center justify-between gap-4">
                <p className="text-sm text-muted">Aucune candidature pour l’instant.</p>
                <Link to="/target/offers" className="text-[13px] font-medium text-brand dark:text-brand-300 whitespace-nowrap">
                  Postuler à une offre →
                </Link>
              </div>
            )}
          </section>

          {/* Activité : candidatures par semaine */}
          {apps.length > 0 && (
            <section className="surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px]">Ton rythme</h2>
                  <p className="text-[13px] text-muted mt-0.5">
                    {thisWeek} candidature{thisWeek > 1 ? 's' : ''} cette semaine
                    {lastWeek > 0 && thisWeek !== lastWeek && (
                      <span className={thisWeek > lastWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-faint'}>
                        {' '}· {thisWeek > lastWeek ? '+' : ''}{thisWeek - lastWeek} par rapport à la semaine dernière
                      </span>
                    )}
                  </p>
                </div>
                <span className="eyebrow shrink-0">8 semaines</span>
              </div>
              <div className="mt-5 flex items-end gap-2 h-28" role="img" aria-label={`Candidatures par semaine : ${weeks.map((w) => w.count).join(', ')}`}>
                {weeks.map((w) => (
                  <div key={w.start.toISOString()} className="group flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                    <span className="text-[11px] tabular-nums text-faint opacity-0 group-hover:opacity-100 transition-opacity">{w.count}</span>
                    <div
                      className={`w-full rounded-md transition-all duration-700 ${w.current ? 'bg-brand' : w.count ? 'bg-brand/25 dark:bg-brand/35 group-hover:bg-brand/40' : 'bg-subtle'}`}
                      style={{ height: `${Math.max(4, (w.count / maxWeek) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2 text-[11px] text-faint">
                {weeks.map((w) => (
                  <span key={w.start.toISOString()} className="flex-1 text-center tabular-nums truncate">
                    {w.current ? 'Cette sem.' : w.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* À relancer : envoyées depuis 7 jours ou plus, sans réponse */}
          {followUps.length > 0 && (
            <section className="surface">
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <BellRing size={16} className="text-amber-500" />
                  <h2 className="text-[15px]">À relancer</h2>
                </div>
                <Link to="/track" className="text-[13px] font-medium text-muted hover:text-ink inline-flex items-center gap-0.5">
                  Suivi <ChevronRight size={15} />
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {followUps.map((a) => {
                  const days = Math.floor((Date.now() - new Date(a.appliedAt).getTime()) / DAY);
                  return (
                    <li key={a.id}>
                      <Link to="/track" className="flex items-center gap-3.5 px-5 py-3 hover:bg-subtle/60 transition-colors">
                        <span className="w-9 h-9 rounded-lg bg-subtle text-muted grid place-items-center text-sm font-semibold shrink-0">
                          {a.company?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink truncate">{a.title}</p>
                          <p className="text-xs text-faint truncate">{a.company}</p>
                        </div>
                        <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-md px-2 h-6 inline-flex items-center shrink-0 tabular-nums">
                          {days} j sans réponse
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Offres des organismes partenaires du candidat */}
          {partnerOffers.length > 0 && (
            <section className="surface">
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
                <div className="min-w-0">
                  <h2 className="text-[15px]">Offres de ton organisme</h2>
                  <p className="text-[13px] text-faint">Publiées pour toi par ta structure d’accompagnement.</p>
                </div>
                <Link to="/target/offers" className="text-[13px] font-medium text-muted hover:text-ink inline-flex items-center gap-0.5 shrink-0">
                  Tout voir <ChevronRight size={15} />
                </Link>
              </div>
              <ul className="divide-y divide-line">
                {partnerOffers.slice(0, 4).map((o) => (
                  <li key={o.id}>
                    <Link to="/target/offers" className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-subtle/60 transition-colors">
                      {o.partner?.logoUrl ? (
                        <span className="w-10 h-10 rounded-lg bg-white border border-line grid place-items-center shrink-0 overflow-hidden">
                          <img src={o.partner.logoUrl} alt="" className="w-full h-full object-contain p-1" />
                        </span>
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-subtle text-muted grid place-items-center font-semibold shrink-0">
                          {(o.partner?.name || o.company || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{o.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-faint">
                          <span className="inline-flex items-center gap-1"><Building2 size={11} />{o.partner?.name || o.company}</span>
                          {o.type && <span className="inline-flex items-center gap-1"><Briefcase size={11} />{o.type}</span>}
                          {o.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{o.location}</span>}
                        </div>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-faint group-hover:text-ink transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-5 min-w-0">
          {/* Profil */}
          <Link to="/prepare/profile" className="card-link block p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px]">Ton profil</h2>
              <span className="text-sm font-semibold tabular-nums text-ink">{loading ? '–' : `${pct} %`}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-subtle overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-[13px] text-muted leading-snug">
              {pct >= 100
                ? 'Complet. Tes documents s’appuient sur toutes tes informations.'
                : (stats?.profileMissing?.length ?? 0) > 0
                  ? <>À ajouter : {stats!.profileMissing!.slice(0, 3).join(', ')}{stats!.profileMissing!.length > 3 ? '…' : ''}</>
                  : 'Quelques informations manquent encore.'}
            </p>
          </Link>

          {/* Documents */}
          <section className="surface">
            <h2 className="text-[15px] px-5 pt-4 pb-1">Tes documents</h2>
            <ul className="pb-2">
              {docs.map((d) => (
                <li key={d.to}>
                  <Link to={d.to} className="flex items-center gap-3 px-5 py-2.5 hover:bg-subtle/60 transition-colors">
                    <span className="text-faint">{d.icon}</span>
                    <span className="flex-1 text-sm text-ink">{d.label}</span>
                    <span className="text-sm tabular-nums text-muted">{loading ? '–' : d.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Abonnement — visible pour tout compte non abonné, essai compris :
              c'est pendant l'essai, quand la valeur est visible, que l'offre se décide. */}
          {showUpgrade && (
            <section className="rounded-[14px] border border-brand/20 bg-brand/[0.04] dark:bg-brand/10 p-5">
              <p className="text-[15px] font-semibold text-ink">
                {usage!.inTrial
                  ? `Essai Élite : encore ${usage!.trialDaysLeft} jour${usage!.trialDaysLeft > 1 ? 's' : ''}`
                  : 'Passe à Élite'}
              </p>
              <p className="mt-1 text-[13px] text-muted leading-snug">
                {usage!.inTrial
                  ? 'Garde l’accès complet après l’essai : CV et lettres sans limite, candidatures spontanées.'
                  : '150 candidatures par mois, CV et lettres sans limite, candidatures spontanées.'}
              </p>
              <Link to="/pricing" className="btn btn-primary w-full mt-4">Voir les formules</Link>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Accueil;
