
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Printer, FileDown, Wand2, RefreshCw, Layout, Save, Clock, Loader2, Plus, Trash2, X, Files, Target, Camera, ImageOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateCVSummary, detailExperience } from '../services/gemini';
// Import dynamique au clic (les libs PDF/Word sont lourdes — ~1,8 Mo — on ne les charge
// que lors d'un export, pas à l'ouverture de l'éditeur).
import { authHeaders } from '../services/authToken';
import TemplateGallery from '../components/TemplateGallery';
import { CV_TEMPLATES, getCvTemplate } from '../services/cvTemplates';
import { computeAtsScore } from '../services/atsScore';
import AtsScoreCard from '../components/AtsScoreCard';
import CvExamplesModal from '../components/CvExamplesModal';
import Tilt from '../components/Tilt';
import Collapsible, { CountBadge } from '../components/Collapsible';
import ActionMenu from '../components/ActionMenu';
import AiLoadingOverlay from '../components/AiLoadingOverlay';
import { CvExample } from '../services/cvExamples';

const uid = () => Math.random().toString(36).slice(2, 10);

// Lit une image locale, la recadre en carré et la réduit à ~256px (JPEG qualité 0.82).
// Objectif : une photo d'identité nette pour le CV, SANS stocker un base64 énorme
// (le CV est sauvegardé en JSON — une image brute de plusieurs Mo le rendrait lourd).
const readAndResizePhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 256;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas')); return; }
        // Recadrage carré centré (cover) pour une photo ronde propre dans les modèles.
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });

interface ExperienceItem { id: string; role: string; company: string; period: string; desc: string; }
interface EducationItem { id: string; degree: string; school: string; date: string; city: string; }

/* Éditeur de « chips » (compétences) — saisie + suggestions, comme dans le profil. */
const SkillsEditor: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F0FF] text-[#7D5CFF] text-sm font-semibold dark:bg-[#7D5CFF]/10">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="hover:text-[#6023C0]"><X size={13} /></button>
            </span>
          ))}
        </div>
      )}
      <input
        className="input-pro"
        value={draft}
        placeholder="Ajoute une compétence (Entrée pour valider)"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
        onBlur={() => draft && add(draft)}
      />
    </div>
  );
};

const CVGenerator: React.FC = () => {
  const location = useLocation();
  const incoming = (location.state as any) || {};
  // Modèle pré-sélectionné depuis la page « Modèles » (navigation avec state).
  const incomingTemplate = incoming.template as string | undefined;
  // Offre ciblée (arrivée depuis le bouton « CV » d'une offre) : oriente la génération IA.
  const [target, setTarget] = useState<{ jobTitle?: string; company?: string; context: string } | null>(
    incoming.targetContext ? { jobTitle: incoming.jobTitle, company: incoming.company, context: incoming.targetContext } : null
  );

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiExpId, setAiExpId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cvs, setCvs] = useState<any[]>([]);
  const [currentCvId, setCurrentCvId] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    city: '',
    summary: '',
    photoUrl: '',
    template: incomingTemplate || 'vertex',
    skills: [] as string[],
    experiences: [] as ExperienceItem[],
    education: [] as EducationItem[],
  });
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Choisis un fichier image (JPG, PNG).'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Image trop lourde (max 8 Mo).'); return; }
    try {
      const dataUrl = await readAndResizePhoto(file);
      setFormData((p) => ({ ...p, photoUrl: dataUrl }));
      toast.success('Photo ajoutée — visible sur les modèles avec photo.');
    } catch { toast.error("Impossible de lire cette image."); }
  };

  // Normalise les expériences/formations (issues du profil ou d'un CV sauvegardé)
  // vers la forme éditée ici (période + description en texte simple).
  const normalizeExperiences = (arr: any[]): ExperienceItem[] =>
    (Array.isArray(arr) ? arr : []).map((e: any) => ({
      id: e.id || uid(),
      role: e.role || '',
      company: e.company || '',
      period: e.period || [e.startDate, e.current ? "Aujourd'hui" : e.endDate].filter(Boolean).join(' – '),
      desc: e.desc || e.missions || '',
    }));
  const normalizeEducation = (arr: any[]): EducationItem[] =>
    (Array.isArray(arr) ? arr : []).map((e: any) => ({
      id: e.id || uid(),
      degree: e.degree || e.level || '',
      school: e.school || '',
      date: e.date || '',
      city: e.city || '',
    }));

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, { credentials: 'include', headers: { ...authHeaders() } });
        const userData = await userRes.json();

        const cvRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/cvs`, { credentials: 'include', headers: { ...authHeaders() } });
        const cvData = await cvRes.json();

        if (userData.success) {
           const u = userData.user;
           setFormData(prev => ({
             ...prev,
             name: u.name || 'Candidat',
             // Si on arrive depuis une offre, on cible directement son intitulé de poste.
             title: incoming.jobTitle || u.title || 'Développeur',
             email: u.email || '',
             phone: u.phone || '',
             city: u.city || '',
             summary: u.summary || '',
             // Reprend la photo du profil (OAuth Google/LinkedIn) comme point de départ.
             photoUrl: u.photoUrl || '',
             skills: Array.isArray(u.skills) ? u.skills.map((s:any) => typeof s === 'string' ? s : s.name) : [],
             experiences: normalizeExperiences(u.experiences),
             education: normalizeEducation(u.education),
           }));
        }

        if (cvData.success) {
           setCvs(cvData.cvs);
        }
      } catch(e) {
         console.error(e);
      } finally { setLoading(false); }
    };
    init();
  }, []);

  /* ── Listes dynamiques ── */
  const addExperience = () =>
    setFormData((p) => ({ ...p, experiences: [...p.experiences, { id: uid(), role: '', company: '', period: '', desc: '' }] }));
  const updExperience = (id: string, patch: Partial<ExperienceItem>) =>
    setFormData((p) => ({ ...p, experiences: p.experiences.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const delExperience = (id: string) =>
    setFormData((p) => ({ ...p, experiences: p.experiences.filter((e) => e.id !== id) }));

  const addEducation = () =>
    setFormData((p) => ({ ...p, education: [...p.education, { id: uid(), degree: '', school: '', date: '', city: '' }] }));
  const updEducation = (id: string, patch: Partial<EducationItem>) =>
    setFormData((p) => ({ ...p, education: p.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  const delEducation = (id: string) =>
    setFormData((p) => ({ ...p, education: p.education.filter((e) => e.id !== id) }));

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const summary = await generateCVSummary(formData.title, formData.skills, formData.experiences, target?.context);
      if (summary) {
        setFormData({ ...formData, summary });
        toast.success("Résumé généré avec succès !");
      }
    } catch (error) { toast.error("Erreur lors de la génération."); }
    finally { setLoadingSummary(false); }
  };

  const handleDetailExperience = async (exp: ExperienceItem) => {
    if (!exp.role) { toast.error("Renseigne au moins l'intitulé du poste."); return; }
    setAiExpId(exp.id);
    try {
      const txt = await detailExperience({
        role: exp.role,
        company: exp.company,
        period: exp.period,
        targetTitle: formData.title,
        notes: exp.desc,
        jobContext: target?.context,
      });
      if (txt) {
        updExperience(exp.id, { desc: txt });
        toast.success("Expérience détaillée par l'IA — relis et ajuste si besoin.");
      }
    } catch (error: any) {
      toast.error(error?.message || "Erreur de l'IA.");
    } finally { setAiExpId(null); }
  };

  const handleSaveCV = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = currentCvId ? `${baseUrl}/api/cvs/${currentCvId}` : `${baseUrl}/api/cvs`;
      const method = currentCvId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: `CV ${formData.title} - ${formData.template}`,
          template: formData.template,
          content: formData
        })
      });
      const data = await res.json();
      if(data.success) {
         toast.success("CV sauvegardé !");
         setCurrentCvId(data.cv.id);
         const cvRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/cvs`, { credentials: 'include', headers: { ...authHeaders() } });
         const cvData = await cvRes.json();
         if(cvData.success) setCvs(cvData.cvs);
      }
    } catch(e) { toast.error("Erreur de sauvegarde"); }
  };

  const loadCv = (cv: any) => {
    const c = cv.content || {};
    setFormData((prev) => ({
      ...prev,
      ...c,
      experiences: normalizeExperiences(c.experiences),
      education: normalizeEducation(c.education),
      skills: Array.isArray(c.skills) ? c.skills : [],
    }));
    setCurrentCvId(cv.id);
    toast.success("CV rechargé");
  };

  // Charge un exemple pré-rempli : on régénère les identifiants (lignes éditables)
  // et on conserve le modèle déjà choisi. C'est un point de départ à personnaliser.
  const loadExample = (ex: CvExample) => {
    setFormData((prev) => ({
      ...prev,
      ...ex.data,
      experiences: normalizeExperiences(ex.data.experiences.map(({ id, ...e }) => e)),
      education: normalizeEducation(ex.data.education.map(({ id, ...e }) => e)),
    }));
    setCurrentCvId(null); // exemple = nouveau document non encore sauvegardé
    toast.success(`Exemple « ${ex.role} » chargé — personnalise-le avec tes infos.`);
  };

  const [exporting, setExporting] = useState(false);

  // L'export ATS attend `period` pour les formations (l'aperçu utilise `date`/`city`).
  // On adapte sans toucher aux données éditées.
  const exportData = () => ({
    ...formData,
    education: formData.education.map((e) => ({ ...e, period: e.date })),
  });

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { exportCvPdf } = await import('../services/atsExport');
      await exportCvPdf(exportData());
      toast.success("CV PDF (ATS) téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    } finally { setExporting(false); }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      const { exportCvDocx } = await import('../services/atsExport');
      await exportCvDocx(exportData());
      toast.success("CV Word (.docx) téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Word.");
    } finally { setExporting(false); }
  };

  const SelectedPreview = getCvTemplate(formData.template).Preview;
  const atsResult = useMemo(() => computeAtsScore(formData), [formData]);

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10">
      <AiLoadingOverlay
        show={loadingSummary || aiExpId !== null}
        title={loadingSummary ? 'Rédaction de votre résumé…' : 'Rédaction de votre expérience…'}
        messages={
          loadingSummary
            ? [
                'Analyse de votre profil…',
                'Sélection de vos points forts…',
                'Rédaction du résumé…',
                'Touches finales…',
              ]
            : [
                'Analyse de votre poste…',
                'Formulation de vos missions…',
                'Touches finales…',
              ]
        }
      />
      <div className="flex-1 space-y-3">
        {target && (
          <div className="surface-accent rounded-xl p-3.5 flex items-start gap-3 ring-1 ring-[#7D5CFF]/20">
            <span className="w-9 h-9 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center shrink-0"><Target size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#111827] dark:text-white">
                CV ciblé pour cette offre{target.jobTitle ? ` : ${target.jobTitle}` : ''}{target.company ? ` — ${target.company}` : ''}
              </p>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                « Aider à rédiger » et « Détailler avec l'IA » reprendront les mots-clés de l'offre, sans rien inventer.
              </p>
            </div>
            <button onClick={() => setTarget(null)} aria-label="Retirer le ciblage de l'offre" className="press text-slate-400 hover:text-[#7D5CFF] shrink-0">
              <X size={16} />
            </button>
          </div>
        )}
        <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <p className="text-sm text-[#6B7280] dark:text-slate-400 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Modifie chaque section ici — l'aperçu et l'export se mettent à jour en direct.
          </p>
          <ActionMenu
            label="Actions"
            className="shrink-0"
            items={[
              { label: "Partir d'un exemple", icon: <Files size={16} />, onClick: () => setShowExamples(true) },
              { label: 'Sauvegarder le CV', icon: <Save size={16} />, onClick: handleSaveCV },
              { label: 'Imprimer', icon: <Printer size={16} />, onClick: () => window.print() },
            ]}
          />
        </header>

        {cvs.length > 0 && (
           <section className="space-y-3">
               <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">Vos CV sauvegardés</h3>
               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                 {cvs.map(cv => (
                   <div key={cv.id} onClick={() => loadCv(cv)} className={`press shrink-0 cursor-pointer p-4 rounded-xl w-48 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${currentCvId === cv.id ? 'surface-accent ring-1 ring-[#7D5CFF]/40' : 'surface'}`}>
                     <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{cv.title}</p>
                     <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-1"><Clock size={10} /> {new Date(cv.updatedAt).toLocaleDateString()}</p>
                   </div>
                 ))}
               </div>
           </section>
        )}

        {/* Choix du modèle */}
        <Collapsible title="Modèle de CV" icon={<Layout size={16} />} subtitle={`Sélectionné : ${getCvTemplate(formData.template).name}`}>
          <TemplateGallery
            items={CV_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={formData} /> }))}
            selectedId={formData.template}
            onSelect={(id) => setFormData({ ...formData, template: id })}
          />
        </Collapsible>

        {/* Coordonnées + résumé */}
        <Collapsible defaultOpen step={1} title="Coordonnées & résumé" bodyClassName="px-4 md:px-5 pb-5 space-y-5">
          {/* Photo (optionnelle) — n'apparaît que sur les modèles « avec photo ». */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] ring-1 ring-[#7D5CFF]/20">
              {formData.photoUrl
                ? <img src={formData.photoUrl} alt="Photo du CV" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <Camera size={22} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => photoInputRef.current?.click()} className="press btn btn-secondary !min-h-0 !py-1.5 !px-3 text-xs">
                  <Camera size={14} /> {formData.photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {formData.photoUrl && (
                  <button type="button" onClick={() => setFormData((p) => ({ ...p, photoUrl: '' }))} className="press btn btn-secondary !min-h-0 !py-1.5 !px-3 text-xs !text-red-500 !border-red-200 hover:!bg-red-50">
                    <ImageOff size={14} /> Retirer
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-1.5 leading-snug">
                Optionnel. Visible uniquement sur les modèles « avec photo ». Astuce : un CV sans photo passe mieux les filtres automatiques (ATS).
              </p>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nom complet</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-pro" />
            </div>
            <div>
              <label className="input-label">Poste recherché</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="input-pro" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-pro" placeholder="jean.dupont@email.com" />
            </div>
            <div>
              <label className="input-label">Téléphone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input-pro" placeholder="06 12 34 56 78" />
            </div>
            <div className="md:col-span-2">
              <label className="input-label">Ville</label>
              <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="input-pro" placeholder="Lyon" />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="input-label mb-0">Résumé du profil</label>
              <button onClick={handleGenerateSummary} className="text-[#7D5CFF] text-xs font-semibold flex items-center gap-1 hover:underline outline-none">
                {loadingSummary ? <RefreshCw className="animate-spin" size={12} /> : <Wand2 size={12} />}
                Aider à rédiger
              </button>
            </div>
            <textarea value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} className="textarea-pro" placeholder="2-3 phrases qui résument ton profil et ce que tu cherches." />
          </div>
        </Collapsible>

        {/* Compétences */}
        <Collapsible step={2} title="Compétences" badge={<CountBadge n={formData.skills.length} />}>
          <SkillsEditor value={formData.skills} onChange={(skills) => setFormData({ ...formData, skills })} />
        </Collapsible>

        {/* Expériences */}
        <Collapsible step={3} title="Expériences" badge={<CountBadge n={formData.experiences.length} />} bodyClassName="px-4 md:px-5 pb-5 space-y-4">
          {formData.experiences.map((exp) => (
            <div key={exp.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Expérience</span>
                <button onClick={() => delExperience(exp.id)} className="text-slate-400 hover:text-red-500" aria-label="Supprimer l'expérience"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input-pro" value={exp.role} onChange={(e) => updExperience(exp.id, { role: e.target.value })} placeholder="Poste (ex : Développeur)" />
                <input className="input-pro" value={exp.company} onChange={(e) => updExperience(exp.id, { company: e.target.value })} placeholder="Entreprise" />
              </div>
              <input className="input-pro" value={exp.period} onChange={(e) => updExperience(exp.id, { period: e.target.value })} placeholder="Période (ex : 2021 – 2024)" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Missions & résultats</span>
                <button type="button" onClick={() => handleDetailExperience(exp)} disabled={aiExpId === exp.id}
                  className="flex items-center gap-1 text-[#7D5CFF] text-xs font-bold hover:underline disabled:opacity-50">
                  {aiExpId === exp.id ? <RefreshCw className="animate-spin" size={13} /> : <Wand2 size={13} />} Détailler avec l'IA
                </button>
              </div>
              <textarea className="textarea-pro !min-h-[80px]" value={exp.desc} onChange={(e) => updExperience(exp.id, { desc: e.target.value })} placeholder="Décris en quelques mots, puis clique « Détailler avec l'IA » — ex : accueil clients, gestion des stocks…" />
            </div>
          ))}
          <button onClick={addExperience} className="press btn btn-secondary w-full"><Plus size={16} /> Ajouter une expérience</button>
        </Collapsible>

        {/* Formations */}
        <Collapsible step={4} title="Formations" badge={<CountBadge n={formData.education.length} />} bodyClassName="px-4 md:px-5 pb-5 space-y-4">
          {formData.education.map((ed) => (
            <div key={ed.id} className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Formation</span>
                <button onClick={() => delEducation(ed.id)} className="text-slate-400 hover:text-red-500" aria-label="Supprimer la formation"><Trash2 size={16} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input-pro" value={ed.degree} onChange={(e) => updEducation(ed.id, { degree: e.target.value })} placeholder="Diplôme" />
                <input className="input-pro" value={ed.school} onChange={(e) => updEducation(ed.id, { school: e.target.value })} placeholder="Établissement" />
                <input className="input-pro" value={ed.date} onChange={(e) => updEducation(ed.id, { date: e.target.value })} placeholder="Année (ex : 2024)" />
                <input className="input-pro" value={ed.city} onChange={(e) => updEducation(ed.id, { city: e.target.value })} placeholder="Ville" />
              </div>
            </div>
          ))}
          <button onClick={addEducation} className="press btn btn-secondary w-full"><Plus size={16} /> Ajouter une formation</button>
        </Collapsible>
      </div>

      <div className="w-full lg:w-[450px] space-y-5 lg:sticky lg:top-[88px] lg:self-start">
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={exporting} className="press btn btn-primary flex-1 disabled:opacity-60">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF ATS
          </button>
          <button onClick={handleExportDocx} disabled={exporting} className="press btn btn-secondary flex-1 text-[#7D5CFF] disabled:opacity-60">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Word .docx
          </button>
        </div>

        {/* Score ATS indicatif (calculé en direct depuis le contenu édité) */}
        <Tilt max={6} glare>
          <AtsScoreCard result={atsResult} />
        </Tilt>

        {/* Aperçu du modèle sélectionné (grand format) */}
        <Tilt max={4}>
        <div id="cv-preview" className="rounded-xl overflow-hidden shadow-pop ring-1 ring-slate-200 dark:ring-slate-700">
          <SelectedPreview data={formData} />
        </div>
        </Tilt>
      </div>

      <CvExamplesModal open={showExamples} onClose={() => setShowExamples(false)} onPick={loadExample} />
    </div>
  );
};

export default CVGenerator;
