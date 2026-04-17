import { getApiPool } from '../db/connection.js';
import { logger } from './Logger.js';

export interface ForensicSignal {
  id?: string;
  signal_type: string;
  confidence: number;
  risk_score: number;
  source_source: string;
  source_ref_id: string;
  entity_ids: number[];
  metadata_json: Record<string, any>;
  status?: string;
  created_at?: Date;
}

export class ForensicSignalService {
  /**
   * Scans flight logs to find entities that traveled together.
   */
  static async extractCoTravelSignals(): Promise<number> {
    const pool = getApiPool();
    logger.info('[ForensicSignal] Extracting Co-Travel signals from flights...');

    const query = `
      WITH pairings AS (
        SELECT 
          f1.flight_id,
          f1.entity_id as entity_a,
          f2.entity_id as entity_b,
          fl.date,
          fl.departure_airport,
          fl.arrival_airport
        FROM flight_passengers f1
        JOIN flight_passengers f2 ON f1.flight_id = f2.flight_id AND f1.entity_id < f2.entity_id
        JOIN flights fl ON f1.flight_id = fl.id
        WHERE f1.entity_id IS NOT NULL AND f2.entity_id IS NOT NULL
      )
      INSERT INTO forensic_signals (
        signal_type, confidence, risk_score, source_source, source_ref_id, entity_ids, metadata_json
      )
      SELECT 
        'CO_TRAVEL', 
        1.0, 
        0.5, 
        'flights', 
        flight_id::text, 
        ARRAY[entity_a::bigint, entity_b::bigint],
        jsonb_build_object(
          'date', date,
          'departure', departure_airport,
          'arrival', arrival_airport
        )
      FROM pairings
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    const result = await pool.query(query);
    const count = result.rowCount ?? 0;
    logger.info(`[ForensicSignal] Generated ${count} new Co-Travel signals.`);
    return count;
  }

  /**
   * Scans media items to find entities appearing in the same photos.
   */
  static async extractCoPresenceSignals(): Promise<number> {
    const pool = getApiPool();
    logger.info('[ForensicSignal] Extracting Co-Presence signals from media...');

    const query = `
      WITH pairings AS (
        SELECT 
          m1.media_item_id,
          m1.entity_id as entity_a,
          m2.entity_id as entity_b,
          mi.red_flag_rating
        FROM media_item_people m1
        JOIN media_item_people m2 ON m1.media_item_id = m2.media_item_id AND m1.entity_id < m2.entity_id
        JOIN media_items mi ON m1.media_item_id::text = mi.id
        WHERE m1.entity_id IS NOT NULL AND m2.entity_id IS NOT NULL
      )
      INSERT INTO forensic_signals (
        signal_type, confidence, risk_score, source_source, source_ref_id, entity_ids, metadata_json
      )
      SELECT 
        'CO_PRESENCE', 
        0.9, 
        red_flag_rating / 10.0, 
        'media_items', 
        media_item_id, 
        ARRAY[entity_a::bigint, entity_b::bigint],
        jsonb_build_object('source', 'facial_recognition')
      FROM pairings
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;

    const result = await pool.query(query);
    const count = result.rowCount ?? 0;
    logger.info(`[ForensicSignal] Generated ${count} new Co-Presence signals.`);
    return count;
  }

  /**
   * Consolidates high-confidence signals into formal relationships.
   */
  static async promoteHighConfidenceSignals(threshold = 0.8): Promise<number> {
    const pool = getApiPool();
    logger.info(
      `[ForensicSignal] Promoting signals with confidence >= ${threshold} to relationships...`,
    );

    // This query aggregates multiple signals between the same two entities
    // and creates/updates a record in entity_relationships.
    const query = `
      WITH aggregated_signals AS (
        SELECT 
          entity_ids[1] as source_id,
          entity_ids[2] as target_id,
          signal_type,
          COUNT(*) as occurrence_count,
          AVG(confidence) as avg_confidence,
          AVG(risk_score) as avg_risk,
          array_agg(id) as signal_ids
        FROM forensic_signals
        WHERE status = 'pending_review' AND confidence >= $1
        GROUP BY entity_ids[1], entity_ids[2], signal_type
      )
      INSERT INTO entity_relationships (
        source_entity_id, 
        target_entity_id, 
        relationship_type, 
        proximity_score, 
        confidence,
        signal_ids
      )
      SELECT 
        source_id, 
        target_id, 
        signal_type, 
        LEAST(occurrence_count * 20, 100), 
        avg_confidence,
        signal_ids
      FROM aggregated_signals
      ON CONFLICT (source_entity_id, target_entity_id, relationship_type) 
      DO UPDATE SET 
        proximity_score = LEAST(entity_relationships.proximity_score + EXCLUDED.proximity_score, 100),
        confidence = (entity_relationships.confidence + EXCLUDED.confidence) / 2.0,
        signal_ids = entity_relationships.signal_ids || EXCLUDED.signal_ids
      RETURNING *;
    `;

    const relRes = await pool.query(query, [threshold]);

    // Mark signals as promoted
    if (relRes.rowCount && relRes.rowCount > 0) {
      const allSignalIds = relRes.rows.flatMap((r) => r.signal_ids);
      await pool.query("UPDATE forensic_signals SET status = 'promoted' WHERE id = ANY($1)", [
        allSignalIds,
      ]);
    }

    const count = relRes.rowCount ?? 0;
    logger.info(`[ForensicSignal] Created/Updated ${count} formal relationships.`);
    return count;
  }
}
