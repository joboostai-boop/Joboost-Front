
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { captureTokenFromUrl } from './services/authToken';

// Retour d'un login Google : le backend place le JWT dans le fragment d'URL.
// On le lit AVANT le premier rendu — sinon le routeur, voyant un visiteur non
// authentifié sur une URL inconnue, redirige vers la page de connexion et
// détruit le fragment avant qu'on ait pu récupérer le jeton.
captureTokenFromUrl();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const render = () => {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Mode démo (DÉVELOPPEMENT uniquement) : `?demo` remplace l'API par des données
// fictives pour relire les écrans connectés sans compte. `import.meta.env.DEV`
// est faux au build : ce bloc et dev/demoApi.ts sont exclus de la production.
if (import.meta.env.DEV) {
  const q = new URLSearchParams(location.search).get('demo');
  if (q === 'off') {
    sessionStorage.removeItem('joboost-demo');
    localStorage.removeItem('joboost-token');
  } else if (q !== null) {
    sessionStorage.setItem('joboost-demo', '1');
  }
}
if (import.meta.env.DEV && sessionStorage.getItem('joboost-demo') === '1') {
  import('./dev/demoApi').then((m) => { m.installDemoApi(); render(); });
} else {
  render();
}
