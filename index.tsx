
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

const root = ReactDOM.createRoot(rootElement);
root.render(
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
