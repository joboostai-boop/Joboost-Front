import React, { useContext, useLayoutEffect, useRef, useState } from 'react';
import { PreviewModeContext } from './previewMode';

export interface LetterData {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  company?: string;
  jobTitle?: string;
  body?: string;
}

const today = () => new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const contacts = (d: LetterData) => [d.email, d.phone, d.city].filter(Boolean);

// Largeur de référence A4 — la lettre est rendue à cette largeur puis réduite
// par transform:scale pour remplir sa carte (vraie vignette nette, comme le CV).
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
        style={{ position: 'absolute', top: 0, left: 0, width: SHEET_W, transform: `scale(${scale})`, transformOrigin: 'top left', fontSize: 13, lineHeight: 1.5 }}
      >
        <div className={`bg-white text-slate-800 ${pad}`}>{children}</div>
      </div>
    </div>
  );
};

const Body: React.FC<{ d: LetterData }> = ({ d }) => (
  <>
    <div className="font-bold mb-3">Objet : Candidature au poste de {d.jobTitle || '…'}</div>
    <p className="leading-relaxed whitespace-pre-line">{d.body || 'Le texte de votre lettre apparaîtra ici…'}</p>
    <div className="mt-5">
      <p>Cordialement,</p>
      <p className="font-bold mt-1">{d.name}</p>
    </div>
  </>
);

const Recipient: React.FC<{ d: LetterData; align?: string }> = ({ d, align }) => (
  <div className={`mb-4 ${align || ''}`}>
    <p className="font-bold">{d.company || "L'entreprise"}</p>
    <p className="text-slate-500">À l'attention du service recrutement</p>
    <p className="text-slate-500 mt-1">{d.city ? `${d.city}, ` : ''}le {today()}</p>
  </div>
);

/* ───── Layouts ───── */

const Classic: React.FC<{ d: LetterData; accent: string }> = ({ d, accent }) => (
  <Paper serif>
    <div className="mb-5">
      <p className="font-bold text-[1.1em]">{d.name}</p>
      {contacts(d).map((c) => <p key={c} className="text-slate-500">{c}</p>)}
    </div>
    <Recipient d={d} align="text-right" />
    <Body d={d} />
  </Paper>
);

const Modern: React.FC<{ d: LetterData; accent: string }> = ({ d, accent }) => (
  <Paper>
    <div className="flex justify-between items-end border-b-2 pb-2 mb-4" style={{ borderColor: accent }}>
      <div>
        <p className="text-[1.6em] font-black tracking-tight">{d.name}</p>
        <p className="font-bold" style={{ color: accent }}>{d.jobTitle}</p>
      </div>
      <div className="text-right text-slate-500 text-[0.9em]">{contacts(d).map((c) => <div key={c}>{c}</div>)}</div>
    </div>
    <Recipient d={d} />
    <Body d={d} />
  </Paper>
);

const Centered: React.FC<{ d: LetterData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-12">
    <div className="text-center pb-3 mb-4 border-b" style={{ borderColor: accent }}>
      <p className="text-[1.7em] font-light tracking-wide">{d.name}</p>
      <p className="text-slate-500 text-[0.9em]">{contacts(d).join('  ·  ')}</p>
    </div>
    <Recipient d={d} />
    <Body d={d} />
  </Paper>
);

const Banner: React.FC<{ d: LetterData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="text-white p-6" style={{ background: accent }}>
      <p className="text-[1.7em] font-black">{d.name}</p>
      <p className="opacity-90 text-[0.9em]">{contacts(d).join('   ·   ')}</p>
    </div>
    <div className="p-8">
      <Recipient d={d} />
      <Body d={d} />
    </div>
  </Paper>
);

const Sidebar: React.FC<{ d: LetterData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="flex h-full">
      <div className="w-[30%] text-white p-4" style={{ background: accent }}>
        <p className="font-black text-[1.1em] leading-tight">{d.name}</p>
        <div className="mt-3 space-y-1 text-[0.9em] opacity-90 break-words">{contacts(d).map((c) => <div key={c}>{c}</div>)}</div>
      </div>
      <div className="flex-1 p-6">
        <Recipient d={d} />
        <Body d={d} />
      </div>
    </div>
  </Paper>
);

export interface LetterTemplate {
  id: string;
  name: string;
  ats: boolean;
  Preview: React.FC<{ data: LetterData }>;
}

const make = (id: string, name: string, ats: boolean, L: React.FC<{ d: LetterData; accent: string }>, accent: string): LetterTemplate => ({
  id, name, ats, Preview: ({ data }) => <L d={data} accent={accent} />,
});

export const LETTER_TEMPLATES: LetterTemplate[] = [
  make('sobre', 'Sobre', true, Classic, '#334155'),
  make('classique', 'Classique', true, Classic, '#4F46E5'),
  make('moderne', 'Moderne', true, Modern, '#4F46E5'),
  make('azur', 'Azur', true, Modern, '#2563EB'),
  make('epuree', 'Épurée', true, Centered, '#111827'),
  make('net', 'Net', true, Centered, '#059669'),
  make('bandeau', 'Bandeau', false, Banner, '#7C3AED'),
  make('ardoise', 'Ardoise', false, Banner, '#0F172A'),
  make('colonne', 'Colonne', false, Sidebar, '#4F46E5'),
  make('corail', 'Corail', false, Sidebar, '#E11D48'),
];

export const getLetterTemplate = (id?: string) => LETTER_TEMPLATES.find((t) => t.id === id) || LETTER_TEMPLATES[0];
