import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

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
  // Joined fields
  subjectName?: string;
  objectName?: string;
  documentTitle?: string;
}

export const claimTriplesRepository = {
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
          ct.claim_text as "claimText",
          ct.confidence,
          ct.modality,
          ct.verified,
          ct.verified_by as "verifiedBy",
          ct.verified_at as "verifiedAt",
          ct.rejection_reason as "rejectionReason",
          ct.created_at as "createdAt",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          d.title as "documentTitle"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        WHERE ct.document_id = $1
        ORDER BY ct.confidence DESC
        `,
        [documentId],
      );
      return res.rows;
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
          ct.claim_text as "claimText",
          ct.confidence,
          ct.modality,
          ct.verified,
          ct.verified_by as "verifiedBy",
          ct.verified_at as "verifiedAt",
          ct.rejection_reason as "rejectionReason",
          ct.created_at as "createdAt",
          s.full_name as "subjectName",
          o.full_name as "objectName",
          d.title as "documentTitle"
        FROM claim_triples ct
        LEFT JOIN entities s ON ct.subject_entity_id = s.id
        LEFT JOIN entities o ON ct.object_entity_id = o.id
        LEFT JOIN documents d ON ct.document_id = d.id
        WHERE ct.subject_entity_id = $1 OR ct.object_entity_id = $1
        ORDER BY ct.confidence DESC
        `,
        [entityId],
      );
      return res.rows;
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
};
