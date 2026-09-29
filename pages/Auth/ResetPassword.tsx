import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import AuthShell from './AuthShell';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const invalidLink = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (password !== confirm) { setError('Les deux mots de passe ne correspondent pas.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        setTimeout(() => navigate('/auth/login'), 2200);
      } else {
        setError(data.error || 'Lien invalide ou expiré.');
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Nouveau mot de passe"
    >

        {invalidLink ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-ink">Ce lien est invalide ou incomplet. Refaites une demande de réinitialisation.</p>
            <Link to="/auth/forgot" className="inline-block font-medium text-brand hover:underline">Demander un nouveau lien</Link>
          </div>
        ) : done ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={26} />
            </div>
            <p className="text-sm text-ink">Mot de passe réinitialisé ! Redirection vers la connexion…</p>
          </div>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="rounded-[10px] border border-red-200 bg-red-50 text-red-700 px-3.5 py-2.5 text-sm">{error}</div>
            )}
            <div>
              <label htmlFor="password" className="input-label">Nouveau mot de passe</label>
              <input
                id="password"
                type="password"
                required
                className="input-pro"
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm" className="input-label">Confirmer le mot de passe</label>
              <input
                id="confirm"
                type="password"
                required
                className="input-pro"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg w-full">
              {isLoading ? 'Enregistrement...' : 'Réinitialiser mon mot de passe'}
            </button>
          </form>
        )}
    </AuthShell>
  );
};

export default ResetPassword;
