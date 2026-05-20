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
  const docId = useMemo(() => {
    const pathMatch = params.location.pathname.match(/^\/(?:documents|evidence)\/(.+)$/);
    const searchParams = new URLSearchParams(params.location.search);
    const queryDocId =
      searchParams.get('id') || searchParams.get('docId') || searchParams.get('documentId');
    return pathMatch?.[1] ? decodeURIComponent(pathMatch[1]) : queryDocId;
  }, [params.location.pathname, params.location.search]);

  const prevDocIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (docId !== prevDocIdRef.current) {
      prevDocIdRef.current = docId;
    }

    if (docId) {
      if (params.documentModalId !== docId) {
        if (params.selectedPerson) params.setSelectedPerson(null);
        params.setDocumentModalId(docId);
      }
    } else if (params.documentModalId) {
      params.setDocumentModalId('');
      params.setDocumentModalInitial(null);
    }
  }, [
    docId,
    params.documentModalId,
    params.selectedPerson,
    params.setDocumentModalId,
    params.setDocumentModalInitial,
    params.setSelectedPerson,
  ]);
}
