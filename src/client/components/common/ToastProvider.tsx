import { useState, useCallback, ReactNode } from 'react';
import { ToastCtx, Toast } from './toastContext';
import { CloseButton } from './CloseButton';
import s from './ToastProvider.module.css';

import { Button } from '@client/design-system/lib';

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, text: t.text, type: t.type || 'info', action: t.action };
    setToasts((prev) => {
      const next = [...prev, toast];
      return next.length > 6 ? next.slice(-6) : next;
    });

    // Auto-dismiss logic - don't auto-dismiss loading toasts
    if (t.type !== 'loading') {
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3500);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

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
      <div className={s.toastStack}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${s.toast} ${toastTypeClass[t.type ?? 'info'] ?? 'toast-info'}`}
          >
            <div className={s.toastBody}>
              {t.text}
              {t.type === 'loading' && <div className={s.loadingSpinner} />}
            </div>
            {t.action && (
              <Button
                unstyled
                onClick={() => {
                  t.action!.onClick();
                  removeToast(t.id);
                }}
                className={s.actionBtn}
              >
                {t.action.label}
              </Button>
            )}
            {t.type !== 'loading' && (
              <CloseButton
                onClick={() => removeToast(t.id)}
                size="sm"
                label="Dismiss notification"
                className={s.closeBtn}
              />
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
