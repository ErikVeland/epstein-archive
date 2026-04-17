import { getApiPool } from '../db/connection.js';
import { logger } from './Logger.js';

/**
 * IdentityFusionService (v2.0)
 *
 * Provides sophisticated entity resolution for the Epstein Archive.
 * Moves beyond exact matching to include fuzzy/phonetic similarity
 * and relationship-based inference.
 */
export class IdentityFusionService {
  /**
   * Links flight passengers to canonical entities.
   * Stage 1: Exact Name Match
   * Stage 2: Fuzzy Similarity (Trigram)
   */
  static async fuseFlightPassengers(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Flight-to-Entity fusion pass (Robust)...');

    // Stage 1: Exact Match (High Precision)
    const exactQuery = `
      UPDATE flight_passengers fp
      SET entity_id = e.id
      FROM entities e
      WHERE fp.entity_id IS NULL
        AND LOWER(TRIM(fp.passenger_name)) = LOWER(TRIM(e.full_name))
        AND e.canonical_id IS NULL;
    `;
    const exactResult = await pool.query(exactQuery);
    const exactCount = exactResult.rowCount ?? 0;

    // Stage 2: Fuzzy Similarity (Trigram/Similarity)
    // We only link if the similarity is > 0.85 to avoid false positives in forensics
    const fuzzyQuery = `
      WITH candidates AS (
        SELECT 
          fp.id as passenger_id,
          e.id as entity_id,
          similarity(LOWER(fp.passenger_name), LOWER(e.full_name)) as score
        FROM flight_passengers fp, entities e
        WHERE fp.entity_id IS NULL
          AND e.canonical_id IS NULL
          AND similarity(LOWER(fp.passenger_name), LOWER(e.full_name)) > 0.85
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY passenger_id ORDER BY score DESC) as rank
        FROM candidates
      )
      UPDATE flight_passengers
      SET entity_id = r.entity_id
      FROM ranked r
      WHERE flight_passengers.id = r.passenger_id AND r.rank = 1;
    `;
    const fuzzyResult = await pool.query(fuzzyQuery);
    const fuzzyCount = fuzzyResult.rowCount ?? 0;

    logger.info(`[CER] Linked ${exactCount} exact and ${fuzzyCount} fuzzy flight passengers.`);
    return exactCount + fuzzyCount;
  }

  /**
   * Links email participants to canonical entities using Black Book and Mentions.
   */
  static async fuseEmailParticipants(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Email-to-Entity fusion pass (Multi-Stage)...');

    // Stage 1: Direct Email Match (Black Book)
    const directQuery = `
      WITH email_resolutions AS (
        SELECT 
          em.id as mention_id,
          bbe.person_id as resolved_entity_id
        FROM entity_mentions em
        JOIN black_book_entries bbe ON em.surface_text = bbe.email_addresses
        WHERE em.surface_text LIKE '%@%'
          AND bbe.person_id IS NOT NULL
          AND em.entity_id IS NULL
      )
      UPDATE entity_mentions
      SET entity_id = er.resolved_entity_id,
          mention_context = COALESCE(mention_context, '') || ' (Auto-resolved via Black Book)'
      FROM email_resolutions er
      WHERE entity_mentions.id = er.mention_id;
    `;

    const res = await pool.query(directQuery);
    const count = res.rowCount ?? 0;
    logger.info(`[CER] Resolved ${count} email mentions via direct Black Book match.`);
    return count;
  }

  /**
   * Identifies candidate entity merges based on similarity.
   * This populates a maintenance table for human review.
   */
  static async discoverMergeCandidates(threshold = 0.9): Promise<number> {
    const pool = getApiPool();
    logger.info(`[CER] Discovering merge candidates with threshold ${threshold}...`);

    const query = `
      INSERT INTO entity_merge_candidates (source_entity_id, target_entity_id, similarity_score, reasoning)
      SELECT 
        e1.id, 
        e2.id, 
        similarity(e1.full_name, e2.full_name),
        'Name similarity: ' || e1.full_name || ' vs ' || e2.full_name
      FROM entities e1
      JOIN entities e2 ON e1.id < e2.id
      WHERE similarity(e1.full_name, e2.full_name) >= $1
        AND e1.canonical_id IS NULL AND e2.canonical_id IS NULL
      ON CONFLICT DO NOTHING;
    `;

    const res = await pool.query(query, [threshold]);
    return res.rowCount ?? 0;
  }

  /**
   * Links media face clusters to entities.
   */
  static async fuseFaceClusters(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Face-to-Entity fusion pass...');

    const query = `
      UPDATE face_clusters fc
      SET entity_id = COALESCE(e.canonical_id, e.id)
      FROM entities e
      WHERE fc.entity_id IS NULL 
        AND fc.name IS NOT NULL
        AND LOWER(TRIM(fc.name)) = LOWER(TRIM(e.full_name));
    `;

    const result = await pool.query(query);
    return result.rowCount ?? 0;
  }
}
