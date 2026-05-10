import { relationshipsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import { resolveCanonicalEntityId } from '../utils/id_utils.js';
import {
  IGetRelationshipsResult,
  IGetNeighborsCachedResult,
} from '@epstein/db/src/queries/__generated__/relationships.js';

function normalizeType(rawType: string): string {
  if (!rawType) return 'person';
  const lower = rawType.toLowerCase().trim();

  if (lower === 'location' || lower === 'place' || lower === 'city' || lower === 'country')
    return 'location';
  if (lower === 'organization' || lower === 'company' || lower === 'corporation')
    return 'organization';
  if (lower === 'financial' || lower === 'bank' || lower === 'account') return 'financial';
  if (lower === 'person' || lower === 'individual') return 'person';

  if (
    lower.includes('org') ||
    lower.includes('company') ||
    lower.includes('llc') ||
    lower.includes('corp')
  )
    return 'organization';
  if (
    lower.includes('island') ||
    lower.includes('residence') ||
    lower.includes('house') ||
    lower.includes('apt') ||
    lower.includes('hong') ||
    lower.includes('york') ||
    lower.includes('beach')
  )
    return 'location';
  if (lower.includes('bank') || lower.includes('fund') || lower.includes('trust'))
    return 'financial';
  if (lower.includes('doc') || lower.includes('log') || lower.includes('file')) return 'document';
  if (lower.includes('comm') || lower.includes('email') || lower.includes('phone'))
    return 'communication';
  if (lower.includes('cluster')) return 'cluster';

  return 'person';
}

export const relationshipsRepository = {
  getRelationships: async (
    entityId: number | string,
    filters: {
      minWeight?: number;
      minConfidence?: number;
      from?: string;
      to?: string;
      includeBreakdown?: boolean;
      limit?: number;
    } = {},
  ) => {
    const pool = getApiPool();
    const { canonicalId } = await resolveCanonicalEntityId(entityId, pool);

    const rowsRes = await pool.query(
      `SELECT 
         source_entity_id as "sourceId",
         target_entity_id as "targetId",
         relationship_type as "relationshipType",
         proximity_score as "proximityScore",
         risk_score as "riskScore",
         confidence as "confidence",
         evidence_pack_json as "metadataJson"
       FROM entity_relationships
       WHERE (source_entity_id = $1::bigint OR target_entity_id = $1::bigint)
         AND ($2::float IS NULL OR proximity_score >= $2)
         AND ($3::float IS NULL OR confidence >= $3)
       ORDER BY proximity_score DESC
       LIMIT $4::int`,
      [
        Number(canonicalId),
        filters.minWeight ?? null,
        filters.minConfidence ?? null,
        Math.max(1, Math.min(500, Number(filters.limit ?? 50))),
      ],
    );
    const rows = rowsRes.rows as IGetRelationshipsResult[];

    // Batch-resolve entity names for all source/target IDs
    const nameById = new Map<number, string>();
    if (rows.length > 0) {
      const allIds = Array.from(
        new Set(rows.flatMap((r) => [Number(r.sourceId), Number(r.targetId)])),
      );
      const nameRows = await pool.query(
        'SELECT id, full_name FROM entities WHERE id = ANY($1::bigint[])',
        [allIds],
      );
      for (const row of nameRows.rows) {
        nameById.set(Number(row.id), String(row.full_name));
      }
    }

    return {
      canonicalId: Number(canonicalId),
      relationships: rows.map((r: IGetRelationshipsResult) => ({
        source_id: Number(r.sourceId),
        target_id: Number(r.targetId),
        source_entity_name: nameById.get(Number(r.sourceId)),
        target_entity_name: nameById.get(Number(r.targetId)),
        relationship_type: r.relationshipType,
        proximity_score: r.proximityScore,
        risk_score: Number(r.riskScore),
        confidence: r.confidence,
        metadata_json: filters.includeBreakdown
          ? r.metadataJson
            ? JSON.parse(r.metadataJson as string)
            : null
          : undefined,
        disclaimer:
          'This reflects data connections and evidence categories, not a legal determination.',
      })),
    };
  },

  /**
   * REBUILD ADJACENCY CACHE: Precomputes entity-to-entity neighbors.
   * Accelerates high-depth graph traverses.
   */
  rebuildAdjacencyCache: async () => {
    logger.info('⏳ [GRAPH] Rebuilding adjacency cache...');

    // Use a real pg client transaction; the @epstein/db helper requires explicit pool/client.
    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM entity_adjacency');
      await relationshipsQueries.rebuildAdjacencyCache.run(
        undefined,
        client as unknown as Parameters<typeof relationshipsQueries.rebuildAdjacencyCache.run>[1],
      );
      await client.query(
        'UPDATE graph_cache_state SET last_rebuild = CURRENT_TIMESTAMP, is_dirty = 0 WHERE id = 1',
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    logger.info('✅ [GRAPH] Adjacency cache rebuilt successfully.');
  },

  getGraphSlice: async (
    entityId: number | string,
    depth: number = 2,
    _filters: { from?: string; to?: string } = {},
  ) => {
    const MAX_DEPTH = 3;
    const MAX_QUEUE_ITERATIONS = 500;
    const safeDepth = Math.min(depth, MAX_DEPTH);

    const pool = getApiPool();
    const resolution = await resolveCanonicalEntityId(entityId, pool);
    if (!resolution.found) return { nodes: [], edges: [] };
    const startId = resolution.canonicalId;
    const visited = new Set<number>();
    const queue: { id: number; d: number; bridge_score?: number }[] = [
      { id: Number(startId), d: 0, bridge_score: 0 },
    ];
    const edges: Array<{
      source_id: number;
      target_id: number;
      relationship_type: string;
      relationship_types: string[];
      proximity_score: number | null;
      risk_score: number;
      confidence: number;
    }> = [];

    // Only process if queue is not empty
    let iterations = 0;
    while (queue.length > 0 && iterations < MAX_QUEUE_ITERATIONS) {
      iterations++;
      const item = queue.shift();
      if (!item) break;
      const { id, d } = item;

      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      if (d >= safeDepth) continue;

      let rels = await relationshipsQueries.getNeighborsCached.run(
        { entityId: id, limit: 100 },
        pool,
      );

      if (!rels || rels.length === 0) {
        // Fallback to direct query from entity_relationships table if adjacency cache is empty
        const directRes = await pool.query(
          `SELECT 
             CASE WHEN source_entity_id = $1::bigint THEN target_entity_id ELSE source_entity_id END AS "targetId",
             relationship_type AS "relationshipTypes",
             proximity_score AS "proximityScore",
             proximity_score AS "bridgeScore"
           FROM entity_relationships
           WHERE source_entity_id = $1::bigint OR target_entity_id = $1::bigint
           ORDER BY proximity_score DESC
           LIMIT 100`,
          [id],
        );
        rels = directRes.rows as IGetNeighborsCachedResult[];
      }

      for (const r of rels as IGetNeighborsCachedResult[]) {
        const targetId = Number(r.targetId);
        const relationshipTypes = String(r.relationshipTypes || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        edges.push({
          source_id: id,
          target_id: targetId,
          relationship_type:
            relationshipTypes.length > 0 ? relationshipTypes.join(', ') : 'connected',
          relationship_types: relationshipTypes,
          proximity_score: r.proximityScore,
          risk_score: 0,
          confidence: 1,
        });

        if (!visited.has(targetId) && d + 1 <= safeDepth) {
          queue.push({ id: targetId, d: d + 1, bridge_score: r.bridgeScore || 0 });
          // Priority: lower depth first, then higher bridge score
          queue.sort(
            (a, b) => a.d - b.d || Number(b.bridge_score || 0) - Number(a.bridge_score || 0),
          );
        }
      }
    }

    if (visited.size === 0) return { nodes: [], edges };

    const canonicalIds = Array.from(visited);
    const detailsRes = await pool.query(
      `SELECT DISTINCT ON (COALESCE(canonical_id, id))
         COALESCE(canonical_id, id) AS id,
         full_name AS "fullName",
         primary_role AS "primaryRole",
         red_flag_rating AS "redFlagRating",
         entity_type AS "type",
         is_vip AS "isVip"
       FROM entities
       WHERE COALESCE(canonical_id, id) = ANY($1::bigint[])
       ORDER BY COALESCE(canonical_id, id), is_vip DESC, red_flag_rating DESC, id ASC`,
      [canonicalIds],
    );

    const photosRes = await pool.query(
      `WITH ranked AS (
         SELECT
           e.canonical_id AS cid,
           mi.id AS photo_id,
           ROW_NUMBER() OVER (
             PARTITION BY e.canonical_id
             ORDER BY mi.red_flag_rating DESC NULLS LAST, mi.id DESC
           ) AS rn
         FROM entities e
          JOIN media_item_people mip ON mip.entity_id = e.id
          JOIN media_items mi ON mi.id::bigint = mip.media_item_id
          WHERE e.canonical_id = ANY($1::bigint[])
            AND (mi.file_type LIKE 'image/%' OR mi.file_type IS NULL)
       )
       SELECT cid, photo_id
       FROM ranked
       WHERE rn = 1`,
      [canonicalIds],
    );

    const photoByCanonicalId = new Map<number, number>(
      photosRes.rows.map((row) => [Number(row.cid), Number(row.photo_id)]),
    );

    const nodesRaw = detailsRes.rows.map((entity) => {
      const type = normalizeType(entity.primaryRole || '');
      return {
        id: String(entity.id),
        label: String(entity.fullName || 'Unknown'),
        type,
        risk: Number(entity.redFlagRating || 0),
        image: photoByCanonicalId.has(Number(entity.id))
          ? `/api/media/images/${photoByCanonicalId.get(Number(entity.id))}/thumbnail`
          : undefined,
        isEgo: Number(entity.id) === Number(entityId),
        connectionCount: 0, // Requires additional join or compute if needed strictly
      };
    });

    // Deduplicate logic
    const uniqueMap = new Map<string, (typeof nodesRaw)[0]>();
    const egoIdStr = String(entityId);

    nodesRaw.forEach((node) => {
      const key = node.label.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, node);
      } else {
        const existing = uniqueMap.get(key)!;
        if (node.id === egoIdStr) {
          uniqueMap.set(key, node);
        } else if (existing.id !== egoIdStr && node.risk > existing.risk) {
          uniqueMap.set(key, node);
        }
      }
    });

    const nodes = Array.from(uniqueMap.values());
    const validIds = new Set(nodes.map((n) => n.id));

    // Batch lookup for distinct shared document count for all resolved edges
    const docCountByPair = new Map<string, number>();
    try {
      const uniquePairs = Array.from(
        new Map(
          edges.map((e) => {
            // Sort IDs for stable lookup key across permutations
            const key = [e.source_id, e.target_id].sort().join('-');
            return [key, [e.source_id, e.target_id]];
          }),
        ).values(),
      );

      if (uniquePairs.length > 0) {
        const pairRes = await pool.query(
          `
          WITH input_pairs(s, t) AS (
            SELECT (value->>0)::bigint, (value->>1)::bigint
            FROM jsonb_array_elements($1::jsonb)
          )
          SELECT p.s, p.t, COUNT(DISTINCT em1.document_id)::int as count
          FROM input_pairs p
          JOIN entity_mentions em1 ON em1.entity_id = p.s
          JOIN entity_mentions em2 ON em2.entity_id = p.t AND em2.document_id = em1.document_id
          GROUP BY p.s, p.t
          `,
          [JSON.stringify(uniquePairs)],
        );
        for (const row of pairRes.rows) {
          const key = [Number(row.s), Number(row.t)].sort().join('-');
          docCountByPair.set(key, Number(row.count || 0));
        }
      }
    } catch (err) {
      logger.warn({ err }, '[GRAPH] Failed fetching document overlap counts');
    }

    // Calculate weight and Remap edges
    const finalEdges = edges
      .map((e) => {
        const docCount = docCountByPair.get([e.source_id, e.target_id].sort().join('-')) || 0;
        const p = Math.min(100, Math.max(0, e.proximity_score || 0));
        const c = Math.min(1.0, Math.max(0, e.confidence || 1));
        const d = Math.min(20, Math.max(0, docCount));
        const score = Math.min(100, Math.round(p * 0.4 + c * 30 + d * 5));

        return {
          id: `${e.source_id}-${e.target_id}`,
          source: String(e.source_id),
          target: String(e.target_id),
          type: String(e.relationship_type || 'related_to'),
          weight: score,
          confidence: c,
          docCount,
        };
      })
      .filter((e) => validIds.has(e.source) && validIds.has(e.target) && e.source !== e.target);

    return { nodes, edges: finalEdges };
  },

  getStats: async () => {
    const statsRows = await relationshipsQueries.getRelationshipStats.run(undefined, getApiPool());
    const totals = statsRows[0];

    const topRows = await relationshipsQueries.getTopEntitiesByRelationshipCount.run(
      { limit: 10 },
      getApiPool(),
    );

    return {
      total_relationships: Number(totals?.totalRelationships || 0),
      avg_proximity_score: Number((totals?.avgProximityScore || 0).toFixed(2)),
      avg_risk_score: Number((totals?.avgRiskScore || 0).toFixed(2)),
      avg_confidence: Number((totals?.avgConfidence || 0).toFixed(2)),
      top_entities_by_relationship_count: topRows.map((r) => ({
        entity_id: Number(r.entityId),
        count: Number(r.count),
      })),
    };
  },

  getEntitySummarySource: async (entityId: number | string, topN: number = 10) => {
    const resolution = await resolveCanonicalEntityId(entityId);
    if (!resolution.found) return null;
    const canonicalId = resolution.canonicalId;

    const entityRows = await relationshipsQueries.getEntityDetailsAggregated.run(
      { canonicalId: String(canonicalId!) },
      getApiPool(),
    );
    const entity = entityRows[0];

    if (!entity) return null;

    // Use consolidated SQL queries for relationships
    const relationships = await relationshipsQueries.getRelationships.run(
      { entityId: Number(canonicalId), minWeight: 0, minConfidence: 0 },
      getApiPool(),
    );

    // Docs search is still tricky, but we can use searchQueries if available
    // For now, keep it simple or use a placeholder if not critical
    // Actually, I'll use the existing search functionality if possible

    return {
      entity: {
        id: Number(entity.id),
        full_name: entity.fullName,
        primary_role: entity.primaryRole,
      },
      relationships: (relationships as IGetRelationshipsResult[]).slice(0, topN).map((r) => ({
        id: Number(r.sourceId),
        target_id: Number(r.targetId),
        proximity: r.proximityScore,
        risk: Number(r.riskScore),
        confidence: r.confidence,
        type: r.relationshipType,
      })),
      documents: [], // To be populated by a separate documents search call if needed
    };
  },

  async findShortestPath(
    sourceId: number | string,
    targetId: number | string,
  ): Promise<Array<{ id: string; label: string; type: string }> | null> {
    const pool = getApiPool();
    const startRes = await resolveCanonicalEntityId(sourceId, pool);
    const endRes = await resolveCanonicalEntityId(targetId, pool);
    if (!startRes.found || !endRes.found) return null;

    const start = Number(startRes.canonicalId);
    const end = Number(endRes.canonicalId);

    if (start === end) {
      const entityRows = await pool.query(
        'SELECT id, full_name, entity_type FROM entities WHERE id = $1',
        [start],
      );
      const node = entityRows.rows[0];
      return [
        {
          id: String(start),
          label: String(node?.full_name || 'Start'),
          type: String(node?.entity_type || 'person'),
        },
      ];
    }

    const queue: number[][] = [[start]];
    const visited = new Set<number>([start]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const node = path[path.length - 1];

      if (node === end) {
        const nameRows = await pool.query(
          'SELECT id, full_name, entity_type FROM entities WHERE id = ANY($1::bigint[])',
          [path],
        );
        const nameMap = new Map<number, { label: string; type: string }>();
        for (const row of nameRows.rows) {
          nameMap.set(Number(row.id), {
            label: String(row.full_name),
            type: String(row.entity_type),
          });
        }
        return path.map((id) => ({
          id: String(id),
          label: nameMap.get(id)?.label || 'Entity',
          type: nameMap.get(id)?.type || 'person',
        }));
      }

      const neighborsRes = await pool.query(
        `
        SELECT DISTINCT CASE WHEN source_entity_id = $1::bigint THEN target_entity_id ELSE source_entity_id END AS neighbor
        FROM entity_relationships
        WHERE source_entity_id = $1::bigint OR target_entity_id = $1::bigint
        LIMIT 50
        `,
        [node],
      );

      for (const row of neighborsRes.rows) {
        const neighbor = Number(row.neighbor);
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }

    return null;
  },

  async resolveEntity(id: string): Promise<{ id: string; name: string; type: string } | null> {
    const pool = getApiPool();
    const res = await pool.query(
      `SELECT id::text, full_name as name, entity_type as type FROM entities WHERE id = $1 LIMIT 1`,
      [id],
    );
    return res.rows[0] ?? null;
  },

  async resolveShortestPath(sourceId: string, targetId: string): Promise<any | null> {
    const pool = getApiPool();
    try {
      const res = await pool.query(
        `
        WITH RECURSIVE path(node_id, path, depth) AS (
          SELECT $1::bigint, ARRAY[$1::bigint], 0
          UNION ALL
          SELECT
            CASE WHEN r.source_entity_id = p.node_id THEN r.target_entity_id ELSE r.source_entity_id END,
            p.path || CASE WHEN r.source_entity_id = p.node_id THEN r.target_entity_id ELSE r.source_entity_id END,
            p.depth + 1
          FROM path p
          JOIN entity_relationships r ON (r.source_entity_id = p.node_id OR r.target_entity_id = p.node_id)
          WHERE NOT (CASE WHEN r.source_entity_id = p.node_id THEN r.target_entity_id ELSE r.source_entity_id END = ANY(p.path))
            AND p.depth < 7
        )
        SELECT path, depth FROM path WHERE node_id = $2::bigint ORDER BY depth ASC LIMIT 1
        `,
        [sourceId, targetId],
      );

      if (!res.rows[0]) return null;

      const { path: nodeIds, depth } = res.rows[0] as { path: (string | number)[]; depth: number };
      const nodeRes = await pool.query(
        `SELECT id::text, full_name as name, entity_type as type FROM entities WHERE id = ANY($1::bigint[])`,
        [nodeIds],
      );
      const nodeMap = new Map(
        nodeRes.rows.map((n: { id: string; name: string; type: string }) => [n.id, n]),
      );
      const nodes = nodeIds.map(
        (nid) =>
          nodeMap.get(String(nid)) ?? { id: String(nid), name: String(nid), type: 'unknown' },
      );

      const edges: any[] = [];
      for (let i = 0; i < nodeIds.length - 1; i++) {
        edges.push({
          source: String(nodeIds[i]),
          target: String(nodeIds[i + 1]),
          type: 'relationship',
        });
      }

      return { hops: Number(depth), nodes, edges };
    } catch {
      return null;
    }
  },
};
