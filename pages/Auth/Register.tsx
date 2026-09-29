import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Building2 } from 'lucide-react';
import AuthShell from './AuthShell';

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
      setError("Indiquez le nom de votre organisation.");
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
    <AuthShell
      title={isBusiness ? 'Créer un espace partenaire' : 'Créer un compte'}
      subtitle={<>Déjà inscrit ? <Link to="/auth/login" className="font-medium text-brand hover:underline">Se connecter</Link></>}
    >
      {/* Choix du type de compte */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-subtle mb-6" role="tablist" aria-label="Type de compte">
        {([
          { key: 'candidate', label: 'Candidat', icon: <UserIcon size={15} /> },
          { key: 'business', label: 'Structure', icon: <Building2 size={15} /> },
        ] as const).map((o) => {
          const active = (o.key === 'business') === isBusiness;
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setAccount(o.key); setError(''); }}
              className={`flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
            >
              {o.icon} {o.label}
            </button>
          );
        })}
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div role="alert" className="rounded-[10px] border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3.5 py-2.5 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="name" className="input-label">{isBusiness ? 'Votre nom' : 'Prénom et nom'}</label>
          <input id="name" name="name" type="text" autoComplete="name" required className="input-pro" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {isBusiness && (
          <div>
            <label htmlFor="companyName" className="input-label">Nom de la structure</label>
            <input id="companyName" name="companyName" type="text" required className="input-pro" placeholder="Mission Locale de Paris" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="input-label">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input-pro" placeholder="prenom.nom@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password" className="input-label">Mot de passe</label>
          <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className="input-pro" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1.5 text-xs text-faint">6 caractères minimum.</p>
        </div>

        <div className="space-y-3 pt-1">
          <label className="flex items-start gap-3 text-[13px] text-muted cursor-pointer">
            <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand shrink-0" />
            <span>
              J’accepte les{' '}
              <Link to="/legal/cgu" target="_blank" className="text-ink underline underline-offset-2">conditions générales</Link>
              {' '}et la{' '}
              <Link to="/legal/confidentialite" target="_blank" className="text-ink underline underline-offset-2">politique de confidentialité</Link>.
            </span>
          </label>
          {!isBusiness && (
            <label className="flex items-start gap-3 text-[13px] text-muted cursor-pointer">
              <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand shrink-0" />
              <span>Recevoir des conseils de recherche d’emploi par e-mail (facultatif).</span>
            </label>
          )}
        </div>

        <button type="submit" disabled={isLoading || !acceptedTerms} className="btn btn-primary btn-lg w-full">
          {isLoading ? 'Création du compte…' : isBusiness ? 'Créer l’espace partenaire' : 'Créer mon compte'}
        </button>
        {!isBusiness && <p className="text-center text-xs text-faint">7 jours d’essai complet, sans carte bancaire.</p>}
      </form>
    </AuthShell>
  );
};

export default Register;
