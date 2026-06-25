import React, { useRef, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' = action destructive (rouge), 'default' = action normale (violet). */
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Boîte de confirmation de marque — remplace `window.confirm()` (dialogue natif
 * du navigateur, hors charte). Échap / clic sur le fond = annuler. Le bouton de
 * confirmation reçoit le focus à l'ouverture.
 */
const ConfirmDialog: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useModalBehavior(open, onCancel);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#111827] w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isDanger ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-[#7D5CFF]/10 text-[#7D5CFF]'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-title" className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary min-h-[44px] w-full sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-[#7D5CFF] hover:bg-[#6B4AE6] focus-visible:ring-[#7D5CFF]'
            }`}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
