import type {
  DocumentDetailDto,
  DocumentListItemDto,
  DocumentsListResponseDto,
} from '@shared/dto/documents';
import { mapProvenanceFieldsDto } from './provenanceDtoMapper.js';
import { deriveDocumentTitle } from '@shared/documentTitle';

const mappedTitle = (doc: Record<string, unknown>): string =>
  deriveDocumentTitle({
    id: String(doc.id || 'source'),
    title: typeof doc.title === 'string' ? doc.title : null,
    fileName:
      typeof doc.fileName === 'string'
        ? doc.fileName
        : typeof doc.file_name === 'string'
          ? doc.file_name
          : null,
    aiSummary:
      typeof doc.aiSummary === 'string'
        ? doc.aiSummary
        : typeof doc.ai_summary === 'string'
          ? doc.ai_summary
          : null,
    ocrText:
      typeof doc.contentRefined === 'string'
        ? doc.contentRefined
        : typeof doc.content === 'string'
          ? doc.content
          : null,
  }).title;

export const mapDocumentListItemDto = (doc: Record<string, unknown>): DocumentListItemDto => ({
  ...mapProvenanceFieldsDto(doc),
  id: String(doc.id || ''),
  fileName: String(doc.fileName || ''),
  title: mappedTitle(doc),
  fileType: String(doc.fileType || 'unknown'),
  fileSize: Number(doc.fileSize || 0),
  dateCreated: typeof doc.dateCreated === 'string' ? doc.dateCreated : null,
  evidenceType: String(doc.evidenceType || 'document'),
  metadata:
    typeof doc.metadata === 'object' && doc.metadata !== null
      ? {
          ...(doc.metadata as Record<string, unknown>),
          ...(doc.matchReason ? { matchReason: String(doc.matchReason) } : {}),
        }
      : doc.matchReason
        ? { matchReason: String(doc.matchReason) }
        : {},
  aiSummary:
    typeof doc.aiSummary === 'string'
      ? doc.aiSummary
      : typeof doc.ai_summary === 'string'
        ? doc.ai_summary
        : null,
  redFlagRating: Number(doc.redFlagRating || 0),
  wordCount: Number(doc.wordCount || 0),
  entitiesCount: Number(doc.entitiesCount || 0),
  keyEntities: Array.isArray(doc.keyEntities)
    ? doc.keyEntities.map((v: unknown) => {
        if (typeof v === 'object' && v !== null && 'id' in v && 'name' in v) {
          return {
            id: String((v as Record<string, unknown>).id),
            name: String((v as Record<string, unknown>).name),
          };
        }
        return { id: '', name: String(v) };
      })
    : [],
  sourceType: String(doc.sourceType || ''),
  previewText: String(doc.previewText || doc.snippet || ''),
  previewKind: String(doc.previewKind || 'fallback'),
  whyFlagged: String(doc.whyFlagged || ''),
  unredactionAttempted: Boolean(doc.unredactionAttempted),
  unredactionSucceeded: Boolean(doc.unredactionSucceeded),
  redactionCoverageBefore:
    doc.redactionCoverageBefore == null ? null : Number(doc.redactionCoverageBefore),
  redactionCoverageAfter:
    doc.redactionCoverageAfter == null ? null : Number(doc.redactionCoverageAfter),
  unredactedTextGain: doc.unredactedTextGain == null ? null : Number(doc.unredactedTextGain),
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

  const response: DocumentsListResponseDto = {
    data: items.map(mapDocumentListItemDto),
    total,
    page,
    pageSize,
    totalPages: Number(result?.totalPages || Math.ceil(total / Math.max(1, pageSize))),
  };
  if (result?.searchMeta && typeof result.searchMeta === 'object') {
    response.searchMeta = result.searchMeta as DocumentsListResponseDto['searchMeta'];
  }
  return response;
};
export const mapDocumentDetailDto = (doc: Record<string, unknown>): DocumentDetailDto => ({
  ...mapProvenanceFieldsDto(doc),
  id: String(doc.id || ''),
  fileName: String(doc.fileName || doc.file_name || ''),
  filePath: typeof doc.filePath === 'string' ? doc.filePath : null,
  fileType: String(doc.fileType || doc.file_type || 'unknown'),
  fileSize: Number(doc.fileSize || doc.file_size || 0),
  dateCreated: typeof doc.dateCreated === 'string' ? doc.dateCreated : null,
  title: mappedTitle(doc),
  content: String(doc.content || ''),
  contentRefined: typeof doc.contentRefined === 'string' ? doc.contentRefined : null,
  contentPreview: typeof doc.contentPreview === 'string' ? doc.contentPreview : null,
  metadata:
    typeof doc.metadata === 'object' && doc.metadata !== null
      ? (doc.metadata as Record<string, unknown>)
      : {},
  aiSummary:
    typeof doc.aiSummary === 'string'
      ? doc.aiSummary
      : typeof doc.ai_summary === 'string'
        ? doc.ai_summary
        : null,
  evidenceType: String(doc.evidenceType || doc.evidence_type || 'document'),
  redFlagRating: Number(doc.redFlagRating || doc.red_flag_rating || 0),
  sourceCollection: typeof doc.sourceCollection === 'string' ? doc.sourceCollection : null,
  fileUrl: typeof doc.fileUrl === 'string' ? doc.fileUrl : null,
  originalFileUrl: typeof doc.originalFileUrl === 'string' ? doc.originalFileUrl : null,
});
