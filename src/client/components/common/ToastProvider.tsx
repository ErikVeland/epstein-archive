import { useState, useCallback, ReactNode, useEffect } from 'react';
import { ToastCtx, Toast } from './toastContext';
import { CloseButton } from './CloseButton';

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, text: t.text, type: t.type || 'info', action: t.action };
    setToasts((prev) => [...prev, toast]);

    // Auto-dismiss logic - don't auto-dismiss loading toasts
    if (t.type !== 'loading') {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length > 6) setToasts((prev) => prev.slice(-6));
  }, [toasts]);

  const toastTypeClass: Record<string, string> = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    loading: 'toast-loading',
    info: 'toast-info',
  };

  return (
    <ToastCtx.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-3 right-3 z-[100] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-[var(--radius-lg)] text-xs shadow-[var(--glass-shadow)] border flex items-center justify-between ${toastTypeClass[t.type ?? 'info'] ?? 'toast-info'}`}
          >
            <div className="flex items-center">
              {t.text}
              {t.type === 'loading' && (
                <div className="ml-2 w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick();
                  removeToast(t.id);
                }}
                className="ml-2 px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors"
              >
                {t.action.label}
              </button>
            )}
            {t.type !== 'loading' && (
              <CloseButton
                onClick={() => removeToast(t.id)}
                size="sm"
                label="Dismiss notification"
                className="ml-2 h-6 w-6 border-transparent bg-transparent text-current hover:bg-white/10"
              />
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
