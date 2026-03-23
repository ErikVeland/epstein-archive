import type { DocumentListItemDto, DocumentsListResponseDto } from '@shared/dto/documents';

export const mapDocumentListItemDto = (doc: Record<string, unknown>): DocumentListItemDto => ({
  id: String(doc.id || ''),
  fileName: String(doc.fileName || ''),
  title: String(doc.title || doc.fileName || 'Untitled'),
  fileType: String(doc.fileType || 'unknown'),
  fileSize: Number(doc.fileSize || 0),
  dateCreated: typeof doc.dateCreated === 'string' ? doc.dateCreated : null,
  evidenceType: String(doc.evidenceType || 'document'),
  metadata:
    typeof doc.metadata === 'object' && doc.metadata !== null
      ? (doc.metadata as Record<string, unknown>)
      : {},
  redFlagRating: Number(doc.redFlagRating || 0),
  wordCount: Number(doc.wordCount || 0),
  entitiesCount: Number(doc.entitiesCount || 0),
  keyEntities: Array.isArray(doc.keyEntities) ? doc.keyEntities.map((v: unknown) => String(v)) : [],
  sourceType: String(doc.sourceType || ''),
  previewText: String(doc.previewText || ''),
  previewKind: String(doc.previewKind || 'fallback'),
  whyFlagged: String(doc.whyFlagged || ''),
});

export const mapDocumentsListResponseDto = (
  result: Record<string, unknown>,
): DocumentsListResponseDto => {
  const items = Array.isArray(result?.documents)
    ? result.documents
    : Array.isArray(result?.data)
      ? result.data
      : [];
  const pageSize = Number(result?.pageSize || result?.limit || 0);
  const total = Number(result?.total || 0);
  const page = Number(result?.page || 1);

  return {
    data: items.map(mapDocumentListItemDto),
    total,
    page,
    pageSize,
    totalPages: Number(result?.totalPages || Math.ceil(total / Math.max(1, pageSize))),
  };
};
