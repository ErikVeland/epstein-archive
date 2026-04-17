import { getApiPool } from '../db/connection.js';
import { logger } from './Logger.js';

export class IdentityFusionService {
  /**
   * Links flight passengers to canonical entities by name matching.
   */
  static async fuseFlightPassengers(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Flight-to-Entity fusion pass...');

    const query = `
      WITH matched_passengers AS (
        SELECT 
          fp.id as passenger_id,
          e.id as entity_id
        FROM flight_passengers fp
        JOIN entities e ON LOWER(TRIM(fp.passenger_name)) = LOWER(TRIM(e.full_name))
        WHERE fp.entity_id IS NULL
          AND e.canonical_id IS NULL -- Link to the root entity
      )
      UPDATE flight_passengers
      SET entity_id = mp.entity_id
      FROM matched_passengers mp
      WHERE flight_passengers.id = mp.passenger_id
      RETURNING flight_passengers.id;
    `;

    const result = await pool.query(query);
    const count = result.rowCount ?? 0;
    logger.info(`[CER] Linked ${count} flight passengers to canonical entities.`);
    return count;
  }

  /**
   * Links email accounts and participants to canonical entities.
   * Leverages harvested contact information in black_book_entries and existing entity_mentions.
   */
  static async fuseEmailParticipants(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Email-to-Entity fusion pass (optimized)...');

    // This query finds entity_mentions that look like emails
    // and matches them to the person_id in black_book_entries where that email was harvested.
    const query = `
      WITH email_resolutions AS (
        SELECT 
          em.id as mention_id,
          bbe.person_id as resolved_entity_id
        FROM entity_mentions em
        JOIN black_book_entries bbe ON (
          em.surface_text ILIKE '%' || bbe.email_addresses || '%'
          OR bbe.entry_text ILIKE '%' || em.surface_text || '%'
        )
        WHERE em.surface_text LIKE '%@%'
          AND bbe.person_id IS NOT NULL
          AND bbe.email_addresses IS NOT NULL
          AND em.entity_id IS NULL -- Only resolve unlinked mentions
      )
      UPDATE entity_mentions
      SET entity_id = er.resolved_entity_id,
          mention_context = COALESCE(mention_context, '') || ' (Auto-resolved via Black Book)'
      FROM email_resolutions er
      WHERE entity_mentions.id = er.mention_id
      RETURNING entity_mentions.id;
    `;

    const result = await pool.query(query);
    const count = result.rowCount ?? 0;
    logger.info(`[CER] Resolved ${count} email mentions to canonical entities.`);
    return count;
  }

  /**
   * Links media face clusters to entities if they share the same metadata names.
   */
  static async fuseFaceClusters(): Promise<number> {
    const pool = getApiPool();
    logger.info('[CER] Starting Face-to-Entity fusion pass...');

    const query = `
      WITH cluster_matches AS (
        SELECT 
          fc.id as cluster_id,
          COALESCE(e.canonical_id, e.id) as resolved_entity_id
        FROM face_clusters fc
        JOIN entities e ON LOWER(TRIM(fc.name)) = LOWER(TRIM(e.full_name))
        WHERE fc.entity_id IS NULL AND fc.name IS NOT NULL
      )
      UPDATE face_clusters
      SET entity_id = cm.resolved_entity_id
      FROM cluster_matches cm
      WHERE face_clusters.id = cm.cluster_id
      RETURNING face_clusters.id;
    `;

    const result = await pool.query(query);
    const count = result.rowCount ?? 0;
    logger.info(`[CER] Linked ${count} face clusters to canonical entities.`);
    return count;
  }
}
