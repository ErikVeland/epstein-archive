import { Router } from 'express';
import { graphRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../services/Logger.js';
import {
  getEdgeEvidenceDocuments,
  getEdgeRelationship,
  getGlobalGraphEdges,
  getGlobalGraphNodes,
  getGraphCommunities,
  getGraphNeighbors,
  getGraphPathEdges,
  getGraphPathNodes,
} from '../db/routesDb.js';

const router = Router();

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
const JUNK_SUBSTRINGS = new Set([
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
  return [...JUNK_SUBSTRINGS].some((fragment) => v.includes(fragment));
}

class MinPriorityQueue<T> {
  private heap: Array<{ value: T; priority: number }> = [];

  push(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { value: T; priority: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].priority <= this.heap[i].priority) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(index: number): void {
    let i = index;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      let smallest = i;
      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
      i = smallest;
    }
  }
}

async function computeShortestPathNodeIds(
  sourceId: string,
  targetId: string,
  startDate?: string,
  endDate?: string,
): Promise<string[] | null> {
  const distances = new Map<string, number>([[sourceId, 0]]);
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const queue = new MinPriorityQueue<string>();
  queue.push(sourceId, 0);

  const maxNodes = 5000;
  let explored = 0;

  while (queue.size > 0 && explored < maxNodes) {
    const item = queue.pop();
    if (!item) break;
    const { value: current, priority: distance } = item;
    if (visited.has(current)) continue;

    visited.add(current);
    explored++;

    if (current === targetId) {
      const path: string[] = [];
      let cursor: string | null = targetId;
      while (cursor) {
        path.unshift(cursor);
        cursor = previous.get(cursor) || null;
      }
      return path;
    }

    const neighbors = await getGraphNeighbors(current, startDate, endDate);
    for (const neighbor of neighbors) {
      const nextId = String(neighbor.canonical_id);
      const weight = Math.max(0.0001, Number(neighbor.weight || 0.1));
      const nextDistance = distance + 1 / weight;

      if (nextDistance < (distances.get(nextId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextId, nextDistance);
        previous.set(nextId, current);
        queue.push(nextId, nextDistance);
      }
    }
  }

  return null;
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
router.get('/global', graphRateLimiter, async (req, res, next) => {
  try {
    const rawLimit = req.query.limit ? parseInt(req.query.limit as string) : 150;
    if (rawLimit > 2000) {
      return res.status(400).json({ error: 'Max nodes limit exceeded (<= 2000 allowed)' });
    }
    const limit = Math.max(10, rawLimit);

    // Phase 6.5 Query Discipline: Hard Caps
    const minRisk = parseInt(req.query.minRisk as string) || 0;
    const mode = req.query.mode as string; // 'cluster' or 'default'
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (mode === 'cluster') {
      // Super Cluster Mode: Aggregated by Structural Community (LPA)
      const clusters = await getGraphCommunities();

      // Enhance labels (optional)

      return res.json({
        nodes: clusters.map((c: any) => ({
          id: c.id,
          label: `${c.label} (${c.size})`,
          type: 'cluster',
          risk: c.risk,
          memberCount: c.size,
          community: parseInt(c.id.split('-')[1]),
        })),
        edges: [], // No edges in cluster view for clarity
      });
    }

    if (mode === 'path') {
      if (!req.query.sourceId || !req.query.targetId) {
        return res.status(400).json({ error: 'sourceId and targetId are required for path mode' });
      }
      const sourceId = String(req.query.sourceId);
      const targetId = String(req.query.targetId);
      const pathNodeArray = await computeShortestPathNodeIds(
        sourceId,
        targetId,
        startDate,
        endDate,
      );
      if (!pathNodeArray || pathNodeArray.length === 0) {
        return res.json({ nodes: [], edges: [] });
      }
      const nodes = await getGraphPathNodes(pathNodeArray);
      const edges = await getGraphPathEdges(pathNodeArray, startDate, endDate);

      return res.json({
        nodes: nodes.map((n: any) => ({
          id: String(n.id),
          label: n.label,
          type: n.type,
          risk: n.risk,
          val: n.val,
          community: n.community,
        })),
        edges: edges.map((e: any) => ({
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
    const groupedByLabel = new Map<string, any>();

    for (const n of rawNodes) {
      const id = String(n.id);
      const normalizedLabel = normalizeGraphLabel(String(n.label || ''));
      if (!normalizedLabel || isLikelyJunkGraphLabel(normalizedLabel)) continue;

      const dedupeKey = normalizedLabel.toLowerCase();
      const current = groupedByLabel.get(dedupeKey);
      const candidateScore =
        Number(n.connectionCount || 0) * 1000 + Number(n.risk || 0) * 100 + Number(n.mentions || 0);

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
    const canonicalIds = rawNodes.map((n: any) => String(n.id));

    // Quick exit if no nodes
    if (canonicalIds.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    // 2. Fetch Relationships between these nodes — injection-safe ANY($N::bigint[]) binding
    const rawEdges = await getGlobalGraphEdges({ canonicalIds, startDate, endDate });
    const edgeMap = new Map<string, any>();
    for (const e of rawEdges) {
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
      nodes: nodesArr.map((n: any) => ({
        id: String(n.id),
        label: n.label,
        type: n.type || 'unknown',
        risk: Number(n.risk || 0),
        connectionCount: Number(n.connectionCount || 0),
        community: Number(n.community_id || 0),
      })),
      edges: edgesArr.map((e: any) => ({
        id: `${e.source}-${e.target}-${e.type}`,
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
    const rel = getEdgeRelationship(String(sourceId), String(targetId));

    const evidence = docs.map((d: any) => ({
      id: `doc-${d.documentId}`,
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
