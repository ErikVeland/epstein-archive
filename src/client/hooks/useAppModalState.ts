import { useState, useCallback, useRef } from 'react';
import type { Person } from '../types';

import type { DocRecord } from '../components/documents/DocumentModal';

export interface UseAppModalStateReturn {
  selectedPerson: Person | null;
  setSelectedPerson: (person: Person | null) => void;
  documentModalId: string | null;
  setDocumentModalId: (id: string | null) => void;
  documentModalInitial: DocRecord | null;
  setDocumentModalInitial: (record: DocRecord | null) => void;
  clearEntityModal: () => void;
  clearDocumentModal: () => void;
}

export function useAppModalState(): UseAppModalStateReturn {
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [documentModalId, setDocumentModalId] = useState<string | null>(null);
  const [documentModalInitial, setDocumentModalInitial] = useState<DocRecord | null>(null);

  const clearEntityModal = useCallback(() => {
    setSelectedPerson(null);
  }, []);

  const clearDocumentModal = useCallback(() => {
    setDocumentModalId(null);
    setDocumentModalInitial(null);
  }, []);

  return {
    selectedPerson,
    setSelectedPerson,
    documentModalId,
    setDocumentModalId,
    documentModalInitial,
    setDocumentModalInitial,
    clearEntityModal,
    clearDocumentModal,
  };
}

export function useEntityModalClose() {
  const closingRef = useRef(false);

  const startClose = useCallback(() => {
    closingRef.current = true;
  }, []);

  const endClose = useCallback(() => {
    closingRef.current = false;
  }, []);

  return { closingRef, startClose, endClose };
}
