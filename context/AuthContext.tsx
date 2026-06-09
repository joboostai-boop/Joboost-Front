import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const checkAuth = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/me`, {
        credentials: 'include',
        headers: { ...authHeaders() }, // fallback mobile : cookie tiers souvent bloqué
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Retour d'un login OAuth (Google) : le backend renvoie le JWT dans le
    // fragment d'URL (#token=...) car le cookie tiers est bloqué sur mobile.
    // On le persiste en localStorage, puis on nettoie l'URL pour ne pas
    // laisser le token visible dans la barre d'adresse / l'historique.
    try {
      if (window.location.hash.includes('token=')) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const t = params.get('token');
        if (t) {
          setToken(t);
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    } catch {
      /* no-op */
    }
    checkAuth();
  }, []);

  const login = (userData: User, token?: string) => {
    setToken(token); // persiste le JWT pour le header Bearer (mobile)
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders() },
      });
    } catch(e) {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
