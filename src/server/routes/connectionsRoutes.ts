import express from 'express';
import { flightsRepository } from '../db/flightsRepository.js';
import { documentsRepository } from '../db/documentsRepository.js';
import { claimTriplesRepository } from '../db/claimTriplesRepository.js';
import { communicationsRepository } from '../db/communicationsRepository.js';
import { getApiPool } from '../db/connection.js';
import { logger } from '../services/Logger.js';
import type { ConnectionDossierDto, ConnectionPathDto } from '@shared/dto/connections';

const router = express.Router();

async function resolveEntity(
  id: string,
): Promise<{ id: string; name: string; type: string } | null> {
  const res = await getApiPool().query(
    `SELECT id::text, full_name as name, entity_type as type FROM entities WHERE id = $1 LIMIT 1`,
    [id],
  );
  return res.rows[0] ?? null;
}

async function resolveShortestPath(
  sourceId: string,
  targetId: string,
): Promise<ConnectionPathDto | null> {
  try {
    const res = await getApiPool().query(
      `
      WITH RECURSIVE path(node_id, path, depth) AS (
        SELECT $1::bigint, ARRAY[$1::bigint], 0
        UNION ALL
        SELECT
          CASE WHEN r.entity_id_1 = p.node_id THEN r.entity_id_2 ELSE r.entity_id_1 END,
          p.path || CASE WHEN r.entity_id_1 = p.node_id THEN r.entity_id_2 ELSE r.entity_id_1 END,
          p.depth + 1
        FROM path p
        JOIN relationships r ON (r.entity_id_1 = p.node_id OR r.entity_id_2 = p.node_id)
        WHERE NOT (CASE WHEN r.entity_id_1 = p.node_id THEN r.entity_id_2 ELSE r.entity_id_1 END = ANY(p.path))
          AND p.depth < 7
      )
      SELECT path, depth FROM path WHERE node_id = $2::bigint ORDER BY depth ASC LIMIT 1
      `,
      [sourceId, targetId],
    );

    if (!res.rows[0]) return null;

    const { path: nodeIds, depth } = res.rows[0] as { path: (string | number)[]; depth: number };
    const nodeRes = await getApiPool().query(
      `SELECT id::text, full_name as name, entity_type as type FROM entities WHERE id = ANY($1::bigint[])`,
      [nodeIds],
    );
    const nodeMap = new Map(
      nodeRes.rows.map((n: { id: string; name: string; type: string }) => [n.id, n]),
    );
    const nodes = nodeIds.map(
      (nid) => nodeMap.get(String(nid)) ?? { id: String(nid), name: String(nid), type: 'unknown' },
    );

    const edges: ConnectionPathDto['edges'] = [];
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
}

// GET /api/connections?a=:entityId&b=:entityId
router.get('/', async (req, res, next) => {
  try {
    const { a, b } = req.query as { a?: string; b?: string };
    if (!a || !b) {
      return res.status(400).json({ error: 'Both a and b entity IDs are required' });
    }

    const [entityA, entityB] = await Promise.all([resolveEntity(a), resolveEntity(b)]);
    if (!entityA) return res.status(404).json({ error: `Entity not found: ${a}` });
    if (!entityB) return res.status(404).json({ error: `Entity not found: ${b}` });

    const aId = Number(a);
    const bId = Number(b);

    const [flights, documents, claims, communications, path] = await Promise.all([
      flightsRepository.getSharedFlights(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedFlights failed');
        return [];
      }),
      documentsRepository.getSharedDocuments(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedDocuments failed');
        return [];
      }),
      claimTriplesRepository.getSharedClaims(a, b).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedClaims failed');
        return [];
      }),
      communicationsRepository.getSharedCommunications(aId, bId).catch((err: unknown) => {
        logger.warn({ err }, 'getSharedCommunications failed');
        return [];
      }),
      resolveShortestPath(a, b),
    ]);

    const dossier: ConnectionDossierDto = {
      entityA,
      entityB,
      signals: { flights, communications, path, claims, documents },
      summary: {
        flightCount: flights.length,
        communicationCount: communications.length,
        pathHops: path?.hops ?? null,
        claimCount: claims.length,
        documentCount: documents.length,
      },
    };

    return res.json(dossier);
  } catch (error) {
    return next(error);
  }
});

export default router;
