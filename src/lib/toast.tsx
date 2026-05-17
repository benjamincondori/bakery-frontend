import { toast as hotToast, type Toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const VARIANTS: Record<ToastVariant, {
  Icon: React.ElementType;
  borderColor: string;
  iconClass: string;
  bgClass: string;
}> = {
  success: {
    Icon: CheckCircle2,
    borderColor: '#10b981',
    iconClass: 'text-emerald-500',
    bgClass: 'bg-white dark:bg-stone-900',
  },
  error: {
    Icon: XCircle,
    borderColor: '#f43f5e',
    iconClass: 'text-rose-500',
    bgClass: 'bg-white dark:bg-stone-900',
  },
  warning: {
    Icon: AlertTriangle,
    borderColor: '#f59e0b',
    iconClass: 'text-amber-500',
    bgClass: 'bg-white dark:bg-stone-900',
  },
  info: {
    Icon: Info,
    borderColor: '#3b82f6',
    iconClass: 'text-blue-500',
    bgClass: 'bg-white dark:bg-stone-900',
  },
};

function ToastContent({ t, variant, message }: { t: Toast; variant: ToastVariant; message: string }) {
  const { Icon, borderColor, iconClass, bgClass } = VARIANTS[variant];

  return (
    <div
      className={`
        flex items-start gap-3 min-w-[280px] max-w-sm w-full
        ${bgClass}
        shadow-lg shadow-stone-200/60 dark:shadow-stone-950/60
        rounded-xl border border-stone-200 dark:border-stone-700
        px-4 py-3.5
        transition-all duration-300
        ${t.visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'}
      `}
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} />
      <p className="text-sm font-medium text-stone-800 dark:text-stone-100 flex-1 leading-snug pt-0.5">
        {message}
      </p>
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="shrink-0 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors mt-0.5 ml-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function show(variant: ToastVariant, message: string, duration = 3500) {
  return hotToast.custom(
    (t) => <ToastContent t={t} variant={variant} message={message} />,
    { duration },
  );
}

const toast = {
  success: (message: string, duration?: number) => show('success', message, duration),
  error: (message: string, duration?: number) => show('error', message, duration),
  warning: (message: string, duration?: number) => show('warning', message, duration),
  info: (message: string, duration?: number) => show('info', message, duration),
  dismiss: hotToast.dismiss,
  promise: hotToast.promise,
};

export default toast;
