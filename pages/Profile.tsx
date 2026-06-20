import React, { useMemo, useRef, useState } from 'react';
import {
  User as UserIcon, Briefcase, GraduationCap, Sparkles, Languages as LanguagesIcon,
  Settings2, Link2, FolderGit2, Heart, Target, Plus, X, Trash2, ChevronDown,
  Linkedin, Wand2, RefreshCw, Check, Save, Upload
} from 'lucide-react';
import { User as UserType } from '../types';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../services/authToken';
import { rewriteSection, detailExperience } from '../services/gemini';

interface ProfileProps { user: UserType; }

/* ─────────── Listes de référence (sélecteurs / cases à cocher) ─────────── */
const SECTORS = ['Tech / Informatique', 'Commerce / Vente', 'Marketing / Communication', 'Santé / Social', 'Industrie', 'BTP', 'Hôtellerie / Restauration', 'Finance / Comptabilité', 'Logistique / Transport', 'Éducation', 'Art / Design', 'Juridique', 'Administratif', 'Autre'];
const CONTRACT_TYPES = ['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance', 'Intérim'];
const WORK_TIMES = ['Temps plein', 'Temps partiel'];
const EDUCATION_LEVELS = ['CAP / BEP', 'Bac', 'Bac+2 (BTS/DUT)', 'Bac+3 (Licence)', 'Bac+5 (Master)', 'Doctorat'];
const LANGUAGE_LEVELS = ['Notions', 'Intermédiaire', 'Courant', 'Bilingue', 'Langue maternelle'];
const MOBILITY = ['OK pour déménager', '100% télétravail', 'Hybride (2-3 j sur site)', 'Mobilité régionale'];
const LICENSES = ['Permis B', 'Permis A (moto)', 'Permis C (poids lourd)'];
const SCHEDULES = ['Temps plein', 'Temps partiel', 'Week-ends', 'Nuit', 'Horaires flexibles'];
const HOBBY_SUGGESTIONS = ['Sport', 'Musique', 'Voyage', 'Bénévolat', 'Lecture', 'Jeux vidéo', 'Création de contenu', 'Photographie', 'Cuisine'];
const SKILL_SUGGESTIONS_BY_TITLE: Record<string, string[]> = {
  dev: ['JavaScript', 'React', 'HTML/CSS', 'Git', 'Node.js', 'SQL'],
  commerc: ['Relation client', 'Négociation', 'Prospection', 'CRM', 'Vente'],
  market: ['SEO', 'Réseaux sociaux', 'Google Ads', 'Canva', 'Rédaction web'],
  comptab: ['Excel', 'Sage', 'Saisie comptable', 'Rigueur', 'Fiscalité'],
};
const SOFT_SKILLS = ['Travail en équipe', 'Rigueur', 'Autonomie', 'Communication', 'Organisation', 'Adaptabilité', 'Créativité', 'Sens du relationnel'];

const uid = () => Math.random().toString(36).slice(2, 10);

/* ─────────── Petits composants réutilisables ─────────── */

const Label: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="input-label">
    {children}{required && <span className="text-[#7D5CFF] ml-0.5">*</span>}
  </label>
);

const Chips: React.FC<{
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}> = ({ value, onChange, suggestions = [], placeholder }) => {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  const remaining = suggestions.filter((s) => !value.includes(s));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F0FF] text-[#7D5CFF] text-sm font-semibold">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-[#6023C0]">
              <X size={13} />
            </button>
          </span>
        ))}
      </div>
      <input
        className="input-pro"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
        onBlur={() => draft && add(draft)}
      />
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 hover:border-[#7D5CFF] hover:text-[#7D5CFF] transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CheckGroup: React.FC<{ options: string[]; value: string[]; onChange: (v: string[]) => void }> = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => {
      const on = value.includes(o);
      return (
        <button key={o} type="button"
          onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            on ? 'bg-[#7D5CFF] text-white border-[#7D5CFF]' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#7D5CFF]'
          }`}>
          {on && <Check size={14} />} {o}
        </button>
      );
    })}
  </div>
);

const Section: React.FC<{
  id: string; title: string; icon: React.ReactNode; badge: 'Essentiel' | 'Bonus';
  open: boolean; onToggle: () => void; done?: boolean; children: React.ReactNode;
}> = ({ title, icon, badge, open, onToggle, done, children }) => (
  <div className="card-pro !p-0 overflow-hidden">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10'}`}>
          {done ? <Check size={18} /> : icon}
        </span>
        <span className="font-bold text-[#111827] dark:text-white truncate">{title}</span>
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
          badge === 'Essentiel' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
        }`}>{badge}</span>
      </div>
      <ChevronDown size={20} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="px-5 pb-6 pt-1 space-y-5 border-t border-slate-100 dark:border-slate-800">{children}</div>}
  </div>
);

/* ─────────── Composant principal ─────────── */

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const { checkAuth } = useAuth();
  const [open, setOpen] = useState<string | null>('identity');
  const [saving, setSaving] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiExpId, setAiExpId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const initialName = { first: user.firstName || user.name?.split(' ')[0] || '', last: user.lastName || user.name?.split(' ').slice(1).join(' ') || '' };

  const [f, setF] = useState({
    firstName: initialName.first,
    lastName: initialName.last,
    email: user.email || '',
    phone: user.phone || '',
    city: user.city || '',
    postalCode: user.postalCode || '',
    title: user.title || '',
    summary: user.summary || '',
    targetSectors: user.targetSectors || [],
    targetLocations: user.targetLocations || [],
    contractTypes: user.contractTypes || [],
    workTime: user.workTime || '',
    availability: user.availability || '',
    salaryMin: user.salaryMin ?? '',
    salaryMax: user.salaryMax ?? '',
    experiences: (Array.isArray(user.experiences) ? user.experiences : []).map((e: any) => ({
      id: e.id || uid(), role: e.role || '', company: e.company || '', city: e.city || '',
      startDate: e.startDate || '', endDate: e.endDate || e.period || '', current: !!e.current,
      contractType: e.contractType || '', missions: e.missions || e.desc || '', achievements: e.achievements || '', link: e.link || '',
    })),
    education: (Array.isArray(user.education) ? user.education : []).map((e: any) => ({
      id: e.id || uid(), degree: e.degree || '', school: e.school || '', city: e.city || '',
      date: e.date || '', level: e.level || '', mention: e.mention || '', ongoing: !!e.ongoing,
    })),
    skills: user.skills || [],
    softSkills: user.softSkills || [],
    languages: (user.languagesDetailed && user.languagesDetailed.length
      ? user.languagesDetailed
      : (user.languages || []).map((l) => ({ language: l, level: 'Courant', certification: '' }))
    ).map((l: any) => ({ id: l.id || uid(), language: l.language || '', level: l.level || 'Courant', certification: l.certification || '' })),
    mobility: user.mobility || [],
    drivingLicenses: user.drivingLicenses || [],
    ownVehicle: !!user.ownVehicle,
    workSchedules: user.workSchedules || [],
    linkedin: user.linkedin || '',
    portfolio: user.portfolio || '',
    github: user.github || '',
    projects: (user.projects || []).map((p: any) => ({ id: p.id || uid(), title: p.title || '', link: p.link || '', description: p.description || '', role: p.role || '' })),
    hobbies: user.hobbies || [],
  });

  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  /* ── Listes dynamiques ── */
  const addItem = (key: 'experiences' | 'education' | 'languages' | 'projects', item: any) =>
    setF((p) => ({ ...p, [key]: [...(p[key] as any[]), item] }));
  const updItem = (key: 'experiences' | 'education' | 'languages' | 'projects', id: string, patch: any) =>
    setF((p) => ({ ...p, [key]: (p[key] as any[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const delItem = (key: 'experiences' | 'education' | 'languages' | 'projects', id: string) =>
    setF((p) => ({ ...p, [key]: (p[key] as any[]).filter((x) => x.id !== id) }));

  /* ── Suggestions de compétences selon le poste ── */
  const skillSuggestions = useMemo(() => {
    const t = f.title.toLowerCase();
    for (const key of Object.keys(SKILL_SUGGESTIONS_BY_TITLE)) {
      if (t.includes(key)) return SKILL_SUGGESTIONS_BY_TITLE[key];
    }
    return ['Microsoft Office', 'Travail en équipe', 'Organisation'];
  }, [f.title]);

  /* ── Barre de progression (pondérée) ── */
  const completion = useMemo(() => {
    let s = 0;
    if (f.firstName && f.lastName) s += 8;
    if (f.email) s += 4; if (f.phone) s += 4; if (f.city) s += 4;
    if (f.title) s += 15;
    if (f.experiences.length > 0 || f.education.length > 0 || f.projects.length > 0) s += 15;
    if (f.skills.length >= 3) s += 10; else if (f.skills.length > 0) s += 5;
    if (f.languages.length > 0) s += 5;
    if (f.summary) s += 8;
    if (f.softSkills.length > 0) s += 5;
    if (f.targetSectors.length > 0 || f.contractTypes.length > 0) s += 7;
    if (f.mobility.length > 0 || f.drivingLicenses.length > 0) s += 5;
    if (f.linkedin || f.portfolio || f.github) s += 5;
    if (f.hobbies.length > 0) s += 3;
    return Math.min(100, s);
  }, [f]);

  const handleSummaryAI = async () => {
    setLoadingAI(true);
    try {
      const txt = await rewriteSection('Résumé', f.summary || `Profil de ${f.firstName} pour le poste ${f.title}`, `Poste visé: ${f.title}`);
      set({ summary: txt });
      toast.success('Résumé optimisé !');
    } catch { toast.error("Erreur de l'IA."); }
    finally { setLoadingAI(false); }
  };

  const handleDetailExperience = async (exp: any) => {
    if (!exp.role) { toast.error("Renseigne au moins l'intitulé du poste."); return; }
    setAiExpId(exp.id);
    try {
      const period = exp.current
        ? `${exp.startDate || ''} – Aujourd'hui`.trim()
        : [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
      const txt = await detailExperience({
        role: exp.role, company: exp.company, contractType: exp.contractType, period,
        targetTitle: f.title,
        notes: [exp.missions, exp.achievements].filter(Boolean).join('\n'),
      });
      if (txt && txt.trim()) {
        updItem('experiences', exp.id, { missions: txt.trim() });
        toast.success("Missions détaillées par l'IA — relis et ajuste si besoin.");
      } else {
        toast.error("L'IA n'a rien renvoyé, réessaie.");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur de l'IA.");
    } finally { setAiExpId(null); }
  };

  // Import d'un CV (PDF/Word) : extraction via l'IA puis remplissage NON destructif
  // du profil (on ne remplit que les champs vides, on fusionne les compétences et
  // on ajoute les expériences absentes). Rien n'est enregistré tant que l'utilisateur
  // n'a pas cliqué « Enregistrer mon profil ».
  const handleImportCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      toast.error('Formats acceptés : PDF ou Word (.doc, .docx).');
      return;
    }
    setImporting(true);
    const toastId = toast.loading('Analyse de ton CV…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/ai/parse-cv`, {
        method: 'POST', credentials: 'include', headers: { ...authHeaders() }, body: fd,
      });
      const data = await res.json();
      if (!data.success || !data.data) {
        toast.error(data.error || "On n'a pas pu lire ce CV. Réessaie avec un autre fichier ou saisis tes infos.", { id: toastId });
        return;
      }
      const d = data.data;
      const [first, ...rest] = (d.name || '').trim().split(/\s+/);
      const importedExps = (Array.isArray(d.experiences) ? d.experiences : [])
        .map((xp: any) => ({
          id: uid(), role: xp.role || '', company: xp.company || '', city: '',
          startDate: '', endDate: xp.period || [xp.startDate, xp.endDate].filter(Boolean).join(' – ') || '',
          current: false, contractType: '', missions: xp.desc || xp.missions || '', achievements: '', link: '',
        }))
        .filter((xp: any) => xp.role || xp.company || xp.missions);

      setF((prev) => {
        const k = (r: string, c: string) => `${r}|${c}`.trim().toLowerCase();
        const existing = new Set(prev.experiences.map((xp) => k(xp.role, xp.company)));
        const newExps = importedExps.filter((xp: any) => !existing.has(k(xp.role, xp.company)));
        const mergedSkills = Array.from(new Set([...(prev.skills || []), ...(Array.isArray(d.skills) ? d.skills : [])])).filter(Boolean);
        return {
          ...prev,
          firstName: prev.firstName || first || '',
          lastName: prev.lastName || rest.join(' '),
          email: prev.email || d.email || '',
          phone: prev.phone || d.phone || '',
          title: prev.title || d.title || '',
          summary: prev.summary || d.summary || '',
          skills: mergedSkills,
          experiences: [...prev.experiences, ...newExps],
        };
      });
      setOpen('exp');
      toast.success('CV importé — vérifie, complète, puis clique « Enregistrer ».', { id: toastId });
    } catch {
      toast.error("Erreur réseau pendant l'import.", { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone,
        city: f.city, postalCode: f.postalCode, title: f.title, summary: f.summary,
        targetSectors: f.targetSectors, targetLocations: f.targetLocations, contractTypes: f.contractTypes,
        workTime: f.workTime, availability: f.availability,
        salaryMin: f.salaryMin === '' ? null : Number(f.salaryMin),
        salaryMax: f.salaryMax === '' ? null : Number(f.salaryMax),
        // On conserve aussi period/desc pour la compatibilité avec le générateur de CV existant.
        experiences: f.experiences.map((e) => ({
          ...e,
          period: e.current
            ? `${e.startDate || ''} – Aujourd'hui`.trim()
            : [e.startDate, e.endDate].filter(Boolean).join(' – '),
          desc: [e.missions, e.achievements].filter(Boolean).join('\n'),
        })),
        education: f.education,
        skills: f.skills, softSkills: f.softSkills,
        languages: f.languages.map((l) => l.language).filter(Boolean),
        languagesDetailed: f.languages,
        mobility: f.mobility, drivingLicenses: f.drivingLicenses, ownVehicle: f.ownVehicle, workSchedules: f.workSchedules,
        linkedin: f.linkedin, portfolio: f.portfolio, github: f.github,
        projects: f.projects, hobbies: f.hobbies,
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Profil enregistré !');
        await checkAuth();
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const connectLinkedIn = async () => {
    const toastId = toast.loading('Redirection vers LinkedIn...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/linkedin`, { credentials: 'include', headers: { ...authHeaders() } });
      const data = await res.json();
      if (data.success && data.url) { toast.dismiss(toastId); window.location.href = data.url; }
      else toast.error(data.error || 'Connexion LinkedIn non configurée.', { id: toastId });
    } catch { toast.error('Erreur de connexion au serveur.', { id: toastId }); }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto pb-10 space-y-5">
      {/* En-tête focal : carte avec avatar entouré de l'anneau de complétion (cohérent Accueil/Dashboard) */}
      <section className="card-pro !p-5 md:!p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="relative w-20 h-20 rounded-full grid place-items-center shrink-0"
              style={{ background: `conic-gradient(#7D5CFF ${completion * 3.6}deg, rgba(125,92,255,0.15) ${completion * 3.6}deg)` }}
              title={`Profil complété à ${completion}%`}
            >
              <div className="w-[68px] h-[68px] rounded-full bg-[#F3F4F6] dark:bg-[#1F2937] flex items-center justify-center text-2xl font-bold text-[#7D5CFF] overflow-hidden border-2 border-white dark:border-[#111827] shadow-sm">
                {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span>{(f.firstName || '?').charAt(0).toUpperCase()}</span>}
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white truncate">{[f.firstName, f.lastName].filter(Boolean).join(' ') || 'Mon profil'}</h2>
              <p className="text-sm text-[#6B7280] dark:text-slate-400 truncate">{f.title || 'Plus ton profil est complet, meilleurs sont tes CV et lettres.'}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-xs font-semibold">
                <span className="text-[#7D5CFF] tabular-nums">Profil complété à {completion}%</span>
                {completion < 100 && <span className="text-[#9CA3AF] font-medium">· termine-le pour de meilleurs CV &amp; lettres</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx" className="hidden" onChange={handleImportCv} />
            <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="press btn btn-secondary text-[#7D5CFF] disabled:opacity-60 flex-1 sm:flex-none">
              {importing ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>Importer mon CV</span>
            </button>
            <button onClick={connectLinkedIn} className="btn btn-secondary !border-[#0A66C2] !text-[#0A66C2] hover:!bg-[#0A66C2]/5 flex-1 sm:flex-none">
              <Linkedin size={16} /> LinkedIn
            </button>
          </div>
        </div>
      </section>

      {/* Sections du profil — colonne unique : tout aligné verticalement (lisible,
          régulier), au lieu d'une mosaïque 2 colonnes aux hauteurs irrégulières. */}
      <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] px-1">Informations essentielles</h2>
      {/* 1. Identité & contact */}
      <Section id="identity" title="Identité & contact" icon={<UserIcon size={18} />} badge="Essentiel"
        open={open === 'identity'} onToggle={() => toggle('identity')}
        done={!!(f.firstName && f.lastName && f.email && f.phone && f.city)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label required>Prénom</Label><input className="input-pro" value={f.firstName} onChange={(e) => set({ firstName: e.target.value })} placeholder="Jean" /></div>
          <div><Label required>Nom</Label><input className="input-pro" value={f.lastName} onChange={(e) => set({ lastName: e.target.value })} placeholder="Dupont" /></div>
          <div><Label required>Email</Label><input className="input-pro" type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="jean.dupont@email.com" /></div>
          <div><Label required>Téléphone</Label><input className="input-pro" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="06 12 34 56 78" /></div>
          <div><Label required>Ville</Label><input className="input-pro" value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Lyon" /></div>
          <div><Label>Code postal</Label><input className="input-pro" value={f.postalCode} onChange={(e) => set({ postalCode: e.target.value })} placeholder="69003" /></div>
        </div>
      </Section>

      {/* 2. Poste recherché & disponibilité */}
      <Section id="target" title="Poste recherché & disponibilité" icon={<Target size={18} />} badge="Essentiel"
        open={open === 'target'} onToggle={() => toggle('target')} done={!!f.title}>
        <div><Label required>Intitulé du poste recherché</Label><input className="input-pro" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Développeur web junior" /></div>
        <div><Label>Secteurs ciblés</Label><CheckGroup options={SECTORS} value={f.targetSectors} onChange={(v) => set({ targetSectors: v })} /></div>
        <div><Label>Localisations souhaitées</Label><Chips value={f.targetLocations} onChange={(v) => set({ targetLocations: v })} suggestions={['Télétravail', f.city].filter(Boolean) as string[]} placeholder="Ajoute une ville ou « Télétravail »" /></div>
        <div><Label>Type de contrat</Label><CheckGroup options={CONTRACT_TYPES} value={f.contractTypes} onChange={(v) => set({ contractTypes: v })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Temps de travail</Label>
            <select className="input-pro" value={f.workTime} onChange={(e) => set({ workTime: e.target.value })}>
              <option value="">—</option>{WORK_TIMES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div><Label>Disponibilité</Label><input className="input-pro" value={f.availability} onChange={(e) => set({ availability: e.target.value })} placeholder="Immédiate / Septembre 2026" /></div>
          <div><Label>Salaire min (€/an)</Label><input className="input-pro" type="number" value={f.salaryMin} onChange={(e) => set({ salaryMin: e.target.value as any })} placeholder="24000" /></div>
          <div><Label>Salaire max (€/an)</Label><input className="input-pro" type="number" value={f.salaryMax} onChange={(e) => set({ salaryMax: e.target.value as any })} placeholder="28000" /></div>
        </div>
      </Section>

      {/* 3. Expériences */}
      <Section id="exp" title="Expériences professionnelles" icon={<Briefcase size={18} />} badge="Essentiel"
        open={open === 'exp'} onToggle={() => toggle('exp')} done={f.experiences.length > 0}>
        <p className="text-xs text-slate-400 italic">Pas d'expérience pro ? Mets un stage, un job d'été ou du bénévolat.</p>
        {f.experiences.map((exp) => (
          <div key={exp.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expérience</span>
              <button onClick={() => delItem('experiences', exp.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input-pro" value={exp.role} onChange={(e) => updItem('experiences', exp.id, { role: e.target.value })} placeholder="Intitulé du poste *" />
              <input className="input-pro" value={exp.company} onChange={(e) => updItem('experiences', exp.id, { company: e.target.value })} placeholder="Entreprise *" />
              <input className="input-pro" value={exp.city} onChange={(e) => updItem('experiences', exp.id, { city: e.target.value })} placeholder="Ville" />
              <select className="input-pro" value={exp.contractType} onChange={(e) => updItem('experiences', exp.id, { contractType: e.target.value })}>
                <option value="">Type de contrat</option>{CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input-pro" value={exp.startDate} onChange={(e) => updItem('experiences', exp.id, { startDate: e.target.value })} placeholder="Début (MM/AAAA)" />
              <input className="input-pro" value={exp.endDate} disabled={exp.current} onChange={(e) => updItem('experiences', exp.id, { endDate: e.target.value })} placeholder="Fin (MM/AAAA)" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={exp.current} onChange={(e) => updItem('experiences', exp.id, { current: e.target.checked })} className="w-4 h-4 accent-[#7D5CFF]" />
              Poste actuel
            </label>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-slate-500">Missions</span>
                <button type="button" onClick={() => handleDetailExperience(exp)} disabled={aiExpId === exp.id}
                  className="flex items-center gap-1 text-[#7D5CFF] text-xs font-bold hover:underline disabled:opacity-50">
                  {aiExpId === exp.id ? <RefreshCw className="animate-spin" size={13} /> : <Wand2 size={13} />} Détailler avec l'IA
                </button>
              </div>
              <textarea className="textarea-pro" value={exp.missions} onChange={(e) => updItem('experiences', exp.id, { missions: e.target.value })} placeholder="Décris en quelques mots, puis clique « Détailler avec l'IA » — ex : gestion dossiers clients, prospection…" />
            </div>
            <textarea className="textarea-pro !min-h-[60px]" value={exp.achievements} onChange={(e) => updItem('experiences', exp.id, { achievements: e.target.value })} placeholder="Réalisations chiffrées — ex : +15% de ventes" />
          </div>
        ))}
        <button onClick={() => addItem('experiences', { id: uid(), role: '', company: '', city: '', startDate: '', endDate: '', current: false, contractType: '', missions: '', achievements: '', link: '' })} className="btn btn-secondary w-full"><Plus size={16} /> Ajouter une expérience</button>
      </Section>

      {/* 4. Formations */}
      <Section id="edu" title="Formations & diplômes" icon={<GraduationCap size={18} />} badge="Essentiel"
        open={open === 'edu'} onToggle={() => toggle('edu')} done={f.education.length > 0}>
        {f.education.map((ed) => (
          <div key={ed.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formation</span>
              <button onClick={() => delItem('education', ed.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="input-pro" value={ed.degree} onChange={(e) => updItem('education', ed.id, { degree: e.target.value })} placeholder="Diplôme *" />
              <input className="input-pro" value={ed.school} onChange={(e) => updItem('education', ed.id, { school: e.target.value })} placeholder="Établissement *" />
              <select className="input-pro" value={ed.level} onChange={(e) => updItem('education', ed.id, { level: e.target.value })}>
                <option value="">Niveau</option>{EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <input className="input-pro" value={ed.date} onChange={(e) => updItem('education', ed.id, { date: e.target.value })} placeholder="Année (ex : 2024)" />
              <input className="input-pro" value={ed.city} onChange={(e) => updItem('education', ed.id, { city: e.target.value })} placeholder="Ville" />
              <input className="input-pro" value={ed.mention} onChange={(e) => updItem('education', ed.id, { mention: e.target.value })} placeholder="Mention (facultatif)" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={ed.ongoing} onChange={(e) => updItem('education', ed.id, { ongoing: e.target.checked })} className="w-4 h-4 accent-[#7D5CFF]" />
              Formation en cours
            </label>
          </div>
        ))}
        <button onClick={() => addItem('education', { id: uid(), degree: '', school: '', city: '', date: '', level: '', mention: '', ongoing: false })} className="btn btn-secondary w-full"><Plus size={16} /> Ajouter une formation</button>
      </Section>

      {/* 5. Compétences */}
      <Section id="skills" title="Compétences" icon={<Sparkles size={18} />} badge="Essentiel"
        open={open === 'skills'} onToggle={() => toggle('skills')} done={f.skills.length >= 3}>
        <div><Label required>Compétences techniques</Label><Chips value={f.skills} onChange={(v) => set({ skills: v })} suggestions={skillSuggestions} placeholder="Ajoute une compétence (Entrée pour valider)" /></div>
        <div><Label>Compétences comportementales (soft skills)</Label><Chips value={f.softSkills} onChange={(v) => set({ softSkills: v })} suggestions={SOFT_SKILLS} placeholder="Ex : Travail en équipe" /></div>
      </Section>

      {/* 6. Langues */}
      <Section id="lang" title="Langues" icon={<LanguagesIcon size={18} />} badge="Essentiel"
        open={open === 'lang'} onToggle={() => toggle('lang')} done={f.languages.length > 0}>
        {f.languages.map((l) => (
          <div key={l.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full"><Label>Langue</Label><input className="input-pro" value={l.language} onChange={(e) => updItem('languages', l.id, { language: e.target.value })} placeholder="Anglais" /></div>
            <div className="flex-1 w-full"><Label>Niveau</Label>
              <select className="input-pro" value={l.level} onChange={(e) => updItem('languages', l.id, { level: e.target.value })}>
                {LANGUAGE_LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full"><Label>Certification</Label><input className="input-pro" value={l.certification} onChange={(e) => updItem('languages', l.id, { certification: e.target.value })} placeholder="TOEIC 850 (facultatif)" /></div>
            <button onClick={() => delItem('languages', l.id)} className="text-slate-400 hover:text-red-500 p-3"><Trash2 size={16} /></button>
          </div>
        ))}
        <button onClick={() => addItem('languages', { id: uid(), language: '', level: 'Courant', certification: '' })} className="btn btn-secondary w-full"><Plus size={16} /> Ajouter une langue</button>
      </Section>

      <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] px-1 pt-3">Pour aller plus loin <span className="text-[#C4C0D6] dark:text-slate-600 normal-case tracking-normal font-medium">· facultatif</span></h2>
      {/* Résumé pro (bonus, avec IA) */}
      <Section id="summary" title="Résumé professionnel" icon={<Wand2 size={18} />} badge="Bonus"
        open={open === 'summary'} onToggle={() => toggle('summary')} done={!!f.summary}>
        <div className="flex justify-end">
          <button onClick={handleSummaryAI} disabled={loadingAI} className="flex items-center gap-2 text-[#7D5CFF] text-xs font-bold hover:underline disabled:opacity-50">
            {loadingAI ? <RefreshCw className="animate-spin" size={14} /> : <Wand2 size={14} />} Optimiser avec l'IA
          </button>
        </div>
        <textarea className="textarea-pro !min-h-[120px]" value={f.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="2-3 phrases qui te résument : ton profil, tes forces, ce que tu cherches." />
      </Section>

      {/* 7. Préférences pratiques */}
      <Section id="prefs" title="Préférences pratiques" icon={<Settings2 size={18} />} badge="Bonus"
        open={open === 'prefs'} onToggle={() => toggle('prefs')} done={f.mobility.length > 0 || f.drivingLicenses.length > 0}>
        <div><Label>Mobilité</Label><CheckGroup options={MOBILITY} value={f.mobility} onChange={(v) => set({ mobility: v })} /></div>
        <div><Label>Permis</Label><CheckGroup options={LICENSES} value={f.drivingLicenses} onChange={(v) => set({ drivingLicenses: v })} /></div>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={f.ownVehicle} onChange={(e) => set({ ownVehicle: e.target.checked })} className="w-4 h-4 accent-[#7D5CFF]" />
          J'ai un véhicule personnel
        </label>
        <div><Label>Horaires</Label><CheckGroup options={SCHEDULES} value={f.workSchedules} onChange={(v) => set({ workSchedules: v })} /></div>
      </Section>

      {/* 8. Liens & réseaux */}
      <Section id="links" title="Liens & réseaux" icon={<Link2 size={18} />} badge="Bonus"
        open={open === 'links'} onToggle={() => toggle('links')} done={!!(f.linkedin || f.portfolio || f.github)}>
        <div><Label>LinkedIn</Label><input className="input-pro" value={f.linkedin} onChange={(e) => set({ linkedin: e.target.value })} placeholder="linkedin.com/in/…" /></div>
        <div><Label>Portfolio</Label><input className="input-pro" value={f.portfolio} onChange={(e) => set({ portfolio: e.target.value })} placeholder="monportfolio.fr" /></div>
        <div><Label>GitHub</Label><input className="input-pro" value={f.github} onChange={(e) => set({ github: e.target.value })} placeholder="github.com/…" /></div>
      </Section>

      {/* 9. Projets */}
      <Section id="projects" title="Projets / portfolio" icon={<FolderGit2 size={18} />} badge="Bonus"
        open={open === 'projects'} onToggle={() => toggle('projects')} done={f.projects.length > 0}>
        <p className="text-xs text-slate-400 italic">Idéal si tu débutes : montre ce que tu sais faire.</p>
        {f.projects.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Projet</span>
              <button onClick={() => delItem('projects', p.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <input className="input-pro" value={p.title} onChange={(e) => updItem('projects', p.id, { title: e.target.value })} placeholder="Titre du projet *" />
            <input className="input-pro" value={p.link} onChange={(e) => updItem('projects', p.id, { link: e.target.value })} placeholder="Lien (github.com/…)" />
            <input className="input-pro" value={p.role} onChange={(e) => updItem('projects', p.id, { role: e.target.value })} placeholder="Ton rôle (ex : Dev front)" />
            <textarea className="textarea-pro !min-h-[60px]" value={p.description} onChange={(e) => updItem('projects', p.id, { description: e.target.value })} placeholder="Description courte" />
          </div>
        ))}
        <button onClick={() => addItem('projects', { id: uid(), title: '', link: '', description: '', role: '' })} className="btn btn-secondary w-full"><Plus size={16} /> Ajouter un projet</button>
      </Section>

      {/* 10. Loisirs */}
      <Section id="hobbies" title="Loisirs & centres d'intérêt" icon={<Heart size={18} />} badge="Bonus"
        open={open === 'hobbies'} onToggle={() => toggle('hobbies')} done={f.hobbies.length > 0}>
        <Chips value={f.hobbies} onChange={(v) => set({ hobbies: v })} suggestions={HOBBY_SUGGESTIONS} placeholder="Ajoute un loisir" />
      </Section>

      </div>

      {/* Bouton de sauvegarde en bas de page (dans le flux) */}
      <div className="pt-4">
        <button onClick={handleSave} disabled={saving} className="press btn btn-primary btn-lg w-full disabled:opacity-60">
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Enregistrer mon profil
        </button>
      </div>
    </div>
  );
};

export default Profile;
