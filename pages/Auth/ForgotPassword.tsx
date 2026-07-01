import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MailCheck } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 card-pro p-8 bg-white">
        <div className="text-center">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-[#7D5CFF]" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7D5CFF] to-violet-800 bg-clip-text text-transparent">
              Joboost
            </h1>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-gray-900">Mot de passe oublié</h2>
          <p className="mt-2 text-sm text-gray-600">
            Entrez votre email : nous vous enverrons un lien pour choisir un nouveau mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MailCheck size={26} />
            </div>
            <p className="text-sm text-gray-700">
              Si un compte existe avec cet email, un message vient d'être envoyé. Pensez à vérifier vos spams (le lien est valable 1 heure).
            </p>
            <Link to="/auth/login" className="inline-block font-medium text-[#7D5CFF] hover:underline">Retour à la connexion</Link>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="input-label">Email</label>
              <input
                id="email"
                type="email"
                required
                className="input-pro"
                placeholder="jean.dupont@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex justify-center py-3 disabled:opacity-50">
              {isLoading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>
            <p className="text-center text-sm text-gray-600">
              <Link to="/auth/login" className="font-medium text-[#7D5CFF] hover:underline">Retour à la connexion</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
