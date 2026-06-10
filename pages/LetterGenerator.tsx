import React, { useState, useEffect } from 'react';
import { RefreshCw, Wand2, Zap, Printer, FileDown, Save, Clock, Link as LinkIcon, AlignLeft, Edit3 } from 'lucide-react';
import { generateCoverLetter } from '../services/gemini';
import toast from 'react-hot-toast';
import { exportLetterPdf, exportLetterDocx } from '../services/atsExport';
import { authHeaders } from '../services/authToken';

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
  const [letterTemplate, setLetterTemplate] = useState<'Classique' | 'Moderne'>('Moderne');
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
    setLoading(true);
    try {
      let jobDescription = "";
      if (mode === 'text') jobDescription = offerText;
      if (mode === 'link') jobDescription = `Lien de l'offre (pour info contextuelle) : ${offerUrl}`;

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

  const activeModeClass = "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300";
  const inactiveModeClass = "border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-500 dark:text-slate-400";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <header className="border-b border-[#E5E7EB] pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1>IA Rédacteur</h1>
          <p>Générez des lettres de motivation percutantes à partir de votre profil et d'une offre.</p>
        </div>
        <button onClick={handleSaveLetter} disabled={!generatedText} className="btn btn-secondary text-[#7D5CFF] disabled:opacity-50">
          <Save size={16} /> Sauvegarder
        </button>
      </header>

      {letters.length > 0 && (
         <section className="space-y-3">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Vos lettres sauvegardées</h3>
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
               {letters.map(letter => (
                 <div key={letter.id} onClick={() => loadLetter(letter)} className={`shrink-0 cursor-pointer p-4 border rounded-md w-48 transition-colors ${currentLetterId === letter.id ? 'border-[#7D5CFF] bg-[#F3F0FF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] bg-white dark:bg-[#111827] hover:border-[#D1D5DB]'}`}>
                   <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{letter.title}</p>
                   <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-1"><Clock size={10} /> {new Date(letter.updatedAt).toLocaleDateString()}</p>
                 </div>
               ))}
             </div>
         </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="card-pro space-y-6">
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
              <button onClick={() => setMode('zero')} className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors outline-none ${mode === 'zero' ? 'border-[#7D5CFF] bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <Edit3 size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Depuis zéro</span>
              </button>
              <button onClick={() => setMode('text')} className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors outline-none ${mode === 'text' ? 'border-[#7D5CFF] bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <AlignLeft size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Texte de l'offre</span>
              </button>
              <button onClick={() => setMode('link')} className={`flex flex-col items-center justify-center p-2 rounded-md border transition-colors outline-none ${mode === 'link' ? 'border-[#7D5CFF] bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}>
                <LinkIcon size={16} className="mb-1" />
                <span className="text-[10px] font-bold">Lien URL</span>
              </button>
            </div>

            {mode === 'text' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="input-label">Collez l'annonce entière</label>
                <textarea rows={4} value={offerText} onChange={(e) => setOfferText(e.target.value)} className="textarea-pro text-xs" placeholder="Vos missions : ...&#10;Profil recherché : ..." />
              </div>
            )}

            {mode === 'link' && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="input-label">Lien de l'offre (URL)</label>
                <input type="text" value={offerUrl} onChange={(e) => setOfferUrl(e.target.value)} className="input-pro" placeholder="https://www.linkedin.com/jobs/view/..." />
                <p className="text-[9px] text-[#9CA3AF]">Le scraping automatique est en cours de développement. L'URL est transmise à l'IA pour l'instant.</p>
              </div>
            )}

            <button onClick={handleGenerate} disabled={loading || loadingInit} className="btn btn-lg btn-primary w-full mt-4">
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
              Rédiger la lettre magique
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          {generatedText ? (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-1.5">
                  {(['Moderne', 'Classique'] as const).map((tpl) => (
                    <button
                      key={tpl}
                      onClick={() => setLetterTemplate(tpl)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-colors ${letterTemplate === tpl ? 'border-[#7D5CFF] bg-[#F3F0FF] text-[#7D5CFF] dark:bg-[#7D5CFF]/10' : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]'}`}
                    >
                      {tpl === 'Moderne' ? 'Style Moderne' : 'Style Sobre'}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportPDF} disabled={exporting || !generatedText} className="btn btn-primary disabled:opacity-60">
                    <FileDown size={14} /> PDF ATS
                  </button>
                  <button onClick={handleExportDocx} disabled={exporting || !generatedText} className="btn btn-secondary text-[#7D5CFF] disabled:opacity-60">
                    <FileDown size={14} /> Word
                  </button>
                  <button onClick={() => window.print()} className="btn btn-secondary px-3" title="Imprimer">
                    <Printer size={14} />
                  </button>
                </div>
              </div>

              <div id="letter-preview" className="card-pro bg-white text-slate-800 shadow-sm min-h-[800px] font-sans text-sm mx-auto max-w-[800px]">
                <div className="mb-10">
                  <p className="font-bold text-base">{userProfile?.name || "Votre Nom"}</p>
                  <p className="text-[#6B7280]">{userProfile?.email || "votre.email@example.com"} {userProfile?.phone ? `| ${userProfile.phone}` : ''}</p>
                  <p className="text-[#6B7280]">{userProfile?.city || "Votre Ville"}</p>
                  <br />
                  <p className="font-bold text-base mt-4">{company || "L'entreprise"}</p>
                  <p className="text-[#6B7280]">À l'attention du Responsable Recrutement</p>
                </div>
                
                <p className="font-bold mb-8 text-base">Objet : Candidature au poste de {jobTitle}</p>

                <textarea
                   className="w-full h-[400px] text-sm leading-relaxed whitespace-pre-wrap outline-none resize-none bg-transparent"
                   value={generatedText}
                   onChange={(e) => setGeneratedText(e.target.value)}
                />

                <div className="mt-12 pt-8 border-t border-[#E5E7EB]">
                  <p>Cordialement,</p>
                  <p className="mt-2 font-bold text-base">{userProfile?.name || "Votre Nom"}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center p-12 card-pro bg-[#F3F4F6] dark:bg-[#111827] border-dashed border-2 border-[#D1D5DB] dark:border-[#374151] text-center">
              <div className="w-16 h-16 bg-white dark:bg-[#1F2937] rounded-full shadow-sm flex items-center justify-center text-[#9CA3AF] mb-6 border border-[#E5E7EB] dark:border-[#374151]">
                <Wand2 size={24} />
              </div>
              <h4>Prêt à rédiger ?</h4>
              <p className="mt-2 text-sm text-[#6B7280]">Remplissez les éléments et l'IA ciblera sa rédaction.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LetterGenerator;