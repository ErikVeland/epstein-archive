import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { Person } from '../types';
import type { DocRecord } from '../components/documents/DocumentModal';

type KeyboardShortcutOptions = {
  navigate: NavigateFunction;
  selectedPerson: Person | null;
  setSelectedPerson: Dispatch<SetStateAction<Person | null>>;
  documentModalId: string | null;
  setDocumentModalId: Dispatch<SetStateAction<string | null>>;
  setDocumentModalInitial: Dispatch<SetStateAction<DocRecord | null>>;
  showReleaseNotes: boolean;
  setShowReleaseNotes: Dispatch<SetStateAction<boolean>>;
  setShowKeyboardShortcuts: Dispatch<SetStateAction<boolean>>;
  location: {
    pathname: string;
    search: string;
  };
  goBack: (fallbackPath: string) => void;
};

function announce(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}

export function useAppKeyboardShortcuts({
  navigate,
  selectedPerson,
  setSelectedPerson,
  documentModalId,
  setDocumentModalId,
  setDocumentModalInitial,
  showReleaseNotes,
  setShowReleaseNotes,
  setShowKeyboardShortcuts,
  location,
  goBack,
}: KeyboardShortcutOptions) {
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
          announce('Search input focused');
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
          announce(`Navigated to ${tabMap[e.key].substring(1)} section`);
        }
      }

      if (e.key === 'Escape') {
        if (selectedPerson) {
          setSelectedPerson(null);
          const params = new URLSearchParams(location.search);
          params.delete('entityId');
          params.delete('entityTab');
          navigate(`${location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
          announce('Person details modal closed');
        }
        if (documentModalId) {
          setDocumentModalId('');
          setDocumentModalInitial(null);
          goBack('/documents');
          announce('Document modal closed');
        }
        if (showReleaseNotes) {
          setShowReleaseNotes(false);
          announce('Release notes closed');
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        window.location.reload();
        announce('Reloading application');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        announce('Keyboard shortcuts help opened');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    documentModalId,
    goBack,
    location.pathname,
    location.search,
    navigate,
    selectedPerson,
    setDocumentModalId,
    setDocumentModalInitial,
    setSelectedPerson,
    setShowKeyboardShortcuts,
    setShowReleaseNotes,
    showReleaseNotes,
  ]);
}
