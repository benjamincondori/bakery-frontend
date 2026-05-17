import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative bg-white dark:bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md animate-slide-in border border-stone-200 dark:border-stone-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center mb-4',
            isDanger
              ? 'bg-rose-100 dark:bg-rose-900/30'
              : 'bg-amber-100 dark:bg-amber-900/30',
          )}>
            {isDanger
              ? <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              : <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            }
          </div>

          <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-1">
            {title}
          </h3>

          {description && (
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-secondary px-5"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'btn px-5 text-white active:scale-95',
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
                : 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
              'focus:ring-2 focus:ring-offset-2',
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Procesando...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
