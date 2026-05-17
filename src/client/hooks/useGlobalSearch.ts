import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SearchResponsePayload, SearchDocumentPayload } from '../types/api';
import type { Person } from '../types';

type SearchSuggestion = Person & {
  canonicalName?: string;
  matchedAlias?: string | null;
};

type SearchDocumentSuggestion = {
  kind: 'document';
  id: string;
  title: string;
  snippet?: string;
  evidenceType?: string;
};

type HeaderSuggestion = ({ kind: 'entity' } & SearchSuggestion) | SearchDocumentSuggestion;

interface UseGlobalSearchOptions {
  searchTerm: string;
  apiEnabled: boolean;
}

interface UseGlobalSearchReturn {
  searchSuggestions: HeaderSuggestion[];
  searchSuggestionsLoading: boolean;
}

export function useGlobalSearch({
  searchTerm,
  apiEnabled,
}: UseGlobalSearchOptions): UseGlobalSearchReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 200);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: searchSuggestions = [], isFetching: searchSuggestionsLoading } = useQuery<
    HeaderSuggestion[]
  >({
    queryKey: ['searchSuggestions', debouncedSearchTerm],
    queryFn: async () => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debouncedSearchTerm)}&limit=10`,
      );
      const data = (await response.json()) as SearchResponsePayload;
      const entities = Array.isArray(data.entities) ? data.entities : [];
      const documents = Array.isArray(data.documents) ? data.documents : [];

      type SearchEntityPayload = Partial<{
        id: string | number;
        fullName: string;
        name: string;
        canonicalName: string;
        matchedAlias: string;
        primaryRole: string;
        role: string;
        mention_count: number;
        mentions: number;
        redFlagRating: number;
        document_count: number;
        files: number;
      }> &
        Record<string, unknown>;

      const entitySuggestions: HeaderSuggestion[] = (entities as SearchEntityPayload[])
        .filter(
          (entity): entity is SearchEntityPayload & { id: string | number } =>
            entity.id !== undefined && entity.id !== null,
        )
        .map((entity) => ({
          kind: 'entity' as const,
          id: entity.id ?? 'unknown',
          name: entity.fullName || entity.name || 'Unknown',
          fullName: entity.fullName || entity.name || 'Unknown',
          canonicalName: entity.canonicalName || entity.fullName || entity.name || 'Unknown',
          matchedAlias: entity.matchedAlias || null,
          role: entity.primaryRole || entity.role || 'Unknown',
          mentions: entity.mention_count || entity.mentions || 0,
          redFlagRating: entity.redFlagRating ?? 0,
          files: entity.document_count || entity.files || 0,
          contexts: [],
          evidenceTypes: [],
          significantPassages: [],
          fileReferences: [],
        }));

      const documentSuggestions: HeaderSuggestion[] = documents
        .slice(0, 4)
        .map((document: SearchDocumentPayload) => ({
          kind: 'document' as const,
          id: String(document.id),
          title: document.title || document.fileName || 'Untitled document',
          snippet: document.snippet || undefined,
          evidenceType: document.evidenceType || undefined,
        }));

      return [...entitySuggestions, ...documentSuggestions];
    },
    enabled: apiEnabled && debouncedSearchTerm.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  return {
    searchSuggestions,
    searchSuggestionsLoading,
  };
}
