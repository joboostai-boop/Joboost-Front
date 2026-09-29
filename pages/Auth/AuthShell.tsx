import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from '../../components/Logo';

/* Mise en page commune des écrans d'authentification (connexion, inscription,
   mot de passe oublié / réinitialisation). Refonte 09/2026 : formulaire sur le
   fond de page, sans carte, et un panneau de présentation sobre à droite sur
   grand écran. */

interface AuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const POINTS = [
  'Des offres triées selon ton métier et ta ville',
  'Un CV et des lettres prêts en quelques minutes',
  'Toutes tes candidatures suivies au même endroit',
];

const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen grid lg:grid-cols-[1fr_minmax(0,520px)] bg-canvas">
    <div className="flex flex-col px-5 py-6 sm:px-10">
      <Link to="/" aria-label="Retour à l'accueil Joboost" className="self-start">
        <Logo className="h-7" />
      </Link>

      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-[380px] animate-fade-in">
          <h1 className="text-[28px] leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-10 pt-6 border-t border-line">{footer}</div>}
        </div>
      </div>
    </div>

    <aside className="hidden lg:flex flex-col justify-between m-3 rounded-2xl bg-ink text-canvas p-10 overflow-hidden relative">
      <span aria-hidden className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-brand/30 blur-3xl" />
      <p className="relative text-sm font-medium text-canvas/60">Joboost</p>
      <div className="relative">
        <p className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-canvas">
          Ta recherche d’emploi, organisée du premier CV à la signature.
        </p>
        <ul className="mt-8 space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex items-center gap-3 text-[15px] text-canvas/80">
              <span className="w-5 h-5 rounded-full bg-brand grid place-items-center shrink-0">
                <Check size={12} strokeWidth={3} className="text-white" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <p className="relative text-xs text-canvas/50">Essai gratuit de 7 jours, sans carte bancaire.</p>
    </aside>
  </div>
);

export default AuthShell;
