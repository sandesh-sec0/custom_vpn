import { Check, X, Info, AlertCircle } from 'lucide-react';
import { useToast, type ToastType } from '@/context/ToastContext';

export function Toaster() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center gap-3 animate-modal-enter min-w-[300px] max-w-md rounded-xl border border-(--border-color) bg-(--bg-card)/90 p-4 shadow-2xl backdrop-blur-xl transition-all hover:translate-y-[-2px]"
          style={{
            borderLeft: `4px solid ${getColor(toast.type)}`,
          }}
        >
          <div 
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: `${getColor(toast.type)}20` }}
          >
            {getIcon(toast.type)}
          </div>
          
          <div className="flex-1 text-sm font-medium text-(--text-primary)">
            {toast.message}
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="rounded-md p-1 text-(--text-secondary) hover:bg-(--bg-main) hover:text-(--text-primary) transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function getColor(type: ToastType) {
  switch (type) {
    case 'success': return '#10b981';
    case 'error': return '#ef4444';
    case 'info': return '#06b6d4';
    default: return '#06b6d4';
  }
}

function getIcon(type: ToastType) {
  switch (type) {
    case 'success': return <Check size={16} className="text-emerald-500" />;
    case 'error': return <AlertCircle size={16} className="text-red-500" />;
    case 'info': return <Info size={16} className="text-cyan-500" />;
    default: return <Info size={16} className="text-cyan-500" />;
  }
}
