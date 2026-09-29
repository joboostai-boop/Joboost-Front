import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Layers, Sparkles, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import Reveal from '../components/Reveal';

/* Page Tarifs publique — page à part entière (29/09), plus une section ancrée dans
   la landing : un lien direct et partageable (pub, post LinkedIn), sans avoir à
   dérouler toute la page d'accueil. Chiffres et libellés identiques à Pricing.tsx
   (page tarifs de l'app, après connexion) — rien n'est inventé ici. Les CTA mènent
   à l'inscription : cette page n'a pas de session utilisateur pour lancer un
   paiement Stripe directement (ça, c'est le rôle de /pricing une fois connecté). */
const PublicPricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-100 px-5 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center" aria-label="Retour à l'accueil Joboost">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link to="/auth/login" className="text-slate-600 font-medium text-sm px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors">
              Connexion
            </Link>
            <Link to="/auth/register" className="press btn btn-primary !min-h-0 px-4 py-2 text-sm">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      <section className="px-5 sm:px-6 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto">
          <Reveal className="max-w-2xl mx-auto mb-14 text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7D5CFF]/[0.08] border border-[#7D5CFF]/20 text-[#6023C0] text-xs font-semibold">
              Tarifs
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-[#0B0B14] tracking-tight">Un prix clair, avant même de vous inscrire</h1>
            <p className="mt-4 text-lg text-slate-500">Essai complet de 7 jours, sans carte bancaire. Ensuite, vous choisissez.</p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Gratuit */}
            <Reveal as="div">
              <div className="surface h-full p-8 flex flex-col">
                <span className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-5">
                  <Layers size={20} strokeWidth={2.5} />
                </span>
                <h2 className="text-lg font-bold text-[#0B0B14]">Gratuit</h2>
                <p className="mt-1 text-sm text-slate-500">Essai complet de 7 jours à l'inscription, puis palier gratuit permanent.</p>
                <p className="mt-5 text-3xl font-extrabold text-[#0B0B14]">0 €</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600 flex-1">
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> 7 premiers jours : accès complet</li>
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> Puis 1 CV et 1 lettre / mois</li>
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> Modèles de lettres standards</li>
                </ul>
                <Link to="/auth/register" className="press btn btn-secondary w-full mt-6">
                  Commencer gratuitement
                </Link>
              </div>
            </Reveal>

            {/* Élite */}
            <Reveal as="div" delay={80}>
              <div className="surface h-full p-8 flex flex-col ring-2 ring-[#7D5CFF] relative overflow-hidden">
                <span className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-[#7D5CFF] text-white text-[11px] font-bold uppercase tracking-wider">Populaire</span>
                <span className="w-11 h-11 rounded-xl bg-[#7D5CFF]/10 text-[#7D5CFF] flex items-center justify-center mb-5">
                  <Sparkles size={20} strokeWidth={2.5} />
                </span>
                <h2 className="text-lg font-bold text-[#0B0B14]">Élite</h2>
                <p className="mt-1 text-sm text-slate-500">L'arsenal complet pour une recherche intensive et sans limite.</p>
                <p className="mt-5 text-3xl font-extrabold text-[#0B0B14]">14,99 € <span className="text-base font-medium text-slate-400">/ mois</span></p>
                <p className="text-xs text-slate-400">ou 119 €/an (-2 mois)</p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600 flex-1">
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> 150 candidatures / mois</li>
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> 50 CV et 100 lettres / mois</li>
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> 50 candidatures spontanées / mois</li>
                  <li className="flex items-start gap-2"><Check size={16} className="text-[#7D5CFF] shrink-0 mt-0.5" /> Support prioritaire 24h</li>
                </ul>
                <Link to="/auth/register" className="press btn btn-primary w-full mt-6 group">
                  Essayer 7 jours gratuitement <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </Reveal>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Pas envie de vous abonner ? Des packs à l'unité existent à partir de <span className="font-semibold text-slate-700">7,99 €</span>, sans engagement — le détail est dans votre espace une fois inscrit.
          </p>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Sans carte bancaire pour l'essai · résiliable en un clic
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicPricing;
