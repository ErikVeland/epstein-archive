import { useEffect } from 'react';
import { runDevAffordanceAudit } from '@client/utils/devAffordanceAudit';

export function useDevAffordanceAudit(params: { pathname: string; search: string }) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle = window.requestAnimationFrame(() => {
      runDevAffordanceAudit(document);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [params.pathname, params.search]);
}
