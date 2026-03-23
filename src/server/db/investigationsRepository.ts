import { investigationsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

/** Minimal shape for pgtyped-generated query objects used in this file. */
type RunQuery = {
  run: (params: unknown, client: unknown) => Promise<Array<Record<string, unknown>>>;
};

export interface Investigation {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  owner_id: string;
  collaborator_ids: string[];
  status: 'open' | 'in_review' | 'closed' | 'archived';
  scope?: string;
  created_at: string;
  updated_at: string;
}

type InvestigationEvidenceAnnotationType = 'highlight' | 'note' | 'tag' | 'classification';

type InvestigationEvidenceAnnotationRow = {
  id: number;
  investigation_id: number;
  evidence_id: number;
  annotation_type: InvestigationEvidenceAnnotationType;
  content: string;
  color: string | null;
  start_offset: number | null;
  end_offset: number | null;
  created_by: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const mapInvestigation = (inv: Record<string, unknown>) => ({
  id: Number(inv.id),
  uuid: inv.uuid,
  title: inv.title,
  description: inv.description,
  ownerId: inv.owner_id,
  status: inv.status,
  scope: inv.scope,
  collaboratorIds: Array.isArray(inv.collaborator_ids)
    ? inv.collaborator_ids
    : typeof inv.collaborator_ids === 'string'
      ? JSON.parse(inv.collaborator_ids)
      : [],
  createdAt: inv.created_at,
  updatedAt: inv.updated_at,
});

export const investigationsRepository = {
  getInvestigations: async (
    filters: {
      status?: string;
      ownerId?: string;
      page?: number;
      limit?: number;
    } = {},
  ) => {
    const { status = null, ownerId = null, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const investigations = await (investigationsQueries.getInvestigations as RunQuery).run(
      {
        status: status,
        ownerId: ownerId,
        limit: limit,
        offset: offset,
      },
      getApiPool(),
    );
    const countResult = await (investigationsQueries.countInvestigations as RunQuery).run(
      { status: status, ownerId: ownerId },
      getApiPool(),
    );

    const total = Number(countResult[0]?.total || 0);

    return {
      data: investigations.map((inv) => mapInvestigation(inv)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  createInvestigation: async (data: { title: string; description?: string; ownerId: string }) => {
    const result = await (investigationsQueries.createInvestigation as RunQuery).run(
      {
        title: data.title,
        description: data.description || null,
        ownerId: data.ownerId,
      },
      getApiPool(),
    );

    const id = result[0]?.id;
    if (!id) throw new Error('Failed to create investigation');
    return investigationsRepository.getInvestigationById(Number(id));
  },

  getInvestigationById: async (id: number) => {
    const rows = await (investigationsQueries.getInvestigationById as RunQuery).run(
      { id },
      getApiPool(),
    );
    const inv = rows[0];
    if (!inv) return null;
    return mapInvestigation(inv);
  },

  getInvestigationByUuid: async (uuid: string) => {
    const rows = await (investigationsQueries.getInvestigationByUuid as RunQuery).run(
      { uuid },
      getApiPool(),
    );
    const inv = rows[0];
    if (!inv) return null;
    return mapInvestigation(inv);
  },

  getInvestigationByTitle: async (title: string) => {
    const rows = await getApiPool().query(
      `SELECT id, uuid, title, description, owner_id, collaborator_ids, status, scope, created_at, updated_at
       FROM investigations
       WHERE title = $1
       ORDER BY id DESC
       LIMIT 1`,
      [title],
    );
    const inv = rows.rows[0];
    if (!inv) return null;
    return mapInvestigation(inv);
  },

  deleteInvestigation: async (id: number) => {
    await (investigationsQueries.deleteInvestigation as RunQuery).run({ id }, getApiPool());
    return true;
  },

  // --- Sub-resources ---

  getEvidence: async (investigationId: number, options?: { limit?: number; offset?: number }) => {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const rows = await (investigationsQueries.getEvidence as RunQuery).run(
      { investigationId, limit: limit, offset: offset },
      getApiPool(),
    );
    const countResult = await (investigationsQueries.countEvidence as RunQuery).run(
      { investigationId },
      getApiPool(),
    );
    const total = Number(countResult[0]?.total || 0);

    return {
      data: rows.map((row: Record<string, unknown>) => ({
        ...row,
        id: Number(row.id),
        investigation_evidence_id: Number(row.investigation_evidence_id),
      })),
      total,
      limit,
      offset,
    };
  },

  addEvidence: async (investigationId: number, data: Record<string, unknown>, userId = 'user') => {
    const evidenceData = data.evidence || data;
    const relevance = data.relevance || evidenceData.relevance || 'high';

    const title = evidenceData.title || evidenceData.file_name || 'Untitled Evidence';
    const description = evidenceData.description || '';
    const sourcePath =
      evidenceData.source_path ||
      evidenceData.source ||
      evidenceData.path ||
      `manual:${Date.now()}`;
    const type = evidenceData.type || 'document';

    const client = await getApiPool().connect();
    let resultId: number;
    try {
      await client.query('BEGIN');

      // 1. Check if evidence exists by sourcePath
      const existing = await (investigationsQueries.getEvidenceBySourcePath as RunQuery).run(
        { sourcePath },
        client,
      );
      let evidenceId = existing[0]?.id ? Number(existing[0].id) : null;

      if (!evidenceId) {
        const result = await (investigationsQueries.createEvidence as RunQuery).run(
          {
            title,
            description,
            evidenceType: type,
            sourcePath,
            originalFilename: title,
            redFlagRating: evidenceData.red_flag_rating || 0,
          },
          client,
        );
        evidenceId = Number(result[0]?.id);
      }

      if (!evidenceId) throw new Error('Failed to create evidence');

      // 2. Link to investigation
      const result = await (investigationsQueries.addEvidenceToInvestigation as RunQuery).run(
        {
          investigationId,
          evidenceId,
          notes: evidenceData.notes || '',
          relevance,
          addedBy: userId,
        },
        client,
      );

      await client.query('COMMIT');
      resultId = Number(result[0]?.id || evidenceId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Log activity outside the transaction — failure here doesn't roll back the evidence link
    try {
      await investigationsRepository.logActivity({
        investigationId,
        userId,
        userName: 'system',
        actionType: 'evidence_added',
        targetType: type,
        targetId: String(resultId),
        targetTitle: title,
        metadata: { relevance, sourcePath },
      });
    } catch (e) {
      logger.warn({ detail: e }, 'Failed to log activity');
    }

    return resultId;
  },

  getTimelineEvents: async (investigationId: number) => {
    const rows = await (investigationsQueries.getTimelineEvents as RunQuery).run(
      { investigationId },
      getApiPool(),
    );
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      id: Number(row.id),
      investigation_id: Number(row.investigation_id),
    }));
  },

  addTimelineEvent: async (investigationId: number, data: Record<string, unknown>) => {
    const result = await (investigationsQueries.createTimelineEvent as RunQuery).run(
      {
        investigationId,
        title: data.title || '',
        description: data.description || '',
        type: data.type || 'document',
        startDate: data.startDate || '',
        endDate: data.endDate || null,
      },
      getApiPool(),
    );
    return Number(result[0]?.id);
  },

  updateTimelineEvent: async (eventId: number, data: Record<string, unknown>) => {
    await (investigationsQueries.updateTimelineEvent as RunQuery).run(
      {
        id: eventId,
        title: data.title || null,
        description: data.description || null,
        type: data.type || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        confidence: data.confidence || null,
        entities: data.entities ? JSON.stringify(data.entities) : null,
        documents: data.documents ? JSON.stringify(data.documents) : null,
      },
      getApiPool(),
    );
    return true;
  },

  deleteTimelineEvent: async (id: number) => {
    await (investigationsQueries.deleteTimelineEvent as RunQuery).run({ id }, getApiPool());
    return true;
  },

  getChainOfCustody: async (evidenceId: number) => {
    const rows = await (investigationsQueries.getChainOfCustody as RunQuery).run(
      { evidenceId },
      getApiPool(),
    );
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      id: Number(row.id),
      evidence_id: Number(row.evidence_id),
    }));
  },

  addChainOfCustody: async (data: Record<string, unknown>) => {
    const result = await (investigationsQueries.addChainOfCustody as RunQuery).run(
      {
        evidenceId: data.evidenceId,
        date: new Date().toISOString(),
        actor: data.actor || 'system',
        action: data.action || 'analyzed',
        notes: data.notes || '',
        signature: data.signature || null,
      },
      getApiPool(),
    );
    return Number(result[0]?.id);
  },

  updateInvestigation: async (
    id: number,
    updates: {
      title?: string;
      description?: string;
      scope?: string;
      status?: 'open' | 'in_review' | 'closed' | 'archived';
      collaboratorIds?: string[];
    },
  ) => {
    const rows = await (investigationsQueries.updateInvestigation as RunQuery).run(
      {
        id,
        title: updates.title || null,
        description: updates.description || null,
        status: updates.status || null,
        scope: updates.scope || null,
        collaboratorIds: updates.collaboratorIds ? JSON.stringify(updates.collaboratorIds) : null,
      },
      getApiPool(),
    );
    const updated = rows[0];
    if (!updated) throw new Error('Investigation not found');
    return mapInvestigation(updated);
  },

  getNotebook: async (investigationId: number) => {
    const rows = await (investigationsQueries.getNotebook as RunQuery).run(
      { investigationId },
      getApiPool(),
    );
    const row = rows[0];
    if (!row) {
      return { investigationId, order: [], annotations: [], updatedAt: null };
    }
    let order = [];
    let annotations = [];
    try {
      order = row.order_json
        ? typeof row.order_json === 'string'
          ? JSON.parse(row.order_json)
          : row.order_json
        : [];
    } catch (_e) {
      order = [];
    }
    try {
      annotations = row.annotations_json
        ? typeof row.annotations_json === 'string'
          ? JSON.parse(row.annotations_json)
          : row.annotations_json
        : [];
    } catch (_e) {
      annotations = [];
    }
    return {
      investigationId: Number(row.investigation_id),
      order,
      annotations,
      updatedAt: row.updated_at,
    };
  },

  saveNotebook: async (
    investigationId: number,
    payload: { order?: number[]; annotations?: Array<Record<string, unknown>> },
  ) => {
    await (investigationsQueries.saveNotebook as RunQuery).run(
      {
        investigationId,
        orderJson: JSON.stringify(payload.order || []),
        annotationsJson: JSON.stringify(payload.annotations || []),
      },
      getApiPool(),
    );
    return true;
  },

  getEvidenceAnnotations: async (investigationId: number, evidenceId: number) => {
    const result = await getApiPool().query<InvestigationEvidenceAnnotationRow>(
      `
        SELECT
          id,
          investigation_id,
          evidence_id,
          annotation_type,
          content,
          color,
          start_offset,
          end_offset,
          created_by,
          metadata_json,
          created_at::text,
          updated_at::text
        FROM investigation_evidence_annotations
        WHERE investigation_id = $1 AND evidence_id = $2
        ORDER BY created_at ASC
      `,
      [investigationId, evidenceId],
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      evidenceId: Number(row.evidence_id),
      type: row.annotation_type,
      content: row.content,
      color: row.color || undefined,
      startOffset: row.start_offset ?? undefined,
      endOffset: row.end_offset ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by || undefined,
      metadata: row.metadata_json || {},
    }));
  },

  addEvidenceAnnotation: async (
    investigationId: number,
    evidenceId: number,
    annotation: {
      type: InvestigationEvidenceAnnotationType;
      content: string;
      color?: string;
      startOffset?: number;
      endOffset?: number;
      createdBy?: string;
      metadata?: Record<string, any>;
    },
  ) => {
    const result = await getApiPool().query<InvestigationEvidenceAnnotationRow>(
      `
        INSERT INTO investigation_evidence_annotations (
          investigation_id,
          evidence_id,
          annotation_type,
          content,
          color,
          start_offset,
          end_offset,
          created_by,
          metadata_json
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
        RETURNING
          id,
          investigation_id,
          evidence_id,
          annotation_type,
          content,
          color,
          start_offset,
          end_offset,
          created_by,
          metadata_json,
          created_at::text,
          updated_at::text
      `,
      [
        investigationId,
        evidenceId,
        annotation.type,
        annotation.content,
        annotation.color || null,
        annotation.startOffset ?? null,
        annotation.endOffset ?? null,
        annotation.createdBy || null,
        JSON.stringify(annotation.metadata || {}),
      ],
    );

    const row = result.rows[0];
    return {
      id: String(row.id),
      evidenceId: Number(row.evidence_id),
      type: row.annotation_type,
      content: row.content,
      color: row.color || undefined,
      startOffset: row.start_offset ?? undefined,
      endOffset: row.end_offset ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by || undefined,
      metadata: row.metadata_json || {},
    };
  },

  updateEvidenceAnnotation: async (
    investigationId: number,
    evidenceId: number,
    annotationId: number,
    updates: {
      content?: string;
      color?: string | null;
      startOffset?: number | null;
      endOffset?: number | null;
      metadata?: Record<string, any>;
    },
  ) => {
    const result = await getApiPool().query<InvestigationEvidenceAnnotationRow>(
      `
        UPDATE investigation_evidence_annotations
        SET
          content = COALESCE($4, content),
          color = COALESCE($5, color),
          start_offset = COALESCE($6, start_offset),
          end_offset = COALESCE($7, end_offset),
          metadata_json = COALESCE($8::jsonb, metadata_json),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND investigation_id = $2 AND evidence_id = $3
        RETURNING
          id,
          investigation_id,
          evidence_id,
          annotation_type,
          content,
          color,
          start_offset,
          end_offset,
          created_by,
          metadata_json,
          created_at::text,
          updated_at::text
      `,
      [
        annotationId,
        investigationId,
        evidenceId,
        updates.content ?? null,
        updates.color ?? null,
        updates.startOffset ?? null,
        updates.endOffset ?? null,
        updates.metadata ? JSON.stringify(updates.metadata) : null,
      ],
    );

    return result.rows[0] || null;
  },

  deleteEvidenceAnnotation: async (
    investigationId: number,
    evidenceId: number,
    annotationId: number,
  ) => {
    const result = await getApiPool().query(
      `
        DELETE FROM investigation_evidence_annotations
        WHERE id = $1 AND investigation_id = $2 AND evidence_id = $3
      `,
      [annotationId, investigationId, evidenceId],
    );
    return (result.rowCount || 0) > 0;
  },

  // --- Hypotheses ---

  getHypotheses: async (investigationId: number) => {
    const hypotheses = await (investigationsQueries.getHypotheses as RunQuery).run(
      { investigationId },
      getApiPool(),
    );

    const enriched = await Promise.all(
      hypotheses.map(async (hyp) => {
        const evidenceLinks = await (investigationsQueries.getHypothesisEvidence as RunQuery).run(
          { hypothesisId: Number(hyp.id) },
          getApiPool(),
        );
        return {
          ...hyp,
          id: Number(hyp.id),
          investigation_id: Number(hyp.investigation_id),
          evidenceLinks: evidenceLinks.map((e) => ({
            ...e,
            id: Number(e.id),
            hypothesis_id: Number(e.hypothesis_id),
            evidence_id: Number(e.evidence_id),
          })),
        };
      }),
    );
    return enriched;
  },

  addHypothesis: async (investigationId: number, data: { title: string; description?: string }) => {
    const result = await (investigationsQueries.createHypothesis as RunQuery).run(
      {
        investigationId,
        title: data.title,
        description: data.description || '',
      },
      getApiPool(),
    );
    return Number(result[0]?.id);
  },

  updateHypothesis: async (
    id: number,
    data: { title?: string; description?: string; status?: string; confidence?: number },
  ) => {
    await (investigationsQueries.updateHypothesis as RunQuery).run(
      {
        id,
        title: data.title || null,
        description: data.description || null,
        status: data.status || null,
        confidence: data.confidence || null,
      },
      getApiPool(),
    );
    return true;
  },

  deleteHypothesis: async (id: number) => {
    await (investigationsQueries.deleteHypothesis as RunQuery).run({ id }, getApiPool());
    return true;
  },

  addEvidenceToHypothesis: async (
    hypothesisId: number,
    evidenceId: number,
    relevance = 'supporting',
  ) => {
    const result = await (investigationsQueries.addEvidenceToHypothesis as RunQuery).run(
      { hypothesisId, evidenceId, relevance },
      getApiPool(),
    );
    return Number(result[0]?.id || 1);
  },

  removeEvidenceFromHypothesis: async (hypothesisId: number, evidenceId: number) => {
    await (investigationsQueries.removeEvidenceFromHypothesis as RunQuery).run(
      { hypothesisId, evidenceId },
      getApiPool(),
    );
    return true;
  },

  // --- Activity Logging ---

  logActivity: async (data: {
    investigationId: number;
    userId?: string;
    userName?: string;
    actionType: string;
    targetType?: string;
    targetId?: string;
    targetTitle?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const result = await (investigationsQueries.logActivity as RunQuery).run(
      {
        investigationId: data.investigationId,
        userId: data.userId || 'anonymous',
        userName: data.userName || 'Anonymous User',
        actionType: data.actionType,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        targetTitle: data.targetTitle || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
      getApiPool(),
    );
    return Number(result[0]?.id);
  },

  getActivity: async (investigationId: number, limit = 50) => {
    const rows = await (investigationsQueries.getActivity as RunQuery).run(
      { investigationId, limit: limit },
      getApiPool(),
    );
    return rows.map((row: Record<string, unknown>) => ({
      ...row,
      id: Number(row.id),
      investigation_id: Number(row.investigation_id),
    }));
  },

  // Enhanced evidence retrieval with type breakdown
  getEvidenceByType: async (investigationId: number) => {
    const evidence = await (investigationsQueries.getDetailedEvidence as RunQuery).run(
      { investigationId },
      getApiPool(),
    );

    const enrichedEvidence = evidence.map((row) => {
      const metadata = (() => {
        try {
          return row.metadata_json
            ? typeof row.metadata_json === 'string'
              ? JSON.parse(row.metadata_json)
              : row.metadata_json
            : {};
        } catch (_error) {
          return {};
        }
      })();
      return {
        ...row,
        id: Number(row.id),
        investigation_evidence_id: Number(row.investigation_evidence_id),
        document_id: row.document_id ? Number(row.document_id) : null,
        media_item_id: row.media_item_id ? Number(row.media_item_id) : null,
        ingest_run_id: metadata.ingest_run_id || metadata.ingestRunId || null,
        evidence_ladder: metadata.evidence_ladder || metadata.evidenceLadder || null,
        pipeline_version: metadata.pipeline_version || metadata.pipelineVersion || null,
        evidence_pack: metadata.evidence_pack || metadata.evidencePack || null,
        was_agentic: metadata.was_agentic || metadata.wasAgentic || false,
      };
    });

    const byType: Record<string, Array<Record<string, unknown>>> = {};
    for (const e of enrichedEvidence) {
      const type = e.type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(e);
    }

    return {
      all: enrichedEvidence,
      byType,
      counts: Object.fromEntries(
        Object.entries(byType).map(([type, items]) => [type, items.length]),
      ),
      total: enrichedEvidence.length,
    };
  },

  getBoardSnapshot: async (
    investigationId: number,
    options?: { evidenceLimit?: number; hypothesisLimit?: number },
  ) => {
    const evidenceLimit = options?.evidenceLimit ?? 100;
    const hypothesisLimit = options?.hypothesisLimit ?? 100;

    const evidenceRows = await (investigationsQueries.getEvidence as RunQuery).run(
      { investigationId, limit: evidenceLimit, offset: 0 },
      getApiPool(),
    );
    const hypothesesRows = await (investigationsQueries.getHypotheses as RunQuery).run(
      { investigationId },
      getApiPool(),
    );
    const countsResult = await (investigationsQueries.countEvidence as RunQuery).run(
      { investigationId },
      getApiPool(),
    );
    const notebook = await investigationsRepository.getNotebook(investigationId);

    return {
      investigationId,
      evidencePreview: evidenceRows.map((row: Record<string, unknown>) => ({
        ...row,
        id: Number(row.id),
        investigation_evidence_id: Number(row.investigation_evidence_id),
      })),
      hypothesesPreview: hypothesesRows
        .slice(0, hypothesisLimit)
        .map((row: Record<string, unknown>) => ({
          ...row,
          id: Number(row.id),
        })),
      evidenceCount: Number(countsResult[0]?.total || 0),
      hypothesisCount: Math.min(hypothesesRows.length, hypothesisLimit),
      notebookOrder: notebook.order,
      notebookOrderCount: notebook.order.length,
    };
  },

  getInvestigationsByEntityId: async (entityId: number) => {
    // This is often used for the "people" view to see linked investigations
    // We search evidence table for source_path matching the entity
    const sourcePath = `entity:${entityId}`;
    const evidence = await (investigationsQueries.getEvidenceBySourcePath as RunQuery).run(
      { sourcePath },
      getApiPool(),
    );
    if (evidence.length === 0) return [];

    // Find all investigations linking to this evidence
    const rows = await (investigationsQueries.getInvestigationsByEvidenceId as RunQuery).run(
      { evidenceId: Number(evidence[0].id) },
      getApiPool(),
    );

    return rows.map((inv) => mapInvestigation(inv));
  },
};
