import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, MapPin, Users, Send, X, Undo2, Search, Mail, Check, Loader2, Pencil, ChevronDown,
  ShieldCheck, ExternalLink, Clock, AlertTriangle, Trash2, Inbox, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import EmptyState from '../components/EmptyState';
import UpgradeDialog from '../components/UpgradeDialog';

/* ════════════════════════════════════════════════════════════════════
   Candidatures spontanées — campagne « à la Jobea » (refonte 10/2026).

   1. Trier   : les entreprises qui recrutent sans annonce (La Bonne Boîte),
                en cartes. À droite : on garde → Joboost cherche l'adresse
                e-mail et écrit une lettre qui parle de l'entreprise.
   2. Valider : le candidat relit chaque lettre, la corrige, ajoute l'adresse
                si on ne l'a pas trouvée, puis valide. Rien ne part sans lui.
   3. Envoyer : depuis SA boîte Gmail (mot de passe d'application, envoi seul),
                une candidature à la fois, espacées, 12 par jour au plus.
   ════════════════════════════════════════════════════════════════════ */

const API = import.meta.env.VITE_API_URL || '';
const json = { 'Content-Type': 'application/json' };

interface Company {
  id: string; // lbb_<siret>
  name: string;
  address: string;
  sector: string;
  size: string;
  hiringPotential: string;
  reason: string;
  contactEmail: string | null;
  acceptsEmail?: boolean;
  matchScore?: number;
}

interface Spontaneous {
  id: string;
  companyName: string;
  companyAddress?: string | null;
  companySector?: string | null;
  companySize?: string | null;
  contactEmail?: string | null;
  contactSource?: string | null;
  coverLetterText?: string | null;
  status: string;
  sentAt?: string | null;
  createdAt: string;
}

interface Mailbox { connected: boolean; email?: string; status?: string; lastError?: string | null; dailyLimit?: number }
interface Campaign { mailbox: Mailbox; sentToday: number; dailyLimit: number; queuedIds: string[]; spacingMinutes: number; inSendingWindow: boolean; estimatedDays: number }

type Step = 'sort' | 'review' | 'send';
type PrepState = 'preparing' | 'done' | 'error';

const hueOf = (name: string) => { let h = 0; for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return h % 360; };
const tidy = (s: string) => (s && s === s.toUpperCase() && s.length > 3 ? s.toLowerCase().replace(/(^|[\s\-'(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) : s);
const sirenOf = (id: string) => (id || '').replace(/^lbb_/, '').slice(0, 9);

const SWIPE = 100;

/* ─────────── Connexion de la boîte Gmail ─────────── */
const MailboxConnect: React.FC<{ onConnected: () => void; defaultEmail?: string }> = ({ onConnected, defaultEmail }) => {
  const [email, setEmail] = useState(defaultEmail || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API}/api/mailbox`, { method: 'POST', credentials: 'include', headers: { ...json, ...authHeaders() }, body: JSON.stringify({ email, appPassword: code }) });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Connexion impossible.'); return; }
      setCode('');
      toast.success('Boîte mail connectée');
      onConnected();
    } catch { setError('Erreur réseau.'); } finally { setBusy(false); }
  };
  return (
    <div className="surface p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand/10 text-brand dark:text-brand-300 grid place-items-center shrink-0"><Mail size={19} /></span>
        <div className="min-w-0">
          <h2 className="text-[17px]">Envoyer depuis ta boîte Gmail</h2>
          <p className="text-sm text-muted mt-1">Tes candidatures partent de ton adresse, à ton nom, et les réponses arrivent directement chez toi. Joboost peut uniquement <strong className="text-ink font-medium">envoyer</strong> : rien n’est lu dans ta boîte.</p>
        </div>
      </div>

      <ol className="mt-5 space-y-3 text-sm">
        {[
          <>Active la <strong className="text-ink font-medium">validation en deux étapes</strong> de ton compte Google (si ce n’est pas déjà fait). <a className="text-brand dark:text-brand-300 underline underline-offset-2" href="https://myaccount.google.com/signinoptions/twosv" target="_blank" rel="noopener noreferrer">Ouvrir</a></>,
          <>Crée un <strong className="text-ink font-medium">mot de passe d’application</strong> nommé « Joboost ». Google affiche 16 lettres. <a className="text-brand dark:text-brand-300 underline underline-offset-2" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">Ouvrir</a></>,
          <>Colle ces 16 lettres ci-dessous. Tu pourras le supprimer à tout moment depuis ton compte Google.</>,
        ].map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-subtle text-muted grid place-items-center text-xs font-semibold shrink-0">{i + 1}</span>
            <span className="text-muted leading-relaxed">{t}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="mt-5 grid sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="mb-email" className="input-label">Adresse Gmail</label>
          <input id="mb-email" type="email" required autoComplete="email" className="input-pro" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@gmail.com" />
        </div>
        <div>
          <label htmlFor="mb-code" className="input-label">Mot de passe d’application</label>
          <input id="mb-code" type="password" required autoComplete="off" className="input-pro font-mono tracking-wider" value={code} onChange={(e) => setCode(e.target.value)} placeholder="abcd efgh ijkl mnop" />
        </div>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          <p className="text-xs text-faint flex items-center gap-1.5"><ShieldCheck size={13} /> Stocké chiffré, jamais affiché.</p>
          <button type="submit" disabled={busy} className="btn btn-primary">{busy ? <><Loader2 size={15} className="animate-spin" /> Vérification…</> : 'Connecter'}</button>
        </div>
      </form>
    </div>
  );
};

/* ─────────── Carte entreprise (étape Trier) ─────────── */
const CompanyCard: React.FC<{ c: Company; preview?: boolean }> = ({ c, preview }) => {
  const hue = hueOf(c.name);
  const name = tidy(c.name);
  return (
    <div className="h-full flex flex-col">
      <div className="relative h-[76px] shrink-0 flex items-center gap-3 px-4 overflow-hidden"
        style={{ background: `radial-gradient(120% 160% at 0% 0%, hsla(${hue},90%,62%,.5), transparent 60%), radial-gradient(120% 160% at 100% 100%, hsla(${(hue + 55) % 360},90%,62%,.4), transparent 55%), hsl(${hue},60%,96%)` }}>
        <span className="w-12 h-12 rounded-xl border-2 border-white/80 shadow-card grid place-items-center text-xl font-semibold text-white shrink-0"
          style={{ background: `linear-gradient(135deg, hsl(${hue},70%,55%), hsl(${(hue + 55) % 360},70%,45%))` }}>{name.charAt(0)}</span>
        <span className="inline-flex items-center h-6 px-2 rounded-full bg-white/85 text-[#121217] text-[11px] font-medium">Recrute sans annonce</span>
      </div>
      {!preview && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 scrollbar-none">
          <h2 className="text-[20px] leading-tight">{name}</h2>
          <p className="text-sm text-muted mt-1">{tidy(c.sector)}</p>
          <dl className="grid grid-cols-2 gap-2 mt-4">
            {[
              { icon: <MapPin size={14} />, label: 'Lieu', value: c.address },
              { icon: <Users size={14} />, label: 'Taille', value: c.size },
              { icon: <Sparkles size={14} />, label: 'Potentiel d’embauche', value: c.hiringPotential },
              { icon: <Mail size={14} />, label: 'Candidature par e-mail', value: c.contactEmail ? 'Adresse connue' : c.acceptsEmail ? 'Acceptée' : 'Non précisé' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-subtle/70 px-3 py-2.5 min-w-0">
                <dt className="flex items-center gap-1.5 text-[11px] text-faint">{f.icon}{f.label}</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-ink truncate" title={f.value}>{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13.5px] text-muted leading-relaxed">{c.reason}</p>
        </div>
      )}
    </div>
  );
};

/* ─────────── Page ─────────── */
const SpontaneousPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('sort');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [editingSearch, setEditingSearch] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<{ index: number; dir: 'left' | 'right' }[]>([]);
  const [prep, setPrep] = useState<Record<string, PrepState>>({});
  const [apps, setApps] = useState<Spontaneous[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [mailboxAvailable, setMailboxAvailable] = useState(true);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason: 'quota' | 'feature'; message?: string }>({ open: false, reason: 'quota' });

  const passedKey = `joboost-spont-passed:${user?.id || 'anon'}`;
  const readPassed = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(passedKey) || '[]')); } catch { return new Set(); } };
  const savePassed = (s: Set<string>) => { try { localStorage.setItem(passedKey, JSON.stringify(Array.from(s).slice(-800))); } catch { /* ignore */ } };

  // ── Données serveur : candidatures préparées + état de la campagne ──
  const refresh = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([
        fetch(`${API}/api/spontaneous`, { credentials: 'include', headers: authHeaders() }).then((r) => r.json()),
        fetch(`${API}/api/mailbox/campaign`, { credentials: 'include', headers: authHeaders() }).then((r) => r.json()),
      ]);
      if (a.success) setApps(a.data || []);
      if (c.success) setCampaign(c.data);
    } catch { /* silencieux */ }
  }, []);
  useEffect(() => {
    refresh();
    fetch(`${API}/api/mailbox`, { credentials: 'include', headers: authHeaders() }).then((r) => r.json()).then((d) => setMailboxAvailable(d.available !== false)).catch(() => {});
  }, [refresh]);

  // ── Recherche d'entreprises ──
  const search = useCallback(async (title: string, loc: string) => {
    if (!title || !loc) return;
    setSearching(true);
    try {
      const res = await fetch(`${API}/api/lbb/search?jobTitle=${encodeURIComponent(title)}&location=${encodeURIComponent(loc)}&distance=30`, { credentials: 'include', headers: authHeaders() });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Recherche impossible.'); return; }
      const passed = readPassed();
      const known = new Set(apps.map((a) => a.companyName.toLowerCase()));
      setCompanies((data.results || []).filter((c: Company) => !passed.has(c.id) && !known.has(c.name.toLowerCase())));
      setCursor(0);
      setHistory([]);
    } catch { toast.error('Recherche impossible.'); } finally { setSearching(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const started = useRef(false);
  useEffect(() => {
    if (!user || started.current) return;
    const t = user.title || '';
    const l = [user.city, (user as any).postalCode].filter(Boolean).join(' ');
    setJobTitle(t); setLocation(l);
    if (t && l) { started.current = true; search(t, l); }
  }, [user, search]);

  // ── Préparation en arrière-plan (adresse + lettre), 2 à la fois ──
  const queueRef = useRef<Company[]>([]);
  const running = useRef(0);
  const pump = useCallback(() => {
    while (running.current < 2 && queueRef.current.length) {
      const c = queueRef.current.shift()!;
      running.current++;
      setPrep((p) => ({ ...p, [c.id]: 'preparing' }));
      fetch(`${API}/api/spontaneous/prepare`, {
        method: 'POST', credentials: 'include', headers: { ...json, ...authHeaders() },
        body: JSON.stringify({
          companyName: c.name, companyAddress: c.address, companySector: c.sector, companySize: c.size,
          contactEmail: c.contactEmail || undefined, contactSource: c.contactEmail ? 'manual' : undefined,
          jobTitle, ftSource: 'francetravail', reason: c.reason, hiringPotential: c.hiringPotential,
          includeLetter: true, siren: sirenOf(c.id),
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) {
            if (d.code === 'QUOTA_EXCEEDED' || d.code === 'SUBSCRIPTION_REQUIRED') {
              queueRef.current = [];
              setUpgrade({ open: true, reason: d.code === 'SUBSCRIPTION_REQUIRED' ? 'feature' : 'quota', message: d.error });
            }
            setPrep((p) => ({ ...p, [c.id]: 'error' }));
            return;
          }
          setPrep((p) => ({ ...p, [c.id]: 'done' }));
          refresh();
        })
        .catch(() => setPrep((p) => ({ ...p, [c.id]: 'error' })))
        .finally(() => { running.current--; pump(); });
    }
  }, [jobTitle, refresh]);

  // ── Tri (swipe) ──
  const current = companies[cursor] || null;
  const decide = (dir: 'left' | 'right') => {
    if (!current) return;
    setHistory((h) => [...h, { index: cursor, dir }]);
    setCursor((i) => i + 1);
    if (dir === 'right') { queueRef.current.push(current); pump(); }
    else { const s = readPassed(); s.add(current.id); savePassed(s); }
  };
  const last = history[history.length - 1];
  const undo = () => {
    if (!last || last.dir !== 'left') return;
    const c = companies[last.index];
    const s = readPassed(); s.delete(c.id); savePassed(s);
    setHistory((h) => h.slice(0, -1));
    setCursor(last.index);
  };

  // Geste : la carte suit le doigt sans re-rendu React.
  const card = useRef<HTMLDivElement | null>(null);
  const g = useRef({ on: false, drag: false, x: 0, y: 0, dx: 0 });
  const paint = (dx: number, anim: boolean) => {
    if (!card.current) return;
    card.current.style.transition = anim ? 'transform 300ms cubic-bezier(.2,.8,.2,1)' : 'none';
    card.current.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
  };
  const down = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button,a,input,textarea')) return;
    g.current = { on: true, drag: false, x: e.clientX, y: e.clientY, dx: 0 };
  };
  const move = (e: React.PointerEvent) => {
    const s = g.current; if (!s.on) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.drag) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { s.on = false; return; }
      if (Math.abs(dx) < 8) return;
      s.drag = true; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    s.dx = dx; paint(dx, false);
  };
  const up = (cancel: boolean) => {
    const s = g.current; g.current = { on: false, drag: false, x: 0, y: 0, dx: 0 };
    if (!s.drag) return;
    if (!cancel && Math.abs(s.dx) > SWIPE) { decide(s.dx > 0 ? 'right' : 'left'); if (card.current) card.current.style.transform = ''; }
    else paint(0, true);
  };

  // ── Valider / envoyer ──
  const queued = new Set(campaign?.queuedIds || []);
  const toReview = useMemo(() => apps.filter((a) => ['DRAFT', 'READY', 'PENDING_REVIEW'].includes(a.status) && !queued.has(a.id)), [apps, campaign]);
  const inQueue = useMemo(() => apps.filter((a) => queued.has(a.id)), [apps, campaign]);
  const sent = useMemo(() => apps.filter((a) => ['SENT', 'FOLLOWED_UP', 'REPLIED'].includes(a.status)), [apps]);
  const preparing = Object.values(prep).filter((s) => s === 'preparing').length + queueRef.current.length;

  const patch = async (id: string, body: any) => {
    const r = await fetch(`${API}/api/spontaneous/${id}`, { method: 'PATCH', credentials: 'include', headers: { ...json, ...authHeaders() }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Enregistrement impossible.');
  };
  const approve = async (a: Spontaneous, letter: string) => {
    const r = await fetch(`${API}/api/spontaneous/${a.id}/queue`, { method: 'POST', credentials: 'include', headers: { ...json, ...authHeaders() }, body: JSON.stringify({ coverLetterText: letter }) });
    const d = await r.json();
    if (!d.success) { toast.error(d.error || 'Impossible de valider.'); if (r.status === 412) setStep('send'); return false; }
    toast.success(`${tidy(a.companyName)} : prête à partir`);
    refresh();
    return true;
  };
  const remove = async (a: Spontaneous) => {
    await fetch(`${API}/api/spontaneous/${a.id}/blacklist`, { method: 'POST', credentials: 'include', headers: { ...json, ...authHeaders() }, body: '{}' }).catch(() => {});
    refresh();
  };
  const unqueue = async (a: Spontaneous) => {
    await fetch(`${API}/api/spontaneous/${a.id}/queue`, { method: 'DELETE', credentials: 'include', headers: authHeaders() }).catch(() => {});
    refresh();
  };
  const disconnect = async () => {
    await fetch(`${API}/api/mailbox`, { method: 'DELETE', credentials: 'include', headers: authHeaders() });
    toast.success('Boîte mail déconnectée'); refresh();
  };

  const stepTab = (id: Step, label: string, count?: number) => (
    <button type="button" onClick={() => setStep(id)} aria-current={step === id ? 'step' : undefined}
      className={`shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-medium transition-colors ${step === id ? 'bg-ink text-canvas' : 'text-muted hover:text-ink hover:bg-subtle'}`}>
      {label}{count ? <span className={`tabular-nums text-xs ${step === id ? 'opacity-70' : 'text-faint'}`}>{count}</span> : null}
    </button>
  );

  return (
    <div className="px-4 md:px-8 pt-3 md:pt-6 pb-10 max-w-6xl mx-auto">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none -mx-1 px-1">
          {stepTab('sort', '1. Trier')}
          {stepTab('review', '2. Valider', toReview.length + preparing)}
          {stepTab('send', '3. Envoyer', inQueue.length)}
        </div>

        {/* ════════ 1. TRIER ════════ */}
        {step === 'sort' && (
          <div className="space-y-4">
            {/* Recherche : repliée en une ligne une fois lancée (place pour la carte sur téléphone). */}
            {editingSearch || !jobTitle || !location ? (
              <form onSubmit={(e) => { e.preventDefault(); setEditingSearch(false); search(jobTitle, location); }} className="flex flex-col sm:flex-row gap-2">
                <input className="input-pro flex-1" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Métier" aria-label="Métier" />
                <input className="input-pro sm:w-48" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ville ou code postal" aria-label="Ville" />
                <button type="submit" className="btn btn-secondary" disabled={searching}>{searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Chercher</button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 min-w-0 text-sm text-muted truncate"><Search size={14} className="inline -mt-0.5 mr-1.5 text-faint" /><span className="text-ink font-medium">{jobTitle}</span> · {location}</p>
                <button type="button" className="btn btn-ghost !min-h-[32px] !px-2.5 text-[13px]" onClick={() => setEditingSearch(true)}><Pencil size={13} /> Modifier</button>
              </div>
            )}

            {searching ? (
              <div className="surface h-[min(440px,calc(100dvh-430px))] min-h-[280px] grid place-items-center text-sm text-muted"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Recherche des entreprises qui recrutent…</span></div>
            ) : !current ? (
              <EmptyState
                variant="companies"
                title={companies.length ? 'Tu as trié toutes les entreprises' : 'Aucune entreprise pour le moment'}
                description={companies.length ? 'Passe à l’étape « Valider » pour relire tes lettres, ou cherche un autre métier ou une autre ville.' : 'Indique un métier et une ville, puis lance la recherche.'}
                action={companies.length ? <button className="btn btn-primary" onClick={() => setStep('review')}>Valider mes lettres</button> : undefined}
              />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full bg-subtle overflow-hidden"><div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(cursor / companies.length) * 100}%` }} /></div>
                  <span className="text-xs tabular-nums text-faint">{cursor + 1} / {companies.length}</span>
                </div>
                <div className="relative isolate h-[min(440px,calc(100dvh-430px))] min-h-[280px] overflow-x-clip">
                  {companies[cursor + 1] && (
                    <div aria-hidden className="absolute inset-x-0 top-0 bottom-4 surface overflow-hidden pointer-events-none z-10" style={{ transform: 'translateY(10px) scale(.96)' }}>
                      <CompanyCard c={companies[cursor + 1]} preview />
                    </div>
                  )}
                  <div key={cursor} ref={card} className="absolute inset-x-0 top-0 bottom-4 surface shadow-pop overflow-hidden z-20 select-none cursor-grab animate-scale-in"
                    style={{ touchAction: 'pan-y' }} onPointerDown={down} onPointerMove={move} onPointerUp={() => up(false)} onPointerCancel={() => up(true)}>
                    <CompanyCard c={current} />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-5">
                  <button onClick={undo} disabled={!last || last.dir !== 'left'} aria-label="Revenir" title="Revenir" className="w-11 h-11 rounded-full grid place-items-center bg-surface border border-line text-amber-500 shadow-xs disabled:opacity-30"><Undo2 size={18} /></button>
                  <button onClick={() => decide('left')} aria-label="Passer" title="Passer" className="w-[60px] h-[60px] rounded-full grid place-items-center bg-surface border border-line text-rose-500 shadow-card active:scale-95 transition"><X size={28} strokeWidth={2.5} /></button>
                  <button onClick={() => decide('right')} aria-label="Garder cette entreprise" title="Garder" className="w-[60px] h-[60px] rounded-full grid place-items-center bg-brand text-white shadow-[0_10px_24px_-8px_rgba(110,80,245,0.7)] active:scale-95 transition"><Check size={28} strokeWidth={2.5} /></button>
                </div>
                <p className="hidden sm:block text-center text-xs text-faint">À droite : je garde, Joboost prépare la lettre. À gauche : je passe.{preparing > 0 && <> · <span className="text-ink">{preparing} lettre{preparing > 1 ? 's' : ''} en préparation</span></>}</p>
              </>
            )}
          </div>
        )}

        {/* ════════ 2. VALIDER ════════ */}
        {step === 'review' && (
          <div className="space-y-3">
            {preparing > 0 && (
              <div className="surface px-4 py-3 text-sm text-muted flex items-center gap-2"><Loader2 size={15} className="animate-spin text-brand" /> {preparing} lettre{preparing > 1 ? 's' : ''} en cours de rédaction…</div>
            )}
            {toReview.length === 0 && preparing === 0 ? (
              <EmptyState variant="generic" title="Rien à valider" description="Garde des entreprises à l’étape « Trier » : Joboost prépare une lettre pour chacune." action={<button className="btn btn-secondary" onClick={() => setStep('sort')}>Trier des entreprises</button>} />
            ) : (
              toReview.map((a) => <ReviewItem key={a.id} a={a} onApprove={approve} onPatch={patch} onRemove={remove} onChanged={refresh} />)
            )}
          </div>
        )}

        {/* ════════ 3. ENVOYER ════════ */}
        {step === 'send' && (
          <div className="space-y-4">
            {!mailboxAvailable ? (
              <div className="surface p-5 text-sm text-muted">L’envoi depuis ta boîte mail n’est pas encore activé sur Joboost. Réessaie bientôt.</div>
            ) : !campaign?.mailbox.connected || campaign.mailbox.status !== 'ACTIVE' ? (
              <>
                {campaign?.mailbox.connected && campaign.mailbox.status === 'ERROR' && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {campaign.mailbox.lastError || 'Gmail refuse la connexion. Reconnecte ta boîte.'}
                  </div>
                )}
                <MailboxConnect onConnected={refresh} defaultEmail={user?.email} />
              </>
            ) : (
              <div className="surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">Envoi depuis</p>
                    <p className="text-[15px] font-medium text-ink mt-1">{campaign.mailbox.email}</p>
                  </div>
                  <button onClick={disconnect} className="btn btn-ghost !min-h-[32px] !px-2.5 text-[13px]">Déconnecter</button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Envoyées aujourd’hui', value: `${campaign.sentToday}/${campaign.dailyLimit}` },
                    { label: 'En attente', value: inQueue.length },
                    { label: 'Envoyées au total', value: sent.length },
                  ].map((k) => (
                    <div key={k.label} className="rounded-xl bg-subtle/70 px-3 py-2.5">
                      <p className="text-[11px] text-faint">{k.label}</p>
                      <p className="text-lg font-semibold tabular-nums text-ink">{k.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-faint flex items-center gap-1.5">
                  <Clock size={13} />
                  Une candidature toutes les {campaign.spacingMinutes} min environ, de 8 h 30 à 19 h, du lundi au samedi.
                  {!campaign.inSendingWindow && ' Prochain envoi au prochain créneau.'}
                  {campaign.estimatedDays > 0 && ` File terminée dans environ ${campaign.estimatedDays + 1} jours.`}
                </p>
              </div>
            )}

            {inQueue.length > 0 && (
              <section className="surface divide-y divide-line">
                <h3 className="px-5 py-3 text-[15px]">En attente d’envoi</h3>
                {inQueue.map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <Clock size={15} className="text-faint shrink-0" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink truncate">{tidy(a.companyName)}</p><p className="text-xs text-faint truncate">{a.contactEmail}</p></div>
                    <button onClick={() => unqueue(a)} className="btn btn-ghost !min-h-[30px] !px-2 text-xs">Retirer</button>
                  </div>
                ))}
              </section>
            )}
            {sent.length > 0 && (
              <section className="surface divide-y divide-line">
                <div className="px-5 py-3 flex items-center justify-between"><h3 className="text-[15px]">Envoyées</h3><button onClick={() => navigate('/track')} className="text-[13px] text-muted hover:text-ink">Voir dans le suivi →</button></div>
                {sent.slice(0, 20).map((a) => (
                  <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <Check size={15} className="text-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink truncate">{tidy(a.companyName)}</p><p className="text-xs text-faint truncate">{a.contactEmail}</p></div>
                    {a.sentAt && <span className="text-xs text-faint tabular-nums shrink-0">{new Date(a.sentAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                ))}
              </section>
            )}
            {inQueue.length === 0 && sent.length === 0 && campaign?.mailbox.connected && (
              <EmptyState variant="applications" title="Aucune candidature en attente" description="Valide des lettres à l’étape 2 : elles partiront d’ici, une par une." action={<button className="btn btn-secondary" onClick={() => setStep('review')}>Valider mes lettres</button>} />
            )}
          </div>
        )}
      </div>

      <UpgradeDialog open={upgrade.open} onClose={() => setUpgrade((u) => ({ ...u, open: false }))} reason={upgrade.reason} message={upgrade.message} />
    </div>
  );
};

/* ─────────── Une candidature à relire (étape Valider) ─────────── */
const ReviewItem: React.FC<{
  a: Spontaneous;
  onApprove: (a: Spontaneous, letter: string) => Promise<boolean>;
  onPatch: (id: string, body: any) => Promise<void>;
  onRemove: (a: Spontaneous) => void;
  onChanged: () => void;
}> = ({ a, onApprove, onPatch, onRemove, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [letter, setLetter] = useState(a.coverLetterText || '');
  const [email, setEmail] = useState(a.contactEmail || '');
  const [editEmail, setEditEmail] = useState(!a.contactEmail);
  const [busy, setBusy] = useState(false);
  const verified = a.contactSource !== 'estimated' && !!a.contactEmail;

  const saveEmail = async () => {
    try { await onPatch(a.id, { contactEmail: email }); setEditEmail(false); toast.success('Adresse enregistrée'); onChanged(); }
    catch (e: any) { toast.error(e.message); }
  };
  const approve = async () => {
    setBusy(true);
    try {
      if (email && email !== a.contactEmail) await onPatch(a.id, { contactEmail: email });
      await onApprove(a, letter);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <article className="surface overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-subtle/40 transition-colors">
        <span className="w-10 h-10 rounded-lg bg-subtle text-muted grid place-items-center font-semibold shrink-0"><Building2 size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-ink truncate">{tidy(a.companyName)}</p>
          <p className="text-xs truncate mt-0.5">
            {a.contactEmail
              ? <span className={verified ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>{a.contactEmail}{verified ? '' : ' · à vérifier'}</span>
              : <span className="text-rose-600 dark:text-rose-400">Adresse e-mail introuvable : ajoute-la pour envoyer</span>}
          </p>
        </div>
        <ChevronDown size={17} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 animate-fade-in">
          <div>
            <label className="input-label" htmlFor={`em-${a.id}`}>Adresse de l’entreprise</label>
            {editEmail ? (
              <div className="flex gap-2">
                <input id={`em-${a.id}`} type="email" className="input-pro flex-1" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="recrutement@entreprise.fr" />
                <button className="btn btn-secondary" onClick={saveEmail} disabled={!email}>Enregistrer</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink">{email}</span>
                <button className="btn btn-ghost !min-h-[30px] !px-2 text-xs" onClick={() => setEditEmail(true)}><Pencil size={13} /> Modifier</button>
              </div>
            )}
            {!a.contactEmail && (
              <a className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted hover:text-ink" href={`https://www.google.com/search?q=${encodeURIComponent(`${a.companyName} ${a.companyAddress || ''} contact email`)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} /> Chercher l’adresse sur Google
              </a>
            )}
          </div>
          <div>
            <label className="input-label" htmlFor={`lt-${a.id}`}>Lettre (tu peux la modifier)</label>
            <textarea id={`lt-${a.id}`} className="textarea-pro !min-h-[260px] text-[14px] leading-relaxed" value={letter} onChange={(e) => setLetter(e.target.value)} />
            <p className="mt-1.5 text-xs text-faint">Envoyée dans le corps de l’e-mail, avec ton CV en pièce jointe.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-primary" onClick={approve} disabled={busy || !email || letter.trim().length < 80}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Valider l’envoi
            </button>
            <button className="btn btn-ghost hover:!text-red-600" onClick={() => onRemove(a)}><Trash2 size={15} /> Ne pas envoyer</button>
          </div>
        </div>
      )}
    </article>
  );
};

export default SpontaneousPage;
