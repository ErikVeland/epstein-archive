import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowseFilters, Document } from '../types/documents';
import { apiClient } from '../services/apiClient';

const mapApiDocumentToDocument = (doc: any): Document => ({
  id: String(doc.id?.toString() || doc.fileName || ''),
  title: doc.title || doc.fileName,
  filename: doc.fileName,
  fileType: doc.fileType || 'unknown',
  fileSize: doc.fileSize || 0,
  dateCreated: doc.dateCreated,
  dateModified: doc.dateModified,
  content: doc.content || doc.previewText || doc.preview_text || doc.contentPreview || '',
  previewText: doc.previewText || doc.preview_text || '',
  previewKind: doc.previewKind || doc.preview_kind || 'fallback',
  keyEntities: Array.isArray(doc.keyEntities)
    ? doc.keyEntities
    : Array.isArray(doc.key_entities)
      ? doc.key_entities
      : [],
  entitiesCount: Number(doc.entitiesCount || doc.entities_count || 0),
  sourceType: doc.sourceType || doc.source_type || '',
  whyFlagged: doc.whyFlagged || doc.why_flagged || '',
  metadata: {
    source: doc.sourceCollection || doc.sourceType || 'Epstein Files',
    confidentiality: 'Public',
    categories: [],
    ...doc.metadata,
    emailHeaders: doc.metadata?.emailHeaders,
  },
  entities: Array.isArray(doc.entities) ? doc.entities : [],
  passages: Array.isArray(doc.passages) ? doc.passages : [],
  redFlagScore: doc.redFlagRating || 0,
  redFlagRating: doc.redFlagRating || 1,
  redFlagPeppers: '',
  redFlagDescription: `Red Flag Index ${doc.redFlagRating || 1}`,
  evidenceType: doc.evidenceType || doc.evidence_type || 'document',
  parentId: doc.parentId || doc.parent_id || doc.original_file_id,
  startOffset: Number(doc.startOffset || doc.start_offset || 0),
  endOffset: Number(doc.endOffset || doc.end_offset || 0),
  childDocuments: Array.isArray(doc.childDocuments) ? doc.childDocuments : [],
  threadId: doc.threadId || doc.thread_id,
  threadPosition: doc.threadPosition || doc.thread_position,
});

interface UseDocumentBrowserDataOptions {
  effectiveSearchTerm: string;
  globalTimeRange: Array<string | null | undefined>;
  sortBy: 'relevance' | 'date' | 'red_flag' | 'fileType' | 'size';
  sortOrder: 'asc' | 'desc';
  filters: BrowseFilters;
  itemsPerPage: number;
  hideLowCredibility: boolean;
  selectedDocumentId?: string;
}

export function useDocumentBrowserData({
  effectiveSearchTerm,
  globalTimeRange,
  sortBy,
  sortOrder,
  filters,
  itemsPerPage,
  hideLowCredibility,
  selectedDocumentId,
}: UseDocumentBrowserDataOptions) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchBlockedUntil] = useState<number>(0);
  const requestKeyRef = useRef<string | null>(null);

  const queryKey = useMemo(
    () =>
      JSON.stringify({
        search: effectiveSearchTerm?.trim() || '',
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
      }),
    [
      effectiveSearchTerm,
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
    ],
  );

  useEffect(() => {
    const fetchDocuments = async () => {
      if (fetchBlockedUntil > Date.now()) return;

      const effectiveStart = globalTimeRange[0] ?? filters.dateRange?.start;
      const effectiveEnd = globalTimeRange[1] ?? filters.dateRange?.end;
      const requestKey = `${queryKey}:${currentPage}`;
      requestKeyRef.current = requestKey;

      try {
        setIsFetching(true);

        const result = await apiClient.getDocuments(
          {
            search:
              effectiveSearchTerm && effectiveSearchTerm.trim() ? effectiveSearchTerm : undefined,
            sortBy: sortBy || undefined,
            sortOrder,
            evidenceType:
              filters.categories && filters.categories.length > 0
                ? filters.categories[0]
                : undefined,
            source: filters.source && filters.source.length > 0 ? filters.source : undefined,
            startDate: effectiveStart ?? undefined,
            endDate: effectiveEnd ?? undefined,
            redFlagLevel: filters.redFlagLevel,
            collectionId: filters.collectionId,
            fileType: filters.fileType,
          },
          currentPage,
          itemsPerPage,
        );

        if (requestKeyRef.current !== requestKey) return;

        const newDocs: Document[] = (result.data || []).map((doc: any) =>
          mapApiDocumentToDocument(doc),
        );
        setDocuments(newDocs);
        setTotalDocuments(result.total ?? 0);
        setHasMore(newDocs.length === itemsPerPage);
      } catch (error) {
        console.error('DocumentBrowser: Error fetching documents:', error);
        if (requestKeyRef.current !== requestKey) return;
        setHasMore(false);
        setTotalDocuments(0);
        setDocuments([]);
      } finally {
        if (requestKeyRef.current === requestKey) {
          setIsFetching(false);
        }
      }
    };

    void fetchDocuments();
  }, [
    currentPage,
    effectiveSearchTerm,
    fetchBlockedUntil,
    filters.categories,
    filters.collectionId,
    filters.dateRange,
    filters.fileType,
    filters.redFlagLevel,
    filters.source,
    globalTimeRange,
    itemsPerPage,
    queryKey,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
  }, [queryKey]);

  const filteredDocuments = useMemo(() => {
    if (!hideLowCredibility) return documents;
    return documents.filter((d) => (d.metadata?.credibility_score ?? 1) >= 0.6);
  }, [documents, hideLowCredibility]);

  const handleDocumentSelect = useCallback(async (document: Document) => {
    setSelectedDocument(document);
    try {
      const fullDoc = await apiClient.getDocument(document.id);
      if (fullDoc) {
        setSelectedDocument((prev) => (prev?.id === document.id ? { ...prev, ...fullDoc } : prev));
      }
    } catch (error) {
      console.error('Error fetching full document content:', error);
    }
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) return;
    if (selectedDocument?.id === selectedDocumentId) return;

    const existing = documents.find((doc) => doc.id === selectedDocumentId);
    if (existing) {
      void handleDocumentSelect(existing);
      return;
    }

    apiClient
      .getDocument(selectedDocumentId)
      .then((docData) => {
        if (!docData) return;
        void handleDocumentSelect(mapApiDocumentToDocument(docData));
      })
      .catch((err) => console.error('Error fetching selected document:', err));
  }, [documents, handleDocumentSelect, selectedDocument, selectedDocumentId]);

  return {
    documents,
    filteredDocuments,
    selectedDocument,
    setSelectedDocument,
    handleDocumentSelect,
    currentPage,
    setCurrentPage,
    totalDocuments,
    hasMore,
    isFetching,
  };
}
