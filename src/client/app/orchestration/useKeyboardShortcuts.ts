import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { DocRecord } from '@client/components/documents/DocumentModal';
import type { Person } from '@client/types';

type LocationLike = { pathname: string; search: string };

export function useKeyboardShortcuts(params: {
  navigate: NavigateFunction;
  location: LocationLike;
  selectedPerson: Person | null;
  setSelectedPerson: (next: Person | null) => void;
  markClosingEntityModal: () => void;
  documentModalId: string | null;
  setDocumentModalId: (next: string | null) => void;
  setDocumentModalInitial: (next: DocRecord | null) => void;
  goBack: (fallbackPath: string) => void;
  showReleaseNotes: boolean;
  setShowReleaseNotes: (next: boolean) => void;
  setShowKeyboardShortcuts: (next: boolean) => void;
  activeTab: string;
  showKeyboardShortcuts: boolean;
}) {
  const {
    navigate,
    location,
    selectedPerson,
    setSelectedPerson,
    markClosingEntityModal,
    documentModalId,
    setDocumentModalId,
    setDocumentModalInitial,
    goBack,
    showReleaseNotes,
    setShowReleaseNotes,
    setShowKeyboardShortcuts,
    activeTab,
    showKeyboardShortcuts,
  } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Search input focused';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      if (e.ctrlKey || e.metaKey) {
        const tabMap: Record<string, string> = {
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

        if (tabMap[e.key]) {
          e.preventDefault();
          navigate(tabMap[e.key]);
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = `Navigated to ${tabMap[e.key].substring(1)} section`;
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      if (e.key === 'Escape') {
        if (selectedPerson) {
          markClosingEntityModal();
          setSelectedPerson(null);
          goBack('/people');
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Person details modal closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
        if (documentModalId) {
          setDocumentModalId('');
          setDocumentModalInitial(null);
          goBack('/documents');
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Document modal closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
        if (showReleaseNotes) {
          setShowReleaseNotes(false);
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.setAttribute('aria-atomic', 'true');
          announcement.className = 'sr-only';
          announcement.textContent = 'Release notes closed';
          document.body.appendChild(announcement);
          setTimeout(() => document.body.removeChild(announcement), 1000);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        window.location.reload();
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Reloading application';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = 'Keyboard shortcuts help opened';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    navigate,
    selectedPerson,
    documentModalId,
    showReleaseNotes,
    showKeyboardShortcuts,
    activeTab,
    location.pathname,
    location.search,
    goBack,
    markClosingEntityModal,
    setDocumentModalId,
    setDocumentModalInitial,
    setSelectedPerson,
    setShowKeyboardShortcuts,
    setShowReleaseNotes,
  ]);
}
