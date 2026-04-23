import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrowseFilters, Document } from '../types/documents';
import { apiClient, type SearchMode } from '../services/apiClient';

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v != null ? String(v) : fallback;

const mapApiDocumentToDocument = (doc: Record<string, unknown>): Document => {
  const meta =
    doc.metadata && typeof doc.metadata === 'object'
      ? (doc.metadata as Record<string, unknown>)
      : {};
  const redFlag = Number(doc.redFlagRating || 0);
  return {
    id: String(doc.id != null ? doc.id : (doc.fileName ?? '')),
    title: str(doc.title || doc.fileName),
    filename: str(doc.fileName),
    fileType: str(doc.fileType, 'unknown'),
    fileSize: Number(doc.fileSize || 0),
    dateCreated: doc.dateCreated as string | undefined,
    dateModified: doc.dateModified as string | undefined,
    content: str(doc.content || doc.previewText || doc.preview_text || doc.contentPreview),
    previewText: str(doc.previewText || doc.preview_text),
    previewKind: str(doc.previewKind || doc.preview_kind, 'fallback') as Document['previewKind'],
    keyEntities: Array.isArray(doc.keyEntities)
      ? (doc.keyEntities as Document['keyEntities'])
      : Array.isArray(doc.key_entities)
        ? (doc.key_entities as Document['keyEntities'])
        : [],
    entitiesCount: Number(doc.entitiesCount || doc.entities_count || 0),
    sourceType: str(doc.sourceType || doc.source_type),
    whyFlagged: str(doc.whyFlagged || doc.why_flagged),
    metadata: {
      source: str(doc.sourceCollection || doc.sourceType, 'Epstein Files'),
      confidentiality: 'public',
      categories: [],
      tags: [],
      ...meta,
      emailHeaders: meta.emailHeaders as Record<string, string> | undefined,
    },
    entities: Array.isArray(doc.entities) ? (doc.entities as Document['entities']) : [],
    passages: Array.isArray(doc.passages) ? (doc.passages as Document['passages']) : [],
    redFlagScore: redFlag,
    redFlagRating: redFlag || 1,
    redFlagPeppers: '',
    redFlagDescription: `Red Flag Index ${redFlag || 1}`,
    evidenceType: str(
      doc.evidenceType || doc.evidence_type,
      'document',
    ) as Document['evidenceType'],
    parentId:
      doc.parentId != null
        ? String(doc.parentId)
        : doc.parent_id != null
          ? String(doc.parent_id)
          : doc.original_file_id != null
            ? String(doc.original_file_id)
            : undefined,
    startOffset: Number(doc.startOffset || doc.start_offset || 0),
    endOffset: Number(doc.endOffset || doc.end_offset || 0),
    childDocuments: Array.isArray(doc.childDocuments)
      ? (doc.childDocuments as Document['childDocuments'])
      : [],
    threadId:
      doc.threadId != null
        ? String(doc.threadId)
        : doc.thread_id != null
          ? String(doc.thread_id)
          : undefined,
    threadPosition:
      doc.threadPosition != null
        ? Number(doc.threadPosition)
        : doc.thread_position != null
          ? Number(doc.thread_position)
          : undefined,
  };
};

interface UseDocumentBrowserDataOptions {
  effectiveSearchTerm: string;
  globalTimeRange: Array<string | null | undefined>;
  sortBy: 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size';
  sortOrder: 'asc' | 'desc';
  filters: BrowseFilters;
  itemsPerPage: number;
  hideLowCredibility: boolean;
  selectedDocumentId?: string;
  searchMode: SearchMode;
}

const EMPTY_DOCUMENTS: Document[] = [];

export function useDocumentBrowserData({
  effectiveSearchTerm,
  globalTimeRange,
  sortBy,
  sortOrder,
  filters,
  itemsPerPage,
  hideLowCredibility,
  selectedDocumentId,
  searchMode,
}: UseDocumentBrowserDataOptions) {
  const [currentPage, setCurrentPage] = useState(1);
  const requestKeyRef = useRef<string | null>(null);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        search: effectiveSearchTerm?.trim() || '',
        mode: searchMode,
        sortBy,
        sortOrder,
        categories: filters.categories || [],
        source: filters.source || [],
        collectionId: filters.collectionId || null,
        dateRange: filters.dateRange || {},
        fileType: filters.fileType || [],
        redFlagLevel: filters.redFlagLevel,
        globalTimeRange,
        itemsPerPage,
        includeMedia: filters.includeMedia,
        excludedFileTypes: filters.excludedFileTypes,
      }),
    [
      effectiveSearchTerm,
      searchMode,
      sortBy,
      sortOrder,
      filters.categories,
      filters.source,
      filters.collectionId,
      filters.dateRange,
      filters.fileType,
      filters.redFlagLevel,
      globalTimeRange,
      itemsPerPage,
      filters.includeMedia,
      filters.excludedFileTypes,
    ],
  );

  // Reset to page 1 when filters change
  // This effect intentionally resets state based on prop changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [queryKey]);

  const effectiveStart = globalTimeRange[0] ?? filters.dateRange?.start;
  const effectiveEnd = globalTimeRange[1] ?? filters.dateRange?.end;

  const { data: queryResult, isFetching } = useQuery({
    queryKey: ['documents', queryKey, currentPage],
    queryFn: async () => {
      const requestKey = `${queryKey}:${currentPage}`;
      requestKeyRef.current = requestKey;

      const result = await apiClient.getDocuments(
        {
          search:
            effectiveSearchTerm && effectiveSearchTerm.trim() ? effectiveSearchTerm : undefined,
          mode: searchMode,
          sortBy: sortBy || undefined,
          sortOrder,
          evidenceType:
            filters.categories && filters.categories.length > 0 ? filters.categories[0] : undefined,
          source: filters.source && filters.source.length > 0 ? filters.source : undefined,
          startDate: effectiveStart ?? undefined,
          endDate: effectiveEnd ?? undefined,
          redFlagLevel: filters.redFlagLevel,
          collectionId: filters.collectionId,
          fileType: filters.fileType,
          includeMedia: filters.includeMedia,
          excludedFileTypes: filters.excludedFileTypes,
        },
        currentPage,
        itemsPerPage,
      );

      const newDocs: Document[] = (result.data || []).map((doc) =>
        mapApiDocumentToDocument(doc as unknown as Record<string, unknown>),
      );
      return {
        documents: newDocs,
        total: result.total ?? 0,
        hasMore: newDocs.length === itemsPerPage,
        searchMeta: result.searchMeta,
      };
    },
    enabled: !selectedDocumentId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const documents = queryResult?.documents ?? EMPTY_DOCUMENTS;
  const totalDocuments = queryResult?.total ?? 0;
  const hasMore = queryResult?.hasMore ?? true;
  const searchMeta = queryResult?.searchMeta;

  const filteredDocuments = useMemo(() => {
    if (!hideLowCredibility) return documents;
    return documents.filter((d) => (d.metadata?.credibility_score ?? 1) >= 0.6);
  }, [documents, hideLowCredibility]);

  const handleDocumentSelect = useCallback((document: Document) => document, []);

  return {
    documents,
    filteredDocuments,
    handleDocumentSelect,
    currentPage,
    setCurrentPage,
    totalDocuments,
    hasMore,
    isFetching,
    searchMeta,
  };
}
