import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Impossible d'envoyer l'email pour le moment.");
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle={<>Entrez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.</>}
    >

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MailCheck size={26} />
            </div>
            <p className="text-sm text-ink">
              Si un compte existe avec cet email, un message vient d'être envoyé. Pensez à vérifier vos spams (le lien est valable 1 heure).
            </p>
            <Link to="/auth/login" className="inline-block font-medium text-brand hover:underline">Retour à la connexion</Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="input-label">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                required
                className="input-pro"
                placeholder="prenom.nom@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full">
              {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>
            <p className="text-center text-sm text-muted">
              <Link to="/auth/login" className="font-medium text-brand hover:underline">Retour à la connexion</Link>
            </p>
          </form>
        )}
    </AuthShell>
  );
};

export default ForgotPassword;
