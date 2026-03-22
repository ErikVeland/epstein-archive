import { useEffect, useRef } from 'react';

interface UseModalFocusTrapOptions {
  isActive?: boolean;
  onEscape?: () => void;
}

/**
 * Custom hook for managing focus trap in modals for accessibility
 * @param isActive - Whether the focus trap should be active
 */
export const useModalFocusTrap = (options: UseModalFocusTrapOptions | boolean = true) => {
  const resolvedOptions =
    typeof options === 'boolean' ? { isActive: options, onEscape: undefined } : options;
  const modalRef = useRef<HTMLDivElement>(null);
  const isActive = resolvedOptions.isActive ?? true;
  const onEscape = resolvedOptions.onEscape;

  useEffect(() => {
    if (!isActive || !modalRef.current) return;

    const modal = modalRef.current;
    const previousActiveElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Get all focusable elements within the modal
    const getFocusableElements = () => {
      return modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), video, audio',
      ) as NodeListOf<HTMLElement>;
    };

    // Focus the first focusable element when modal opens
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      modal.focus();
    }

    // Handle tab key for focus trapping
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: Move focus to the last element if currently on first
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: Move focus to the first element if currently on last
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Handle escape key to close modal
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
      }
    };

    // Add event listeners
    modal.addEventListener('keydown', handleTabKey);
    modal.addEventListener('keydown', handleEscapeKey);

    // Cleanup
    return () => {
      modal.removeEventListener('keydown', handleTabKey);
      modal.removeEventListener('keydown', handleEscapeKey);
      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, [isActive, onEscape]);

  return { modalRef };
};
