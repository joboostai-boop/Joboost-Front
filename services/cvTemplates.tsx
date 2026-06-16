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

/* Conteneur "feuille" : ratio A4, fond blanc, typo qui s'adapte à la largeur dispo. */
const Paper: React.FC<{ children: React.ReactNode; pad?: string; serif?: boolean }> = ({ children, pad = 'p-8', serif }) => (
  <div
    className={`bg-white text-[#1f2430] w-full aspect-[1/1.414] overflow-hidden ${pad} ${serif ? 'font-serif' : 'font-sans'}`}
    style={{ fontSize: 'clamp(7px, 1.5vw, 12px)', lineHeight: 1.45 }}
  >
    {children}
  </div>
);

/* Titre de section : libellé en petites capitales espacées + filet d'accent.
   Donne du rythme et une hiérarchie nette (le point faible des anciens modèles). */
const SectionHead: React.FC<{ children: React.ReactNode; accent: string; variant?: 'rule' | 'bar' | 'full' | 'plain' }> = ({ children, accent, variant = 'rule' }) => {
  if (variant === 'bar')
    return (
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-[0.45em] h-[0.95em] rounded-[1px]" style={{ background: accent }} />
        <span className="font-bold uppercase tracking-[0.16em] text-[0.82em]" style={{ color: accent }}>{children}</span>
      </div>
    );
  if (variant === 'full')
    return (
      <div className="font-bold uppercase tracking-[0.18em] text-[0.78em] text-white px-2 py-0.5 mb-1.5 rounded-[2px]" style={{ background: accent }}>{children}</div>
    );
  if (variant === 'plain')
    return <div className="font-bold uppercase tracking-[0.22em] text-[0.75em] text-[#9aa1ad] mb-1.5">{children}</div>;
  // 'rule' : libellé + trait fin sous le texte
  return (
    <div className="mb-1.5">
      <span className="font-bold uppercase tracking-[0.16em] text-[0.82em]" style={{ color: accent }}>{children}</span>
      <div className="h-px mt-0.5 w-full" style={{ background: `${accent}33` }} />
    </div>
  );
};

const ContactRow: React.FC<{ d: CvData; className?: string }> = ({ d, className }) => (
  <div className={`flex flex-wrap gap-x-2.5 gap-y-0.5 text-[0.82em] text-[#5b6270] ${className || ''}`}>
    {contacts(d).map((c, i) => (
      <span key={c} className="flex items-center gap-2.5">
        {i > 0 && <span className="text-[#c7ccd4]">•</span>}{c}
      </span>
    ))}
  </div>
);

const Exp: React.FC<{ d: CvData; accent?: string }> = ({ d, accent }) => (
  <div className="space-y-2">
    {(d.experiences || []).slice(0, 4).map((e, i) => (
      <div key={i}>
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-bold text-[1.02em]">{e.role || 'Poste'}</span>
          <span className="text-[0.82em] text-[#8a909c] shrink-0 tabular-nums">{period(e)}</span>
        </div>
        {e.company && <div className="font-semibold text-[0.95em]" style={accent ? { color: accent } : undefined}>{e.company}</div>}
        {desc(e) && <div className="text-[#4a505c] leading-snug whitespace-pre-line mt-0.5">{desc(e)}</div>}
      </div>
    ))}
  </div>
);

const Edu: React.FC<{ d: CvData; accent?: string }> = ({ d, accent }) => (
  <div className="space-y-1.5">
    {(d.education || []).slice(0, 4).map((e, i) => (
      <div key={i}>
        <div className="flex justify-between items-baseline gap-2">
          <span className="font-bold">{e.degree || e.level || 'Diplôme'}</span>
          <span className="text-[0.82em] text-[#8a909c] shrink-0 tabular-nums">{e.date}</span>
        </div>
        <div className="text-[#5b6270] text-[0.92em]" style={accent ? { color: accent } : undefined}>{[e.school, e.city].filter(Boolean).join(' · ')}</div>
      </div>
    ))}
  </div>
);

const SkillChips: React.FC<{ d: CvData; accent: string; tone?: 'soft' | 'solid' | 'outline' }> = ({ d, accent, tone = 'soft' }) => (
  <div className="flex flex-wrap gap-1">
    {(d.skills || []).map((s) =>
      tone === 'solid' ? (
        <span key={s} className="px-1.5 py-0.5 rounded text-white text-[0.9em] font-medium" style={{ background: accent }}>{s}</span>
      ) : tone === 'outline' ? (
        <span key={s} className="px-1.5 py-0.5 rounded text-[0.9em] font-medium border" style={{ borderColor: `${accent}66`, color: accent }}>{s}</span>
      ) : (
        <span key={s} className="px-1.5 py-0.5 rounded text-[0.9em] font-medium" style={{ background: `${accent}14`, color: accent }}>{s}</span>
      )
    )}
  </div>
);

/* ───────────────────── LAYOUTS ───────────────────── */

// Classique : sérif, en-tête centré, filets — élégant et très ATS.
const ClassicSerif: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-10" serif>
    <div className="text-center pb-2.5 mb-3 border-b-2" style={{ borderColor: accent }}>
      <div className="text-[2em] font-bold tracking-tight leading-none">{d.name}</div>
      <div className="text-[1.05em] mt-1 tracking-wide" style={{ color: accent }}>{d.title}</div>
      <ContactRow d={d} className="justify-center mt-1.5" />
    </div>
    {d.summary && <div className="mb-3"><SectionHead accent={accent} variant="rule">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
    <div className="mb-3"><SectionHead accent={accent} variant="rule">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-3"><SectionHead accent={accent} variant="rule">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
    {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="rule">Compétences</SectionHead><p className="text-[#4a505c]">{(d.skills || []).join('  ·  ')}</p></div>}
  </Paper>
);

// Moderne : sans-serif, nom fort, filet d'accent par section (sobre, ATS).
const ModernRule: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-9">
    <div className="flex items-end justify-between gap-3 mb-1">
      <div>
        <div className="text-[2.1em] font-extrabold tracking-tight leading-none">{d.name}</div>
        <div className="text-[1.1em] font-semibold mt-1" style={{ color: accent }}>{d.title}</div>
      </div>
    </div>
    <ContactRow d={d} className="mb-3" />
    <div className="h-[2.5px] w-full mb-3 rounded-full" style={{ background: accent }} />
    {d.summary && <div className="mb-3"><SectionHead accent={accent} variant="bar">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
    <div className="mb-3"><SectionHead accent={accent} variant="bar">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-3"><SectionHead accent={accent} variant="bar">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
    {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Compétences</SectionHead><SkillChips d={d} accent={accent} tone="soft" /></div>}
  </Paper>
);

// Minimaliste : très aéré, fines capitales, zéro fioriture (ultra ATS).
const MinimalClean: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-12">
    <div className="text-[2.2em] font-light tracking-tight leading-none">{d.name}</div>
    <div className="text-[0.95em] uppercase tracking-[0.28em] text-[#8a909c] mt-1.5">{d.title}</div>
    <ContactRow d={d} className="mt-1.5 mb-5" />
    {d.summary && <p className="leading-relaxed text-[#4a505c] mb-5">{d.summary}</p>}
    <div className="mb-5"><SectionHead accent={accent} variant="plain">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
    {(d.education || []).length > 0 && <div className="mb-5"><SectionHead accent={accent} variant="plain">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
    {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="plain">Compétences</SectionHead><p className="text-[#4a505c]">{(d.skills || []).join('   ·   ')}</p></div>}
  </Paper>
);

// Deux colonnes : sidebar claire à gauche (compétences/formation), expérience à droite.
const TwoColumn: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="px-8 pt-7 pb-3">
      <div className="text-[2em] font-extrabold tracking-tight leading-none">{d.name}</div>
      <div className="text-[1.05em] font-semibold mt-1" style={{ color: accent }}>{d.title}</div>
    </div>
    <div className="grid grid-cols-[1fr_1.8fr]">
      <div className="px-8 pb-8 pt-2 space-y-3" style={{ background: `${accent}0f` }}>
        <div><SectionHead accent={accent} variant="bar">Contact</SectionHead>
          <div className="space-y-0.5 text-[0.9em] text-[#4a505c] break-words">{contacts(d).map((c) => <div key={c}>{c}</div>)}</div>
        </div>
        {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Compétences</SectionHead><div className="space-y-0.5 text-[0.92em] text-[#4a505c]">{(d.skills || []).map((s) => <div key={s}>{s}</div>)}</div></div>}
        {(d.education || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
      </div>
      <div className="px-8 pb-8 pt-2 space-y-3">
        {d.summary && <div><SectionHead accent={accent} variant="bar">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
        <div><SectionHead accent={accent} variant="bar">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
      </div>
    </div>
  </Paper>
);

// Sidebar colorée : bandeau latéral plein (créatif mais lisible).
const Sidebar: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="flex h-full">
      <div className="w-[35%] text-white p-5 flex flex-col gap-3.5" style={{ background: accent }}>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-[1.3em] font-black overflow-hidden ring-2 ring-white/30">
          {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
        </div>
        <div>
          <div className="font-black leading-tight text-[1.2em]">{d.name}</div>
          <div className="opacity-90 mt-0.5">{d.title}</div>
        </div>
        <div className="text-[0.85em] opacity-90 space-y-0.5 break-words">{contacts(d).map((c) => <div key={c}>{c}</div>)}</div>
        {(d.skills || []).length > 0 && (
          <div><div className="font-bold uppercase tracking-[0.14em] text-[0.78em] mb-1 opacity-95">Compétences</div>
            <div className="space-y-0.5 text-[0.9em] opacity-95">{(d.skills || []).map((s) => <div key={s}>{s}</div>)}</div>
          </div>
        )}
      </div>
      <div className="flex-1 p-6 space-y-3">
        {d.summary && <div><SectionHead accent={accent} variant="bar">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
        <div><SectionHead accent={accent} variant="bar">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
        {(d.education || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
      </div>
    </div>
  </Paper>
);

// Avec photo : en-tête à photo ronde + accent (proche du modèle « avec photo »).
const PhotoHeader: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="flex items-center gap-4 p-6" style={{ background: `${accent}12` }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-[1.4em] font-black text-white overflow-hidden shrink-0" style={{ background: accent }}>
        {d.photoUrl ? <img src={d.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials(d.name)}
      </div>
      <div className="min-w-0">
        <div className="text-[1.9em] font-extrabold tracking-tight leading-none">{d.name}</div>
        <div className="text-[1.05em] font-semibold mt-1" style={{ color: accent }}>{d.title}</div>
        <ContactRow d={d} className="mt-1" />
      </div>
    </div>
    <div className="p-7 pt-4 space-y-3">
      {d.summary && <div><SectionHead accent={accent} variant="bar">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
      <div><SectionHead accent={accent} variant="bar">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
      <div className="grid grid-cols-2 gap-4">
        {(d.education || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
        {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Compétences</SectionHead><SkillChips d={d} accent={accent} tone="soft" /></div>}
      </div>
    </div>
  </Paper>
);

// Bandeau plein en tête (créatif assumé).
const BandHeader: React.FC<{ d: CvData; accent: string }> = ({ d, accent }) => (
  <Paper pad="p-0">
    <div className="text-white p-6" style={{ background: accent }}>
      <div className="text-[2.1em] font-black tracking-tight leading-none">{d.name}</div>
      <div className="opacity-90 text-[1.05em] mt-1">{d.title}</div>
      <ContactRow d={d} className="!text-white/85 mt-1.5" />
    </div>
    <div className="p-7 space-y-3">
      {d.summary && <div><SectionHead accent={accent} variant="bar">Profil</SectionHead><p className="leading-snug text-[#4a505c]">{d.summary}</p></div>}
      <div><SectionHead accent={accent} variant="bar">Expérience</SectionHead><Exp d={d} accent={accent} /></div>
      <div className="grid grid-cols-2 gap-4">
        {(d.education || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Formation</SectionHead><Edu d={d} accent={accent} /></div>}
        {(d.skills || []).length > 0 && <div><SectionHead accent={accent} variant="bar">Compétences</SectionHead><SkillChips d={d} accent={accent} tone="solid" /></div>}
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

/* 10 modèles inspirés des références fournies (couleurs reprises des modèles ATS) :
   IDs conservés pour ne pas casser les CV déjà sauvegardés. */
export const CV_TEMPLATES: CvTemplate[] = [
  make('vertex', 'Bleu', true, ModernRule, '#1D6FF2'),        // « bleu »
  make('cobalt', 'Azur', true, PhotoHeader, '#0A66C2'),        // « avec photo » bleu
  make('lustre', 'Classique', true, ClassicSerif, '#463A4F'),  // « classique » prune
  make('quill', 'Élégant', true, ClassicSerif, '#1F2937'),     // sobre charbon
  make('bare', 'Simple', true, MinimalClean, '#111827'),       // « simple »
  make('aero', 'Émeraude', true, MinimalClean, '#047857'),     // variante verte
  make('nimbus', 'Deux colonnes', true, TwoColumn, '#B7902E'), // « deux colonnes » or
  make('onyx', 'Ardoise', true, TwoColumn, '#222A44'),         // « gris » navy
  make('crest', 'Beige', false, BandHeader, '#8A7361'),        // « beige » taupe
  make('mosaic', 'Sidebar', false, Sidebar, '#1D6FF2'),        // créatif colonne
];

export const getCvTemplate = (id?: string) => CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];
