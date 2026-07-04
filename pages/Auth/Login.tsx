import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, Building2 } from 'lucide-react';

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
          navigate('/business/offers');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="card-pro p-8 bg-white">
          <div className="text-center">
            <Link to="/" className="flex justify-center items-center gap-2 mb-4" aria-label="Retour à l'accueil Joboost">
              <Sparkles className="w-8 h-8 text-[#7D5CFF]" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7D5CFF] to-violet-800 bg-clip-text text-transparent">
                Joboost
              </h1>
            </Link>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              Bon retour parmi nous
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Ou{' '}
              <Link to="/auth/register" className="font-medium text-[#7D5CFF] hover:text-violet-700">
                créez votre compte candidat
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="input-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input-pro"
                  placeholder="jean.dupont@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="input-label mb-0">Mot de passe</label>
                  <Link to="/auth/forgot" className="text-xs font-medium text-[#7D5CFF] hover:underline">Mot de passe oublié ?</Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input-pro"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center py-3"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>

        {/* Espace recruteur — inscription self-service (identifiants) */}
        <div className="card-pro p-5 bg-white border-[#7D5CFF]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7D5CFF] to-[#4F46E5] flex items-center justify-center text-white shrink-0">
              <Building2 size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Vous êtes un recruteur / organisme ?</p>
              <p className="text-xs text-slate-500">Mission Locale, agence d'insertion, organisme de formation, entreprise…</p>
            </div>
          </div>
          <Link
            to="/auth/register"
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-[#7D5CFF] to-[#4F46E5] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Building2 size={16} />
            Créer un espace recruteur
          </Link>
          <p className="mt-2 text-center text-xs text-slate-400">Déjà un compte recruteur ? Connectez-vous ci-dessus avec vos identifiants.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

