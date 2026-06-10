
import React, { useState, useEffect } from 'react';
import { Printer, FileDown, Wand2, RefreshCw, Layout, Save, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateCVSummary } from '../services/gemini';
import { exportCvPdf, exportCvDocx } from '../services/atsExport';
import { authHeaders } from '../services/authToken';
import TemplateGallery from '../components/TemplateGallery';
import { CV_TEMPLATES, getCvTemplate } from '../services/cvTemplates';

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
    template: 'vertex',
    skills: [] as string[],
    experiences: [] as any[],
    education: [] as any[]
  });

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

  const SelectedPreview = getCvTemplate(formData.template).Preview;

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

        {/* Choix du modèle (carrousel un par un) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Layout size={18} className="text-[#7D5CFF]" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Choisis ton modèle</h3>
          </div>
          <TemplateGallery
            items={CV_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={formData} /> }))}
            selectedId={formData.template}
            onSelect={(id) => setFormData({ ...formData, template: id })}
          />
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
        
        {/* Aperçu du modèle sélectionné (grand format) */}
        <div id="cv-preview" className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
          <SelectedPreview data={formData} />
        </div>
      </div>
    </div>
  );
};

export default CVGenerator;
