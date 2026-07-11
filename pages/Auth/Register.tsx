import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, User as UserIcon, Building2 } from 'lucide-react';

type Account = 'candidate' | 'business';

const Register = () => {
  const [account, setAccount] = useState<Account>('candidate');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const isBusiness = account === 'business';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError("Vous devez accepter les Conditions générales et la Politique de confidentialité.");
      return;
    }
    if (isBusiness && !companyName.trim()) {
      setError("Indiquez le nom de votre entreprise.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isBusiness ? '/api/auth/business-register' : '/api/auth/register';
      const payload = isBusiness
        ? { name, companyName, email, password, acceptedTerms }
        : { name, email, password, acceptedTerms, marketingOptIn };
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        login(data.user, data.token);
        navigate(isBusiness ? '/business/dashboard' : '/home');
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
          <Link to="/" className="flex justify-center items-center gap-2 mb-4" aria-label="Retour à l'accueil Joboost">
            <Sparkles className="w-8 h-8 text-[#7D5CFF]" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7D5CFF] to-violet-800 bg-clip-text text-transparent">
              Joboost
            </h1>
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {isBusiness ? 'Créez votre espace recruteur' : 'Créez votre compte gratuit'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Déjà inscrit ?{' '}
            <Link to="/auth/login" className="font-medium text-[#7D5CFF] hover:text-violet-700">
              Connectez-vous ici
            </Link>
          </p>
        </div>

        {/* Choix du type de compte */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100">
          <button
            type="button"
            onClick={() => { setAccount('candidate'); setError(''); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${!isBusiness ? 'bg-white text-[#7D5CFF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <UserIcon size={16} /> Candidat
          </button>
          <button
            type="button"
            onClick={() => { setAccount('business'); setError(''); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${isBusiness ? 'bg-white text-[#7D5CFF] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 size={16} /> Recruteur
          </button>
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {error && (
             <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="input-label">{isBusiness ? 'Votre nom' : 'Prénom & Nom'}</label>
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
            {isBusiness && (
              <div>
                <label htmlFor="companyName" className="input-label">Nom de l'entreprise</label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  className="input-pro"
                  placeholder="Ex : Mission Locale de Paris"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}
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
            {!isBusiness && (
              <label className="flex items-start gap-3 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#4F46E5] shrink-0"
                />
                <span>J'accepte de recevoir des conseils et actualités Joboost par e-mail (facultatif, désinscription à tout moment).</span>
              </label>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !acceptedTerms}
              className="btn-primary w-full flex justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Création...' : isBusiness ? "Créer mon espace recruteur" : "S'inscrire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
