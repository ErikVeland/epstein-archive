import { useEffect, useMemo, useRef } from 'react';
import type { DocRecord } from '@client/components/documents/DocumentModal';
import type { Person } from '@client/types';

type LocationLike = { pathname: string; search: string };

export function useDocumentModalUrlSync(params: {
  location: LocationLike;
  selectedPerson: Person | null;
  setSelectedPerson: (next: Person | null) => void;
  documentModalId: string | null;
  setDocumentModalId: (next: string | null) => void;
  documentModalInitial: DocRecord | null;
  setDocumentModalInitial: (next: DocRecord | null) => void;
}) {
  const {
    location,
    selectedPerson,
    setSelectedPerson,
    documentModalId,
    setDocumentModalId,
    setDocumentModalInitial,
  } = params;
  const docId = useMemo(() => {
    const pathMatch = location.pathname.match(/^\/(?:documents|evidence)\/(.+)$/);
    const searchParams = new URLSearchParams(location.search);
    const queryDocId =
      searchParams.get('id') || searchParams.get('docId') || searchParams.get('documentId');
    return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : queryDocId;
  }, [location.pathname, location.search]);

  const prevDocIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (docId !== prevDocIdRef.current) {
      prevDocIdRef.current = docId;
    }

    if (docId) {
      if (documentModalId !== docId) {
        if (selectedPerson) setSelectedPerson(null);
        setDocumentModalId(docId);
      }
    } else if (documentModalId) {
      setDocumentModalId('');
      setDocumentModalInitial(null);
    }
  }, [
    docId,
    documentModalId,
    selectedPerson,
    setDocumentModalId,
    setDocumentModalInitial,
    setSelectedPerson,
  ]);
}
