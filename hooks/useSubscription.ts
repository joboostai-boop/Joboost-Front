import { useState, useEffect, useCallback } from 'react';

interface SubscriptionState {
  isActive: boolean;
  status: string | null;
  endsAt: string | null;
  loading: boolean;
  error: string | null;
  startCheckout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/stripe/subscription-status', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setIsActive(data.isActive);
        setStatus(data.status);
        setEndsAt(data.endsAt);
      }
    } catch (err) {
      setError('Impossible de récupérer le statut d\'abonnement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startCheckout = async () => {
    try {
      setError(null);
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Erreur lors de la création du checkout');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur de paiement');
    }
  };

  return {
    isActive,
    status,
    endsAt,
    loading,
    error,
    startCheckout,
    refresh: fetchStatus,
  };
}
