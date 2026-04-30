/* eslint-disable prettier/prettier, @typescript-eslint/no-explicit-any */
import { investigationsQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
type CollaboratorRow = { user_id: string; permission_level: string; joined_at: string };

export interface Investigation {
  id: number;
  uuid: string;
  title: string;
  description?: string;
  owner_id: string;
  collaborators: Array<{ userId: string; permissionLevel: string; joinedAt: string }>;
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

const mapInvestigation = (inv: Record<string, unknown>, collaborators: CollaboratorRow[] = []) => ({
  id: Number(inv.id),
  uuid: String(inv.uuid),
  title: String(inv.title),
  description: inv.description ? String(inv.description) : undefined,
  ownerId: String(inv.owner_id),
  status: inv.status as Investigation['status'],
  scope: inv.scope ? String(inv.scope) : undefined,
  collaborators: collaborators.map((c) => ({
    userId: c.user_id,
    permissionLevel: c.permission_level,
    joinedAt: c.joined_at,
  })),
  createdAt: String(inv.created_at),
  updatedAt: String(inv.updated_at),
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

    const investigations = await (investigationsQueries.getInvestigations as unknown as any).run(
      {
        status: status,
        ownerId: ownerId,
        limit: limit,
        offset: offset,
      },
      getApiPool(),
    );
    const countResult = await (investigationsQueries.countInvestigations as unknown as any).run(
      { status: status, ownerId: ownerId },
      getApiPool(),
    );

    const total = Number(countResult[0]?.total || 0);

    return {
      data: investigations.map((inv: any) => mapInvestigation(inv)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  createInvestigation: async (data: { title: string; description?: string; ownerId: string }) => {
    const result = await (investigationsQueries.createInvestigation as unknown as any).run(
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
    const rows = await (investigationsQueries.getInvestigationById as unknown as any).run(
      { id },
      getApiPool(),
    );
    const inv = rows[0];
    if (!inv) return null;

    const collaboratorRows = await getApiPool().query(
      `SELECT user_id, permission_level, joined_at
       FROM investigation_collaborators
       WHERE investigation_id = $1`,
      [id],
    );
    const collaborators = collaboratorRows.rows as CollaboratorRow[];

    return mapInvestigation(inv, collaborators);
  },

  getInvestigationByUuid: async (uuid: string) => {
    const rows = await (investigationsQueries.getInvestigationByUuid as unknown as any).run(
      { uuid },
      getApiPool(),
    );
    const inv = rows[0];
    if (!inv) return null;

    const collaboratorRows = await getApiPool().query(
      `SELECT user_id, permission_level, joined_at
       FROM investigation_collaborators
       WHERE investigation_id = $1`,
      [Number(inv.id)],
    );
    const collaborators = collaboratorRows.rows as CollaboratorRow[];

    return mapInvestigation(inv, collaborators);
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
    await (investigationsQueries.deleteInvestigation as unknown as any).run({ id }, getApiPool());
    return true;
  },

  // --- Sub-resources ---

  getEvidence: async (investigationId: number, options?: { limit?: number; offset?: number }) => {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const rows = await (investigationsQueries.getEvidence as unknown as any).run(
      { investigationId, limit: limit, offset: offset },
      getApiPool(),
    );
    const countResult = await (investigationsQueries.countEvidence as unknown as any).run(
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
    const evidenceData =
      typeof data.evidence === 'object' && data.evidence !== null
        ? (data.evidence as Record<string, unknown>)
        : data;
    const relevance = String(data.relevance ?? evidenceData.relevance ?? 'high');

    const title = String(evidenceData.title ?? evidenceData.file_name ?? 'Untitled Evidence');
    const description = String(evidenceData.description ?? '');
    const sourcePath = String(
      evidenceData.source_path ??
        evidenceData.source ??
        evidenceData.path ??
        `manual:${Date.now()}`,
    );
    const type = String(evidenceData.type ?? 'document');

    const client = await getApiPool().connect();
    let resultId: number;
    try {
      await client.query('BEGIN');

      // 1. Check if evidence exists by sourcePath
      const existing = await (investigationsQueries.getEvidenceBySourcePath as unknown as any).run(
        { sourcePath },
        client,
      );
      let evidenceId = existing[0]?.id ? Number(existing[0].id) : null;

      if (!evidenceId) {
        const result = await (investigationsQueries.createEvidence as unknown as any).run(
          {
            title,
            description,
            evidenceType: type,
            sourcePath,
            originalFilename: title,
            redFlagRating: Number(evidenceData.red_flag_rating ?? 0),
          },
          client,
        );
        evidenceId = Number(result[0]?.id);
      }

      if (!evidenceId) throw new Error('Failed to create evidence');

      // 2. Link to investigation
      const result = await (investigationsQueries.addEvidenceToInvestigation as unknown as any).run(
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
    const rows = await (investigationsQueries.getTimelineEvents as unknown as any).run(
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
    const result = await (investigationsQueries.createTimelineEvent as unknown as any).run(
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
    await (investigationsQueries.updateTimelineEvent as unknown as any).run(
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
    await (investigationsQueries.deleteTimelineEvent as unknown as any).run({ id }, getApiPool());
    return true;
  },

  getChainOfCustody: async (evidenceId: number) => {
    const rows = await (investigationsQueries.getChainOfCustody as unknown as any).run(
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
    const result = await (investigationsQueries.addChainOfCustody as unknown as any).run(
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
    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');

      const rows = await (investigationsQueries.updateInvestigation as unknown as any).run(
        {
          id,
          title: updates.title || null,
          description: updates.description || null,
          status: updates.status || null,
          scope: updates.scope || null,
        },
        client,
      );

      const updated = rows[0];
      if (!updated) throw new Error('Investigation not found');

      if (updates.collaboratorIds) {
        // Simple sync for now: remove all and re-add
        await client.query('DELETE FROM investigation_collaborators WHERE investigation_id = $1', [
          id,
        ]);
        for (const cId of updates.collaboratorIds) {
          await client.query(
            'INSERT INTO investigation_collaborators (investigation_id, user_id, permission_level, joined_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
            [id, cId, 'editor'],
          );
        }
      }

      await client.query('COMMIT');

      const collaboratorRows = await getApiPool().query(
        `SELECT user_id, permission_level, joined_at
         FROM investigation_collaborators
         WHERE investigation_id = $1`,
        [id],
      );
      const collaborators = collaboratorRows.rows as CollaboratorRow[];

      return mapInvestigation(updated, collaborators);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getNotebook: async (investigationId: number) => {
    const rows = await (investigationsQueries.getNotebook as unknown as any).run(
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
    await (investigationsQueries.saveNotebook as unknown as any).run(
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

  /** Fetch all evidence annotations for an investigation in a single query. */
  getAllEvidenceAnnotations: async (investigationId: number) => {
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
        WHERE investigation_id = $1
        ORDER BY evidence_id ASC, created_at ASC
      `,
      [investigationId],
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
      metadata?: Record<string, unknown>;
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
      metadata?: Record<string, unknown>;
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
    const hypotheses = await (investigationsQueries.getHypotheses as unknown as any).run(
      { investigationId },
      getApiPool(),
    );

    if (hypotheses.length === 0) return [];

    // Fetch ALL evidence links for all these hypotheses in one go to avoid N+1
    const hypothesisIds = hypotheses.map((h: any) => Number(h.id));
    const allEvidenceLinks = await getApiPool().query(
      `SELECT he.*, e.title as evidence_title, e.evidence_type
       FROM hypothesis_evidence he
       LEFT JOIN evidence e ON he.evidence_id = e.id
       WHERE he.hypothesis_id = ANY($1::int[])`,
      [hypothesisIds],
    );

    const linksByHypId = allEvidenceLinks.rows.reduce(
      (acc: Record<number, Record<string, unknown>[]>, link) => {
        const hid = Number(link.hypothesis_id);
        if (!acc[hid]) acc[hid] = [];
        acc[hid].push({
          ...link,
          id: Number(link.id),
          hypothesis_id: hid,
          evidence_id: Number(link.evidence_id),
        });
        return acc;
      },
      {} as Record<number, Record<string, unknown>[]>,
    );

    return hypotheses.map((hyp: any) => ({
      ...hyp,
      id: Number(hyp.id),
      investigation_id: Number(hyp.investigation_id),
      evidenceLinks: linksByHypId[Number(hyp.id)] || [],
    }));
  },

  addHypothesis: async (investigationId: number, data: { title: string; description?: string }) => {
    const result = await (investigationsQueries.createHypothesis as unknown as any).run(
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
    await (investigationsQueries.updateHypothesis as unknown as any).run(
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
    await (investigationsQueries.deleteHypothesis as unknown as any).run({ id }, getApiPool());
    return true;
  },

  addEvidenceToHypothesis: async (
    hypothesisId: number,
    evidenceId: number,
    relevance = 'supporting',
  ) => {
    const result = await (investigationsQueries.addEvidenceToHypothesis as unknown as any).run(
      { hypothesisId, evidenceId, relevance },
      getApiPool(),
    );
    return Number(result[0]?.id || 1);
  },

  removeEvidenceFromHypothesis: async (hypothesisId: number, evidenceId: number) => {
    await (investigationsQueries.removeEvidenceFromHypothesis as unknown as any).run(
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
    const metadata = data.metadata || {};
    const result = await (investigationsQueries.logActivity as unknown as any).run(
      {
        investigationId: data.investigationId,
        userId: data.userId || 'anonymous',
        userName: data.userName || 'Anonymous User',
        actionType: data.actionType,
        targetType: data.targetType || null,
        targetId: data.targetId || null,
        targetTitle: data.targetTitle || null,
        metadata: JSON.stringify(metadata),
        docId: metadata.docId || metadata.document_id || null,
        entId: metadata.entId || metadata.entity_id || null,
        lead_id: metadata.leadId || metadata.lead_id || null,
      },
      getApiPool(),
    );
    return Number(result[0]?.id);
  },

  getActivity: async (investigationId: number, limit = 50) => {
    const rows = await (investigationsQueries.getActivity as unknown as any).run(
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
  getEvidenceByType: async (
    investigationId: number,
    options?: { limit?: number; offset?: number },
  ) => {
    const limit = options?.limit ?? 500;
    const offset = options?.offset ?? 0;

    // We use a raw query here to easily apply limit/offset to the joint view
    const result = await getApiPool().query(
      `SELECT 
        e.id, 
        e.evidence_type as type, 
        e.title, 
        e.description, 
        e.source_path,
        e.metadata_json,
        ie.id as investigation_evidence_id,
        d.id as document_id,
        m.id as media_item_id,
        e.red_flag_rating,
        ie.relevance, 
        ie.added_at, 
        ie.added_by,
        ie.notes
      FROM investigation_evidence ie
      JOIN evidence e ON ie.evidence_id = e.id
      LEFT JOIN documents d ON d.file_path = e.source_path OR e.source_path LIKE '%' || d.file_path || '%'
      LEFT JOIN media_items m ON m.file_path = e.source_path OR e.source_path LIKE '%' || m.file_path || '%'
      WHERE ie.investigation_id = $1 
      ORDER BY ie.added_at DESC
      LIMIT $2 OFFSET $3`,
      [investigationId, limit, offset],
    );

    const enrichedEvidence = result.rows.map((row) => {
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
      const type = String((e as Record<string, unknown>).type || 'other');
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

  getInvestigationStats: async (investigationId: number) => {
    try {
      const { evidenceRepository } = await import('./evidenceRepository.js');
      const summary = await evidenceRepository.getInvestigationEvidenceSummary(
        String(investigationId),
      );

      // totalEntities: Count of unique entities mentioned in any investigation evidence
      const totalEntities = summary.entityCoverage.length;

      // totalDocuments: Total number of evidence records in the investigation
      const totalDocuments = summary.totalEvidence;

      // entitiesWithDocuments: For investigation scoping, this is the count of entities
      // that are explicitly linked via the evidence_entity table in this investigation.
      const entitiesWithDocuments = totalEntities;

      // documentsWithMetadata: Count of documents that have non-empty enrichment/metadata
      const documentsWithMetadata = summary.evidence.filter((e: Record<string, unknown>) => {
        const metadata = e.metadata_json;
        return (
          typeof metadata === 'object' &&
          metadata !== null &&
          Object.keys(metadata as Record<string, unknown>).length > 0
        );
      }).length;

      return {
        totalEntities,
        totalDocuments,
        entitiesWithDocuments,
        documentsWithMetadata,
      };
    } catch (e) {
      logger.error({ err: e, investigationId }, 'Failed to fetch investigation stats');
      return {
        totalEntities: 0,
        totalDocuments: 0,
        entitiesWithDocuments: 0,
        documentsWithMetadata: 0,
      };
    }
  },

  getBoardSnapshot: async (
    investigationId: number,
    options?: { evidenceLimit?: number; hypothesisLimit?: number },
  ) => {
    const evidenceLimit = options?.evidenceLimit ?? 100;
    const hypothesisLimit = options?.hypothesisLimit ?? 100;

    const evidenceRows = await (investigationsQueries.getEvidence as unknown as any).run(
      { investigationId, limit: evidenceLimit, offset: 0 },
      getApiPool(),
    );
    const hypothesesRows = await (investigationsQueries.getHypotheses as unknown as any).run(
      { investigationId },
      getApiPool(),
    );
    const countsResult = await (investigationsQueries.countEvidence as unknown as any).run(
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
    const pool = getApiPool();
    // 1. Find investigations linked via leads and forensic signals
    // 2. Find investigations linked via evidence that mentions the entity in documents
    const result = await pool.query(
      `
      WITH linked_via_leads AS (
        SELECT DISTINCT i.id
        FROM investigations i
        JOIN investigation_leads l ON i.id = l.investigation_id
        JOIN forensic_signal_entities fse ON l.forensic_signal_id = fse.signal_id
        WHERE fse.entity_id = $1::bigint
      ),
      linked_via_mentions AS (
        SELECT DISTINCT i.id
        FROM investigations i
        JOIN investigation_evidence ie ON i.id = ie.investigation_id
        JOIN evidence ev ON ie.evidence_id = ev.id
        LEFT JOIN evidence_entity ee ON ev.id = ee.evidence_id
        LEFT JOIN documents d ON d.file_path = ev.source_path
        LEFT JOIN entity_mentions em ON d.id = em.document_id
        WHERE ee.entity_id = $1::bigint OR em.entity_id = $1::bigint
      )
      SELECT * FROM investigations
      WHERE id IN (SELECT id FROM linked_via_leads UNION SELECT id FROM linked_via_mentions)
      ORDER BY updated_at DESC
      `,
      [BigInt(entityId)],
    );

    return result.rows.map((inv) => mapInvestigation(inv));
  },

  // ─── Leads ──────────────────────────────────────────────────────────────────

  getLeads: async (investigationId: number, options?: { status?: string }) => {
    const pool = getApiPool();
    let sql = `
      SELECT 
        l.*, 
        d.title AS document_title,
        fs.signal_type as "signalType",
        fs.confidence,
        fs.risk_score as "riskScore",
        fs.metadata_json as "signalMetadata",
        (
          SELECT ARRAY_AGG(fse.entity_id)
          FROM forensic_signal_entities fse
          WHERE fse.signal_id = fs.id
        ) as "entityIds",
        (
          SELECT ARRAY_AGG(e.full_name)
          FROM forensic_signal_entities fse
          JOIN entities e ON e.id = fse.entity_id
          WHERE fse.signal_id = fs.id
        ) as "entityNames"
      FROM investigation_leads l
      LEFT JOIN documents d ON l.source_document_id = d.id
      LEFT JOIN forensic_signals fs ON l.forensic_signal_id = fs.id
      WHERE l.investigation_id = $1
    `;
    const queryParams: unknown[] = [investigationId];

    if (options?.status && options.status !== 'all') {
      sql += ` AND l.status = $2`;
      queryParams.push(options.status);
    }

    sql += ` ORDER BY
      CASE l.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
      l.created_at DESC`;

    const result = await pool.query(sql, queryParams);
    return result.rows;
  },

  createLead: async (
    investigationId: number,
    data: {
      title: string;
      description?: string | null;
      status?: string;
      priority?: string;
      source_document_id?: number | null;
      source_efta_ref?: string | null;
      assigned_to?: string | null;
      created_by?: string;
      resolution_notes?: string | null;
    },
  ) => {
    const pool = getApiPool();
    const result = await pool.query(
      `INSERT INTO investigation_leads
        (investigation_id, title, description, status, priority,
         source_document_id, source_efta_ref, assigned_to, created_by, resolution_notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
      [
        investigationId,
        data.title,
        data.description ?? null,
        data.status ?? 'open',
        data.priority ?? 'medium',
        data.source_document_id ?? null,
        data.source_efta_ref ?? null,
        data.assigned_to ?? null,
        data.created_by ?? 'system',
        data.resolution_notes ?? null,
      ],
    );
    return result.rows[0];
  },

  updateLead: async (
    leadId: number,
    investigationId: number,
    updates: {
      title?: string;
      description?: string | null;
      status?: string;
      priority?: string;
      source_document_id?: number | null;
      source_efta_ref?: string | null;
      assigned_to?: string | null;
      resolution_notes?: string | null;
    },
  ) => {
    const pool = getApiPool();
    const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      status: 'status',
      priority: 'priority',
      source_document_id: 'source_document_id',
      source_efta_ref: 'source_efta_ref',
      assigned_to: 'assigned_to',
      resolution_notes: 'resolution_notes',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        setClauses.push(`${col} = $${idx++}`);
        values.push((updates as Record<string, unknown>)[key] ?? null);
      }
    }

    if (updates.status === 'resolved') {
      setClauses.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    values.push(leadId, investigationId);
    const query = `
      UPDATE investigation_leads
      SET ${setClauses.join(', ')}
      WHERE id = $${idx++} AND investigation_id = $${idx}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] ?? null;
  },

  deleteLead: async (leadId: number, investigationId: number) => {
    const pool = getApiPool();
    const result = await pool.query(
      `DELETE FROM investigation_leads WHERE id = $1 AND investigation_id = $2`,
      [leadId, investigationId],
    );
    return (result.rowCount ?? 0) > 0;
  },
};
