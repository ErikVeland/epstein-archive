import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DocRecord } from '@client/components/documents/DocumentModal';
import type { Person, Photo } from '@client/types';
import type { EntityByIdResponse } from '@client/types/api';

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
    () => !!urlEntityId && (!selectedPerson || selectedPerson.id !== urlEntityId),
    [urlEntityId, selectedPerson],
  );

  const { data: urlEntityData } = useQuery<EntityByIdResponse | null>({
    queryKey: ['urlEntity', urlEntityId],
    queryFn: async () => {
      if (!urlEntityId) return null;
      const res = await fetch(`/api/entities/${urlEntityId}`);
      return (await res.json()) as EntityByIdResponse;
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
    if (urlEntityData?.id && (!selectedPerson || selectedPerson.id !== urlEntityData.id)) {
      const photos: Photo[] = Array.isArray(urlEntityData.photos)
        ? (urlEntityData.photos as unknown[])
            .map((p) => {
              const rec = p as Record<string, unknown>;
              const id = rec.id ?? rec.photo_id ?? rec.media_id;
              const filePath = rec.filePath ?? rec.file_path ?? rec.path ?? rec.url;
              if (typeof id !== 'string' && typeof id !== 'number') return null;
              if (typeof filePath !== 'string') return null;
              return { id: String(id), filePath };
            })
            .filter((v): v is Photo => v !== null)
        : [];

      const blackBookEntries = Array.isArray(urlEntityData.blackBookEntry)
        ? (urlEntityData.blackBookEntry as Array<Record<string, unknown>>)
            .map((rec) => {
              const id = rec.id;
              if (typeof id !== 'number') return null;
              return {
                id,
                phoneNumbers: Array.isArray(rec.phoneNumbers)
                  ? (rec.phoneNumbers as string[])
                  : undefined,
                emailAddresses: Array.isArray(rec.emailAddresses)
                  ? (rec.emailAddresses as string[])
                  : undefined,
                addresses: Array.isArray(rec.addresses) ? (rec.addresses as string[]) : undefined,
                entryText: typeof rec.entryText === 'string' ? rec.entryText : undefined,
                notes: typeof rec.notes === 'string' ? rec.notes : undefined,
                entryCategory:
                  typeof rec.entryCategory === 'string' ? rec.entryCategory : undefined,
                documentId: typeof rec.documentId === 'number' ? rec.documentId : undefined,
              };
            })
            .filter((v) => v !== null)
        : undefined;

      const person: Person = {
        id: urlEntityData.id,
        name: urlEntityData.fullName || 'Unknown',
        fullName: urlEntityData.fullName || 'Unknown',
        role: urlEntityData.primaryRole || 'Unknown',
        mentions: urlEntityData.mentions || urlEntityData.mention_count || 0,
        redFlagRating: urlEntityData.redFlagRating ?? 0,
        files: urlEntityData.documentCount || urlEntityData.document_count || 0,
        contexts: [],
        evidenceTypes: urlEntityData.evidenceTypes || [],
        significantPassages: [],
        likelihoodScore: urlEntityData.likelihoodLevel || 'MEDIUM',
        fileReferences: [],
        bio: urlEntityData.bio || urlEntityData.description,
        birthDate: urlEntityData.birthDate,
        deathDate: urlEntityData.deathDate,
        photos,
        blackBookEntries,
        entityType: urlEntityData.entityType || urlEntityData.type,
        redFlagDescription: urlEntityData.redFlagDescription,
      };
      setSelectedPerson(person);
    }
  }, [
    urlEntityData,
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
