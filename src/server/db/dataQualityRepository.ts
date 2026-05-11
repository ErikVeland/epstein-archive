import { getApiPool } from './connection.js';

/**
 * Data Quality Repository
 *
 * Provides data quality metrics, provenance tracking, and audit trail functionality
 * for the Epstein Archive investigative platform.
 */

export interface DataQualityMetrics {
  totalDocuments: number;
  documentsWithProvenance: number;
  documentsWithoutProvenance: number;
  provenanceCoverage: number;

  ocrQualityDistribution: { band: string; count: number }[];
  sourceCollections: { name: string; count: number }[];
  evidenceTypeDistribution: { type: string; count: number }[];

  entityQuality: {
    total: number;
    withRoles: number;
    withRedFlagDescription: number;
    orphaned: number;
  };

  dataCompleteness: {
    documentsWithContent: number;
    documentsWithMetadata: number;
    entitiesWithMentions: number;
  };

  lastUpdated: string;
}

export interface AuditLogEntry {
  id?: number;
  timestamp?: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}

export const dataQualityRepository = {
  /**
   * Get comprehensive data quality metrics
   */
  getMetrics: async (): Promise<DataQualityMetrics> => {
    const pool = getApiPool();

    // Document counts
    const { rows: totalRows } = await pool.query('SELECT COUNT(*) as c FROM documents');
    const totalDocs = totalRows[0];

    const { rows: provenanceRows } = await pool.query(
      `
      SELECT COUNT(*) as c
      FROM documents
      WHERE COALESCE(provenance_score, 0) >= 60
         OR COALESCE(provenance_status, '') IN ('substantial', 'verified')
      `,
    );
    const docsWithProvenance = provenanceRows[0];

    // OCR Quality Distribution
    const { rows: ocrQuality } = await pool.query(
      `
      SELECT 
        CASE 
          WHEN ocr_quality_score >= 0.8 THEN 'High (80%+)'
          WHEN ocr_quality_score >= 0.5 THEN 'Medium (50-80%)'
          WHEN ocr_quality_score > 0 THEN 'Low (<50%)'
          ELSE 'Not Processed'
        END as band,
        COUNT(*) as count
      FROM documents
      GROUP BY band
      ORDER BY 
        CASE 
          WHEN band = 'High (80%+)' THEN 1
          WHEN band = 'Medium (50-80%)' THEN 2
          WHEN band = 'Low (<50%)' THEN 3
          ELSE 4
        END
    `,
    );

    // Source Collections
    const { rows: sourceCollections } = await pool.query(
      `
      SELECT 
        COALESCE(source_collection, 'Unknown/Untagged') as name,
        COUNT(*) as count
      FROM documents
      GROUP BY source_collection
      ORDER BY count DESC
      LIMIT 20
    `,
    );

    // Evidence Types
    const { rows: evidenceTypes } = await pool.query(
      `
      SELECT 
        COALESCE(evidence_type, 'unclassified') as type,
        COUNT(*) as count
      FROM documents
      GROUP BY evidence_type
      ORDER BY count DESC
    `,
    );

    // Entity Quality
    const { rows: entityRows } = await pool.query(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN primary_role IS NOT NULL AND primary_role != 'Unknown' THEN 1 ELSE 0 END) as "withRoles",
        SUM(CASE WHEN red_flag_description IS NOT NULL AND red_flag_description != '' THEN 1 ELSE 0 END) as "withRedFlagDescription"
      FROM entities
    `,
    );
    const entityQuality = entityRows[0] as {
      total: string;
      withRoles: string | null;
      withRedFlagDescription: string | null;
    };

    // Orphaned entities (no mentions)
    const { rows: orphanedRows } = await pool.query(
      `
      SELECT COUNT(*) as c FROM entities e
      WHERE NOT EXISTS (SELECT 1 FROM entity_mentions em WHERE em.entity_id = e.id)
    `,
    );
    const orphanedEntities = orphanedRows[0];

    // Data Completeness
    const { rows: contentRows } = await pool.query(
      'SELECT COUNT(*) as c FROM documents WHERE content IS NOT NULL AND length(content) > 100',
    );
    const docsWithContent = contentRows[0];

    const { rows: metadataRows } = await pool.query(
      'SELECT COUNT(*) as c FROM documents WHERE metadata_json IS NOT NULL',
    );
    const docsWithMetadata = metadataRows[0];

    const { rows: mentionRows } = await pool.query(
      `
      SELECT COUNT(DISTINCT entity_id) as c FROM entity_mentions
    `,
    );
    const entitiesWithMentions = mentionRows[0];

    const totalC = parseInt(totalDocs.c, 10);
    const provC = parseInt(docsWithProvenance.c, 10);
    const provenanceCoverage = totalC > 0 ? Math.round((provC / totalC) * 100 * 10) / 10 : 0;

    return {
      totalDocuments: totalC,
      documentsWithProvenance: provC,
      documentsWithoutProvenance: totalC - provC,
      provenanceCoverage,

      ocrQualityDistribution: ocrQuality.map((r: { band: string; count: string }) => ({
        band: r.band,
        count: parseInt(r.count, 10),
      })),
      sourceCollections: sourceCollections.map((r: { name: string; count: string }) => ({
        name: r.name,
        count: parseInt(r.count, 10),
      })),
      evidenceTypeDistribution: evidenceTypes.map((r: { type: string; count: string }) => ({
        type: r.type,
        count: parseInt(r.count, 10),
      })),

      entityQuality: {
        total: parseInt(entityQuality.total, 10),
        withRoles: parseInt(entityQuality.withRoles || '0', 10),
        withRedFlagDescription: parseInt(entityQuality.withRedFlagDescription || '0', 10),
        orphaned: parseInt(orphanedEntities.c, 10),
      },

      dataCompleteness: {
        documentsWithContent: parseInt(docsWithContent.c, 10),
        documentsWithMetadata: parseInt(docsWithMetadata.c, 10),
        entitiesWithMentions: parseInt(entitiesWithMentions.c, 10),
      },

      lastUpdated: new Date().toISOString(),
    };
  },

  /**
   * Add an entry to the audit log
   */
  logAudit: async (entry: AuditLogEntry): Promise<number> => {
    const pool = getApiPool();
    const payload = entry.payload || {};
    const { rows } = await pool.query(
      `
      INSERT INTO audit_log (actor_id, action, target_type, target_id, payload_json, doc_id, ent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
      [
        entry.actorId || 'system',
        entry.action,
        entry.targetType,
        entry.targetId || null,
        JSON.stringify(payload),
        entry.targetType === 'document'
          ? entry.targetId
          : payload.docId || payload.document_id || null,
        entry.targetType === 'entity' ? entry.targetId : payload.entId || payload.entity_id || null,
      ],
    );

    return parseInt(rows[0].id, 10);
  },

  /**
   * Get audit log entries, optionally filtered
   */
  getAuditLog: async (
    filters: { targetType?: string; targetId?: string; action?: string } = {},
    limit: number = 100,
  ): Promise<AuditLogEntry[]> => {
    const pool = getApiPool();

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramCounter = 1;

    if (filters.targetType) {
      conditions.push(`target_type = $${paramCounter++}`);
      params.push(filters.targetType);
    }
    if (filters.targetId) {
      conditions.push(`target_id = $${paramCounter++}`);
      params.push(filters.targetId);
    }
    if (filters.action) {
      conditions.push(`action = $${paramCounter++}`);
      params.push(filters.action);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit);

    const { rows } = await pool.query(
      `
      SELECT id, timestamp, actor_id as "actorId", action, target_type as "targetType", 
             target_id as "targetId", payload_json as "payloadJson"
      FROM audit_log
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramCounter}
    `,
      params,
    );

    return rows.map(
      (row: {
        id: number;
        timestamp: string;
        actorId: string;
        action: string;
        targetType: string;
        targetId: string;
        payloadJson: string | Record<string, unknown> | null;
      }) => ({
        id: row.id,
        timestamp: row.timestamp,
        actorId: row.actorId,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        payload: row.payloadJson
          ? typeof row.payloadJson === 'string'
            ? JSON.parse(row.payloadJson)
            : row.payloadJson
          : undefined,
      }),
    );
  },

  /**
   * Get document provenance/lineage information
   */
  getDocumentLineage: async (
    documentId: string | number,
  ): Promise<Record<string, unknown> | null> => {
    const pool = getApiPool();

    // Get document with provenance info
    const { rows: docRows } = await pool.query(
      `
      SELECT 
        d.id,
        d.file_name,
        d.source_collection,
        NULL::text AS source_original_url,
        d.source_path,
        d.source_url,
        d.source_system,
        d.source_release,
        d.source_acquisition_method,
        d.provenance_status,
        d.provenance_score,
        d.credibility_score,
        d.original_file_id,
        d.ocr_engine,
        d.ocr_quality_score,
        d.ocr_processed_at,
        d.created_at,
        orig.file_name as original_document_name,
        orig.file_path as original_document_path
      FROM documents d
      LEFT JOIN documents orig ON d.original_file_id = orig.id
      WHERE d.id = $1
    `,
      [documentId],
    );

    const doc = docRows[0];
    if (!doc) return null;

    // Get child documents (e.g., pages extracted from this document)
    const { rows: children } = await pool.query(
      `
      SELECT id, file_name, page_number
      FROM documents
      WHERE parent_document_id = $1
      ORDER BY page_number ASC
    `,
      [documentId],
    );

    const { rows: provenanceEvents } = await pool.query(
      `
      SELECT
        id,
        event_type,
        event_order,
        actor_type,
        actor_id,
        tool_name,
        tool_version,
        input_asset_id,
        output_asset_id,
        input_document_id,
        parent_document_id,
        source_collection,
        source_path,
        source_url,
        file_sha256,
        text_sha256,
        metadata_json,
        occurred_at
      FROM document_provenance_events
      WHERE document_id = $1
      ORDER BY occurred_at ASC, event_order ASC, id ASC
    `,
      [documentId],
    );

    // Get related audit entries
    const { rows: auditEntries } = await pool.query(
      `
      SELECT timestamp, actor_id, action, payload_json
      FROM audit_log
      WHERE (target_type = 'document' AND target_id = $1)
         OR (doc_id = $1)
      ORDER BY timestamp DESC
      LIMIT 20
    `,
      [String(documentId)],
    );

    return {
      document: doc,
      originalDocument: doc.original_file_id
        ? {
            id: doc.original_file_id,
            fileName: doc.original_document_name,
            filePath: doc.original_document_path,
          }
        : null,
      childDocuments: children,
      processingInfo: {
        ocrEngine: doc.ocr_engine,
        ocrQualityScore: doc.ocr_quality_score,
        processedAt: doc.ocr_processed_at,
      },
      provenance: {
        status: doc.provenance_status,
        score: doc.provenance_score,
        sourceSystem: doc.source_system,
        sourceRelease: doc.source_release,
        sourcePath: doc.source_path,
        sourceUrl: doc.source_url || doc.source_original_url,
        acquisitionMethod: doc.source_acquisition_method,
      },
      provenanceEvents,
      auditTrail: auditEntries.map(
        (e: {
          timestamp: string;
          actor_id: string;
          action: string;
          payload_json: string | Record<string, unknown> | null;
        }) => ({
          timestamp: e.timestamp,
          user: e.actor_id,
          action: e.action,
          details: e.payload_json
            ? typeof e.payload_json === 'string'
              ? JSON.parse(e.payload_json)
              : e.payload_json
            : null,
        }),
      ),
    };
  },

  /**
   * Get entity confidence scoring based on evidence quality
   */
  getEntityConfidence: async (
    entityId: string | number,
  ): Promise<Record<string, unknown> | null> => {
    const pool = getApiPool();

    const { rows: entityRows } = await pool.query('SELECT * FROM entities WHERE id = $1', [
      entityId,
    ]);
    const entity = entityRows[0];
    if (!entity) return null;

    // Count mentions by evidence type
    const { rows: mentionsByType } = await pool.query(
      `
      SELECT d.evidence_type, COUNT(*) as count
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE em.entity_id = $1
      GROUP BY d.evidence_type
    `,
      [entityId],
    );

    // Count high-quality OCR sources
    const { rows: highQualityRows } = await pool.query(
      `
      SELECT COUNT(DISTINCT d.id) as c
      FROM entity_mentions em
      JOIN documents d ON em.document_id = d.id
      WHERE em.entity_id = $1 AND d.ocr_quality_score >= 0.8
    `,
      [entityId],
    );
    const highQualitySources = highQualityRows[0];

    // Calculate confidence score (0-100)
    const totalMentions = mentionsByType.reduce(
      (sum: number, m: { evidence_type: string; count: string }) => sum + parseInt(m.count, 10),
      0,
    );
    const typeWeights: Record<string, number> = {
      legal: 1.0,
      testimony: 0.9,
      flight_log: 0.85,
      financial: 0.8,
      email: 0.7,
      document: 0.6,
      photo: 0.5,
      article: 0.4,
    };

    let weightedScore = 0;
    let totalWeight = 0;
    for (const m of mentionsByType) {
      const weight = typeWeights[m.evidence_type] || 0.5;
      const count = parseInt(m.count, 10);
      weightedScore += weight * count;
      totalWeight += count;
    }

    const baseConfidence = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
    const hqCount = parseInt(highQualitySources.c, 10);
    const qualityBonus = hqCount > 10 ? 10 : hqCount;
    const confidence = Math.min(100, Math.round(baseConfidence + qualityBonus));

    return {
      entityId,
      entityName: entity.full_name,
      confidenceScore: confidence,
      evidenceBreakdown: mentionsByType.map((m: { evidence_type: string; count: string }) => ({
        evidence_type: m.evidence_type,
        count: parseInt(m.count, 10),
      })),
      highQualitySources: hqCount,
      totalMentions,
      confidenceLevel: confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low',
    };
  },
};
