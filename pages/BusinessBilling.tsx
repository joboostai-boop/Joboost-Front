import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BusinessAccount } from '../types';
import { businessBillingApi } from '../services/business';
import { useModalBehavior } from '../hooks/useModalBehavior';
import toast from 'react-hot-toast';
import {
  Check, Loader2, CreditCard, ShieldCheck, Mail,
  Building2, X, Send, Sparkles, Users, Megaphone, BarChart3,
} from 'lucide-react';

/* Abonnement de l'espace recruteur — modèle SUR DEVIS uniquement : le tarif est
   construit selon les effectifs de l'organisme (adhérents, recruteurs). La demande
   part par email à l'équipe Joboost (Reply-To = le recruteur). */

const INCLUDED = [
  { icon: <Users size={15} />, text: 'Vivier de candidats + fiches CRM (statuts, notes privées)' },
  { icon: <Megaphone size={15} />, text: 'Offres d\'emploi illimitées, diffusées à vos adhérents sur Joboost' },
  { icon: <Sparkles size={15} />, text: 'Assistant IA : rédaction d\'offres, suggestions de compétences, messages d\'approche' },
  { icon: <BarChart3 size={15} />, text: 'Matching par compétences, tableau de bord, statistiques, exports CSV/PDF' },
];

const emptyQuote = { organizationName: '', phone: '', membersCount: '', recruitersCount: '', message: '' };

const BusinessBilling: React.FC = () => {
  const { account } = useOutletContext<{ account: BusinessAccount | null; refreshAccount: () => Promise<void> }>();
  const [portalLoading, setPortalLoading] = useState(false);

  // Demande de devis
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [quoteForm, setQuoteForm] = useState(emptyQuote);
  useModalBehavior(quoteOpen, () => setQuoteOpen(false));

  const openQuote = () => {
    setQuoteForm({ ...emptyQuote, organizationName: account?.companyName || '' });
    setQuoteOpen(true);
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.organizationName.trim()) {
      toast.error("Indiquez le nom de votre organisation.");
      return;
    }
    setQuoteSubmitting(true);
    try {
      await businessBillingApi.requestQuote({
        organizationName: quoteForm.organizationName.trim(),
        phone: quoteForm.phone.trim() || undefined,
        membersCount: quoteForm.membersCount.trim() || undefined,
        recruitersCount: quoteForm.recruitersCount.trim() || undefined,
        message: quoteForm.message.trim() || undefined,
      });
      setQuoteOpen(false);
      setQuoteSent(true);
      toast.success('Demande envoyée ! Nous revenons vers vous rapidement par email.', { duration: 6000 });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const url = await businessBillingApi.portal();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message);
      setPortalLoading(false);
    }
  };

  const currentPlan = account?.plan || 'Essai';
  const isSubscribed = account?.isPaid || currentPlan.startsWith('Business');
  const daysLeft = account?.discoveryDaysLeft ?? null;
  const discoveryOver = !isSubscribed && daysLeft !== null && daysLeft <= 0;

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">

      {/* ── Situation actuelle ── */}
      <div className={`card-pro flex flex-col sm:flex-row sm:items-center gap-4 ${discoveryOver ? '!border-red-200 dark:!border-red-900/40' : ''}`}>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
          isSubscribed ? 'bg-[#7D5CFF]/15 text-[#7D5CFF] dark:text-[#B9A7FF]'
            : discoveryOver ? 'bg-red-500/15 text-red-600 dark:text-red-400'
            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}>
          <CreditCard size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {isSubscribed
              ? `Votre plan actuel : ${currentPlan.replace('Business ', '')}`
              : discoveryOver
                ? 'Votre période de découverte est terminée'
                : daysLeft !== null
                  ? `Période de découverte — ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
                  : 'Vous êtes en période de découverte'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            {isSubscribed
              ? 'Factures et moyen de paiement se gèrent depuis le portail sécurisé Stripe.'
              : discoveryOver
                ? 'L\'assistant IA et l\'ajout de nouveaux candidats sont suspendus. Vos données restent accessibles — demandez votre devis pour tout réactiver.'
                : 'Accès complet à la plateforme pendant 15 jours, assistant IA inclus. Quand vous êtes prêt, demandez votre devis.'}
          </p>
        </div>
        {isSubscribed && (
          <button onClick={openPortal} disabled={portalLoading} className="btn btn-secondary min-h-[44px] shrink-0">
            {portalLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
            Gérer ma facturation
          </button>
        )}
      </div>

      {/* Barre de progression de la découverte (tant qu'on n'est pas abonné) */}
      {!isSubscribed && daysLeft !== null && (
        <div className="-mt-3">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${discoveryOver ? 'bg-red-500' : 'bg-[#7D5CFF]'}`}
              style={{ width: `${Math.max(4, (daysLeft / 15) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── L'offre (sur devis) ── */}
      <div className="relative rounded-2xl bg-white dark:bg-[#111827] border border-[#7D5CFF] ring-1 ring-[#7D5CFF]/30 shadow-[0_18px_45px_-18px_rgba(124,92,255,0.4)] p-6 md:p-8 overflow-hidden">
        {/* Halo décoratif ancré hors-cadre */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 motion-reduce:hidden"
          style={{
            background: 'radial-gradient(420px 220px at 100% -60px, rgba(125,92,255,0.10), transparent 70%)',
            maskImage: 'linear-gradient(to bottom, black, black 60%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, black 60%, transparent)',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="w-10 h-10 rounded-xl bg-[#7D5CFF] text-white flex items-center justify-center">
              <Building2 size={19} />
            </span>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">Joboost Business</h3>
              <p className="text-xs text-slate-500">L'espace recruteur complet pour votre organisme</p>
            </div>
          </div>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-[2rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">Sur devis</span>
          </p>
          <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            Le tarif est construit avec vous, selon la taille de votre organisme : nombre d'adhérents
            (500 ou 8 000, ce n'est pas la même chose), nombre de recruteurs et accompagnement souhaité.
          </p>

          <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {INCLUDED.map((f) => (
              <li key={f.text} className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300 leading-snug">
                <span className="w-6 h-6 rounded-lg bg-[#7D5CFF]/10 text-[#7D5CFF] dark:text-[#B9A7FF] flex items-center justify-center shrink-0 mt-[-2px]">
                  {f.icon}
                </span>
                {f.text}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {quoteSent ? (
              <span className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                <Check size={16} /> Demande envoyée — réponse par email
              </span>
            ) : (
              <button onClick={openQuote} className="btn btn-primary min-h-[48px] px-6 text-[15px]">
                <Mail size={16} /> Demander un devis
              </button>
            )}
            <a
              href="mailto:joboost.ai@gmail.com?subject=Joboost%20Business%20—%20question"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#7D5CFF] transition-colors"
            >
              ou écrivez-nous directement
            </a>
          </div>
        </div>
      </div>

      {/* ── Réassurance ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#7D5CFF]" /> Réponse rapide
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Votre demande arrive directement à l'équipe Joboost avec votre email de contact — la proposition revient dans votre boîte mail.
          </p>
        </div>
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Découverte gratuite</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            En attendant, votre espace reste ouvert en mode découverte : explorez le vivier, les offres et l'assistant IA sans engagement.
          </p>
        </div>
        <div className="card-pro">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">Vos données restent à vous</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vivier, offres et statistiques restent accessibles dans votre espace, quel que soit votre choix.
          </p>
        </div>
      </div>

      {/* ── Modale : demande de devis ── */}
      {quoteOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQuoteOpen(false)} />
          <div className="relative bg-white dark:bg-[#111827] w-full md:max-w-lg md:mx-4 max-h-[95dvh] md:max-h-[90vh] overflow-y-auto border-t md:border border-slate-200 dark:border-slate-700 rounded-t-2xl md:rounded-xl shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-[#111827] flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-700 z-10">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full md:hidden" />
              <div className="mt-2 md:mt-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 size={18} className="text-[#7D5CFF]" /> Demande de devis
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Nous revenons vers vous par email avec une proposition adaptée.</p>
              </div>
              <button onClick={() => setQuoteOpen(false)} className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitQuote} className="p-4 md:p-5 space-y-4">
              <div>
                <label className="input-label">Nom de l'organisation *</label>
                <input
                  className="input-pro"
                  value={quoteForm.organizationName}
                  onChange={(e) => setQuoteForm({ ...quoteForm, organizationName: e.target.value })}
                  placeholder="Ex : Mission locale de…"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Adhérents / candidats (estimation)</label>
                  <input
                    className="input-pro"
                    value={quoteForm.membersCount}
                    onChange={(e) => setQuoteForm({ ...quoteForm, membersCount: e.target.value })}
                    placeholder="Ex : 8 000"
                  />
                </div>
                <div>
                  <label className="input-label">Recruteurs / utilisateurs</label>
                  <input
                    className="input-pro"
                    value={quoteForm.recruitersCount}
                    onChange={(e) => setQuoteForm({ ...quoteForm, recruitersCount: e.target.value })}
                    placeholder="Ex : 5"
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Téléphone (facultatif)</label>
                <input
                  className="input-pro"
                  value={quoteForm.phone}
                  onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                  placeholder="Pour être rappelé plus vite"
                />
              </div>

              <div>
                <label className="input-label">Votre besoin</label>
                <textarea
                  className="textarea-pro"
                  rows={4}
                  value={quoteForm.message}
                  onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                  placeholder="Contexte, volumes, échéances, fonctionnalités attendues…"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                Votre demande est envoyée à l'équipe Joboost avec votre email de contact ({account?.email || 'votre compte'}) — la réponse arrive directement dans votre boîte mail.
              </p>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setQuoteOpen(false)} className="btn btn-secondary min-h-[44px] w-full sm:w-auto">Annuler</button>
                <button type="submit" disabled={quoteSubmitting} className="btn btn-primary min-h-[44px] w-full sm:w-auto">
                  {quoteSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessBilling;
