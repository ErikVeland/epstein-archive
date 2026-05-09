import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import type { ExtractionMethod, ProvenanceStatus, ReviewState } from '@shared/dto/provenance';
import type { SharedClaimDto } from '@shared/dto/connections';

export interface ClaimTriple {
  id: string;
  documentId: string;
  subjectEntityId: string | null;
  objectEntityId: string | null;
  predicate: string | null;
  objectText: string | null;
  claimText: string | null;
  confidence: number;
  modality: string;
  verified: number;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  sourceDocumentId: number | null;
  sourceHash: string | null;
  extractionMethod: ExtractionMethod;
  reviewState: ReviewState;
  lastVerifiedAt: Date | null;
  provenanceStatus: ProvenanceStatus;
  // Joined fields
  subjectName?: string;
  objectName?: string;
  documentTitle?: string;
}

type ClaimTripleRow = Omit<
  ClaimTriple,
  'sourceDocumentId' | 'extractionMethod' | 'reviewState' | 'lastVerifiedAt' | 'provenanceStatus'
> & {
  documentId: string | number | null;
  sourceHash: string | null;
  verified: number | string | null;
  verifiedAt: Date | string | null;
};

const normalizeClaim = (row: ClaimTripleRow): ClaimTriple => {
  const sourceDocumentId =
    row.documentId == null || !Number.isFinite(Number(row.documentId))
      ? null
      : Number(row.documentId);
  const verified = Number(row.verified ?? 0);
  const reviewState: ReviewState =
    verified === 1 ? 'accepted' : verified === 2 ? 'rejected' : 'unreviewed';
  const extractionMethod: ExtractionMethod = 'agentic';
  const provenanceStatus: ProvenanceStatus = sourceDocumentId ? 'complete' : 'missing';

  return {
    ...row,
    documentId: row.documentId == null ? '' : String(row.documentId),
    verified,
    sourceDocumentId,
    sourceHash: row.sourceHash,
    extractionMethod,
    reviewState,
    lastVerifiedAt: row.verifiedAt ? new Date(row.verifiedAt) : null,
    provenanceStatus,
  };
};

export const claimTriplesRepository = {
  async getById(id: string | number): Promise<ClaimTriple | null> {
    try {
      const res = await getApiPool().query(
        `
        SELECT
          ct.id,
          ct.document_id as "documentId",
          ct.subject_entity_id as "subjectEntityId",
          ct.object_entity_id as "objectEntityId",
          ct.predicate,
          ct.object_text as "objectText",
          trim(concat_ws(' ', s.full_name, ct.predicate, COALESCE(o.full_name, ct.object_text))) as "claimText",
          ct.confidence,
          ct.modality,
          ct.verified,
          ct.verified_by as "verifiedBy",
          ct.verified_at as "verifiedAt",
          ct.rejection_reason as "rejectionReason",
          ct.created_at as "createdAt",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          d.title as "documentTitle",
          d.content_hash as "sourceHash"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        WHERE ct.id = $1
        LIMIT 1
        `,
        [id],
      );
      return res.rows[0] ? normalizeClaim(res.rows[0]) : null;
    } catch (error) {
      logger.error({ err: error, id }, '[claimTriplesRepository] getById error');
      throw error;
    }
  },

  async getByDocumentId(documentId: string | number): Promise<ClaimTriple[]> {
    try {
      const res = await getApiPool().query(
        `
        SELECT 
          ct.id,
          ct.document_id as "documentId",
          ct.subject_entity_id as "subjectEntityId",
          ct.object_entity_id as "objectEntityId",
          ct.predicate,
          ct.object_text as "objectText",
          (COALESCE(ct.predicate, '') || ' ' || COALESCE(ct.object_text, '')) as "claimText",
          ct.confidence,
          ct.modality,
          ct.verified,
          ct.verified_by as "verifiedBy",
          ct.verified_at as "verifiedAt",
          ct.rejection_reason as "rejectionReason",
          ct.created_at as "createdAt",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          d.title as "documentTitle",
          d.content_hash as "sourceHash"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        WHERE ct.document_id = $1
        ORDER BY ct.confidence DESC
        `,
        [documentId],
      );
      return res.rows.map(normalizeClaim);
    } catch (error) {
      logger.error({ err: error, documentId }, '[claimTriplesRepository] getByDocumentId error');
      throw error;
    }
  },

  async getByEntityId(entityId: string | number): Promise<ClaimTriple[]> {
    try {
      const res = await getApiPool().query(
        `
        SELECT 
          ct.id,
          ct.document_id as "documentId",
          ct.subject_entity_id as "subjectEntityId",
          ct.object_entity_id as "objectEntityId",
          ct.predicate,
          ct.object_text as "objectText",
          (COALESCE(ct.predicate, '') || ' ' || COALESCE(ct.object_text, '')) as "claimText",
          ct.confidence,
          ct.modality,
          ct.verified,
          ct.verified_by as "verifiedBy",
          ct.verified_at as "verifiedAt",
          ct.rejection_reason as "rejectionReason",
          ct.created_at as "createdAt",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          d.title as "documentTitle",
          d.content_hash as "sourceHash"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        WHERE ct.subject_entity_id = $1::bigint OR ct.object_entity_id = $1::bigint
        ORDER BY ct.confidence DESC
        `,
        [BigInt(entityId)],
      );
      return res.rows.map(normalizeClaim);
    } catch (error) {
      logger.error({ err: error, entityId }, '[claimTriplesRepository] getByEntityId error');
      throw error;
    }
  },

  async verify(
    id: string | number,
    verifiedBy: string,
    status: number = 1,
    rejectionReason?: string,
  ): Promise<boolean> {
    try {
      await getApiPool().query(
        `
        UPDATE claim_triples
        SET 
          verified = $2,
          verified_by = $3,
          verified_at = CURRENT_TIMESTAMP,
          rejection_reason = $4
        WHERE id = $1
        `,
        [id, status, verifiedBy, rejectionReason || null],
      );
      return true;
    } catch (error) {
      logger.error({ err: error, id }, '[claimTriplesRepository] verify error');
      throw error;
    }
  },

  async getSharedClaims(
    entityAId: string | number,
    entityBId: string | number,
  ): Promise<SharedClaimDto[]> {
    try {
      const res = await getApiPool().query(
        `
        SELECT
          ct.id::text as id,
          ct.predicate,
          ct.object_text as "objectText",
          ct.subject_entity_id::text as "subjectEntityId",
          ct.object_entity_id::text as "objectEntityId",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          COUNT(DISTINCT ct.document_id) as "documentCount"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        WHERE
          (ct.subject_entity_id = $1 OR ct.object_entity_id = $1)
          AND (ct.subject_entity_id = $2 OR ct.object_entity_id = $2)
        GROUP BY ct.id, ct.predicate, ct.object_text, ct.subject_entity_id, ct.object_entity_id, s.full_name, o.full_name
        ORDER BY "documentCount" DESC
        LIMIT 50
        `,
        [BigInt(entityAId), BigInt(entityBId)],
      );
      return res.rows.map((r) => ({
        id: String(r.id),
        predicate: r.predicate ?? null,
        objectText: r.objectText ?? null,
        subjectEntityId: r.subjectEntityId ?? null,
        objectEntityId: r.objectEntityId ?? null,
        subjectName: r.subjectName ?? null,
        objectName: r.objectName ?? null,
        documentCount: Number(r.documentCount ?? 0),
      }));
    } catch (error) {
      logger.error(
        { err: error, entityAId, entityBId },
        '[claimTriplesRepository] getSharedClaims error',
      );
      throw error;
    }
  },

  async getCorroboratedClaims(limit = 50): Promise<
    Array<{
      subjectId: string;
      subjectName: string;
      predicate: string;
      objectId: string | null;
      objectName: string | null;
      objectText: string | null;
      corroborationCount: number;
      documents: Array<{ id: string; title: string }>;
    }>
  > {
    try {
      const res = await getApiPool().query(
        `
        SELECT
          ct.subject_entity_id as "subjectId",
          s.full_name as "subjectName",
          ct.predicate as "predicate",
          ct.object_entity_id as "objectId",
          o.full_name as "objectName",
          ct.object_text as "objectText",
          COUNT(DISTINCT ct.document_id) as "corroborationCount",
          json_agg(DISTINCT jsonb_build_object('id', d.id::text, 'title', d.title)) as "documents"
        FROM claim_triples ct
        JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        GROUP BY ct.subject_entity_id, s.full_name, ct.predicate, ct.object_entity_id, o.full_name, ct.object_text
        HAVING COUNT(DISTINCT ct.document_id) > 1
        ORDER BY "corroborationCount" DESC, ct.subject_entity_id ASC
        LIMIT $1
        `,
        [limit],
      );
      return res.rows;
    } catch (error) {
      logger.error({ err: error }, '[claimTriplesRepository] getCorroboratedClaims error');
      throw error;
    }
  },
};
