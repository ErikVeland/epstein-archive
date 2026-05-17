import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcutHandlers {
  onEscape?: () => void;
  onCtrlK?: () => void;
  onCtrlShiftR?: () => void;
  onCtrlSlash?: () => void;
}

const TAB_MAP: Record<string, string> = {
  '1': '/people',
  '2': '/search',
  '3': '/documents',
  '4': '/media',
  '5': '/timeline',
  '7': '/analytics',
  '8': '/blackbook',
  '9': '/about',
  '0': '/admin',
};

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onCtrlK?.();
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const route = TAB_MAP[e.key];
        if (route) {
          e.preventDefault();
          navigate(route);
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onEscape?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handlers.onCtrlShiftR?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        handlers.onCtrlSlash?.();
        return;
      }
    },
    [navigate, handlers],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export function announceForScreenReader(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}
