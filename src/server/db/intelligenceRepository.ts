/**
 * Intelligence Review Repository
 *
 * Provides bounded queries that surface post-ingest quality issues for analyst review.
 * Every query is capped at a safe row limit to prevent expensive unbounded dashboard scans.
 * Tables that may not exist in all environments are queried with graceful try/catch.
 */

import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

const QUEUE_LIMIT = 50;

export interface WeakProvenanceDoc {
  documentId: number;
  fileName: string;
  docType: string | null;
  entityMentionCount: number;
  evidenceCount: number;
}

export interface LowOcrDoc {
  documentId: number;
  fileName: string;
  avgOcrConfidence: number | null;
  ocrFlagCount: number;
}

export interface FuzzyEntityAlias {
  entityId: number;
  entityName: string;
  aliasName: string;
  similarityScore: number | null;
}

export interface ThinHighRiskEntity {
  entityId: number;
  entityName: string;
  riskLevel: string;
  evidenceCount: number;
  documentCount: number;
}

export interface UnlinkedClaim {
  claimId: number;
  predicateText: string;
  objectText: string;
  subjectEntityId: number | null;
  subjectEntityName: string | null;
  confidence: number | null;
}

export interface ReviewableFinancialItem {
  itemId: number;
  itemType: string;
  description: string | null;
  entityName: string | null;
  needsReview: boolean;
}

export interface IntelligenceReviewQueues {
  weakProvenanceDocs: WeakProvenanceDoc[];
  lowOcrDocs: LowOcrDoc[];
  fuzzyEntityAliases: FuzzyEntityAlias[];
  thinHighRiskEntities: ThinHighRiskEntity[];
  unlinkedClaims: UnlinkedClaim[];
  reviewableFinancialItems: ReviewableFinancialItem[];
  counts: {
    weakProvenanceDocs: number;
    lowOcrDocs: number;
    fuzzyEntityAliases: number;
    thinHighRiskEntities: number;
    unlinkedClaims: number;
    reviewableFinancialItems: number;
  };
}

export interface ReleaseReadinessState {
  semanticAvailable: boolean;
  provenanceCoveragePct: number | null;
  pendingMentionReviews: number;
  pendingClaimReviews: number;
  exportTestsNote: string;
}

async function safeQuery<T>(
  label: string,
  fn: () => Promise<T[]>,
  fallback: T[] = [],
): Promise<T[]> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, label }, '[Intelligence] optional queue unavailable, skipping');
    return fallback;
  }
}

async function safeCount(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err, label }, '[Intelligence] optional count unavailable, skipping');
    return 0;
  }
}

export const intelligenceRepository = {
  /**
   * Documents with shallow provenance — few or no entity mentions and no evidence links.
   * Capped at QUEUE_LIMIT rows ordered by ascending mention count so the worst are first.
   */
  async getWeakProvenanceDocs(): Promise<WeakProvenanceDoc[]> {
    const pool = getApiPool();
    const result = await pool.query<{
      document_id: number;
      file_name: string;
      doc_type: string | null;
      entity_mention_count: string;
      evidence_count: string;
    }>(
      `
      SELECT
        d.id AS document_id,
        d.file_name,
        d.doc_type,
        COUNT(DISTINCT em.id) AS entity_mention_count,
        COUNT(DISTINCT ie.id) AS evidence_count
      FROM documents d
      LEFT JOIN entity_mentions em ON em.document_id = d.id
      LEFT JOIN investigation_evidence ie ON ie.document_id = d.id
      GROUP BY d.id, d.file_name, d.doc_type
      HAVING COUNT(DISTINCT em.id) < 2
      ORDER BY COUNT(DISTINCT em.id) ASC, d.id ASC
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    );
    return result.rows.map((r) => ({
      documentId: r.document_id,
      fileName: r.file_name,
      docType: r.doc_type,
      entityMentionCount: Number(r.entity_mention_count),
      evidenceCount: Number(r.evidence_count),
    }));
  },

  async countWeakProvenanceDocs(): Promise<number> {
    const pool = getApiPool();
    const result = await pool.query<{ cnt: string }>(`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT d.id
        FROM documents d
        LEFT JOIN entity_mentions em ON em.document_id = d.id
        GROUP BY d.id
        HAVING COUNT(DISTINCT em.id) < 2
      ) sub
    `);
    return Number(result.rows[0]?.cnt ?? 0);
  },

  /**
   * Documents flagged for low OCR confidence or OCR quality issues.
   * Reads from the optional document_ocr_results table; returns empty if unavailable.
   */
  async getLowOcrDocs(): Promise<LowOcrDoc[]> {
    return safeQuery('lowOcrDocs', async () => {
      const pool = getApiPool();
      const result = await pool.query<{
        document_id: number;
        file_name: string;
        avg_ocr_confidence: string | null;
        ocr_flag_count: string;
      }>(
        `
        SELECT
          d.id AS document_id,
          d.file_name,
          AVG(ocr.confidence_score) AS avg_ocr_confidence,
          COUNT(CASE WHEN ocr.quality_flag IS NOT NULL THEN 1 END) AS ocr_flag_count
        FROM documents d
        JOIN document_ocr_results ocr ON ocr.document_id = d.id
        GROUP BY d.id, d.file_name
        HAVING AVG(ocr.confidence_score) < 0.6 OR COUNT(CASE WHEN ocr.quality_flag IS NOT NULL THEN 1 END) > 0
        ORDER BY AVG(ocr.confidence_score) ASC NULLS FIRST, d.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        documentId: r.document_id,
        fileName: r.file_name,
        avgOcrConfidence: r.avg_ocr_confidence !== null ? Number(r.avg_ocr_confidence) : null,
        ocrFlagCount: Number(r.ocr_flag_count),
      }));
    });
  },

  async countLowOcrDocs(): Promise<number> {
    return safeCount('countLowOcrDocs', async () => {
      const pool = getApiPool();
      const result = await pool.query<{ cnt: string }>(`
        SELECT COUNT(DISTINCT d.id) AS cnt
        FROM documents d
        JOIN document_ocr_results ocr ON ocr.document_id = d.id
        GROUP BY d.id
        HAVING AVG(ocr.confidence_score) < 0.6 OR COUNT(CASE WHEN ocr.quality_flag IS NOT NULL THEN 1 END) > 0
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * Entity aliases with uncertain/fuzzy resolution — entities that share similar names
   * but haven't been confirmed as the same person.
   */
  async getFuzzyEntityAliases(): Promise<FuzzyEntityAlias[]> {
    return safeQuery('fuzzyEntityAliases', async () => {
      const pool = getApiPool();
      const result = await pool.query<{
        entity_id: number;
        entity_name: string;
        alias_name: string;
        similarity_score: string | null;
      }>(
        `
        SELECT
          e.id AS entity_id,
          e.name AS entity_name,
          ea.alias_name,
          ea.similarity_score
        FROM entities e
        JOIN entity_aliases ea ON ea.entity_id = e.id
        WHERE ea.is_confirmed IS NOT TRUE
          AND (ea.similarity_score IS NULL OR ea.similarity_score < 0.85)
        ORDER BY ea.similarity_score ASC NULLS FIRST, e.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        entityId: r.entity_id,
        entityName: r.entity_name,
        aliasName: r.alias_name,
        similarityScore: r.similarity_score !== null ? Number(r.similarity_score) : null,
      }));
    });
  },

  async countFuzzyEntityAliases(): Promise<number> {
    return safeCount('countFuzzyEntityAliases', async () => {
      const pool = getApiPool();
      const result = await pool.query<{ cnt: string }>(`
        SELECT COUNT(*) AS cnt
        FROM entity_aliases ea
        WHERE ea.is_confirmed IS NOT TRUE
          AND (ea.similarity_score IS NULL OR ea.similarity_score < 0.85)
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * High-risk entities with thin supporting evidence — the most important targets
   * to review when evidence coverage is weak.
   */
  async getThinHighRiskEntities(): Promise<ThinHighRiskEntity[]> {
    const pool = getApiPool();
    const result = await pool.query<{
      entity_id: number;
      entity_name: string;
      risk_level: string;
      evidence_count: string;
      document_count: string;
    }>(
      `
      SELECT
        e.id AS entity_id,
        e.name AS entity_name,
        e.risk_level,
        COUNT(DISTINCT ie.id) AS evidence_count,
        COUNT(DISTINCT em.document_id) AS document_count
      FROM entities e
      LEFT JOIN investigation_evidence ie ON ie.entity_id = e.id
      LEFT JOIN entity_mentions em ON em.entity_id = e.id
      WHERE e.risk_level = 'HIGH'
      GROUP BY e.id, e.name, e.risk_level
      HAVING COUNT(DISTINCT ie.id) < 3
      ORDER BY COUNT(DISTINCT ie.id) ASC, e.id ASC
      LIMIT $1
      `,
      [QUEUE_LIMIT],
    );
    return result.rows.map((r) => ({
      entityId: r.entity_id,
      entityName: r.entity_name,
      riskLevel: r.risk_level,
      evidenceCount: Number(r.evidence_count),
      documentCount: Number(r.document_count),
    }));
  },

  async countThinHighRiskEntities(): Promise<number> {
    const pool = getApiPool();
    const result = await pool.query<{ cnt: string }>(`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT e.id
        FROM entities e
        LEFT JOIN investigation_evidence ie ON ie.entity_id = e.id
        WHERE e.risk_level = 'HIGH'
        GROUP BY e.id
        HAVING COUNT(DISTINCT ie.id) < 3
      ) sub
    `);
    return Number(result.rows[0]?.cnt ?? 0);
  },

  /**
   * Extracted claims missing a source link — claims where the originating document
   * or entity reference could not be resolved during ingestion.
   */
  async getUnlinkedClaims(): Promise<UnlinkedClaim[]> {
    return safeQuery('unlinkedClaims', async () => {
      const pool = getApiPool();
      const result = await pool.query<{
        claim_id: number;
        predicate_text: string;
        object_text: string;
        subject_entity_id: number | null;
        subject_entity_name: string | null;
        confidence: string | null;
      }>(
        `
        SELECT
          ct.id AS claim_id,
          ct.predicate_text,
          ct.object_text,
          ct.subject_entity_id,
          e.name AS subject_entity_name,
          ct.confidence
        FROM claim_triples ct
        LEFT JOIN entities e ON e.id = ct.subject_entity_id
        WHERE ct.source_document_id IS NULL
           OR ct.subject_entity_id IS NULL
        ORDER BY ct.confidence ASC NULLS FIRST, ct.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        claimId: r.claim_id,
        predicateText: r.predicate_text,
        objectText: r.object_text,
        subjectEntityId: r.subject_entity_id,
        subjectEntityName: r.subject_entity_name,
        confidence: r.confidence !== null ? Number(r.confidence) : null,
      }));
    });
  },

  async countUnlinkedClaims(): Promise<number> {
    return safeCount('countUnlinkedClaims', async () => {
      const pool = getApiPool();
      const result = await pool.query<{ cnt: string }>(`
        SELECT COUNT(*) AS cnt
        FROM claim_triples ct
        WHERE ct.source_document_id IS NULL
           OR ct.subject_entity_id IS NULL
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * Financial extraction items flagged for review — incomplete or unresolved
   * financial records needing analyst verification.
   */
  async getReviewableFinancialItems(): Promise<ReviewableFinancialItem[]> {
    return safeQuery('reviewableFinancialItems', async () => {
      const pool = getApiPool();
      const result = await pool.query<{
        item_id: number;
        item_type: string;
        description: string | null;
        entity_name: string | null;
        needs_review: boolean;
      }>(
        `
        SELECT
          fi.id AS item_id,
          fi.item_type,
          fi.description,
          e.name AS entity_name,
          fi.needs_review
        FROM financial_items fi
        LEFT JOIN entities e ON e.id = fi.entity_id
        WHERE fi.needs_review = TRUE
           OR fi.entity_id IS NULL
        ORDER BY fi.needs_review DESC, fi.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        itemId: r.item_id,
        itemType: r.item_type,
        description: r.description,
        entityName: r.entity_name,
        needsReview: r.needs_review,
      }));
    });
  },

  async countReviewableFinancialItems(): Promise<number> {
    return safeCount('countReviewableFinancialItems', async () => {
      const pool = getApiPool();
      const result = await pool.query<{ cnt: string }>(`
        SELECT COUNT(*) AS cnt
        FROM financial_items fi
        WHERE fi.needs_review = TRUE OR fi.entity_id IS NULL
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * Release readiness — semantic search capability and pending review queue sizes.
   */
  async getReleaseReadiness(): Promise<ReleaseReadinessState> {
    const pool = getApiPool();

    // Check pgvector availability via the existing semantic capability detection path
    let semanticAvailable = false;
    try {
      const extResult = await pool.query<{ extname: string }>(
        `SELECT extname FROM pg_extension WHERE extname = 'vector' LIMIT 1`,
      );
      semanticAvailable = extResult.rows.length > 0;
    } catch {
      semanticAvailable = false;
    }

    // Provenance coverage: fraction of documents with at least one entity mention
    let provenanceCoveragePct: number | null = null;
    try {
      const covResult = await pool.query<{ total: string; covered: string }>(`
        SELECT
          COUNT(DISTINCT d.id) AS total,
          COUNT(DISTINCT em.document_id) AS covered
        FROM documents d
        LEFT JOIN entity_mentions em ON em.document_id = d.id
      `);
      const row = covResult.rows[0];
      const total = Number(row?.total ?? 0);
      const covered = Number(row?.covered ?? 0);
      provenanceCoveragePct = total > 0 ? Math.round((covered / total) * 100) : null;
    } catch {
      provenanceCoveragePct = null;
    }

    const [pendingMentionReviews, pendingClaimReviews] = await Promise.all([
      safeCount('pendingMentions', async () => {
        const r = await pool.query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM entity_mentions WHERE reviewed = FALSE OR reviewed IS NULL`,
        );
        return Number(r.rows[0]?.cnt ?? 0);
      }),
      safeCount('pendingClaims', async () => {
        const r = await pool.query<{ cnt: string }>(
          `SELECT COUNT(*) AS cnt FROM claim_triples WHERE reviewed = FALSE OR reviewed IS NULL`,
        );
        return Number(r.rows[0]?.cnt ?? 0);
      }),
    ]);

    return {
      semanticAvailable,
      provenanceCoveragePct,
      pendingMentionReviews,
      pendingClaimReviews,
      exportTestsNote: 'Run pnpm test:contracts to verify export API coverage',
    };
  },

  /**
   * Aggregate all queues and their total counts in a single call.
   */
  async getFullReview(): Promise<IntelligenceReviewQueues> {
    const [
      weakProvenanceDocs,
      lowOcrDocs,
      fuzzyEntityAliases,
      thinHighRiskEntities,
      unlinkedClaims,
      reviewableFinancialItems,
      weakProvenanceCount,
      lowOcrCount,
      fuzzyAliasCount,
      thinHighRiskCount,
      unlinkedClaimCount,
      reviewableFinancialCount,
    ] = await Promise.all([
      intelligenceRepository.getWeakProvenanceDocs(),
      intelligenceRepository.getLowOcrDocs(),
      intelligenceRepository.getFuzzyEntityAliases(),
      intelligenceRepository.getThinHighRiskEntities(),
      intelligenceRepository.getUnlinkedClaims(),
      intelligenceRepository.getReviewableFinancialItems(),
      intelligenceRepository.countWeakProvenanceDocs(),
      intelligenceRepository.countLowOcrDocs(),
      intelligenceRepository.countFuzzyEntityAliases(),
      intelligenceRepository.countThinHighRiskEntities(),
      intelligenceRepository.countUnlinkedClaims(),
      intelligenceRepository.countReviewableFinancialItems(),
    ]);

    return {
      weakProvenanceDocs,
      lowOcrDocs,
      fuzzyEntityAliases,
      thinHighRiskEntities,
      unlinkedClaims,
      reviewableFinancialItems,
      counts: {
        weakProvenanceDocs: weakProvenanceCount,
        lowOcrDocs: lowOcrCount,
        fuzzyEntityAliases: fuzzyAliasCount,
        thinHighRiskEntities: thinHighRiskCount,
        unlinkedClaims: unlinkedClaimCount,
        reviewableFinancialItems: reviewableFinancialCount,
      },
    };
  },
};
