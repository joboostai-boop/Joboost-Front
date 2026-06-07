import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError("Vous devez accepter les Conditions générales et la Politique de confidentialité.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, acceptedTerms, marketingOptIn }),
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        login(data.user);
        navigate('/prepare');
      } else {
        setError(data.error || 'Erreur lors de la création');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 card-pro p-8 bg-white">
        
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-[#7D5CFF]" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7D5CFF] to-violet-800 bg-clip-text text-transparent">
              JoBoost
            </h1>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Créez votre compte gratuit
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Déjà inscrit ?{' '}
            <Link to="/auth/login" className="font-medium text-[#7D5CFF] hover:text-violet-700">
              Connectez-vous ici
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
              <label htmlFor="name" className="input-label">Prénom & Nom</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input-pro"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
              <label htmlFor="password" className="input-label">Mot de passe</label>
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

          <div className="space-y-3">
            <label className="flex items-start gap-3 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#4F46E5] shrink-0"
              />
              <span>
                J'ai lu et j'accepte les{' '}
                <Link to="/legal/cgu" target="_blank" className="font-medium text-[#7D5CFF] hover:underline">conditions générales</Link>
                {' '}et la{' '}
                <Link to="/legal/confidentialite" target="_blank" className="font-medium text-[#7D5CFF] hover:underline">politique de confidentialité</Link>.
              </span>
            </label>
            <label className="flex items-start gap-3 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#4F46E5] shrink-0"
              />
              <span>J'accepte de recevoir des conseils et actualités JoBoost par e-mail (facultatif, désinscription à tout moment).</span>
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !acceptedTerms}
              className="btn-primary w-full flex justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Création...' : 'S\'inscrire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
