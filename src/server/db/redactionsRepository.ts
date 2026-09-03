import { getApiPool } from './connection.js';
import type {
  RedactionCandidateDto,
  RedactionFindingDto,
  RedactionFindingType,
  RedactionIntelligenceSummaryDto,
  RedactionQueueDto,
  RedactionReviewStatus,
} from '@shared/dto/redactions';

type QueueRow = {
  document_id: string;
  title: string | null;
  file_name: string | null;
  preview_text: string | null;
  finding_count: string;
  overlay_count: string;
  hypothesis_count: string;
  unresolved_count: string;
  highest_confidence: number | string;
  pending_count: string;
  total_count: string;
};

type FindingRow = {
  id: string;
  document_id: string;
  page_number: number | null;
  span_start: number | null;
  span_end: number | null;
  finding_type: RedactionFindingType;
  source_text: string | null;
  bbox_json: unknown;
  inferred_class: string | null;
  candidates_json: unknown;
  confidence: number | string;
  evidence_json: unknown;
  method: string;
  model_id: string | null;
  prompt_version: string | null;
  source_sha256: string | null;
  review_status: RedactionReviewStatus;
};

const candidatesFrom = (value: unknown): RedactionCandidateDto[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const candidate = String(row.value || '').trim();
    if (!candidate) return [];
    return [
      {
        value: candidate,
        category: String(row.category || 'other') as RedactionCandidateDto['category'],
        confidence: Math.max(0, Math.min(1, Number(row.confidence) || 0)),
        rationale: String(row.rationale || 'Machine-generated contextual candidate'),
        entityId: row.entityId == null ? null : String(row.entityId),
        corroboratingDocumentCount: Math.max(0, Number(row.corroboratingDocumentCount) || 0),
      },
    ];
  });
};

const evidenceFrom = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean).slice(0, 8) : [];

export const redactionsRepository = {
  async getQueue(limit = 50): Promise<RedactionQueueDto> {
    const result = await getApiPool().query<QueueRow>(
      `
        SELECT rf.document_id::text,
               COALESCE(NULLIF(d.title, ''), d.file_name, 'Untitled document') AS title,
               COALESCE(d.file_name, '') AS file_name,
               COALESCE(d.content_preview, '') AS preview_text,
               COUNT(*)::text AS finding_count,
               COUNT(*) FILTER (WHERE rf.finding_type = 'overlay_text_exposed')::text AS overlay_count,
               COUNT(*) FILTER (WHERE rf.finding_type = 'contextual_hypothesis')::text AS hypothesis_count,
               COUNT(*) FILTER (WHERE rf.finding_type = 'unresolved_redaction')::text AS unresolved_count,
               MAX(rf.confidence) AS highest_confidence,
               COUNT(*) FILTER (WHERE rf.review_status = 'pending')::text AS pending_count,
               COUNT(*) OVER()::text AS total_count
        FROM redaction_findings rf
        JOIN documents d ON d.id = rf.document_id
        WHERE rf.review_status <> 'rejected'
        GROUP BY rf.document_id, d.title, d.file_name, d.content_preview
        ORDER BY MAX(rf.confidence) DESC, COUNT(*) DESC, rf.document_id
        LIMIT $1
      `,
      [Math.max(1, Math.min(200, limit))],
    );
    return {
      items: result.rows.map((row) => ({
        documentId: row.document_id,
        title: row.title || 'Untitled document',
        fileName: row.file_name || '',
        previewText: row.preview_text || '',
        findingCount: Number(row.finding_count || 0),
        overlayRecoveryCount: Number(row.overlay_count || 0),
        hypothesisCount: Number(row.hypothesis_count || 0),
        unresolvedCount: Number(row.unresolved_count || 0),
        highestConfidence: Math.max(0, Math.min(1, Number(row.highest_confidence) || 0)),
        pendingReviewCount: Number(row.pending_count || 0),
      })),
      total: Number(result.rows[0]?.total_count || 0),
    };
  },

  async getDocumentFindings(documentId: string): Promise<RedactionFindingDto[]> {
    const result = await getApiPool().query<FindingRow>(
      `
        SELECT id::text, document_id::text, page_number, span_start, span_end, finding_type, source_text,
               bbox_json, inferred_class, candidates_json, confidence, evidence_json,
               method, model_id, prompt_version, source_sha256, review_status
        FROM redaction_findings
        WHERE document_id = $1
        ORDER BY page_number NULLS LAST, confidence DESC, id
      `,
      [documentId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      pageNumber: row.page_number,
      spanStart: row.span_start,
      spanEnd: row.span_end,
      type: row.finding_type,
      exposedText: row.source_text,
      bbox: row.bbox_json,
      inferredClass: row.inferred_class,
      candidates: candidatesFrom(row.candidates_json),
      confidence: Math.max(0, Math.min(1, Number(row.confidence) || 0)),
      evidence: evidenceFrom(row.evidence_json),
      method: row.method,
      modelId: row.model_id,
      promptVersion: row.prompt_version,
      sourceSha256: row.source_sha256,
      reviewStatus: row.review_status,
    }));
  },

  async getSummary(): Promise<RedactionIntelligenceSummaryDto> {
    const result = await getApiPool().query<{
      total: string;
      overlays: string;
      hypotheses: string;
      pending: string;
      corroborated: string;
    }>(`
      SELECT COUNT(*)::text AS total,
             COUNT(*) FILTER (WHERE finding_type = 'overlay_text_exposed')::text AS overlays,
             COUNT(*) FILTER (WHERE finding_type = 'contextual_hypothesis')::text AS hypotheses,
             COUNT(*) FILTER (WHERE review_status = 'pending')::text AS pending,
             COUNT(*) FILTER (WHERE review_status = 'corroborated')::text AS corroborated
      FROM redaction_findings
    `);
    const row = result.rows[0];
    return {
      total: Number(row?.total || 0),
      overlayRecoveries: Number(row?.overlays || 0),
      contextualHypotheses: Number(row?.hypotheses || 0),
      pendingReview: Number(row?.pending || 0),
      corroborated: Number(row?.corroborated || 0),
    };
  },
};
