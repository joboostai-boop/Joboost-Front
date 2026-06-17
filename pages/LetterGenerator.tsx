import React, { useState, useEffect } from 'react';
import { RefreshCw, Wand2, Zap, Printer, FileDown, Save, Clock, Link as LinkIcon, AlignLeft, Edit3 } from 'lucide-react';
import { generateCoverLetter, extractOfferFromUrl } from '../services/gemini';
import toast from 'react-hot-toast';
import { exportLetterPdf, exportLetterDocx } from '../services/atsExport';
import { authHeaders } from '../services/authToken';
import TemplateGallery from '../components/TemplateGallery';
import Collapsible from '../components/Collapsible';
import { LETTER_TEMPLATES, getLetterTemplate } from '../services/letterTemplates';

import { useNavigate, useLocation } from 'react-router-dom';

type Mode = 'zero' | 'text' | 'link';

const LetterGenerator: React.FC = () => {
  const location = useLocation();
  const state = location.state as any;

  const [jobTitle, setJobTitle] = useState(state?.jobTitle || '');
  const [company, setCompany] = useState(state?.company || '');
  const [tone, setTone] = useState('professionnel');
  
  const [mode, setMode] = useState<Mode>(state?.targetContext ? 'text' : 'zero');
  const [offerText, setOfferText] = useState(state?.targetContext || '');
  const [offerUrl, setOfferUrl] = useState('');
  
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [currentLetterId, setCurrentLetterId] = useState<string | null>(null);
  const [letterTemplate, setLetterTemplate] = useState<string>(state?.template || 'moderne');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const userRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/me`, { credentials: 'include', headers: { ...authHeaders() } });
        const userData = await userRes.json();

        const lettersRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coverletters`, { credentials: 'include', headers: { ...authHeaders() } });
        const lettersData = await lettersRes.json();
        
        if (userData.success) {
           setUserProfile(userData.user);
        }
        
        if (lettersData.success) {
           setLetters(lettersData.letters);
        }
      } catch(e) {
         console.error(e);
      } finally { setLoadingInit(false); }
    };
    init();
  }, []);

  const handleGenerate = async () => {
    if (!jobTitle || !company) {
      toast.error("Veuillez remplir le Poste et l'Entreprise.");
      return;
    }
    if (mode === 'link' && !offerUrl) {
      toast.error("Collez l'URL de l'offre, ou utilisez l'onglet « Texte de l'offre ».");
      return;
    }
    setLoading(true);
    try {
      let jobDescription = "";
      if (mode === 'text') jobDescription = offerText;
      if (mode === 'link') {
        // On tente d'extraire le contenu réel de la page. Souvent bloqué (LinkedIn/Indeed) :
        // dans ce cas on le dit clairement et on génère depuis le poste/entreprise seuls.
        const extraction = await extractOfferFromUrl(offerUrl);
        if (extraction.ok && extraction.text) {
          jobDescription = extraction.text;
          toast.success("Offre lue depuis le lien ✓");
        } else {
          jobDescription = `URL de l'offre (contenu non extractible) : ${offerUrl}`;
          toast("Page non lisible (LinkedIn/Indeed bloquent souvent l'accès). Lettre basée sur le poste et l'entreprise — collez le texte de l'offre pour un meilleur ciblage.", { icon: '⚠️', duration: 6500 });
        }
      }

      const text = await generateCoverLetter(jobTitle, company, tone, userProfile, jobDescription);
      setGeneratedText(text);
      toast.success("Lettre générée avec succès !");
    } catch(err: any) {
      toast.error(err.message || "Erreur de génération.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLetter = async () => {
     if(!generatedText) return;
     try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const url = currentLetterId ? `${baseUrl}/api/coverletters/${currentLetterId}` : `${baseUrl}/api/coverletters`;
        const method = currentLetterId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            title: `Lettre pour ${company} - ${jobTitle}`,
            company,
            jobTitle,
            content: generatedText
          })
        });
        const data = await res.json();
        if(data.success) {
           toast.success("Lettre sauvegardée !");
           setCurrentLetterId(data.letter.id);
           const lettersRes = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/coverletters`, { credentials: 'include', headers: { ...authHeaders() } });
           const lettersData = await lettersRes.json();
           if(lettersData.success) setLetters(lettersData.letters);
        }
     } catch(e) { toast.error("Erreur de sauvegarde"); }
  };

  const loadLetter = (letter: any) => {
     setJobTitle(letter.jobTitle);
     setCompany(letter.company);
     setGeneratedText(letter.content);
     setCurrentLetterId(letter.id);
     toast.success("Lettre rechargée");
  };

  const letterData = () => ({
    name: userProfile?.name,
    email: userProfile?.email,
    phone: userProfile?.phone,
    city: userProfile?.city,
    company,
    jobTitle,
    body: generatedText,
    template: letterTemplate,
  });

  const previewData = {
    name: userProfile?.name, email: userProfile?.email, phone: userProfile?.phone,
    city: userProfile?.city, company, jobTitle, body: generatedText,
  };
  const SelectedLetterPreview = getLetterTemplate(letterTemplate).Preview;

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportLetterPdf(letterData());
      toast.success("Lettre PDF (ATS) téléchargée !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export PDF.");
    } finally { setExporting(false); }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try {
      await exportLetterDocx(letterData());
      toast.success("Lettre Word (.docx) téléchargée !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de l'export Word.");
    } finally { setExporting(false); }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <p className="text-sm text-[#6B7280] dark:text-slate-400">Des lettres de motivation ciblées, écrites à partir de votre profil et de l'offre.</p>
        <button onClick={handleSaveLetter} disabled={!generatedText} className="press btn btn-secondary text-[#7D5CFF] disabled:opacity-50">
          <Save size={16} /> Sauvegarder
        </button>
      </header>

      {letters.length > 0 && (
         <section className="space-y-3">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Vos lettres sauvegardées</h3>
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
               {letters.map(letter => (
                 <div key={letter.id} onClick={() => loadLetter(letter)} className={`press shrink-0 cursor-pointer p-4 rounded-xl w-48 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${currentLetterId === letter.id ? 'surface-accent ring-1 ring-[#7D5CFF]/40' : 'surface'}`}>
                   <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{letter.title}</p>
                   <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-1"><Clock size={10} /> {new Date(letter.updatedAt).toLocaleDateString()}</p>
                 </div>
               ))}
             </div>
         </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="surface p-5 md:p-6 space-y-6">
            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest border-b border-[#E5E7EB] dark:border-[#1F2937] pb-2">1. Informations de l'offre</h3>
            <div className="space-y-4">
              <div>
                <label className="input-label">Poste visé</label>
                <input type="text" placeholder="Développeur, Manager..." value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="input-pro" />
              </div>
              <div>
                <label className="input-label">Entreprise</label>
                <input type="text" placeholder="Nom de l'entreprise" value={company} onChange={(e) => setCompany(e.target.value)} className="input-pro" />
              </div>
            </div>

            <h3 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest border-b border-[#E5E7EB] dark:border-[#1F2937] pb-2 pt-2">2. Contexte de personnalisation</h3>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setMode('zero')} className={`press flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all outline-none ${mode === 'zero' ? 'surface-accent text-[#7D5CFF] ring-1 ring-[#7D5CFF]/30' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <Edit3 size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Depuis zéro</span>
              </button>
              <button onClick={() => setMode('text')} className={`press flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all outline-none ${mode === 'text' ? 'surface-accent text-[#7D5CFF] ring-1 ring-[#7D5CFF]/30' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <AlignLeft size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Texte de l'offre</span>
              </button>
              <button onClick={() => setMode('link')} className={`press flex flex-col items-center justify-center p-2.5 rounded-lg border transition-all outline-none ${mode === 'link' ? 'surface-accent text-[#7D5CFF] ring-1 ring-[#7D5CFF]/30' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <LinkIcon size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Lien URL</span>
              </button>
            </div>

            {mode === 'text' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="input-label">Collez l'annonce entière</label>
                <textarea rows={4} value={offerText} onChange={(e) => setOfferText(e.target.value)} className="textarea-pro text-xs" placeholder="Vos missions : ...&#10;Profil recherché : ..." />
              </div>
            )}

            {mode === 'link' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="input-label">Lien de l'offre (URL)</label>
                <input type="text" value={offerUrl} onChange={(e) => setOfferUrl(e.target.value)} className="input-pro" placeholder="https://entreprise.com/carrieres/..." />
                <p className="text-[10px] text-[#9CA3AF] leading-relaxed">On tente de lire automatiquement la page. Les grands sites (LinkedIn, Indeed) bloquent souvent l'accès : si c'est le cas, copiez-collez le texte de l'offre via l'onglet « Texte de l'offre » pour une lettre mieux ciblée.</p>
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading || loadingInit} className="press btn btn-lg btn-primary w-full mt-4 disabled:opacity-60">
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
              {loading ? 'Rédaction en cours…' : 'Rédiger la lettre magique'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-5">
          {/* Actions (export quand une lettre existe) */}
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={handleExportPDF} disabled={exporting || !generatedText} className="press btn btn-primary disabled:opacity-50">
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
            </button>
            <button onClick={handleExportDocx} disabled={exporting || !generatedText} className="press btn btn-secondary text-[#7D5CFF] disabled:opacity-50">
              {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} Word
            </button>
            <button onClick={() => window.print()} disabled={!generatedText} className="press btn btn-secondary px-3 disabled:opacity-50" title="Imprimer">
              <Printer size={14} />
            </button>
          </div>

          {/* Choix du modèle (replié par défaut pour alléger le flux) */}
          <Collapsible collapsible={false} title="Modèle de lettre" subtitle={`Sélectionné : ${getLetterTemplate(letterTemplate).name}`}>
            <TemplateGallery
              items={LETTER_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={previewData} /> }))}
              selectedId={letterTemplate}
              onSelect={setLetterTemplate}
            />
          </Collapsible>

          {/* Édition du texte */}
          <div>
            <label className="input-label">Texte de la lettre</label>
            <textarea
              className="textarea-pro !min-h-[180px]"
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              placeholder="Génère ta lettre avec l'IA à gauche, ou écris-la directement ici."
            />
          </div>

          {/* Aperçu grand format du modèle sélectionné */}
          <div id="letter-preview" className="rounded-xl overflow-hidden shadow-pop ring-1 ring-slate-200 dark:ring-slate-700 max-w-[800px] mx-auto">
            <SelectedLetterPreview data={previewData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterGenerator;