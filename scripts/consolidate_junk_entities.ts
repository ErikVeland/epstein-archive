import * as dotenv from 'dotenv';
import * as pg from 'pg';
import { isJunkEntity } from './filters/entityFilters.js';
import { resolveVip } from './filters/vipRules.js';

dotenv.config();

const ALL_ENTITIES_SQL = `
  SELECT id, full_name, mentions, evidence_count, aliases, type, entity_type
  FROM entities
  ORDER BY id ASC
`;

const WRAPPER_PREFIXES = [
  'dear',
  'dearest',
  'dears',
  'deare',
  'defendant',
  'defendants',
  'plaintiff',
  'plaintiffs',
  'watch',
  'watching',
  'watched',
  'philanthropy',
] as const;

const WRAPPER_SUFFIXES = ['to', 'from'] as const;

const EXPLICIT_JUNK_NAME_RE =
  /^(?:dear|dearest|dears|deare|defendant|defendants|plaintiff|plaintiffs|watch|watching|watched|philanthropy)\b|\b(?:to|from)\s*$|housekeeper/i;

type EntityRow = {
  id: number;
  full_name: string;
  mentions: number | null;
  evidence_count: number | null;
  aliases: string | null;
  type: string | null;
  entity_type: string | null;
};

function normalizeLookupValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildLookupIndex(rows: EntityRow[]): Map<string, number[]> {
  const index = new Map<string, number[]>();

  for (const row of rows) {
    const key = normalizeLookupValue(row.full_name);
    const ids = index.get(key) || [];
    ids.push(row.id);
    index.set(key, ids);
  }

  return index;
}

function unwrapCandidates(name: string): string[] {
  const seen = new Set<string>();
  const queue = [normalizeLookupValue(name)];

  while (queue.length > 0) {
    const current = normalizeLookupValue(queue.shift() || '');
    if (!current || seen.has(current)) continue;
    seen.add(current);

    for (const prefix of WRAPPER_PREFIXES) {
      if (current.startsWith(`${prefix} `)) {
        queue.push(current.slice(prefix.length + 1));
      }
    }

    for (const suffix of WRAPPER_SUFFIXES) {
      if (current.endsWith(` ${suffix}`)) {
        queue.push(current.slice(0, -(suffix.length + 1)));
      }
    }
  }

  return Array.from(seen);
}

function shouldProcessEntity(name: string): boolean {
  const vipCanonicalName = resolveVip(name);
  if (EXPLICIT_JUNK_NAME_RE.test(name) || isJunkEntity(name)) return true;
  return vipCanonicalName !== null && vipCanonicalName !== name;
}

function deriveCanonicalId(
  source: EntityRow,
  rowsById: Map<number, EntityRow>,
  lookupIndex: Map<string, number[]>,
): number | null {
  const vipCanonicalName = resolveVip(source.full_name);
  if (vipCanonicalName && vipCanonicalName !== source.full_name) {
    const ids = lookupIndex.get(normalizeLookupValue(vipCanonicalName)) || [];
    const targetId = ids.find((id) => id !== source.id);
    if (targetId) {
      const target = rowsById.get(targetId);
      const targetType = target?.type || target?.entity_type || '';
      if (targetType === 'Person' || targetType === 'Organization') {
        return targetId;
      }
    }
  }

  for (const candidate of unwrapCandidates(source.full_name)) {
    if (!candidate || candidate === normalizeLookupValue(source.full_name)) continue;
    if (candidate.split(' ').filter(Boolean).length < 2) continue;
    const ids = Array.from(new Set(lookupIndex.get(candidate) || [])).filter(
      (id) => id !== source.id && rowsById.has(id),
    );
    if (ids.length !== 1) continue;
    const target = rowsById.get(ids[0]);
    if (!target) continue;
    const targetType = target.type || target.entity_type || '';
    if (targetType !== 'Person' && targetType !== 'Organization') continue;
    if (normalizeLookupValue(target.full_name) === candidate) return target.id;
    if (resolveVip(target.full_name) || !isJunkEntity(target.full_name)) return target.id;
  }

  return null;
}

async function mergeEntity(
  client: pg.PoolClient,
  source: EntityRow,
  targetId: number,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(`UPDATE entities SET canonical_id = $2 WHERE canonical_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(`UPDATE black_book_entries SET person_id = $2 WHERE person_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(
      `UPDATE claim_triples SET subject_entity_id = $2 WHERE subject_entity_id = $1`,
      [source.id, targetId],
    );
    await client.query(
      `UPDATE claim_triples SET object_entity_id = $2 WHERE object_entity_id = $1`,
      [source.id, targetId],
    );

    await client.query(
      `
      DELETE FROM entity_evidence_types src
      USING entity_evidence_types dst
      WHERE src.entity_id = $1
        AND dst.entity_id = $2
        AND dst.evidence_type_id = src.evidence_type_id
      `,
      [source.id, targetId],
    );
    await client.query(`UPDATE entity_evidence_types SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(`UPDATE entity_mentions SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(
      `
      DELETE FROM evidence_entity src
      USING evidence_entity dst
      WHERE src.entity_id = $1
        AND dst.entity_id = $2
        AND dst.evidence_id = src.evidence_id
      `,
      [source.id, targetId],
    );
    await client.query(`UPDATE evidence_entity SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(`UPDATE face_clusters SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(`UPDATE flight_passengers SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(`UPDATE media_items SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(
      `
      DELETE FROM media_item_people src
      USING media_item_people dst
      WHERE src.entity_id = $1
        AND dst.entity_id = $2
        AND dst.media_item_id = src.media_item_id
      `,
      [source.id, targetId],
    );
    await client.query(`UPDATE media_item_people SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(`UPDATE relations SET subject_entity_id = $2 WHERE subject_entity_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(`UPDATE relations SET object_entity_id = $2 WHERE object_entity_id = $1`, [
      source.id,
      targetId,
    ]);
    await client.query(
      `UPDATE resolution_candidates SET left_entity_id = $2 WHERE left_entity_id = $1`,
      [source.id, targetId],
    );
    await client.query(
      `UPDATE resolution_candidates SET right_entity_id = $2 WHERE right_entity_id = $1`,
      [source.id, targetId],
    );
    await client.query(`UPDATE timeline_events SET entity_id = $2 WHERE entity_id = $1`, [
      source.id,
      targetId,
    ]);

    await client.query(
      `
      INSERT INTO entity_relationships (
        source_entity_id,
        target_entity_id,
        relationship_type,
        strength,
        confidence,
        proximity_score,
        risk_score,
        first_seen_at,
        last_seen_at,
        ingest_run_id,
        evidence_pack_json,
        created_at,
        updated_at,
        was_agentic
      )
      SELECT
        CASE WHEN source_entity_id = $1 THEN $2 ELSE source_entity_id END AS source_entity_id,
        CASE WHEN target_entity_id = $1 THEN $2 ELSE target_entity_id END AS target_entity_id,
        relationship_type,
        MAX(strength) AS strength,
        MAX(confidence) AS confidence,
        MAX(proximity_score) AS proximity_score,
        MAX(risk_score) AS risk_score,
        MIN(first_seen_at) AS first_seen_at,
        MAX(last_seen_at) AS last_seen_at,
        (ARRAY_REMOVE(ARRAY_AGG(ingest_run_id), NULL))[1] AS ingest_run_id,
        (ARRAY_REMOVE(ARRAY_AGG(evidence_pack_json), NULL))[1] AS evidence_pack_json,
        MIN(created_at) AS created_at,
        MAX(updated_at) AS updated_at,
        MAX(was_agentic) AS was_agentic
      FROM entity_relationships
      WHERE source_entity_id = $1 OR target_entity_id = $1
      GROUP BY 1, 2, 3
      HAVING CASE WHEN source_entity_id = $1 THEN $2 ELSE source_entity_id END
           <> CASE WHEN target_entity_id = $1 THEN $2 ELSE target_entity_id END
      ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO UPDATE
      SET strength = GREATEST(entity_relationships.strength, EXCLUDED.strength),
          confidence = GREATEST(entity_relationships.confidence, EXCLUDED.confidence),
          proximity_score = GREATEST(entity_relationships.proximity_score, EXCLUDED.proximity_score),
          risk_score = GREATEST(entity_relationships.risk_score, EXCLUDED.risk_score),
          first_seen_at = LEAST(entity_relationships.first_seen_at, EXCLUDED.first_seen_at),
          last_seen_at = GREATEST(entity_relationships.last_seen_at, EXCLUDED.last_seen_at),
          updated_at = GREATEST(entity_relationships.updated_at, EXCLUDED.updated_at),
          was_agentic = GREATEST(entity_relationships.was_agentic, EXCLUDED.was_agentic)
      `,
      [source.id, targetId],
    );
    await client.query(
      `DELETE FROM entity_relationships WHERE source_entity_id = $1 OR target_entity_id = $1`,
      [source.id],
    );

    await client.query(
      `
      INSERT INTO entity_adjacency (entity_id, neighbor_id, weight, bridge_score, relationship_types)
      SELECT
        CASE WHEN entity_id = $1 THEN $2 ELSE entity_id END AS entity_id,
        CASE WHEN neighbor_id = $1 THEN $2 ELSE neighbor_id END AS neighbor_id,
        MAX(weight) AS weight,
        MAX(bridge_score) AS bridge_score,
        (ARRAY_REMOVE(ARRAY_AGG(relationship_types), NULL))[1] AS relationship_types
      FROM entity_adjacency
      WHERE entity_id = $1 OR neighbor_id = $1
      GROUP BY 1, 2
      HAVING CASE WHEN entity_id = $1 THEN $2 ELSE entity_id END
           <> CASE WHEN neighbor_id = $1 THEN $2 ELSE neighbor_id END
      ON CONFLICT (entity_id, neighbor_id) DO UPDATE
      SET weight = GREATEST(entity_adjacency.weight, EXCLUDED.weight),
          bridge_score = GREATEST(entity_adjacency.bridge_score, EXCLUDED.bridge_score)
      `,
      [source.id, targetId],
    );
    await client.query(`DELETE FROM entity_adjacency WHERE entity_id = $1 OR neighbor_id = $1`, [
      source.id,
    ]);

    await client.query(
      `
      UPDATE entities
      SET evidence_count = COALESCE(evidence_count, 0) + COALESCE($2, 0),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [targetId, source.evidence_count ?? 0],
    );

    await client.query(`DELETE FROM entities WHERE id = $1`, [source.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function deleteEntity(client: pg.PoolClient, source: EntityRow): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(`DELETE FROM entities WHERE id = $1`, [source.id]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function recalcMentions(client: pg.PoolClient): Promise<void> {
  await client.query(`
    UPDATE entities e
    SET mentions = COALESCE(m.cnt, 0),
        updated_at = CURRENT_TIMESTAMP
    FROM (
      SELECT entity_id, COUNT(*)::int AS cnt
      FROM entity_mentions
      GROUP BY entity_id
    ) m
    WHERE e.id = m.entity_id
  `);
  await client.query(`
    UPDATE entities
    SET mentions = 0,
        updated_at = CURRENT_TIMESTAMP
    WHERE id NOT IN (SELECT DISTINCT entity_id FROM entity_mentions)
      AND mentions <> 0
  `);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    const allEntities = (await client.query<EntityRow>(ALL_ENTITIES_SQL)).rows;
    const rowsById = new Map(allEntities.map((row) => [row.id, row]));
    const lookupIndex = buildLookupIndex(allEntities);
    const candidates = allEntities.filter((row) => shouldProcessEntity(row.full_name));
    let merged = 0;
    let deleted = 0;

    for (const source of candidates) {
      const targetId = deriveCanonicalId(source, rowsById, lookupIndex);
      if (targetId && targetId !== source.id) {
        const target = rowsById.get(targetId);
        await mergeEntity(client, source, targetId);
        rowsById.delete(source.id);
        merged += 1;
        console.log(
          `merged ${source.id} "${source.full_name}" -> ${target?.full_name || targetId}`,
        );
        continue;
      }

      await deleteEntity(client, source);
      rowsById.delete(source.id);
      deleted += 1;
      console.log(`deleted ${source.id} "${source.full_name}"`);
    }

    await recalcMentions(client);

    console.log(`done: merged=${merged} deleted=${deleted}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
