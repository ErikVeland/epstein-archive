import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DocRecord } from '@client/components/documents/DocumentModal';
import type { Person } from '@client/types';
import type { EntityDetailDto } from '@shared/dto/entities';
import { apiClient } from '@client/services/apiClient';
import { mapEntityDetailToPerson } from '@client/mappers/entityMapper';

type LocationLike = { pathname: string; search: string };

export function useEntityModalUrlSync(params: {
  apiEnabled: boolean;
  location: LocationLike;
  selectedPerson: Person | null;
  setSelectedPerson: (next: Person | null) => void;
  closingEntityModal: { current: boolean };
  clearClosingEntityModal: () => void;
  documentModalId: string | null;
  setDocumentModalId: (next: string | null) => void;
  documentModalInitial: DocRecord | null;
  setDocumentModalInitial: (next: DocRecord | null) => void;
}) {
  const {
    apiEnabled,
    location,
    selectedPerson,
    setSelectedPerson,
    closingEntityModal,
    clearClosingEntityModal,
    documentModalId,
    setDocumentModalId,
    documentModalInitial,
    setDocumentModalInitial,
  } = params;
  const urlEntityId = useMemo(() => {
    const match = location.pathname.match(/^\/entity\/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }, [location.pathname]);

  const needsEntityFetch = useMemo(
    () => !!urlEntityId && (!selectedPerson || String(selectedPerson.id) !== String(urlEntityId)),
    [urlEntityId, selectedPerson],
  );

  const { data: urlEntityData } = useQuery<EntityDetailDto | null>({
    queryKey: ['urlEntity', urlEntityId],
    queryFn: async () => {
      if (!urlEntityId) return null;
      return apiClient.getEntity(String(urlEntityId));
    },
    enabled: apiEnabled && needsEntityFetch,
    staleTime: 60_000,
  });

  const prevUrlEntityIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (urlEntityId !== prevUrlEntityIdRef.current) {
      prevUrlEntityIdRef.current = urlEntityId;
      if (urlEntityId) {
        if (documentModalId) setDocumentModalId('');
        if (documentModalInitial) setDocumentModalInitial(null);
      }
    }
  }, [
    urlEntityId,
    documentModalId,
    documentModalInitial,
    setDocumentModalId,
    setDocumentModalInitial,
  ]);

  useEffect(() => {
    if (closingEntityModal.current) {
      clearClosingEntityModal();
      return;
    }
    if (
      urlEntityData?.id &&
      String(urlEntityData.id) === String(urlEntityId) &&
      (!selectedPerson || String(selectedPerson.id) !== String(urlEntityData.id))
    ) {
      setSelectedPerson(mapEntityDetailToPerson(urlEntityData));
    }
  }, [
    urlEntityData,
    urlEntityId,
    selectedPerson,
    setSelectedPerson,
    closingEntityModal,
    clearClosingEntityModal,
  ]);

  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = location.pathname;
      if (!urlEntityId && selectedPerson) {
        setSelectedPerson(null);
      }
    }
  }, [location.pathname, urlEntityId, selectedPerson, setSelectedPerson]);

  useEffect(() => {
    const handleEntityClick = (event: CustomEvent) => {
      const { id, name } = event.detail as { id: number | string; name?: string };
      if (id) {
        const partialPerson: Person = {
          id: Number(id),
          name: name || 'Unknown Entity',
          fullName: name || 'Unknown Entity',
          mentions: 0,
          files: 0,
          contexts: [],
          evidenceTypes: [],
          significantPassages: [],
          fileReferences: [],
        };
        setSelectedPerson(partialPerson);
      }
    };

    window.addEventListener('entityClick', handleEntityClick as EventListener);
    return () => {
      window.removeEventListener('entityClick', handleEntityClick as EventListener);
    };
  }, [setSelectedPerson]);
}
