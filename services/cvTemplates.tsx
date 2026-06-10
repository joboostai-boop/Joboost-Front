import React from 'react';

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
const desc = (e: any) => e?.desc || e?.missions || '';
const contacts = (d: CvData) => [d.email, d.phone, d.city].filter(Boolean);
const initials = (n?: string) => (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

/* Conteneur "feuille" : ratio A4, fond blanc, contenu qui s'adapte à la largeur dispo. */
const Paper: React.FC<{ children: React.ReactNode; pad?: string; serif?: boolean }> = ({ children, pad = 'p-8', serif }) => (
  <div className={`bg-white text-slate-800 w-full aspect-[1/1.414] overflow-hidden shadow-sm ${pad} ${serif ? 'font-serif' : 'font-sans'}`} style={{ fontSize: 'clamp(7px, 1.45vw, 12px)' }}>
    {children}
  </div>
);

const Exp: React.FC<{ d: CvData; accent?: string }> = ({ d, accent }) => (
  <>
    {(d.experiences || []).slice(0, 4).map((e, i) => (
      <div key={i} className="mb-2">
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-bold">{e.role || 'Poste'}</span>
          <span className="text-[0.85em] text-slate-500 shrink-0">{period(e)}</span>
        </div>
        <div className="font-semibold italic" style={accent ? { color: accent } : undefined}>{e.company}</div>
        {desc(e) && <div className="text-slate-600 leading-snug whitespace-pre-line">{desc(e)}</div>}
      </div>
    ))}
  </>
);

const Edu: React.FC<{ d: CvData }> = ({ d }) => (
  <>
    {(d.education || []).slice(0, 4).map((e, i) => (
      <div key={i} className="mb-1.5">
        <div className="flex justify-between gap-2">
          <span className="font-bold">{e.degree || e.level || 'Diplôme'}</span>
          <span className="text-[0.85em] text-slate-500 shrink-0">{e.date}</span>
        </div>
        <div className="text-slate-600">{[e.school, e.city].filter(Boolean).join(' · ')}</div>
      </div>
    ))}
  </>
);

const H: React.FC<{ children: React.ReactNode; accent?: string; line?: boolean }> = ({ children, accent, line }) => (
  <div className={`font-black uppercase tracking-widest text-[0.8em] mb-1 ${line ? 'border-b pb-0.5' : ''}`} style={accent ? { color: accent } : undefined}>{children}</div>
);

/* ───────────────────── LAYOUTS ───────────────────── */

// Classique : sérif, en-tête centré, filets pleine largeur (très ATS).
const Classic: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10" serif>
    <div className="text-center border-b-2 border-slate-800 pb-2 mb-3">
      <div className="text-[1.9em] font-bold tracking-tight">{d.name}</div>
      <div className="text-[1.05em]" style={{ color: accent }}>{d.title}</div>
      <div className="text-[0.85em] text-slate-500 mt-1">{contacts(d).join('  ·  ')}</div>
    </div>
    {d.summary && <div className="mb-3"><H line>Résumé</H><p className="leading-snug">{d.summary}</p></div>}
    <div className="mb-3"><H line>Expérience</H><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-3"><H line>Formation</H><Edu d={d} /></div>}
    {(d.skills || []).length > 0 && <div><H line>Compétences</H><p>{(d.skills || []).join(' · ')}</p></div>}
  </Paper>
);

// Moderne : sans-serif, titre coloré, alignement gauche, sobre (ATS).
const Modern: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10">
    <div className="mb-3">
      <div className="text-[2em] font-black tracking-tight">{d.name}</div>
      <div className="text-[1.1em] font-bold" style={{ color: accent }}>{d.title}</div>
      <div className="text-[0.85em] text-slate-500 mt-0.5">{contacts(d).join('   ')}</div>
    </div>
    <div className="h-[3px] w-full mb-3" style={{ background: accent }} />
    {d.summary && <div className="mb-3"><H accent={accent}>Profil</H><p className="leading-snug">{d.summary}</p></div>}
    <div className="mb-3"><H accent={accent}>Expérience</H><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-3"><H accent={accent}>Formation</H><Edu d={d} /></div>}
    {(d.skills || []).length > 0 && (
      <div><H accent={accent}>Compétences</H>
        <div className="flex flex-wrap gap-1">{(d.skills || []).map((s) => <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{s}</span>)}</div>
      </div>
    )}
  </Paper>
);

// Minimaliste : aéré, fines majuscules, aucune fioriture (ultra ATS).
const Minimal: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-12">
    <div className="text-[2.1em] font-light tracking-tight">{d.name}</div>
    <div className="text-[1em] uppercase tracking-[0.25em] text-slate-500 mb-1">{d.title}</div>
    <div className="text-[0.85em] text-slate-500 mb-4">{contacts(d).join('  /  ')}</div>
    {d.summary && <p className="leading-relaxed mb-4">{d.summary}</p>}
    <div className="mb-4"><div className="uppercase tracking-[0.25em] text-[0.8em] text-slate-400 mb-1">Expérience</div><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-4"><div className="uppercase tracking-[0.25em] text-[0.8em] text-slate-400 mb-1">Formation</div><Edu d={d} /></div>}
    {(d.skills || []).length > 0 && <div><div className="uppercase tracking-[0.25em] text-[0.8em] text-slate-400 mb-1">Compétences</div><p>{(d.skills || []).join(' · ')}</p></div>}
  </Paper>
);

// Barre latérale colorée (créatif, non-ATS).
const Sidebar: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="flex h-full">
      <div className="w-[34%] text-white p-4 flex flex-col gap-3" style={{ background: accent }}>
        <div className="w-12 h-12 rounded-full bg-white/25 flex items-center justify-center text-[1.3em] font-black overflow-hidden">
          {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
        </div>
        <div>
          <div className="font-black leading-tight text-[1.15em]">{d.name}</div>
          <div className="opacity-90">{d.title}</div>
        </div>
        <div className="text-[0.85em] opacity-90 space-y-0.5 break-words">{contacts(d).map((c) => <div key={c}>{c}</div>)}</div>
        {(d.skills || []).length > 0 && (
          <div><div className="font-bold uppercase tracking-wider text-[0.8em] mb-1 opacity-90">Compétences</div>
            <div className="space-y-0.5 text-[0.9em]">{(d.skills || []).map((s) => <div key={s}>{s}</div>)}</div>
          </div>
        )}
      </div>
      <div className="flex-1 p-5">
        {d.summary && <div className="mb-3"><H accent={accent}>Profil</H><p className="leading-snug">{d.summary}</p></div>}
        <div className="mb-3"><H accent={accent}>Expérience</H><Exp d={d} accent={accent} /></div>
        {(d.education || []).length > 0 && <div><H accent={accent}>Formation</H><Edu d={d} /></div>}
      </div>
    </div>
  </Paper>
);

// Bandeau coloré en tête (créatif, non-ATS).
const Band: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="text-white p-6" style={{ background: accent }}>
      <div className="text-[2em] font-black tracking-tight">{d.name}</div>
      <div className="opacity-90 text-[1.05em]">{d.title}</div>
      <div className="opacity-80 text-[0.85em] mt-1">{contacts(d).join('   ·   ')}</div>
    </div>
    <div className="p-6">
      {d.summary && <div className="mb-3"><H accent={accent}>Profil</H><p className="leading-snug">{d.summary}</p></div>}
      <div className="mb-3"><H accent={accent}>Expérience</H><Exp d={d} accent={accent} /></div>
      <div className="grid grid-cols-2 gap-4">
        {(d.education || []).length > 0 && <div><H accent={accent}>Formation</H><Edu d={d} /></div>}
        {(d.skills || []).length > 0 && <div><H accent={accent}>Compétences</H><div className="flex flex-wrap gap-1">{(d.skills || []).map((s) => <span key={s} className="px-1.5 py-0.5 rounded text-white text-[0.9em]" style={{ background: accent }}>{s}</span>)}</div></div>}
      </div>
    </div>
  </Paper>
);

// Deux colonnes (semi-créatif).
const TwoCol: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-8">
    <div className="border-b-2 pb-2 mb-3" style={{ borderColor: accent }}>
      <div className="text-[2em] font-black">{d.name}</div>
      <div className="font-bold" style={{ color: accent }}>{d.title}</div>
      <div className="text-[0.85em] text-slate-500">{contacts(d).join('  ·  ')}</div>
    </div>
    <div className="grid grid-cols-[1.6fr_1fr] gap-5">
      <div>
        {d.summary && <div className="mb-3"><H accent={accent}>Profil</H><p className="leading-snug">{d.summary}</p></div>}
        <H accent={accent}>Expérience</H><Exp d={d} accent={accent} />
      </div>
      <div>
        {(d.skills || []).length > 0 && <div className="mb-3"><H accent={accent}>Compétences</H><div className="space-y-0.5">{(d.skills || []).map((s) => <div key={s}>{s}</div>)}</div></div>}
        {(d.education || []).length > 0 && <div><H accent={accent}>Formation</H><Edu d={d} /></div>}
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

// 10 modèles : 6 ATS (sobres) + 4 créatifs (non-ATS).
export const CV_TEMPLATES: CvTemplate[] = [
  make('lustre', 'Lustre', true, Classic, '#334155'),
  make('quill', 'Quill', true, Classic, '#4F46E5'),
  make('vertex', 'Vertex', true, Modern, '#4F46E5'),
  make('cobalt', 'Cobalt', true, Modern, '#2563EB'),
  make('bare', 'Bare', true, Minimal, '#111827'),
  make('aero', 'Aero', true, Minimal, '#059669'),
  make('nimbus', 'Nimbus', false, Sidebar, '#4F46E5'),
  make('onyx', 'Onyx', false, Sidebar, '#0F172A'),
  make('crest', 'Crest', false, Band, '#7C3AED'),
  make('mosaic', 'Mosaic', false, TwoCol, '#E11D48'),
];

export const getCvTemplate = (id?: string) => CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];
