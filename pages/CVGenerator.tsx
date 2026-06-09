
import React, { useState, useEffect } from 'react';
import { Printer, FileDown, Wand2, RefreshCw, Layout, Check, ShieldCheck, Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateCVSummary } from '../services/gemini';
import { exportCvPdf, exportCvDocx } from '../services/atsExport';

type CVTemplate = 'Classique' | 'Moderne' | 'Minimaliste';

// Aperçu miniature réel du rendu de chaque template (texte simulé en barres).
const MiniCvPreview: React.FC<{ template: CVTemplate }> = ({ template }) => {
  const accent = template === 'Moderne' ? '#4F46E5' : template === 'Classique' ? '#1F2937' : '#111827';
  const serif = template === 'Classique';
  return (
    <div className={`bg-white rounded-md border border-slate-200 p-3 h-32 overflow-hidden shadow-inner ${serif ? 'font-serif' : 'font-sans'}`}>
      <div className="h-2.5 w-2/3 rounded-sm" style={{ background: accent }} />
      <div className="h-1.5 w-1/3 bg-slate-300 rounded-sm mt-1" />
      <div className="h-px w-full bg-slate-200 my-2" />
      <div className="h-1 w-1/5 rounded-sm mb-1" style={{ background: accent, opacity: 0.65 }} />
      <div className="space-y-1">
        <div className="h-1 w-full bg-slate-200 rounded-sm" />
        <div className="h-1 w-5/6 bg-slate-200 rounded-sm" />
      </div>
      <div className="h-1 w-1/5 rounded-sm mt-2 mb-1" style={{ background: accent, opacity: 0.65 }} />
      <div className="flex gap-1">
        <div className="h-1.5 w-6 bg-slate-200 rounded-sm" />
        <div className="h-1.5 w-8 bg-slate-200 rounded-sm" />
        <div className="h-1.5 w-5 bg-slate-200 rounded-sm" />
      </div>
    </div>
  );
};

const CVGenerator: React.FC = () => {
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cvs, setCvs] = useState<any[]>([]);
  const [currentCvId, setCurrentCvId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    city: '',
    summary: '',
    template: 'Moderne' as CVTemplate,
    skills: [] as string[],
    experiences: [] as any[],
    education: [] as any[]
  });

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`);
        const userData = await userRes.json();
        
        const cvRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/cvs`);
        const cvData = await cvRes.json();
        
        if (userData.success) {
           const u = userData.user;
           setFormData(prev => ({
             ...prev,
             name: u.name || 'Candidat',
             title: u.title || 'Développeur',
             email: u.email || '',
             phone: u.phone || '',
             city: u.city || '',
             summary: u.summary || '',
             skills: Array.isArray(u.skills) ? u.skills.map((s:any) => typeof s === 'string' ? s : s.name) : [],
             experiences: Array.isArray(u.experiences) ? u.experiences : [],
             education: Array.isArray(u.education) ? u.education : []
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

  const templates: { name: CVTemplate; desc: string; color: string }[] = [
    { name: 'Minimaliste', desc: 'Structure ultra-claire, 100% ATS Compliant', color: 'bg-slate-400' },
    { name: 'Moderne', desc: 'Design épuré avec accents stratégiques', color: 'bg-indigo-600' },
    { name: 'Classique', desc: 'Le standard indémodable des recruteurs', color: 'bg-slate-900' },
  ];

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const summary = await generateCVSummary(formData.title, formData.skills, formData.experiences);
      if (summary) {
        setFormData({ ...formData, summary });
        toast.success("Résumé généré avec succès !");
      }
    } catch (error) { toast.error("Erreur lors de la génération."); }
    finally { setLoadingSummary(false); }
  };

  const handleSaveCV = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const url = currentCvId ? `${baseUrl}/api/cvs/${currentCvId}` : `${baseUrl}/api/cvs`;
      const method = currentCvId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
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
         const cvRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/cvs`);
         const cvData = await cvRes.json();
         if(cvData.success) setCvs(cvData.cvs);
      }
    } catch(e) { toast.error("Erreur de sauvegarde"); }
  };

  const loadCv = (cv: any) => {
    setFormData(cv.content);
    setCurrentCvId(cv.id);
    toast.success("CV rechargé");
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportCvPdf(formData);
      toast.success("CV PDF (ATS) téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    } finally { setExporting(false); }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      await exportCvDocx(formData);
      toast.success("CV Word (.docx) téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Word.");
    } finally { setExporting(false); }
  };

  // Helper pour obtenir les styles dynamiques de la prévisualisation
  const getTemplateStyles = () => {
    switch (formData.template) {
      case 'Minimaliste':
        return {
          accentColor: 'text-slate-900 dark:text-white',
          headerBg: 'border-slate-200 dark:border-slate-800',
          font: 'font-sans',
          containerClass: 'p-10'
        };
      case 'Classique':
        return {
          accentColor: 'text-slate-800 dark:text-slate-300',
          headerBg: 'border-slate-400 dark:border-slate-600',
          font: 'font-serif',
          containerClass: 'p-12'
        };
      default: // Moderne
        return {
          accentColor: 'text-indigo-600',
          headerBg: 'border-indigo-100 dark:border-indigo-900/30',
          font: 'font-sans',
          containerClass: 'p-10'
        };
    }
  };

  const styles = getTemplateStyles();

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto flex flex-col lg:flex-row gap-10">
      <div className="flex-1 space-y-10">
        <header className="border-b border-[#E5E7EB] pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1>Éditeur de CV</h1>
            <p>Créez un CV certifié ATS pour maximiser vos chances de recrutement.</p>
          </div>
          <button onClick={handleSaveCV} className="btn btn-secondary text-[#7D5CFF]">
            <Save size={16} /> Sauvegarder
          </button>
        </header>

        {cvs.length > 0 && (
           <section className="space-y-3">
               <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Vos CV sauvegardés</h3>
               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                 {cvs.map(cv => (
                   <div key={cv.id} onClick={() => loadCv(cv)} className={`shrink-0 cursor-pointer p-4 border rounded-md w-48 transition-colors ${currentCvId === cv.id ? 'border-[#7D5CFF] bg-[#F3F0FF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:border-[#D1D5DB]'}`}>
                     <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{cv.title}</p>
                     <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-1"><Clock size={10} /> {new Date(cv.updatedAt).toLocaleDateString()}</p>
                   </div>
                 ))}
               </div>
           </section>
        )}

        {/* Sélection du Modèle */}
        <section className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layout size={18} className="text-[#7D5CFF]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Modèle de CV</h3>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
               <ShieldCheck size={12} />
               <span className="text-[10px] font-bold uppercase tracking-widest">ATS Ready</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => setFormData({ ...formData, template: t.name })}
                className={`relative flex flex-col p-3 rounded-xl border-2 transition-all text-left group outline-none ${
                  formData.template === t.name
                    ? 'border-[#7D5CFF] bg-[#F3F0FF] dark:bg-[#7D5CFF]/10 shadow-md'
                    : 'border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:border-[#D1D5DB]'
                }`}
              >
                {formData.template === t.name && (
                  <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-[#7D5CFF] text-white flex items-center justify-center shadow">
                    <Check size={12} />
                  </div>
                )}
                <MiniCvPreview template={t.name} />
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-[#111827] dark:text-white">{t.name}</p>
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">ATS</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-tight mt-0.5">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Nom complet</label>
              <input 
                type="text" value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="input-pro" 
              />
            </div>
            <div>
              <label className="input-label">Poste recherché</label>
              <input 
                type="text" value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                className="input-pro" 
              />
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
            <textarea value={formData.summary} onChange={(e) => setFormData({...formData, summary: e.target.value})} className="textarea-pro" />
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[450px] space-y-4">
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={exporting} className="btn btn-primary flex-1 disabled:opacity-60">
            <FileDown size={16} /> PDF ATS
          </button>
          <button onClick={handleExportDocx} disabled={exporting} className="btn btn-secondary flex-1 text-[#7D5CFF] disabled:opacity-60">
            <FileDown size={16} /> Word .docx
          </button>
          <button onClick={() => window.print()} className="btn btn-secondary px-3" title="Imprimer">
            <Printer size={18} />
          </button>
        </div>
        
        <div className={`card-modern ${styles.containerClass} bg-white dark:bg-[#0F172A] shadow-2xl relative overflow-auto`}>
          {/* Filigrane discret JoBoost */}
          <div className="absolute bottom-4 right-8 text-[8px] font-black text-slate-200 dark:text-slate-800 uppercase tracking-[0.2em]">JoBoost Protocol • ATS Validated</div>
          
          <div id="cv-preview" className={`text-slate-900 dark:text-slate-100 text-sm space-y-6 ${styles.font} bg-white p-12 min-h-[1100px] w-full max-w-[800px] mx-auto`}>
             <div className={`pb-4 border-b ${styles.headerBg}`}>
                <h2 className="text-xl font-black uppercase tracking-tight">{formData.name}</h2>
                <p className={`font-bold ${styles.accentColor}`}>{formData.title}</p>
                {[formData.email, formData.phone, formData.city].filter(Boolean).length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{[formData.email, formData.phone, formData.city].filter(Boolean).join('  •  ')}</p>
                )}
             </div>
             
             <div className="space-y-2">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 border-b pb-1 mb-2">Résumé</h3>
                <p className="leading-relaxed whitespace-pre-wrap">{formData.summary}</p>
             </div>

             <div className="space-y-2">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 border-b pb-1 mb-2">Compétences</h3>
                <div className="flex flex-wrap gap-2">
                   {formData.skills.map(skill => (
                      <span key={skill} className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-bold">{skill}</span>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="font-black uppercase tracking-widest text-xs text-slate-500 border-b pb-1 mb-2">Expérience Professionnelle</h3>
                {formData.experiences.map((exp: any) => (
                   <div key={exp.id || Math.random()} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                         <p className="font-bold text-base">{exp.role}</p>
                         <p className="text-xs text-slate-500 font-bold">{exp.period}</p>
                      </div>
                      <p className={`font-bold text-sm italic ${styles.accentColor}`}>{exp.company}</p>
                      <p className="text-sm text-slate-700">{exp.desc}</p>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVGenerator;
