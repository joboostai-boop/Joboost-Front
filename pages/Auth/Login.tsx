import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2 } from 'lucide-react';
import AuthShell from './AuthShell';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        // Redirect based on role
        if (data.user.role === 'BUSINESS_PARTNER') {
          navigate('/business/dashboard');
        } else {
          navigate('/home');
        }
      } else {
        setError(data.error || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Connexion"
      subtitle={<>Pas encore de compte ? <Link to="/auth/register" className="font-medium text-brand hover:underline">Créer un compte</Link></>}
      footer={
        <p className="text-center text-[13px] text-muted">
          Vous représentez une structure (Mission Locale, organisme de formation…) ?{' '}
          <Link to="/auth/register" className="font-medium text-ink hover:underline inline-flex items-center gap-1">
            <Building2 size={13} /> Créer un espace partenaire
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="rounded-[10px] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3.5 py-2.5 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="input-label">Adresse e-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-pro"
            placeholder="prenom.nom@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="input-label !mb-0">Mot de passe</label>
            <Link to="/auth/forgot" className="text-[13px] text-muted hover:text-ink">Mot de passe oublié ?</Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-pro"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full">
          {isLoading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;

