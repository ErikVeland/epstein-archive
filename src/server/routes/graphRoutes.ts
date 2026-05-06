import express from 'express';
import { graphRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../services/Logger.js';
import { validate, graphGlobalQuerySchema } from '../middleware/validate.js';
import {
  findShortestPath,
  getEdgeEvidenceDocuments,
  getEdgeRelationship,
  getGlobalGraphEdges,
  getGlobalGraphNodes,
  getGraphCommunities,
  getGraphPathEdges,
  getGraphPathNodes,
} from '../db/routesDb.js';
import { icebergRepository } from '../db/icebergRepository.js';

const router = express.Router();

interface GraphNodeRaw {
  id: unknown;
  label?: unknown;
  type?: unknown;
  risk?: unknown;
  connectionCount?: unknown;
  mentions?: unknown;
  entity_type?: unknown;
  community_id?: unknown;
}

interface GraphEdgeRaw {
  source: unknown;
  target: unknown;
  type?: unknown;
  weight?: unknown;
  confidence?: unknown;
  classification?: unknown;
}

interface GraphClusterRaw {
  id: unknown;
  label?: unknown;
  size?: unknown;
  risk?: unknown;
}

interface GraphEdgeEvidence {
  documentId?: unknown;
  title?: unknown;
  snippet?: unknown;
  date?: unknown;
  sourceType?: unknown;
  model?: unknown;
}

interface MergedGraphNode extends GraphNodeRaw {
  __mergedIds: string[];
  __score: number;
}

interface NormalizedEdge {
  source: string;
  target: string;
  type: unknown;
  weight: number;
  confidence: number;
  classification: unknown;
}

function normalizeGraphLabel(raw: string): string {
  const trimmed = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!trimmed) return '';

  const withoutHonorific = trimmed.replace(/^(mr|mrs|ms|miss|dr|prof|sir)\.?\s+/i, '').trim();
  const canonicalRules: Array<{ pattern: RegExp; canonical: string }> = [
    {
      pattern: /\b(jeffrey\s+epstein|mr\s+epstein|jeff\s+epstein)\b/i,
      canonical: 'Jeffrey Epstein',
    },
    {
      pattern: /\b(donald\s+j\.?\s*trump|president\s+trump|mr\s+trump)\b/i,
      canonical: 'Donald Trump',
    },
    {
      pattern: /\b(ghislaine\s+maxwell|ms\s+maxwell|miss\s+maxwell)\b/i,
      canonical: 'Ghislaine Maxwell',
    },
    {
      pattern: /\b(bill\s+clinton|president\s+clinton|mr\s+clinton)\b/i,
      canonical: 'Bill Clinton',
    },
  ];

  for (const rule of canonicalRules) {
    if (rule.pattern.test(withoutHonorific)) return rule.canonical;
  }

  return withoutHonorific;
}

// Generic document-noise fragments that bleed into entity names during OCR/extraction.
// Checked via substring match (toLowerCase) against the candidate label.
const OCR_JUNK_FRAGMENTS = new Set([
  'demolition',
  'bracket',
  'column',
  'provided',
  'direction',
  'newsletter',
  // OCR artefacts — mis-reads of specific proper nouns or corpus-specific extraction noise
  'east if',
  'magstea',
  'jedge',
  'girand',
  'girara',
  'margarlt',
  'tunsi',
  'dechiqu',
  'kimberly meder',
  'kimbery meder',
  // Document-structure noise
  'see attachment',
  'attachment',
  'building no',
  'bluray disc',
  'en espa',
  'search ',
  'click ',
  'privacy ',
]);

const JUNK_PREFIXES = ['the ', 'mango '];

function isLikelyJunkGraphLabel(label: string): boolean {
  const v = label.toLowerCase();
  if (!v) return true;
  if (JUNK_PREFIXES.some((p) => v.startsWith(p))) return true;
  if (/\d/.test(v)) return true;
  if (v.endsWith(' group') || v.endsWith(' inc') || v.endsWith(' llc') || v.endsWith(' corp')) {
    return true;
  }
  return [...OCR_JUNK_FRAGMENTS].some((fragment) => v.includes(fragment));
}

// Legacy root alias for older clients/tests expecting /api/graph to return the global graph payload.
router.get('/', (req, res) => {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(req.query)) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) params.append(key, String(value));
      continue;
    }
    params.set(key, String(raw));
  }
  const qs = params.toString();
  res.redirect(307, `/api/graph/global${qs ? `?${qs}` : ''}`);
});

/**
 * Global Graph Data Endpoint
 * Supports Zoom-based LOD fetching.
 * Query Params:
 * - limit: number (default 150, max 2000)
 * - minRisk: number (default 0)
 * - includeEvidence: boolean (default false)
 */
router.get(
  '/global',
  graphRateLimiter,
  validate(graphGlobalQuerySchema),
  async (req, res, next) => {
    try {
      const q = req.query as Record<string, string | undefined>;
      const limit = Math.max(10, Number(q.limit || 150));
      const minRisk = Number(q.minRisk || 0);
      const mode = q.mode;
      const startDate = q.startDate;
      const endDate = q.endDate;

      if (mode === 'cluster') {
        // Super Cluster Mode: Aggregated by Structural Community (LPA)
        const clusters = await getGraphCommunities();

        // Enhance labels (optional)

        return res.json({
          nodes: (clusters as unknown as GraphClusterRaw[]).map((c) => ({
            id: c.id,
            label: `${String(c.label || '')} (${String(c.size || '')})`,
            type: 'cluster',
            risk: c.risk,
            memberCount: c.size,
            community: parseInt(String(c.id || '').split('-')[1]),
          })),
          edges: [], // No edges in cluster view for clarity
        });
      }

      if (mode === 'path') {
        if (!req.query.sourceId || !req.query.targetId) {
          return res
            .status(400)
            .json({ error: 'sourceId and targetId are required for path mode' });
        }
        const sourceId = String(req.query.sourceId);
        const targetId = String(req.query.targetId);
        const pathNodeArray = await findShortestPath(sourceId, targetId, startDate, endDate);
        if (!pathNodeArray || pathNodeArray.length === 0) {
          return res.json({ nodes: [], edges: [] });
        }
        const nodes = await getGraphPathNodes(pathNodeArray);
        const edges = await getGraphPathEdges(pathNodeArray, startDate, endDate);

        return res.json({
          nodes: (nodes as unknown as GraphNodeRaw[]).map((n) => ({
            id: String(n.id),
            label: n.label,
            type: n.type,
            risk: n.risk,
            val: (n as unknown as Record<string, unknown>).val,
            community: (n as unknown as Record<string, unknown>).community,
          })),
          edges: (edges as unknown as GraphEdgeRaw[]).map((e) => ({
            source: String(e.source),
            target: String(e.target),
            type: e.type,
            weight: e.weight,
            confidence: e.confidence,
            classification: e.classification,
          })),
        });
      }

      // 1. Fetch Top Entities (Nodes) - Aggregated by Canonical ID
      // Deterministic Sort: Risk DESC, Degree DESC, ID ASC
      const rawNodes = await getGlobalGraphNodes({ minRisk, limit, startDate, endDate });
      const remapToCanonicalId = new Map<string, string>();
      const groupedByLabel = new Map<string, MergedGraphNode>();

      for (const n of rawNodes as unknown as GraphNodeRaw[]) {
        const id = String(n.id);
        const normalizedLabel = normalizeGraphLabel(String(n.label || ''));
        if (!normalizedLabel || isLikelyJunkGraphLabel(normalizedLabel)) continue;

        const dedupeKey = normalizedLabel.toLowerCase();
        const current = groupedByLabel.get(dedupeKey);
        const candidateScore =
          Number(n.connectionCount || 0) * 1000 +
          Number(n.risk || 0) * 100 +
          Number(n.mentions || 0);

        if (!current) {
          groupedByLabel.set(dedupeKey, {
            ...n,
            id,
            label: normalizedLabel,
            __mergedIds: [id],
            __score: candidateScore,
          });
          remapToCanonicalId.set(id, id);
        } else {
          current.__mergedIds.push(id);
          remapToCanonicalId.set(id, String(current.id));
          if (candidateScore > Number(current.__score || 0)) {
            const oldPrimary = String(current.id);
            current.id = id;
            current.label = normalizedLabel;
            current.type = n.type;
            current.risk = n.risk;
            current.connectionCount = n.connectionCount;
            current.mentions = n.mentions;
            current.entity_type = n.entity_type;
            current.community_id = n.community_id;
            current.__score = candidateScore;
            for (const mergedId of current.__mergedIds as string[]) {
              remapToCanonicalId.set(String(mergedId), id);
            }
            remapToCanonicalId.set(oldPrimary, id);
          }
        }
      }

      const nodesArr = Array.from(groupedByLabel.values());
      const canonicalIds = (rawNodes as unknown as GraphNodeRaw[])
        .map((n) => String(n.id))
        .filter((id) => id && id !== 'null' && /^\d+$/.test(id));

      // Quick exit if no nodes
      if (canonicalIds.length === 0) {
        return res.json({ nodes: [], edges: [] });
      }

      // 2. Fetch Relationships between these nodes — injection-safe ANY($N::bigint[]) binding
      const rawEdges = await getGlobalGraphEdges({ canonicalIds, startDate, endDate });
      const edgeMap = new Map<string, NormalizedEdge>();
      for (const e of rawEdges as unknown as GraphEdgeRaw[]) {
        const sourceRemapped = remapToCanonicalId.get(String(e.source)) || String(e.source);
        const targetRemapped = remapToCanonicalId.get(String(e.target)) || String(e.target);
        if (sourceRemapped === targetRemapped) continue;

        const edgeKey = `${sourceRemapped}|${targetRemapped}|${e.type}`;
        const existing = edgeMap.get(edgeKey);
        const weight = Number(e.weight || 0.1);
        const confidence = Number(e.confidence || 1.0);

        if (!existing) {
          edgeMap.set(edgeKey, {
            source: sourceRemapped,
            target: targetRemapped,
            type: e.type,
            weight,
            confidence,
            classification: e.classification,
          });
        } else {
          existing.weight = Math.max(existing.weight, weight);
          existing.confidence = Math.max(existing.confidence, confidence);
        }
      }
      const edgesArr = Array.from(edgeMap.values());

      // Return formatting aligned with GraphService
      res.json({
        nodes: nodesArr.map((n) => ({
          id: String(n.id),
          label: n.label,
          type: n.type || 'unknown',
          risk: Number(n.risk || 0),
          connectionCount: Number(n.connectionCount || 0),
          community: Number(n.community_id || 0),
        })),
        edges: edgesArr.map((e) => ({
          id: `${e.source}-${e.target}-${String(e.type)}`,
          source: String(e.source),
          target: String(e.target),
          type: e.type,
          weight: e.weight || 0.1,
          confidence: e.confidence || 1.0,
          classification: e.classification,
        })),
      });
    } catch (error) {
      logger.error({ err: error }, '❌ Error fetching global graph');
      next(error);
    }
  },
);

router.get('/paths', async (req, res, next) => {
  try {
    const sourceId = String(req.query.sourceId || '').trim();
    const targetId = String(req.query.targetId || '').trim();
    if (!/^\d+$/.test(sourceId) || !/^\d+$/.test(targetId)) {
      return res
        .status(400)
        .json({ error: 'sourceId and targetId are required numeric entity ids' });
    }

    const limit = Math.max(1, Math.min(5, Number(req.query.limit || 5)));
    const minConfidence = Math.max(0, Math.min(1, Number(req.query.minConfidence || 0)));
    const paths = await icebergRepository.getRankedPaths({
      sourceId,
      targetId,
      limit,
      minConfidence,
      startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
      endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
    });

    return res.json({ data: paths, total: paths.length, limit });
  } catch (error) {
    next(error);
  }
});

router.get('/edges/:sourceId/:targetId/explain', async (req, res, next) => {
  try {
    const { sourceId, targetId } = req.params;
    if (!/^\d+$/.test(sourceId) || !/^\d+$/.test(targetId)) {
      return res.status(400).json({ error: 'sourceId and targetId must be numeric entity ids' });
    }

    const explanation = await icebergRepository.explainRelationship(sourceId, targetId);
    return res.json(explanation);
  } catch (error) {
    next(error);
  }
});

/**
 * Get Evidence for an Edge
 */
router.get('/edge-evidence', async (req, res, next) => {
  try {
    const { sourceId, targetId } = req.query;
    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    const docs = await getEdgeEvidenceDocuments(String(sourceId), String(targetId));
    const rel = await getEdgeRelationship(String(sourceId), String(targetId));

    const evidence = (docs as GraphEdgeEvidence[]).map((d) => ({
      id: `doc-${String(d.documentId || '')}`,
      documentId: d.documentId,
      title: d.title,
      snippet: d.snippet || 'No snippet available',
      date: d.date,
      sourceType: d.sourceType || 'document',
      confidence: 1.0,
      extractionMethod: d.model ? 'LLM' : 'Manual/Heuristic',
      model: d.model || 'Legacy Pipeline',
      sourceId: d.documentId,
    }));

    res.json({
      documents: evidence,
      relationship: rel || null,
    });
  } catch (error) {
    logger.error({ err: error }, '❌ Error fetching edge evidence');
    next(error);
  }
});

export default router;
