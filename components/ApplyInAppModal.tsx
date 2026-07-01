import React, { useEffect, useState } from 'react';
import { X, Mail, Paperclip, Send, Loader2, ShieldCheck, ExternalLink, Sparkles, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authHeaders } from '../services/authToken';

const API = import.meta.env.VITE_API_URL || '';

export interface ApplyOffer {
  id?: string;
  title: string;
  company: string;
  url?: string;
  source?: string;
  contactEmail?: string;
  aiInsight?: string;
}

interface Props {
  offer: ApplyOffer;
  onClose: () => void;
  onSent: () => void; // notifie le parent (marque l'offre comme postulée)
}

type Phase = 'preparing' | 'ready' | 'quota' | 'error' | 'sending';

/**
 * « Postuler depuis Joboost » — envoie la candidature (CV + lettre IA) directement
 * par email à l'employeur (via Brevo), sans redirection. Réutilise le moteur des
 * candidatures spontanées : /prepare génère la lettre + consomme 1 candidature,
 * /:id/send envoie réellement l'email.
 */
const ApplyInAppModal: React.FC<Props> = ({ offer, onClose, onSent }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('preparing');
  const [spId, setSpId] = useState<string | null>(null);
  const [letter, setLetter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // À l'ouverture : prépare la candidature (génère la lettre à partir de l'offre).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/spontaneous/prepare`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({
            companyName: offer.company,
            jobTitle: offer.title,
            contactEmail: offer.contactEmail,
            contactSource: 'ft_contact',
            ftOfferId: offer.id,
            ftOfferUrl: offer.url,
            ftSource: offer.source,
            reason: 'Candidature à une offre publiée par cet employeur.',
            includeLetter: true,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 402 || data?.code === 'QUOTA_EXCEEDED') {
          setPhase('quota');
          return;
        }
        if (!res.ok || !data.success) {
          setErrorMsg(data.error || "Impossible de préparer la candidature.");
          setPhase('error');
          return;
        }
        setSpId(data.data.id);
        setLetter(data.coverLetter || '');
        setPhase('ready');
      } catch {
        if (!cancelled) { setErrorMsg('Erreur réseau.'); setPhase('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [offer]);

  const handleSend = async () => {
    if (!spId) return;
    setPhase('sending');
    try {
      const res = await fetch(`${API}/api/spontaneous/${spId}/send`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok && data.success && !data.manual) {
        toast.success('Candidature envoyée à l\'employeur — ajoutée à ton suivi.');
        onSent();
        onClose();
        return;
      }
      // Envoi non automatique (blocage / email indispo) → on informe et on propose le lien.
      if (data?.manual) {
        toast(data.message || "Envoi automatique impossible — finalise sur le site de l'offre.", { icon: '⚠️', duration: 6000 });
        onSent(); // la candidature est tout de même dans le suivi
        onClose();
        return;
      }
      setErrorMsg(data.error || "Échec de l'envoi.");
      setPhase('error');
    } catch {
      setErrorMsg('Erreur réseau.');
      setPhase('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#0B1120] rounded-t-2xl sm:rounded-2xl shadow-pop border border-[#ECEAF6] dark:border-[#1F2937] animate-fade-in-up overflow-hidden">
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[#ECEAF6] dark:border-[#1F2937]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <Send size={18} className="text-[#7D5CFF]" /> Postuler depuis Joboost
            </h2>
            <p className="text-[13px] text-[#6B7280] dark:text-slate-400 mt-0.5 truncate">
              {offer.title} — <span className="text-[#7D5CFF] font-medium">{offer.company}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="press shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-[#F5F4FB] dark:hover:bg-[#1F2937]">
            <X size={18} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {phase === 'preparing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Loader2 size={26} className="animate-spin text-[#7D5CFF]" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Préparation de ta candidature…<br />L'IA rédige ta lettre à partir de l'offre.</p>
            </div>
          )}

          {phase === 'quota' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <span className="w-12 h-12 rounded-full bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center"><Crown size={24} /></span>
              <p className="text-sm font-semibold text-[#111827] dark:text-white">Limite de candidatures atteinte ce mois-ci</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">Passe à l'abonnement Élite ou ajoute un pack de crédits pour continuer à postuler.</p>
              <button onClick={() => { onClose(); navigate('/pricing'); }} className="press btn btn-primary mt-1">Voir les forfaits</button>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
              {offer.url && (
                <a href={offer.url} target="_blank" rel="noopener noreferrer" className="press btn btn-secondary">
                  <ExternalLink size={15} /> Voir l'offre
                </a>
              )}
            </div>
          )}

          {(phase === 'ready' || phase === 'sending') && (
            <>
              {/* Destinataire + pièces jointes */}
              <div className="surface-accent rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={15} className="text-[#7D5CFF] shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400">Envoyée à</span>
                  <span className="font-semibold text-[#111827] dark:text-white truncate">{offer.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Paperclip size={13} className="shrink-0" />
                  Ton <b className="font-semibold text-slate-600 dark:text-slate-300">CV</b> et ta <b className="font-semibold text-slate-600 dark:text-slate-300">lettre</b> sont joints automatiquement en PDF.
                </div>
              </div>

              {/* Aperçu de la lettre (générée par l'IA) */}
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7D5CFF] uppercase tracking-wide mb-1.5">
                  <Sparkles size={12} /> Lettre générée par l'IA
                </p>
                <div className="rounded-xl border border-[#ECEAF6] dark:border-[#1F2937] bg-white dark:bg-[#0B1120] p-3.5 max-h-56 overflow-y-auto text-sm text-[#374151] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {letter || 'Bonjour,\n\nJe me permets de vous adresser ma candidature pour ce poste.\n\nCordialement.'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Tu peux affiner ta lettre depuis l'onglet « Lettre » avant d'envoyer, si tu le souhaites.</p>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-400">
                <ShieldCheck size={14} className="shrink-0 mt-px text-emerald-500" />
                L'employeur reçoit ta candidature par email. Ses réponses arriveront directement sur ton adresse.
              </div>
            </>
          )}
        </div>

        {/* Pied : action d'envoi */}
        {(phase === 'ready' || phase === 'sending') && (
          <div className="p-4 border-t border-[#ECEAF6] dark:border-[#1F2937] flex gap-2">
            <button onClick={onClose} className="press btn btn-secondary flex-1">Annuler</button>
            <button onClick={handleSend} disabled={phase === 'sending'} className="press btn btn-primary flex-1 disabled:opacity-60">
              {phase === 'sending' ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : <><Send size={16} /> Envoyer ma candidature</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplyInAppModal;
