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
    // Silence spam for known dropped legacy tables (42P01 = undefined table)
    if ((err as any)?.code === '42P01') {
      logger.debug({ label }, '[Intelligence] Skipping optional queue: table missing');
    } else {
      logger.warn({ err, label }, '[Intelligence] optional queue unavailable, skipping');
    }
    return fallback;
  }
}

async function safeCount(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err) {
    if ((err as any)?.code === '42P01') {
      logger.debug({ label }, '[Intelligence] Skipping optional count: table missing');
    } else {
      logger.warn({ err, label }, '[Intelligence] optional count unavailable, skipping');
    }
    return 0;
  }
}

export const intelligenceRepository = {
  /**
   * Documents with shallow provenance — few or no entity mentions and no evidence links.
   * Capped at QUEUE_LIMIT rows ordered by ascending mention count so the worst are first.
   */
  async getWeakProvenanceDocs(): Promise<WeakProvenanceDoc[]> {
    return safeQuery('weakProvenanceDocs', async () => {
      const pool = getApiPool();
      // Optimization: Fetch documents with 0 or 1 mentions separately to avoid heavy GROUP BY on full join
      const result = await pool.query(
        `
        WITH docs_with_one_mention AS (
          SELECT document_id, COUNT(*) as cnt
          FROM entity_mentions
          GROUP BY document_id
          HAVING COUNT(*) = 1
        ),
        weak_docs AS (
          -- Documents with 0 mentions
          (SELECT d.id, d.file_name, d.file_type, 0 as mention_count
           FROM documents d
           WHERE NOT EXISTS (SELECT 1 FROM entity_mentions em WHERE em.document_id = d.id)
           LIMIT $1)
          UNION ALL
          -- Documents with 1 mention
          (SELECT d.id, d.file_name, d.file_type, 1 as mention_count
           FROM documents d
           JOIN docs_with_one_mention dwm ON d.id = dwm.document_id
           LIMIT $1)
        )
        SELECT
          wd.id AS document_id,
          wd.file_name,
          wd.file_type,
          wd.mention_count AS entity_mention_count,
          COUNT(DISTINCT ie.id) AS evidence_count
        FROM weak_docs wd
        LEFT JOIN investigation_evidence ie ON ie.document_id = wd.id
        GROUP BY wd.id, wd.file_name, wd.file_type, wd.mention_count
        ORDER BY wd.mention_count ASC, wd.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        documentId: r.document_id,
        fileName: r.file_name,
        docType: r.file_type,
        entityMentionCount: Number(r.entity_mention_count),
        evidenceCount: Number(r.evidence_count),
      }));
    });
  },

  async countWeakProvenanceDocs(): Promise<number> {
    return safeCount('countWeakProvenanceDocs', async () => {
      const pool = getApiPool();
      const result = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM documents d WHERE NOT EXISTS (SELECT 1 FROM entity_mentions em WHERE em.document_id = d.id)) +
          (SELECT COUNT(*) FROM (SELECT 1 FROM entity_mentions GROUP BY document_id HAVING COUNT(*) = 1) sub)
        AS cnt
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * Documents flagged for low OCR confidence or OCR quality issues.
   * Reads from the optional document_ocr_results table; returns empty if unavailable.
   */
  async getLowOcrDocs(): Promise<LowOcrDoc[]> {
    return safeQuery('lowOcrDocs', async () => {
      const pool = getApiPool();
      const result = await pool.query(
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
      const result = await pool.query(`
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
      const result = await pool.query(
        `
        SELECT
          e.id AS entity_id,
          e.full_name AS entity_name,
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
      const result = await pool.query(`
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
    return safeQuery('thinHighRiskEntities', async () => {
      const pool = getApiPool();
      const result = await pool.query(
        `
        SELECT
          e.id AS entity_id,
          e.full_name AS entity_name,
          e.risk_level,
          COUNT(DISTINCT em.id) AS evidence_count,
          COUNT(DISTINCT em.document_id) AS document_count
        FROM entities e
        LEFT JOIN entity_mentions em ON em.entity_id = e.id
        WHERE e.risk_level = 'HIGH'
        GROUP BY e.id, e.full_name, e.risk_level
        HAVING COUNT(DISTINCT em.document_id) < 3
        ORDER BY COUNT(DISTINCT em.id) ASC, e.id ASC
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
    });
  },

  async countThinHighRiskEntities(): Promise<number> {
    return safeCount('countThinHighRiskEntities', async () => {
      const pool = getApiPool();
      const result = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM (
          SELECT e.id
          FROM entities e
          LEFT JOIN entity_mentions em ON em.entity_id = e.id
          WHERE e.risk_level = 'HIGH'
          GROUP BY e.id
          HAVING COUNT(DISTINCT em.document_id) < 3
        ) sub
      `);
      return Number(result.rows[0]?.cnt ?? 0);
    });
  },

  /**
   * Extracted claims missing a source link — claims where the originating document
   * or entity reference could not be resolved during ingestion.
   */
  async getUnlinkedClaims(): Promise<UnlinkedClaim[]> {
    return safeQuery('unlinkedClaims', async () => {
      const pool = getApiPool();
      const result = await pool.query(
        `
        SELECT
          ct.id AS claim_id,
          ct.predicate,
          ct.object_text,
          ct.subject_entity_id,
          e.full_name AS subject_entity_name,
          ct.confidence
        FROM claim_triples ct
        LEFT JOIN entities e ON e.id = ct.subject_entity_id
        WHERE ct.document_id IS NULL
           OR ct.subject_entity_id IS NULL
        ORDER BY ct.confidence ASC NULLS FIRST, ct.id ASC
        LIMIT $1
        `,
        [QUEUE_LIMIT],
      );
      return result.rows.map((r) => ({
        claimId: r.claim_id,
        predicateText: r.predicate,
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
      const result = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM claim_triples ct
        WHERE ct.document_id IS NULL
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
      const result = await pool.query(
        `
        SELECT
          ft.id AS item_id,
          ft.transaction_type AS item_type,
          ft.description,
          e.full_name AS entity_name,
          (ft.risk_level = 'HIGH') AS needs_review
        FROM financial_transactions ft
        LEFT JOIN entities e ON e.full_name = ft.from_entity
        WHERE ft.risk_level = 'HIGH'
           OR ft.from_entity IS NULL
        ORDER BY ft.transaction_date DESC, ft.id ASC
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
      const result = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM financial_transactions ft
        WHERE ft.risk_level = 'HIGH' OR ft.from_entity IS NULL
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
      const extResult = await pool.query(
        `SELECT extname FROM pg_extension WHERE extname = 'vector' LIMIT 1`,
      );
      semanticAvailable = extResult.rows.length > 0;
    } catch {
      semanticAvailable = false;
    }

    // Provenance coverage: fraction of documents with at least one entity mention
    let provenanceCoveragePct: number | null = null;
    try {
      const covResult = await pool.query(`
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
        const r = await pool.query(
          `SELECT COUNT(*) AS cnt FROM entity_mentions WHERE COALESCE(verified, 0) = 0`,
        );
        return Number(r.rows[0]?.cnt ?? 0);
      }),
      safeCount('pendingClaims', async () => {
        const r = await pool.query(
          `SELECT COUNT(*) AS cnt FROM claim_triples WHERE COALESCE(verified, 0) = 0`,
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
