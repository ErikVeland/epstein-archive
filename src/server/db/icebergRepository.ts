import { getApiPool } from './connection.js';
import { investigationsRepository } from './investigationsRepository.js';
import type {
  EvidenceChainItemDto,
  GraphPathDto,
  GraphPathEdgeDto,
  HarmType,
  IcebergEntityRefDto,
  IcebergLeadDto,
  IcebergSupportingDocumentDto,
  RelationshipExplanationDto,
  DangerMotifType,
  IcebergReviewState,
} from '../../shared/dto/iceberg.js';

interface JsonObject {
  [key: string]: unknown;
}

interface FindingRow {
  id: string | number;
  investigation_id: string | number;
  lead_id: string | number | null;
  motif_type: string;
  harm_type: string | null;
  title: string;
  description: string | null;
  source_summary: string | null;
  confidence: string | number | null;
  risk_score: string | number | null;
  evidence_count: string | number | null;
  path_length: string | number | null;
  contradiction_count: string | number | null;
  review_state: string | null;
  status: string | null;
  priority: string | null;
  explainability_json: JsonObject | string | null;
  created_at: string;
  updated_at: string;
  primary_entities: IcebergEntityRefDto[] | null;
  supporting_documents: IcebergSupportingDocumentDto[] | null;
}

interface EdgeRow {
  source: string | number;
  source_label: string | null;
  target: string | number;
  target_label: string | null;
  type: string | null;
  confidence: string | number | null;
  risk_score: string | number | null;
  evidence_count: string | number | null;
  source_document_ids: Array<string | number> | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

const MOTIF_TYPES = new Set<DangerMotifType>([
  'co_travel',
  'co_presence',
  'shared_address_contact',
  'weak_repeated_association',
  'high_risk_bridge',
  'conflicting_dates',
  'missing_provenance',
  'sensitive_entity_exposure',
  'financial_proximity',
  'communication_proximity',
  'document_cluster_bridge',
  'manual_lead',
]);

const HARM_TYPES = new Set<HarmType>([
  'privacy_exposure',
  'coercion_or_exploitation',
  'reputational_harm',
  'financial_harm',
  'legal_process_harm',
  'safety_risk',
  'misinformation_amplification',
  'institutional_accountability',
  'unknown',
]);

const REVIEW_STATES = new Set<IcebergReviewState>([
  'unreviewed',
  'accepted',
  'rejected',
  'deferred',
  'insufficient_evidence',
]);

function isMissingTableError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && (error as { code?: string }).code === '42P01',
  );
}

function toNumber(value: unknown, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toJsonObject(value: unknown): JsonObject {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asMotifType(value: string | null | undefined): DangerMotifType {
  return MOTIF_TYPES.has(value as DangerMotifType) ? (value as DangerMotifType) : 'manual_lead';
}

function asHarmType(value: string | null | undefined): HarmType {
  return HARM_TYPES.has(value as HarmType) ? (value as HarmType) : 'unknown';
}

function asReviewState(value: string | null | undefined): IcebergReviewState {
  return REVIEW_STATES.has(value as IcebergReviewState)
    ? (value as IcebergReviewState)
    : 'unreviewed';
}

function normalizeEntities(value: unknown): IcebergEntityRefDto[] {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item as Record<string, unknown>;
          const id = toNumber(record.id);
          if (id === null) return null;
          return {
            id,
            name: String(record.name || 'Unknown entity'),
            type: record.type ? String(record.type) : null,
            riskScore: toNumber(record.riskScore),
          };
        })
        .filter((item): item is IcebergEntityRefDto => item !== null)
    : [];
}

function normalizeDocuments(value: unknown): IcebergSupportingDocumentDto[] {
  return Array.isArray(value)
    ? value
        .map((item) => {
          const record = item as Record<string, unknown>;
          const documentId = toNumber(record.documentId);
          if (documentId === null) return null;
          return {
            documentId,
            title: String(record.title || `Document ${documentId}`),
            snippet: record.snippet ? String(record.snippet) : null,
            sourceType: record.sourceType ? String(record.sourceType) : null,
            date: record.date ? new Date(String(record.date)).toISOString() : null,
            confidence: toNumber(record.confidence),
          };
        })
        .filter((item): item is IcebergSupportingDocumentDto => item !== null)
    : [];
}

function mapFinding(row: FindingRow): IcebergLeadDto {
  const explainability = toJsonObject(row.explainability_json);
  const confidence = toNumber(row.confidence);
  const riskScore = toNumber(row.risk_score);

  return {
    id: `motif-${String(row.id)}`,
    investigationId: Number(row.investigation_id),
    title: row.title,
    description: row.description,
    leadKind: 'motif',
    motifType: asMotifType(row.motif_type),
    harmType: asHarmType(row.harm_type),
    status: (row.status || 'open') as IcebergLeadDto['status'],
    priority: (row.priority || 'medium') as IcebergLeadDto['priority'],
    confidence,
    riskScore,
    evidenceCount: Number(row.evidence_count || 0),
    pathLength: toNumber(row.path_length),
    sourceSummary: row.source_summary || 'Generated from source-backed graph evidence.',
    primaryEntities: normalizeEntities(row.primary_entities),
    supportingDocuments: normalizeDocuments(row.supporting_documents),
    contradictionCount: Number(row.contradiction_count || 0),
    reviewState: asReviewState(row.review_state),
    explainability: {
      whyItMatters:
        typeof explainability.whyItMatters === 'string'
          ? explainability.whyItMatters
          : 'This lead links entities through a repeatable evidence motif. Review source documents before relying on it.',
      strongestEvidence: Array.isArray(explainability.strongestEvidence)
        ? explainability.strongestEvidence.map(String)
        : [],
      limitations: Array.isArray(explainability.limitations)
        ? explainability.limitations.map(String)
        : ['Generated evidence has not been fully reviewed.'],
      nextActions: Array.isArray(explainability.nextActions)
        ? explainability.nextActions.map(String)
        : [
            'Open the source documents.',
            'Check the timeline window.',
            'Save reviewed evidence to the case packet.',
          ],
    },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function sourceSummaryForSignal(signalType: string | null | undefined, count: number): string {
  const label = String(signalType || 'manual lead')
    .replace(/_/g, ' ')
    .toLowerCase();
  return `${count || 1} source-backed ${label} signal${count === 1 ? '' : 's'} available for review.`;
}

async function fallbackLeads(
  investigationId: number,
  filters: IcebergLeadFilters,
): Promise<IcebergLeadDto[]> {
  const rows = await investigationsRepository.getLeads(investigationId, {
    status: filters.status,
  });

  return rows.slice(filters.offset, filters.offset + filters.limit).map((lead) => {
    const record = lead as Record<string, unknown>;
    const entityIds = Array.isArray(record.entityIds) ? record.entityIds.map(Number) : [];
    const entityNames = Array.isArray(record.entityNames) ? record.entityNames.map(String) : [];
    const signalType = record.signalType ? String(record.signalType) : null;
    const motifType = signalType?.toLowerCase().includes('travel')
      ? 'co_travel'
      : signalType?.toLowerCase().includes('presence')
        ? 'co_presence'
        : 'manual_lead';
    const riskScore = toNumber(record.riskScore, 0.45);
    const confidence = toNumber(record.confidence, 0.5);

    return {
      id: `lead-${String(record.id)}`,
      investigationId,
      title: String(record.title || 'Investigation lead'),
      description: record.description ? String(record.description) : null,
      leadKind: signalType ? 'relationship' : 'manual',
      motifType,
      harmType: 'unknown',
      status: (record.status || 'open') as IcebergLeadDto['status'],
      priority: (record.priority || 'medium') as IcebergLeadDto['priority'],
      confidence,
      riskScore,
      evidenceCount: record.sourceDocumentId ? 1 : entityIds.length,
      pathLength: entityIds.length >= 2 ? 1 : null,
      sourceSummary: sourceSummaryForSignal(signalType, entityIds.length || 1),
      primaryEntities: entityIds.map((id, index) => ({
        id,
        name: entityNames[index] || `Entity ${id}`,
        type: null,
        riskScore: null,
      })),
      supportingDocuments: record.sourceDocumentId
        ? [
            {
              documentId: Number(record.sourceDocumentId),
              title: String(record.document_title || `Document ${String(record.sourceDocumentId)}`),
              snippet: record.description ? String(record.description) : null,
              sourceType: null,
              date: null,
              confidence,
            },
          ]
        : [],
      contradictionCount: 0,
      reviewState: 'unreviewed',
      explainability: {
        whyItMatters:
          'This lead is already attached to the investigation and can be checked against source documents and graph paths.',
        strongestEvidence: signalType ? [String(signalType).replace(/_/g, ' ')] : [],
        limitations: ['This lead needs source review before it is treated as a finding.'],
        nextActions: [
          'Open the path panel.',
          'Inspect source documents.',
          'Save verified material to the case packet.',
        ],
      },
      createdAt: new Date(String(record.createdAt || Date.now())).toISOString(),
      updatedAt: new Date(String(record.updatedAt || Date.now())).toISOString(),
    };
  });
}

export interface IcebergLeadFilters {
  limit: number;
  offset: number;
  motifType?: string;
  harmType?: string;
  reviewState?: string;
  status?: string;
  minConfidence?: number;
  sourceType?: string;
}

function buildFindingWhere(filters: IcebergLeadFilters): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const clauses = ['f.investigation_id = $1'];

  const add = (value: unknown, sql: (idx: number) => string) => {
    values.push(value);
    clauses.push(sql(values.length));
  };

  values.push(null);
  if (filters.motifType && filters.motifType !== 'all') {
    add(filters.motifType, (idx) => `f.motif_type = $${idx}`);
  }
  if (filters.harmType && filters.harmType !== 'all') {
    add(filters.harmType, (idx) => `f.harm_type = $${idx}`);
  }
  if (filters.reviewState && filters.reviewState !== 'all') {
    add(filters.reviewState, (idx) => `f.review_state = $${idx}`);
  }
  if (filters.status && filters.status !== 'all') {
    add(filters.status, (idx) => `f.status = $${idx}`);
  }
  if (typeof filters.minConfidence === 'number') {
    add(filters.minConfidence, (idx) => `COALESCE(f.confidence, 0) >= $${idx}`);
  }
  if (filters.sourceType && filters.sourceType !== 'all') {
    add(
      filters.sourceType,
      (idx) => `EXISTS (
        SELECT 1
        FROM danger_motif_evidence me
        LEFT JOIN documents d ON d.id = me.document_id
        WHERE me.finding_id = f.id
          AND COALESCE(me.source_type, d.evidence_type, 'document') = $${idx}
      )`,
    );
  }

  return { sql: clauses.join(' AND '), values };
}

async function loadEdgeEvidenceDocuments(
  sourceId: string,
  targetId: string,
): Promise<IcebergSupportingDocumentDto[]> {
  const pool = getApiPool();
  const { rows } = await pool.query(
    `
      SELECT
        d.id AS "documentId",
        COALESCE(d.title, d.file_name, 'Document ' || d.id::text) AS title,
        d.evidence_type AS "sourceType",
        d.date_created AS date,
        (
          SELECT mention_context
          FROM entity_mentions em2
          JOIN entities e2 ON e2.id = em2.entity_id
          WHERE em2.document_id = d.id
            AND e2.canonical_id IN ($1::bigint, $2::bigint)
            AND mention_context IS NOT NULL
          LIMIT 1
        ) AS snippet
      FROM documents d
      JOIN entity_mentions em ON em.document_id = d.id
      JOIN entities e ON e.id = em.entity_id
      WHERE e.canonical_id IN ($1::bigint, $2::bigint)
      GROUP BY d.id
      HAVING COUNT(DISTINCT e.canonical_id) >= 2
      ORDER BY d.red_flag_rating DESC NULLS LAST, d.date_created DESC NULLS LAST
      LIMIT 12
    `,
    [sourceId, targetId],
  );

  return normalizeDocuments(rows);
}

function mapEdge(row: EdgeRow): GraphPathEdgeDto {
  const docs = Array.isArray(row.source_document_ids)
    ? row.source_document_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
    : [];
  const confidence = toNumber(row.confidence, 0) ?? 0;
  const riskScore = toNumber(row.risk_score, 0) ?? 0;
  return {
    source: String(row.source),
    sourceLabel: row.source_label,
    target: String(row.target),
    targetLabel: row.target_label,
    type: row.type || 'connected',
    classification:
      confidence < 0.8 || String(row.type || '').includes('infer') ? 'INFERRED' : 'EVIDENCE_BACKED',
    confidence,
    riskScore,
    evidenceCount: Number(row.evidence_count || docs.length),
    sourceDocumentIds: docs,
    dateRange: {
      start: row.first_seen_at ? new Date(row.first_seen_at).toISOString() : null,
      end: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    },
  };
}

export const icebergRepository = {
  async getLeads(investigationId: number, filters: IcebergLeadFilters): Promise<IcebergLeadDto[]> {
    const pool = getApiPool();
    const where = buildFindingWhere(filters);
    where.values[0] = investigationId;

    try {
      const values = [...where.values, filters.limit, filters.offset];
      const { rows } = await pool.query<FindingRow>(
        `
          SELECT
            f.id,
            f.investigation_id,
            f.lead_id,
            f.motif_type,
            f.harm_type,
            f.title,
            f.description,
            f.source_summary,
            f.confidence,
            f.risk_score,
            f.evidence_count,
            f.path_length,
            f.contradiction_count,
            f.review_state,
            f.status,
            f.priority,
            f.explainability_json,
            f.created_at,
            f.updated_at,
            COALESCE((
              SELECT json_agg(json_build_object(
                'id', e.id,
                'name', e.full_name,
                'type', e.entity_type,
                'riskScore', e.red_flag_rating
              ) ORDER BY e.red_flag_rating DESC NULLS LAST)
              FROM entities e
              WHERE e.id = ANY(f.primary_entity_ids)
            ), '[]'::json) AS primary_entities,
            COALESCE((
              SELECT json_agg(json_build_object(
                'documentId', d.id,
                'title', COALESCE(d.title, d.file_name, 'Document ' || d.id::text),
                'snippet', me.snippet,
                'sourceType', COALESCE(me.source_type, d.evidence_type),
                'date', d.date_created,
                'confidence', me.confidence
              ) ORDER BY d.red_flag_rating DESC NULLS LAST)
              FROM danger_motif_evidence me
              LEFT JOIN documents d ON d.id = me.document_id
              WHERE me.finding_id = f.id
              LIMIT 8
            ), '[]'::json) AS supporting_documents
          FROM danger_motif_findings f
          WHERE ${where.sql}
          ORDER BY COALESCE(f.risk_score, 0) DESC, COALESCE(f.confidence, 0) DESC, f.updated_at DESC
          LIMIT $${where.values.length + 1} OFFSET $${where.values.length + 2}
        `,
        values,
      );

      if (rows.length > 0) return rows.map(mapFinding);
      return fallbackLeads(investigationId, filters);
    } catch (error) {
      if (isMissingTableError(error)) return fallbackLeads(investigationId, filters);
      throw error;
    }
  },

  async getLead(investigationId: number, leadId: string): Promise<IcebergLeadDto | null> {
    const leads = await this.getLeads(investigationId, {
      limit: 100,
      offset: 0,
    });
    return leads.find((lead) => lead.id === leadId) || null;
  },

  async saveEvidenceChainItem(params: {
    investigationId: number;
    leadId: string | null;
    itemType: EvidenceChainItemDto['itemType'];
    title: string;
    payload: unknown;
    createdBy?: string | null;
  }): Promise<EvidenceChainItemDto> {
    const pool = getApiPool();
    const { rows } = await pool.query(
      `
        INSERT INTO evidence_chain_items (
          investigation_id, lead_id, item_type, title, payload_json, created_by
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING id, investigation_id, lead_id, item_type, title, payload_json, created_at
      `,
      [
        params.investigationId,
        params.leadId,
        params.itemType,
        params.title,
        JSON.stringify(params.payload || {}),
        params.createdBy || null,
      ],
    );
    const row = rows[0];
    return {
      id: Number(row.id),
      investigationId: Number(row.investigation_id),
      leadId: row.lead_id,
      itemType: row.item_type,
      title: row.title,
      payload: row.payload_json,
      createdAt: new Date(row.created_at).toISOString(),
    };
  },

  async getRankedPaths(params: {
    sourceId: string;
    targetId: string;
    limit: number;
    minConfidence: number;
    startDate?: string;
    endDate?: string;
  }): Promise<GraphPathDto[]> {
    const pool = getApiPool();
    const limit = Math.max(1, Math.min(5, params.limit));
    const { rows } = await pool.query<{
      path_nodes: Array<string | number>;
      score: string | number;
    }>(
      `
        WITH rels AS (
          SELECT
            source_entity_id::bigint AS a,
            target_entity_id::bigint AS b,
            confidence,
            COALESCE(risk_score, 0) AS risk_score,
            COALESCE(proximity_score, strength, 0) AS weight,
            first_seen_at,
            last_seen_at
          FROM entity_relationships
          WHERE COALESCE(confidence, 0) >= $3
            AND ($4::timestamptz IS NULL OR last_seen_at >= $4::timestamptz)
            AND ($5::timestamptz IS NULL OR first_seen_at <= $5::timestamptz)
          UNION ALL
          SELECT
            target_entity_id::bigint AS a,
            source_entity_id::bigint AS b,
            confidence,
            COALESCE(risk_score, 0) AS risk_score,
            COALESCE(proximity_score, strength, 0) AS weight,
            first_seen_at,
            last_seen_at
          FROM entity_relationships
          WHERE COALESCE(confidence, 0) >= $3
            AND ($4::timestamptz IS NULL OR last_seen_at >= $4::timestamptz)
            AND ($5::timestamptz IS NULL OR first_seen_at <= $5::timestamptz)
        ),
        direct AS (
          SELECT ARRAY[$1::bigint, $2::bigint] AS path_nodes, MAX(weight + confidence * 100 + risk_score) AS score
          FROM rels
          WHERE a = $1::bigint AND b = $2::bigint
          HAVING COUNT(*) > 0
        ),
        two_hop AS (
          SELECT ARRAY[$1::bigint, r1.b, $2::bigint] AS path_nodes,
            MAX(r1.weight + r2.weight + (r1.confidence + r2.confidence) * 50 + r1.risk_score + r2.risk_score) AS score
          FROM rels r1
          JOIN rels r2 ON r1.b = r2.a
          WHERE r1.a = $1::bigint
            AND r2.b = $2::bigint
            AND r1.b NOT IN ($1::bigint, $2::bigint)
          GROUP BY r1.b
        )
        SELECT path_nodes, score FROM direct
        UNION ALL
        SELECT path_nodes, score FROM two_hop
        ORDER BY score DESC
        LIMIT $6
      `,
      [
        params.sourceId,
        params.targetId,
        params.minConfidence,
        params.startDate || null,
        params.endDate || null,
        limit,
      ],
    );

    const paths: GraphPathDto[] = [];
    for (const row of rows) {
      const nodeIds = row.path_nodes.map(String);
      const nodes = await this.getEntities(nodeIds);
      const edges: GraphPathEdgeDto[] = [];
      for (let idx = 0; idx < nodeIds.length - 1; idx++) {
        const edge = await this.getBestEdge(nodeIds[idx], nodeIds[idx + 1], params);
        if (edge) edges.push(edge);
      }
      if (edges.length === 0) continue;
      const confidence =
        edges.reduce((sum, edge) => sum + edge.confidence, 0) / Math.max(1, edges.length);
      paths.push({
        id: nodeIds.join('-'),
        sourceId: params.sourceId,
        targetId: params.targetId,
        score: toNumber(row.score, 0) ?? 0,
        confidence,
        riskScore: Math.max(...edges.map((edge) => edge.riskScore), 0),
        pathLength: edges.length,
        nodes,
        edges,
      });
    }
    return paths;
  },

  async getEntities(ids: string[]): Promise<IcebergEntityRefDto[]> {
    if (ids.length === 0) return [];
    const pool = getApiPool();
    const { rows } = await pool.query(
      `
        SELECT id, full_name, entity_type, red_flag_rating
        FROM entities
        WHERE id = ANY($1::bigint[])
      `,
      [ids],
    );
    const byId = new Map(
      rows.map((row) => [
        String(row.id),
        {
          id: Number(row.id),
          name: String(row.full_name || `Entity ${String(row.id)}`),
          type: row.entity_type ? String(row.entity_type) : null,
          riskScore: toNumber(row.red_flag_rating),
        },
      ]),
    );
    return ids.map(
      (id) =>
        byId.get(id) || {
          id: Number(id),
          name: `Entity ${id}`,
          type: null,
          riskScore: null,
        },
    );
  },

  async getBestEdge(
    sourceId: string,
    targetId: string,
    params: { minConfidence?: number; startDate?: string; endDate?: string },
  ): Promise<GraphPathEdgeDto | null> {
    const pool = getApiPool();
    const { rows } = await pool.query<EdgeRow>(
      `
        SELECT
          s.id AS source,
          s.full_name AS source_label,
          t.id AS target,
          t.full_name AS target_label,
          er.relationship_type AS type,
          MAX(er.confidence) AS confidence,
          MAX(COALESCE(er.risk_score, 0)) AS risk_score,
          COUNT(DISTINCT d.id)::integer AS evidence_count,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT d.id), NULL) AS source_document_ids,
          MIN(er.first_seen_at) AS first_seen_at,
          MAX(er.last_seen_at) AS last_seen_at
        FROM entity_relationships er
        JOIN entities s ON s.id = er.source_entity_id
        JOIN entities t ON t.id = er.target_entity_id
        LEFT JOIN entity_mentions ems ON ems.entity_id = s.id
        LEFT JOIN entity_mentions emt ON emt.entity_id = t.id AND emt.document_id = ems.document_id
        LEFT JOIN documents d ON d.id = ems.document_id
        WHERE (
          (er.source_entity_id = $1::bigint AND er.target_entity_id = $2::bigint)
          OR (er.source_entity_id = $2::bigint AND er.target_entity_id = $1::bigint)
        )
          AND COALESCE(er.confidence, 0) >= $3
          AND ($4::timestamptz IS NULL OR er.last_seen_at >= $4::timestamptz)
          AND ($5::timestamptz IS NULL OR er.first_seen_at <= $5::timestamptz)
        GROUP BY s.id, s.full_name, t.id, t.full_name, er.relationship_type
        ORDER BY MAX(COALESCE(er.proximity_score, er.strength, 0)) DESC, MAX(er.confidence) DESC
        LIMIT 1
      `,
      [
        sourceId,
        targetId,
        params.minConfidence ?? 0,
        params.startDate || null,
        params.endDate || null,
      ],
    );
    return rows[0] ? mapEdge(rows[0]) : null;
  },

  async explainRelationship(
    sourceId: string,
    targetId: string,
  ): Promise<RelationshipExplanationDto> {
    // Perform dynamic search for both direct evidence AND recursive ranked paths
    const [directEvidence, edge, paths] = await Promise.all([
      loadEdgeEvidenceDocuments(sourceId, targetId),
      this.getBestEdge(sourceId, targetId, { minConfidence: 0 }),
      this.getRankedPaths({ sourceId, targetId, limit: 1, minConfidence: 0.01 }),
    ]);

    let indirectEvidence: IcebergSupportingDocumentDto[] = [];

    // Upgrade Routine: If direct matching fails, attempt to salvage multi-hop bridging documents
    if (directEvidence.length === 0 && paths && paths.length > 0) {
      const topPath = paths[0];
      if (topPath && topPath.edges.length > 1) {
        try {
          // Load standard evidence bundles for each leg in the bridge
          const legDocs = await Promise.all(
            topPath.edges.map((e) => loadEdgeEvidenceDocuments(String(e.source), String(e.target))),
          );
          // Flatten and cap to reasonable volume
          indirectEvidence = legDocs.flat().slice(0, 10);
        } catch (_err) {
          // Graceful degradation to empty if deeper resolution errors out
        }
      }
    }

    const allDocs = directEvidence.length > 0 ? directEvidence : indirectEvidence;

    const sharedDates = Array.from(
      new Set(
        allDocs
          .map((doc) => (doc.date ? doc.date.slice(0, 10) : null))
          .filter((date): date is string => Boolean(date)),
      ),
    ).slice(0, 8);

    const missingProvenance = allDocs
      .filter((doc) => !doc.snippet)
      .slice(0, 5)
      .map((doc) => `${doc.title} has no extractable source snippet in the current index.`);

    const summary =
      directEvidence.length > 0
        ? `${directEvidence.length} source document${directEvidence.length === 1 ? '' : 's'} directly link these entities.`
        : indirectEvidence.length > 0
          ? `Inferred connection backed by ${indirectEvidence.length} docs supporting an intermediate multi-hop bridge.`
          : 'No shared source documents found in primary or secondary degree lookups.';

    return {
      sourceId,
      targetId,
      directEvidence,
      indirectEvidence,
      sharedDates,
      sharedLocations: [],
      contradictions: [],
      missingProvenance,
      confidence: edge?.confidence ?? null,
      summary,
    };
  },

  async getDocumentContext(params: {
    documentId: number;
    entityIds: number[];
    page?: number;
  }): Promise<{
    documentId: number;
    page: number | null;
    title: string;
    snippets: Array<{
      text: string;
      page: number | null;
      entityIds: number[];
      confidence: number | null;
    }>;
    provenanceStatus: 'complete' | 'partial' | 'missing';
  } | null> {
    const pool = getApiPool();
    const docRes = await pool.query(
      `
        SELECT id, COALESCE(title, file_name, 'Document ' || id::text) AS title,
          content_sha256, source_acquisition_method, provenance_status
        FROM documents
        WHERE id = $1
      `,
      [params.documentId],
    );
    const doc = docRes.rows[0];
    if (!doc) return null;

    const mentionRows = await pool.query(
      `
        SELECT em.mention_context, em.entity_id, dp.page_number, em.confidence
        FROM entity_mentions em
        LEFT JOIN document_pages dp ON dp.document_id = em.document_id
          AND em.mention_context IS NOT NULL
          AND dp.extracted_text ILIKE '%' || LEFT(em.mention_context, 80) || '%'
        WHERE em.document_id = $1
          AND ($2::bigint[] IS NULL OR em.entity_id = ANY($2::bigint[]))
          AND ($3::int IS NULL OR dp.page_number = $3)
          AND em.mention_context IS NOT NULL
        ORDER BY em.confidence DESC NULLS LAST
        LIMIT 12
      `,
      [
        params.documentId,
        params.entityIds.length > 0 ? params.entityIds : null,
        params.page || null,
      ],
    );

    const snippets = mentionRows.rows.map((row) => ({
      text: String(row.mention_context || ''),
      page:
        row.page_number === null || row.page_number === undefined ? null : Number(row.page_number),
      entityIds: [Number(row.entity_id)].filter((id) => Number.isFinite(id)),
      confidence: toNumber(row.confidence),
    }));

    const hasHash = Boolean(doc.content_sha256);
    const hasMethod = Boolean(doc.source_acquisition_method);
    const durableStatus = String(doc.provenance_status || '').toLowerCase();
    const provenanceStatus =
      durableStatus === 'complete'
        ? 'complete'
        : hasHash && hasMethod
          ? 'complete'
          : hasHash || hasMethod || durableStatus === 'partial'
            ? 'partial'
            : 'missing';

    return {
      documentId: Number(doc.id),
      page: params.page || null,
      title: String(doc.title),
      snippets,
      provenanceStatus,
    };
  },
};
