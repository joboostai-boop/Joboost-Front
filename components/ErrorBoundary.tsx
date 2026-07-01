import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Garde-fou global : si une page plante au rendu, on affiche un écran de secours
 * sobre (aux couleurs de la marque) au lieu d'une page blanche. L'utilisateur peut
 * recharger ou revenir à l'accueil sans perdre sa session.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Loggé en console pour diagnostic ; pas de service externe pour l'instant.
    console.error('💥 Erreur de rendu capturée par ErrorBoundary:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712] px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7D5CFF]/10 text-[#7D5CFF]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Oups, un imprévu…
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Une erreur inattendue est survenue. Pas d'inquiétude, vos données sont en sécurité.
            Rechargez la page pour reprendre.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#7D5CFF] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#6B4AE6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5CFF] focus-visible:ring-offset-2"
          >
            Recharger Joboost
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
