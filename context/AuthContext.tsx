import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types'; // I will expand types.ts to include User fields
import { authHeaders, setToken, clearToken } from '../services/authToken';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User, token?: string) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  checkAuth: async () => {}
});

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Compteur de génération de session.
  //
  // ⚠️ Corrige une déconnexion immédiate après connexion, visible surtout sur
  // mobile. Au montage, `checkAuth()` interroge /api/auth/me alors que personne
  // n'est encore connecté : la réponse est un 401 qui exécute `setUser(null)`.
  // Si l'utilisateur se connecte PENDANT que cette requête est en vol, la
  // réponse tardive arrive après `login()` et écrase l'utilisateur fraîchement
  // authentifié → `isAuthenticated` repasse à faux et le routeur renvoie vers
  // la page d'authentification. Sur PC la requête revient avant que l'on ait
  // fini de saisir son mot de passe, d'où un bug invisible ; sur mobile le
  // réseau est plus lent, donc elle arrive après.
  //
  // `login()` et `logout()` incrémentent ce compteur. Une réponse de `checkAuth`
  // dont la génération a changé entre-temps est ignorée : elle est périmée.
  const authEpoch = useRef(0);

  const checkAuth = async () => {
    const epoch = authEpoch.current;
    const isStale = () => authEpoch.current !== epoch;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
        credentials: 'include',
        headers: { ...authHeaders() }, // fallback mobile : cookie tiers souvent bloqué
      });
      if (isStale()) return;
      if (res.ok) {
        const data = await res.json();
        if (isStale()) return;
        setUser(data.success ? data.user : null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed", err);
      if (!isStale()) setUser(null);
    } finally {
      if (!isStale()) setLoading(false);
    }
  };

  useEffect(() => {
    // Le jeton d'un retour Google (#token=...) est désormais lu AVANT le premier
    // rendu, dans index.tsx via captureTokenFromUrl() — le faire ici était trop
    // tard : le routeur avait déjà redirigé et détruit le fragment.
    checkAuth();
  }, []);

  const login = (userData: User, token?: string) => {
    // Nouvelle génération de session : toute réponse de `checkAuth` encore en vol
    // devient périmée et ne pourra plus écraser cet utilisateur (cf. authEpoch).
    authEpoch.current += 1;
    setToken(token); // persiste le JWT pour le header Bearer (mobile)
    setUser(userData);
    setLoading(false);
  };

  const logout = async () => {
    // On capture le header d'auth AVANT de purger le token, puis on déconnecte
    // l'interface immédiatement. Si on attendait la réponse du serveur, la
    // redirection vers "/" partirait alors qu'on est encore « connecté » :
    // "/" renverrait vers /home, puis la déconnexion effective renverrait
    // /home vers /auth/login — l'utilisateur ne reverrait jamais la landing.
    const headers = { ...authHeaders() };
    authEpoch.current += 1; // invalide toute vérification de session en vol
    clearToken();
    setUser(null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch(e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
