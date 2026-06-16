import React, { useContext, useLayoutEffect, useRef, useState } from 'react';
import { Phone, Mail, MapPin, Linkedin } from 'lucide-react';
import { PreviewModeContext } from './previewMode';

// Données minimales nécessaires au rendu d'un modèle de CV.
export interface CvData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  city?: string;
  summary?: string;
  skills?: string[];
  experiences?: any[];
  education?: any[];
  photoUrl?: string;
}

const period = (e: any) => e?.period || [e?.startDate, e?.current ? "Aujourd'hui" : e?.endDate].filter(Boolean).join(' – ');
const descOf = (e: any) => e?.desc || e?.missions || '';
const place = (e: any) => [e?.company, e?.city].filter(Boolean).join(', ');
const contacts = (d: CvData) => [d.email, d.phone, d.city].filter(Boolean);
const initials = (n?: string) => (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

// Découpe une description en puces (par lignes, sinon par phrases).
const toBullets = (e: any): string[] => {
  const t = descOf(e);
  if (!t) return [];
  let parts = t.split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
  if (parts.length === 1) parts = parts[0].split(/(?<=\.)\s+(?=[A-ZÀ-Ÿ0-9])/).map((s: string) => s.trim()).filter(Boolean);
  return parts.map((s: string) => s.replace(/^[-•·]\s*/, ''));
};

/* Largeur de référence A4 (~96 dpi). Le modèle est rendu à cette largeur puis
   réduit par transform:scale pour remplir sa carte (vignette nette) ou affiché
   en entier dans l'éditeur. */
const SHEET_W = 760;

const Paper: React.FC<{ children: React.ReactNode; pad?: string; serif?: boolean }> = ({ children, pad = 'p-10', serif }) => {
  const mode = useContext(PreviewModeContext);
  const thumb = mode === 'thumb';
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current, inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.clientWidth;
      if (!w) return;
      const s = w / SHEET_W;
      setScale(s);
      setHeight(thumb ? w * 1.414 : inner.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [thumb]);

  return (
    <div ref={outerRef} className="relative w-full overflow-hidden bg-white" style={{ height: height || undefined }}>
      <div
        ref={innerRef}
        className={serif ? 'font-serif' : 'font-sans'}
        style={{ position: 'absolute', top: 0, left: 0, width: SHEET_W, transform: `scale(${scale})`, transformOrigin: 'top left', fontSize: 13, lineHeight: 1.4 }}
      >
        <div className={`bg-white text-[#23282f] ${pad}`}>{children}</div>
      </div>
    </div>
  );
};

/* ───────────────────── Briques réutilisables ───────────────────── */

// Puces d'expérience (titre + lieu + dates + bullets) — variante « bulleted » ou paragraphe.
const ExpList: React.FC<{ d: CvData; accent: string; bulleted?: boolean; center?: boolean }> = ({ d, accent, bulleted, center }) => (
  <div className="space-y-2.5">
    {(d.experiences || []).slice(0, 5).map((e, i) => {
      const bl = bulleted ? toBullets(e) : [];
      return (
        <div key={i} className={center ? 'text-center' : ''}>
          <div className={`flex ${center ? 'flex-col items-center' : 'justify-between items-baseline'} gap-x-2`}>
            <span className="font-bold text-[1.02em]">{e.role || 'Poste'}</span>
            <span className="text-[0.82em] text-[#8a909c] shrink-0 tabular-nums">{period(e)}</span>
          </div>
          {place(e) && <div className={`text-[0.95em] ${center ? 'italic' : 'font-semibold'}`} style={{ color: center ? '#5b6270' : accent }}>{place(e)}</div>}
          {bulleted && bl.length > 0 ? (
            <ul className="mt-0.5 space-y-0.5">
              {bl.map((b, j) => (
                <li key={j} className="flex gap-1.5 text-[#4a505c] leading-snug">
                  <span style={{ color: accent }} className="shrink-0">•</span><span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            descOf(e) && <div className="text-[#4a505c] leading-snug whitespace-pre-line mt-0.5">{descOf(e)}</div>
          )}
        </div>
      );
    })}
  </div>
);

const EduList: React.FC<{ d: CvData; accent: string; center?: boolean }> = ({ d, accent, center }) => (
  <div className="space-y-1.5">
    {(d.education || []).slice(0, 4).map((e, i) => (
      <div key={i} className={center ? 'text-center' : ''}>
        <div className={`flex ${center ? 'flex-col items-center' : 'justify-between items-baseline'} gap-x-2`}>
          <span className="font-bold">{e.degree || e.level || 'Diplôme'}</span>
          <span className="text-[0.82em] text-[#8a909c] shrink-0 tabular-nums">{e.date}</span>
        </div>
        <div className="text-[0.92em]" style={{ color: accent }}>{[e.school, e.city].filter(Boolean).join(', ')}</div>
      </div>
    ))}
  </div>
);

// Grille de compétences à puces (multi-colonnes) — comme les modèles de référence.
const SkillGrid: React.FC<{ skills?: string[]; accent: string; cols?: number }> = ({ skills, accent, cols = 2 }) => (
  <div className="grid gap-x-5 gap-y-0.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
    {(skills || []).map((s) => (
      <div key={s} className="flex gap-1.5 text-[0.95em] text-[#4a505c]"><span style={{ color: accent }}>•</span><span>{s}</span></div>
    ))}
  </div>
);

const SkillList: React.FC<{ skills?: string[]; accent: string }> = ({ skills, accent }) => (
  <div className="space-y-0.5 text-[0.95em]">{(skills || []).map((s) => <div key={s}>{s}</div>)}</div>
);

// Titres de section
const SecCentered: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-center my-2"><div className="font-bold uppercase tracking-[0.12em] text-[1.05em]">{children}</div><div className="h-px bg-[#d7dbe2] mt-1" /></div>
);
const SecLeftRule: React.FC<{ children: React.ReactNode; accent: string }> = ({ children, accent }) => (
  <div className="mb-1.5 mt-0.5"><div className="font-bold uppercase tracking-[0.1em] text-[1.02em]">{children}</div><div className="h-[1.5px] mt-0.5 w-full" style={{ background: `${accent}` }} /></div>
);
const SecAccent: React.FC<{ children: React.ReactNode; accent: string }> = ({ children, accent }) => (
  <div className="mb-1.5"><div className="font-bold tracking-wide text-[1.05em]" style={{ color: accent }}>{children}</div><div className="h-px mt-0.5" style={{ background: `${accent}55` }} /></div>
);
const SecSidebar: React.FC<{ children: React.ReactNode; accent: string }> = ({ children, accent }) => (
  <div className="font-bold uppercase tracking-[0.12em] text-[0.95em] mb-1.5" style={{ color: accent }}>{children}</div>
);

const ContactIcons: React.FC<{ d: CvData; color?: string }> = ({ d, color }) => (
  <div className="space-y-1 text-[0.9em]" style={color ? { color } : undefined}>
    {d.phone && <div className="flex items-center gap-1.5"><Phone size={11} className="shrink-0" /> {d.phone}</div>}
    {d.email && <div className="flex items-center gap-1.5 break-all"><Mail size={11} className="shrink-0" /> {d.email}</div>}
    {d.city && <div className="flex items-center gap-1.5"><MapPin size={11} className="shrink-0" /> {d.city}</div>}
  </div>
);

/* ───────────────────── LAYOUTS (fidèles aux modèles fournis) ───────────────────── */

// 1. CLASSIQUE — tout centré, filets, N&B (modele « classique »).
const Classique: React.FC<{ d: CvData; accent: string }> = ({ d }) => (
  <Paper pad="p-10">
    <div className="text-center">
      <div className="text-[2.1em] font-bold tracking-tight">{d.name}</div>
      <div className="text-[1.1em] font-semibold uppercase tracking-wide text-[#3a3f47]">{d.title}</div>
      <div className="text-[0.85em] text-[#5b6270] mt-1 leading-tight">{contacts(d).map((c, i) => <div key={i}>{c}</div>)}</div>
    </div>
    {d.summary && <p className="text-center leading-snug text-[#4a505c] mt-2">{d.summary}</p>}
    <SecCentered>Expériences professionnelles</SecCentered><ExpList d={d} accent="#3a3f47" center />
    {(d.education || []).length > 0 && (<><SecCentered>Formation</SecCentered><EduList d={d} accent="#3a3f47" center /></>)}
    {(d.skills || []).length > 0 && (<><SecCentered>Compétences</SecCentered><p className="text-center text-[#4a505c]">{(d.skills || []).join(', ')}</p></>)}
  </Paper>
);

// 2. SOBRE — en-tête centré, sections à gauche, dates à droite, compétences en grille (modele « simple »).
const Sobre: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10">
    <div className="text-center pb-2 border-b border-[#d7dbe2]">
      <div className="text-[2.1em] font-bold tracking-tight text-[#2b3038]">{d.name}</div>
      <div className="text-[1.05em] uppercase tracking-[0.18em] text-[#6b7180] mt-0.5">{d.title}</div>
      <div className="text-[0.85em] text-[#5b6270] mt-1">{contacts(d).join('  |  ')}</div>
    </div>
    {d.summary && (<><div className="text-center font-bold uppercase tracking-[0.12em] text-[1.02em] my-2">Profil professionnel</div><p className="text-center leading-snug text-[#4a505c]">{d.summary}</p></>)}
    <div className="mt-2"><SecLeftRule accent="#2b3038">Expériences professionnelles</SecLeftRule><ExpList d={d} accent={accent} bulleted /></div>
    {(d.education || []).length > 0 && (<div className="mt-2"><SecLeftRule accent="#2b3038">Formation</SecLeftRule><EduList d={d} accent={accent} /></div>)}
    {(d.skills || []).length > 0 && (<div className="mt-2"><SecLeftRule accent="#2b3038">Compétences</SecLeftRule><SkillGrid skills={d.skills} accent={accent} cols={3} /></div>)}
  </Paper>
);

// 3. BLEU — nom + titres en bleu avec filet, puces, une colonne (modele « bleu »).
const Bleu: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10">
    <div className="text-[2.2em] font-extrabold tracking-tight leading-none" style={{ color: accent }}>{d.name}</div>
    <div className="text-[1.05em] uppercase tracking-[0.16em] text-[#5b6270] mt-1">{d.title}</div>
    <div className="text-[0.85em] text-[#5b6270] mt-1">
      {d.email && <span style={{ color: accent }}>{d.email}</span>}{d.email && (d.phone || d.city) ? '  |  ' : ''}{[d.phone, d.city].filter(Boolean).join('  |  ')}
    </div>
    {d.summary && (<div className="mt-3"><SecAccent accent={accent}>Profil professionnel</SecAccent><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>)}
    <div className="mt-3"><SecAccent accent={accent}>Expérience professionnelle</SecAccent><ExpList d={d} accent={accent} bulleted /></div>
    {(d.education || []).length > 0 && (<div className="mt-3"><SecAccent accent={accent}>Formation</SecAccent><EduList d={d} accent={accent} /></div>)}
    {(d.skills || []).length > 0 && (<div className="mt-3"><SecAccent accent={accent}>Compétences</SecAccent><SkillGrid skills={d.skills} accent={accent} cols={2} /></div>)}
  </Paper>
);

// 4. AVEC PHOTO — en-tête à gauche + photo ronde à droite, puces (modele « avec photo »).
const AvecPhoto: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[2.1em] font-extrabold tracking-tight leading-none">{d.name}</div>
        <div className="text-[1.05em] uppercase tracking-[0.16em] text-[#6b7180] mt-1">{d.title}</div>
        <div className="text-[0.85em] text-[#5b6270] mt-1.5 leading-tight">{contacts(d).map((c, i) => <div key={i}>{c}</div>)}</div>
      </div>
      <div className="w-[4.5em] h-[4.5em] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-[1.4em] font-black" style={{ background: accent }}>
        {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
      </div>
    </div>
    {d.summary && <p className="leading-snug text-[#4a505c] mt-3">{d.summary}</p>}
    <div className="mt-2"><SecLeftRule accent={accent}>Expériences professionnelles</SecLeftRule><ExpList d={d} accent={accent} bulleted /></div>
    {(d.education || []).length > 0 && (<div className="mt-2"><SecLeftRule accent={accent}>Formation</SecLeftRule><EduList d={d} accent={accent} /></div>)}
    {(d.skills || []).length > 0 && (<div className="mt-2"><SecLeftRule accent={accent}>Compétences</SecLeftRule><SkillGrid skills={d.skills} accent={accent} cols={2} /></div>)}
  </Paper>
);

// 5. ANGLAIS — « NAME SURNAME » encadré, libellés anglais (modele « en anglais »).
const Anglais: React.FC<{ d: CvData; accent: string }> = ({ d }) => (
  <Paper pad="p-10">
    <div className="text-center border-y-2 border-[#2b3038] py-2">
      <div className="text-[2em] font-bold tracking-[0.06em] uppercase">{d.name}</div>
      <div className="text-[0.95em] uppercase tracking-[0.22em] text-[#6b7180] mt-0.5">{d.title}</div>
    </div>
    <div className="text-center text-[0.85em] text-[#5b6270] mt-1.5">{contacts(d).join('   |   ')}</div>
    {d.summary && <p className="leading-snug text-[#4a505c] mt-2">{d.summary}</p>}
    {(d.education || []).length > 0 && (<div className="mt-2"><SecLeftRule accent="#2b3038">Education</SecLeftRule><EduList d={d} accent="#2b3038" /></div>)}
    <div className="mt-2"><SecLeftRule accent="#2b3038">Work experience</SecLeftRule><ExpList d={d} accent="#2b3038" bulleted /></div>
    {(d.skills || []).length > 0 && (<div className="mt-2"><SecLeftRule accent="#2b3038">Skills</SecLeftRule><SkillGrid skills={d.skills} accent="#2b3038" cols={3} /></div>)}
  </Paper>
);

// 6. MODERNE — en-tête à photo + bandeau de contact, une colonne, accent bleu-gris (modele « moderne »).
const ModernePhoto: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="px-9 pt-8 pb-3 flex items-center gap-4">
      <div className="w-[4em] h-[4em] rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-[1.3em] font-black" style={{ background: accent }}>
        {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
      </div>
      <div className="min-w-0">
        <div className="text-[2em] font-extrabold tracking-tight leading-none" style={{ color: accent }}>{d.name}</div>
        <div className="text-[1.05em] uppercase tracking-[0.14em] text-[#6b7180] mt-0.5">{d.title}</div>
      </div>
    </div>
    <div className="px-9 py-1.5 text-white text-[0.85em] flex flex-wrap gap-x-4 gap-y-0.5" style={{ background: accent }}>
      {d.city && <span className="flex items-center gap-1"><MapPin size={11} /> {d.city}</span>}
      {d.phone && <span className="flex items-center gap-1"><Phone size={11} /> {d.phone}</span>}
      {d.email && <span className="flex items-center gap-1 break-all"><Mail size={11} /> {d.email}</span>}
    </div>
    <div className="px-9 pt-3 pb-8">
      {d.summary && (<div><SecAccent accent={accent}>Profil professionnel</SecAccent><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>)}
      <div className="mt-3"><SecAccent accent={accent}>Expériences professionnelles</SecAccent><ExpList d={d} accent={accent} bulleted /></div>
      {(d.education || []).length > 0 && (<div className="mt-3"><SecAccent accent={accent}>Formation</SecAccent><EduList d={d} accent={accent} /></div>)}
      {(d.skills || []).length > 0 && (<div className="mt-3"><SecAccent accent={accent}>Compétences</SecAccent><SkillGrid skills={d.skills} accent={accent} cols={3} /></div>)}
    </div>
  </Paper>
);

// Gabarit deux colonnes (sidebar). Paramétrable : couleur de fond, accent, photo, nom dans la sidebar.
const SidebarLayout: React.FC<{ d: CvData; accent: string; bg: string; sidebarText?: string; withPhoto?: boolean; nameInSidebar?: boolean }> =
  ({ d, accent, bg, sidebarText = '#3a3f47', withPhoto, nameInSidebar }) => (
  <Paper pad="p-0">
    <div className="flex min-h-full">
      {/* Sidebar */}
      <div className="w-[34%] p-5 space-y-3.5" style={{ background: bg, color: sidebarText }}>
        {withPhoto && (
          <div className="w-[5em] h-[5em] mx-auto rounded-full overflow-hidden flex items-center justify-center text-white text-[1.5em] font-black" style={{ background: accent }}>
            {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
          </div>
        )}
        {nameInSidebar && (
          <div className="text-center">
            <div className="text-[1.5em] font-black leading-tight tracking-tight uppercase">{d.name}</div>
            <div className="text-[0.9em] uppercase tracking-[0.14em] text-[#6b7180]">{d.title}</div>
          </div>
        )}
        <div><SecSidebar accent={accent}>Contact</SecSidebar><ContactIcons d={d} /></div>
        {d.summary && <div><SecSidebar accent={accent}>Profil</SecSidebar><p className="text-[0.9em] leading-snug">{d.summary}</p></div>}
        {(d.skills || []).length > 0 && <div><SecSidebar accent={accent}>Compétences</SecSidebar><SkillList skills={d.skills} accent={accent} /></div>}
        {(d.education || []).length > 0 && <div><SecSidebar accent={accent}>Formation</SecSidebar><EduList d={d} accent={accent} /></div>}
      </div>
      {/* Main */}
      <div className="flex-1 p-6 space-y-3">
        {!nameInSidebar && (
          <div>
            <div className="text-[2em] font-black tracking-tight leading-none uppercase">{d.name}</div>
            <div className="text-[1.05em] uppercase tracking-[0.14em] text-[#6b7180] mt-0.5">{d.title}</div>
          </div>
        )}
        <div><SecAccent accent={accent}>Expériences professionnelles</SecAccent><ExpList d={d} accent={accent} bulleted /></div>
      </div>
    </div>
  </Paper>
);

export interface CvTemplate {
  id: string;
  name: string;
  ats: boolean;
  Preview: React.FC<{ data: CvData }>;
}

const make = (id: string, name: string, ats: boolean, L: React.FC<{ d: CvData; accent: string }>, accent: string): CvTemplate => ({
  id, name, ats, Preview: ({ data }) => <L d={data} accent={accent} />,
});

/* 9 modèles fidèles aux références ATS fournies. IDs conservés (compat CV sauvegardés). */
export const CV_TEMPLATES: CvTemplate[] = [
  make('vertex', 'Bleu', true, Bleu, '#1F5FBF'),
  make('lustre', 'Classique', true, Classique, '#2b3038'),
  make('quill', 'Sobre', true, Sobre, '#1F5FBF'),
  make('bare', 'Anglais', true, Anglais, '#2b3038'),
  make('nimbus', 'Deux colonnes', true, (p) => <SidebarLayout {...p} bg="#EEF1F4" accent="#222A44" />, '#222A44'),
  make('cobalt', 'Avec photo', false, AvecPhoto, '#1F5FBF'),
  make('aero', 'Moderne', false, ModernePhoto, '#5B7C99'),
  make('onyx', 'Colonne + photo', false, (p) => <SidebarLayout {...p} bg="#ECEFF3" accent="#334155" withPhoto nameInSidebar />, '#334155'),
  make('crest', 'Beige', false, (p) => <SidebarLayout {...p} bg="#EFE7DC" accent="#8A6F58" withPhoto nameInSidebar />, '#8A6F58'),
];

export const getCvTemplate = (id?: string) => CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];
