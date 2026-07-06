import React, { useState, useEffect } from 'react';
import { RefreshCw, Wand2, Zap, Printer, FileDown, Save, Clock, Link as LinkIcon, AlignLeft, Edit3, Check, PenLine, Eye, ArrowRight, FileText } from 'lucide-react';
import { generateCoverLetter, extractOfferFromUrl } from '../services/gemini';
import toast from 'react-hot-toast';
// Import dynamique au clic (libs PDF/Word lourdes : chargées seulement à l'export).
import { authHeaders } from '../services/authToken';
import TemplateGallery from '../components/TemplateGallery';
import Collapsible from '../components/Collapsible';
import AiLoadingOverlay from '../components/AiLoadingOverlay';
import QuotaDialog, { isQuotaError } from '../components/QuotaDialog';
import { LETTER_TEMPLATES, getLetterTemplate } from '../services/letterTemplates';

import { useNavigate, useLocation } from 'react-router-dom';

type Mode = 'zero' | 'text' | 'link';

/* Tons de rédaction proposés (le paramètre existait côté IA mais n'était pas exposé). */
const TONES = [
  { id: 'professionnel', label: 'Professionnel', hint: 'Sobre et classique' },
  { id: 'enthousiaste', label: 'Enthousiaste', hint: 'Motivé et énergique' },
  { id: 'direct', label: 'Direct', hint: 'Concis, droit au but' },
];

const LetterGenerator: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [quotaOpen, setQuotaOpen] = useState(false);
  const [quotaMessage, setQuotaMessage] = useState<string | undefined>();
  // Atelier : bascule Aperçu (document mis en page) / Éditer (texte brut).
  const [view, setView] = useState<'apercu' | 'editer'>('apercu');

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
      setView('apercu'); // la lettre fraîche s'affiche mise en page
      toast.success("Lettre générée avec succès !");
    } catch(err: any) {
      // Quota atteint : on PROPOSE l'offre adaptée (modal → /pricing) au lieu d'un toast d'erreur.
      if (isQuotaError(err)) {
        setQuotaMessage(err.message);
        setQuotaOpen(true);
      } else {
        toast.error(err.message || "Erreur de génération.");
      }
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
     setView('apercu');
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
    if (!generatedText.trim()) { toast.error("Ta lettre est vide : génère-la ou écris-la d'abord."); return; }
    setExporting(true);
    try {
      const { exportLetterPdf } = await import('../services/atsExport');
      await exportLetterPdf(letterData());
      toast.success("Lettre PDF (ATS) téléchargée !");
    } catch (e: any) {
      console.error('Export PDF lettre:', e);
      toast.error(`Erreur export PDF : ${e?.message || e}`);
    } finally { setExporting(false); }
  };

  const handleExportDocx = async () => {
    if (!generatedText.trim()) { toast.error("Ta lettre est vide : génère-la ou écris-la d'abord."); return; }
    setExporting(true);
    try {
      const { exportLetterDocx } = await import('../services/atsExport');
      await exportLetterDocx(letterData());
      toast.success("Lettre Word (.docx) téléchargée !");
    } catch (e: any) {
      console.error('Export Word lettre:', e);
      toast.error(`Erreur export Word : ${e?.message || e}`);
    } finally { setExporting(false); }
  };

  const hasLetter = generatedText.trim().length > 0;

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <QuotaDialog open={quotaOpen} onClose={() => setQuotaOpen(false)} message={quotaMessage} />
      <AiLoadingOverlay
        show={loading}
        title="Rédaction de votre lettre…"
        messages={[
          "Analyse de l'offre et de votre profil…",
          'Mise en correspondance de vos compétences…',
          'Rédaction des paragraphes…',
          'Vérification du ton et du style…',
          'Touches finales…',
        ]}
      />

      {letters.length > 0 && (
         <section className="space-y-3">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Vos lettres sauvegardées</h3>
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
               {letters.map(letter => (
                 <div key={letter.id} onClick={() => loadLetter(letter)} className={`press shrink-0 cursor-pointer p-4 rounded-xl w-52 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-[#7D5CFF]/30 ${currentLetterId === letter.id ? 'surface-accent ring-1 ring-[#7D5CFF]/40' : 'surface'}`}>
                   <div className="flex items-start gap-2.5">
                     <span className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${currentLetterId === letter.id ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white shadow-[0_2px_8px_rgba(125,92,255,0.35)]' : 'bg-[#7D5CFF]/10 text-[#7D5CFF]'}`}>
                       <PenLine size={14} />
                     </span>
                     <div className="min-w-0">
                       <p className="text-sm font-semibold text-[#111827] dark:text-white truncate">{letter.title}</p>
                       <p className="text-[10px] text-[#9CA3AF] flex items-center gap-1 mt-1"><Clock size={10} /> {new Date(letter.updatedAt).toLocaleDateString()}</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
         </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══ Rail de composition (gauche, collant au scroll) ══ */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="surface p-5 md:p-6 space-y-6">
            {/* En-tête de l'atelier */}
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8C6DFF] to-[#6D28D9] text-white grid place-items-center shadow-[0_4px_14px_rgba(125,92,255,0.35)]">
                <Wand2 size={19} />
              </span>
              <div>
                <h2 className="text-base font-bold text-[#111827] dark:text-white leading-tight">Composer ma lettre</h2>
                <p className="text-xs text-[#9CA3AF]">Ciblée sur l'offre, écrite depuis ton profil.</p>
              </div>
            </div>

            {/* Étape 1 — badge numéroté violet */}
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-black grid place-items-center shadow-[0_2px_8px_rgba(125,92,255,0.35)]">1</span>
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">Informations de l'offre</h3>
            </div>
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

            {/* Étape 2 */}
            <div className="flex items-center gap-2.5 pt-1">
              <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-black grid place-items-center shadow-[0_2px_8px_rgba(125,92,255,0.35)]">2</span>
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">Contexte de personnalisation</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'zero' as Mode, icon: <Edit3 size={18} />, label: 'Depuis zéro', hint: 'Poste + profil' },
                { key: 'text' as Mode, icon: <AlignLeft size={18} />, label: "Texte de l'offre", hint: 'Ciblage max' },
                { key: 'link' as Mode, icon: <LinkIcon size={18} />, label: 'Lien URL', hint: 'Lecture auto' },
              ]).map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  aria-pressed={mode === m.key}
                  className={`press relative flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-xl border-2 transition-all outline-none ${
                    mode === m.key
                      ? 'border-[#7D5CFF] bg-[#7D5CFF]/[0.06] dark:bg-[#7D5CFF]/10 text-[#7D5CFF] shadow-[0_4px_14px_-4px_rgba(125,92,255,0.4)]'
                      : 'border-[#E5E7EB] dark:border-[#1F2937] text-[#6B7280] hover:border-[#7D5CFF]/35 hover:text-[#7D5CFF] hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]'
                  }`}
                >
                  {mode === m.key && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#7D5CFF] text-white grid place-items-center">
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                  )}
                  {m.icon}
                  <span className="text-[10px] font-bold leading-tight text-center">{m.label}</span>
                  <span className={`text-[9px] leading-none ${mode === m.key ? 'text-[#7D5CFF]/70' : 'text-[#9CA3AF]'}`}>{m.hint}</span>
                </button>
              ))}
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

            {/* Étape 3 — ton de la lettre (le réglage existait, il n'était juste pas exposé) */}
            <div className="flex items-center gap-2.5 pt-1">
              <span className="w-6 h-6 rounded-full bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white text-[11px] font-black grid place-items-center shadow-[0_2px_8px_rgba(125,92,255,0.35)]">3</span>
              <h3 className="text-sm font-bold text-[#111827] dark:text-white">Ton de la lettre</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  aria-pressed={tone === t.id}
                  title={t.hint}
                  className={`press px-3 py-1.5 rounded-full text-xs font-bold border transition-all outline-none ${
                    tone === t.id
                      ? 'bg-gradient-to-b from-[#8C6DFF] to-[#7D5CFF] text-white border-[#5B21B6]/40 shadow-[0_2px_10px_rgba(125,92,255,0.35)]'
                      : 'bg-white dark:bg-[#111827] text-[#6B7280] dark:text-slate-400 border-[#E5E7EB] dark:border-[#1F2937] hover:border-[#7D5CFF]/35 hover:text-[#7D5CFF]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={loading || loadingInit} className="press tab-shine btn btn-lg btn-primary w-full mt-2 disabled:opacity-60">
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
              {loading ? 'Rédaction en cours…' : 'Rédiger la lettre magique'}
            </button>
          </div>
        </div>

        {/* ══ Atelier document (droite) ══ */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barre d'outils : bascule Aperçu/Éditer + actions document réunies */}
          <div className="surface p-2.5 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 rounded-xl bg-[#F5F4FB] dark:bg-[#0B1220] border border-[#ECEAF6] dark:border-[#1F2937]">
              {([
                { key: 'apercu' as const, icon: <Eye size={14} />, label: 'Aperçu' },
                { key: 'editer' as const, icon: <Edit3 size={14} />, label: 'Éditer' },
              ]).map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  aria-pressed={view === v.key}
                  className={`press flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all outline-none ${
                    view === v.key
                      ? 'bg-white dark:bg-[#111827] text-[#7D5CFF] shadow-xs'
                      : 'text-[#6B7280] dark:text-slate-400 hover:text-[#7D5CFF]'
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button onClick={handleSaveLetter} disabled={!hasLetter} className="press btn btn-secondary !min-h-[38px] !px-3 disabled:opacity-40" title="Sauvegarder la lettre">
                <Save size={15} /> <span className="hidden sm:inline">Sauvegarder</span>
              </button>
              <button onClick={() => window.print()} disabled={!hasLetter} className="press btn btn-ghost !min-h-[38px] !px-3 disabled:opacity-40" title="Imprimer" aria-label="Imprimer">
                <Printer size={15} />
              </button>
              <button onClick={handleExportPDF} disabled={exporting || !hasLetter} className="press btn btn-primary !min-h-[38px] disabled:opacity-40">
                {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} PDF
              </button>
              <button onClick={handleExportDocx} disabled={exporting || !hasLetter} className="press btn btn-secondary !min-h-[38px] text-[#7D5CFF] disabled:opacity-40">
                {exporting ? <RefreshCw size={14} className="animate-spin" /> : <FileDown size={14} />} Word
              </button>
            </div>
          </div>

          {/* Fil conducteur : la lettre est prête → on propose l'étape suivante du
              parcours (CV adapté à la même offre) au lieu de laisser l'utilisateur
              deviner quoi faire. */}
          {hasLetter && jobTitle && company && (
            <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-[#8C6DFF] to-[#6D28D9] text-white flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.12]"
                style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
              />
              <div className="relative flex items-center gap-3 flex-1 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-white/15 grid place-items-center shrink-0"><Check size={18} strokeWidth={2.6} /></span>
                <div className="min-w-0">
                  <p className="!text-white font-bold text-sm leading-tight">Lettre prête pour {company} ✓</p>
                  <p className="!text-white/80 text-xs mt-0.5">Étape suivante : un CV adapté à cette offre multiplie tes chances.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/prepare/cv', { state: { jobTitle, company, targetContext: (mode === 'text' && offerText) ? offerText : `Poste visé : ${jobTitle} chez ${company}` } })}
                className="press relative shrink-0 inline-flex items-center justify-center gap-2 bg-white text-[#6D28D9] font-semibold text-xs rounded-xl px-4 py-2.5 hover:gap-2.5 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
              >
                <FileText size={14} /> Adapter mon CV <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Choix du modèle (replié par défaut pour alléger le flux) */}
          <Collapsible title="Modèle de lettre" subtitle={`Sélectionné : ${getLetterTemplate(letterTemplate).name}`}>
            <TemplateGallery
              items={LETTER_TEMPLATES.map((t) => ({ id: t.id, name: t.name, ats: t.ats, node: <t.Preview data={previewData} /> }))}
              selectedId={letterTemplate}
              onSelect={setLetterTemplate}
            />
          </Collapsible>

          {view === 'editer' ? (
            /* Mode édition : le texte brut, en grand */
            <div className="animate-fade-in">
              <textarea
                className="textarea-pro !min-h-[460px] !text-[15px] !leading-relaxed"
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                placeholder="Génère ta lettre avec l'IA à gauche, ou écris-la directement ici."
              />
              <p className="text-[11px] text-[#9CA3AF] mt-2 text-right">Tes retouches apparaissent aussitôt dans l'Aperçu.</p>
            </div>
          ) : hasLetter ? (
            /* Mode aperçu : le document posé sur un « bureau » teinté */
            <div className="animate-fade-in rounded-2xl p-4 md:p-8 bg-gradient-to-b from-[#EEEBFA] to-[#E4E0F5] dark:from-[#0B1220] dark:to-[#030712] border border-[#E2DEF2] dark:border-[#1F2937]">
              <div id="letter-preview" className="rounded-xl overflow-hidden shadow-pop ring-1 ring-slate-200 dark:ring-slate-700 max-w-[800px] mx-auto">
                <SelectedLetterPreview data={previewData} />
              </div>
            </div>
          ) : (
            /* État vide : guide vers le rail de composition */
            <div className="surface p-10 md:p-14 flex flex-col items-center text-center gap-3 animate-fade-in">
              <span className="relative">
                <span aria-hidden className="pointer-events-none absolute inset-0 m-auto w-16 h-16 rounded-full bg-[#7D5CFF]/20 blur-2xl" />
                <span className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8C6DFF] to-[#6D28D9] text-white grid place-items-center shadow-[0_6px_20px_rgba(125,92,255,0.35)]">
                  <Wand2 size={24} />
                </span>
              </span>
              <h3 className="text-base font-bold text-[#111827] dark:text-white mt-1">Ta lettre apparaîtra ici</h3>
              <p className="text-sm text-[#6B7280] dark:text-slate-400 max-w-sm leading-relaxed">
                Renseigne le poste et l'entreprise dans le panneau de gauche, choisis ton contexte et ton ton, puis clique sur
                <span className="font-semibold text-[#7D5CFF]"> « Rédiger la lettre magique »</span>. Tu pourras la retoucher, changer de modèle et l'exporter en PDF ou Word.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LetterGenerator;
