import {
  MemoryEntry,
  CreateMemoryEntryInput,
  UpdateMemoryEntryInput,
  MemoryRelationship,
  CreateMemoryRelationshipInput,
  MemoryAuditLog,
  CreateMemoryAuditLogInput,
  MemoryQualityMetrics,
  CreateMemoryQualityMetricsInput,
  MemorySearchFilters,
  MemorySearchResult,
} from '../../types/memory.js';
import pg from 'pg';

const MEMORY_ENTRY_COLUMNS = `
  id,
  uuid,
  memory_type,
  content,
  metadata_json,
  context_tags,
  importance_score,
  created_at,
  updated_at,
  source_id,
  source_type,
  version,
  status,
  quality_score,
  provenance_json
`;

const MEMORY_RELATIONSHIP_COLUMNS = `
  id,
  from_memory_id,
  to_memory_id,
  relationship_type,
  strength,
  created_at,
  updated_at
`;

const MEMORY_AUDIT_COLUMNS = `
  id,
  memory_entry_id,
  action,
  actor,
  timestamp,
  old_values_json,
  new_values_json,
  metadata_json
`;

const MEMORY_QUALITY_COLUMNS = `
  id,
  memory_entry_id,
  source_reliability,
  evidence_strength,
  temporal_relevance,
  entity_confidence,
  overall_score,
  calculated_at
`;

export const memoryRepository = {
  /**
   * Creates a new memory entry
   */
  createMemoryEntry: async (pool: pg.Pool, input: CreateMemoryEntryInput): Promise<MemoryEntry> => {
    const sql = `
      INSERT INTO memory_entries (
        uuid, memory_type, content, metadata_json, context_tags, 
        importance_score, source_id, source_type, quality_score, provenance_json
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10
      )
      RETURNING id
    `;

    const res = await pool.query(sql, [
      input.uuid || globalThis.crypto.randomUUID(),
      input.memoryType,
      input.content,
      JSON.stringify(input.metadata || {}),
      JSON.stringify(input.contextTags || []),
      input.importanceScore || 0.5,
      input.sourceId,
      input.sourceType,
      0.5,
      JSON.stringify(input.provenance || {}),
    ]);

    const newId = res.rows[0].id;
    const newEntry = await memoryRepository.getMemoryEntryById(pool, newId);
    if (!newEntry) throw new Error('Failed to retrieve created memory entry');
    return newEntry;
  },

  /**
   * Gets a memory entry by ID
   */
  getMemoryEntryById: async (pool: pg.Pool, id: number): Promise<MemoryEntry | null> => {
    const res = await pool.query(
      `SELECT ${MEMORY_ENTRY_COLUMNS} FROM memory_entries WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      uuid: row.uuid,
      memoryType: row.memory_type,
      content: row.content,
      metadata: row.metadata_json
        ? typeof row.metadata_json === 'string'
          ? JSON.parse(row.metadata_json)
          : row.metadata_json
        : {},
      contextTags: row.context_tags
        ? typeof row.context_tags === 'string'
          ? JSON.parse(row.context_tags)
          : row.context_tags
        : [],
      importanceScore: row.importance_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceId: row.source_id,
      sourceType: row.source_type,
      version: row.version,
      status: row.status,
      qualityScore: row.quality_score,
      provenance: row.provenance_json
        ? typeof row.provenance_json === 'string'
          ? JSON.parse(row.provenance_json)
          : row.provenance_json
        : undefined,
    };
  },

  /**
   * Updates a memory entry
   */
  updateMemoryEntry: async (
    pool: pg.Pool,
    id: number,
    input: UpdateMemoryEntryInput,
  ): Promise<MemoryEntry | null> => {
    const updateFields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.content !== undefined) {
      updateFields.push(`content = $${i++}`);
      values.push(input.content);
    }
    if (input.metadata !== undefined) {
      updateFields.push(`metadata_json = $${i++}`);
      values.push(JSON.stringify(input.metadata));
    }
    if (input.contextTags !== undefined) {
      updateFields.push(`context_tags = $${i++}`);
      values.push(JSON.stringify(input.contextTags));
    }
    if (input.importanceScore !== undefined) {
      updateFields.push(`importance_score = $${i++}`);
      values.push(input.importanceScore);
    }
    if (input.sourceId !== undefined) {
      updateFields.push(`source_id = $${i++}`);
      values.push(input.sourceId);
    }
    if (input.sourceType !== undefined) {
      updateFields.push(`source_type = $${i++}`);
      values.push(input.sourceType);
    }
    if (input.status !== undefined) {
      updateFields.push(`status = $${i++}`);
      values.push(input.status);
    }
    if (input.provenance !== undefined) {
      updateFields.push(`provenance_json = $${i++}`);
      values.push(JSON.stringify(input.provenance));
    }

    if (updateFields.length === 0) {
      return await memoryRepository.getMemoryEntryById(pool, id);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    const sql = `UPDATE memory_entries SET ${updateFields.join(', ')} WHERE id = $${i}`;

    await pool.query(sql, values);
    return await memoryRepository.getMemoryEntryById(pool, id);
  },

  /**
   * Deletes a memory entry
   */
  deleteMemoryEntry: async (pool: pg.Pool, id: number): Promise<boolean> => {
    const res = await pool.query('DELETE FROM memory_entries WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  },

  /**
   * Searches memory entries based on filters
   */
  searchMemoryEntries: async (
    pool: pg.Pool,
    filters: MemorySearchFilters = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<MemorySearchResult> => {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.memoryType) {
      conditions.push(`memory_type = $${i++}`);
      params.push(filters.memoryType);
    }
    if (filters.status) {
      conditions.push(`status = $${i++}`);
      params.push(filters.status);
    }
    if (filters.minImportance !== undefined) {
      conditions.push(`importance_score >= $${i++}`);
      params.push(filters.minImportance);
    }
    if (filters.maxImportance !== undefined) {
      conditions.push(`importance_score <= $${i++}`);
      params.push(filters.maxImportance);
    }
    if (filters.startDate) {
      conditions.push(`created_at >= $${i++}`);
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`created_at <= $${i++}`);
      params.push(filters.endDate);
    }
    if (filters.sourceId) {
      conditions.push(`source_id = $${i++}`);
      params.push(filters.sourceId);
    }
    if (filters.sourceType) {
      conditions.push(`source_type = $${i++}`);
      params.push(filters.sourceType);
    }
    if (filters.contextTag) {
      conditions.push(`context_tags::text ILIKE $${i++}`);
      params.push(`%${filters.contextTag}%`);
    }
    if (filters.searchQuery) {
      // Native Postgres full-text search
      conditions.push(`content_search_vector @@ websearch_to_tsquery('english', $${i++})`);
      params.push(filters.searchQuery);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM memory_entries ${whereClause}`,
      params,
    );
    const totalCount = parseInt(countRes.rows[0].total, 10);

    // Fetch data
    const queryParams = [...params, limit, offset];
    const dataSql = `
      SELECT ${MEMORY_ENTRY_COLUMNS} FROM memory_entries
      ${whereClause}
      ORDER BY importance_score DESC, created_at DESC
      LIMIT $${i++} OFFSET $${i++}
    `;

    const res = await pool.query(dataSql, queryParams);
    const data = res.rows.map((row) => ({
      id: row.id,
      uuid: row.uuid,
      memoryType: row.memory_type,
      content: row.content,
      metadata: row.metadata_json
        ? typeof row.metadata_json === 'string'
          ? JSON.parse(row.metadata_json)
          : row.metadata_json
        : {},
      contextTags: row.context_tags
        ? typeof row.context_tags === 'string'
          ? JSON.parse(row.context_tags)
          : row.context_tags
        : [],
      importanceScore: row.importance_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceId: row.source_id,
      sourceType: row.source_type,
      version: row.version,
      status: row.status,
      qualityScore: row.quality_score,
      provenance: row.provenance_json
        ? typeof row.provenance_json === 'string'
          ? JSON.parse(row.provenance_json)
          : row.provenance_json
        : undefined,
    }));

    return {
      data,
      total: totalCount,
      page,
      pageSize: limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  /**
   * Creates a relationship between two memory entries
   */
  createMemoryRelationship: async (
    pool: pg.Pool,
    input: CreateMemoryRelationshipInput,
  ): Promise<MemoryRelationship> => {
    const sql = `
      INSERT INTO memory_relationships (
        from_memory_id, to_memory_id, relationship_type, strength
      ) VALUES (
        $1, $2, $3, $4
      )
      RETURNING id
    `;

    const res = await pool.query(sql, [
      input.fromMemoryId,
      input.toMemoryId,
      input.relationshipType,
      input.strength || 1.0,
    ]);

    const newId = res.rows[0].id;
    const newRelationship = await memoryRepository.getMemoryRelationshipById(pool, newId);
    if (!newRelationship) throw new Error('Failed to retrieve created memory relationship');
    return newRelationship;
  },

  /**
   * Gets a memory relationship by ID
   */
  getMemoryRelationshipById: async (
    pool: pg.Pool,
    id: number,
  ): Promise<MemoryRelationship | null> => {
    const res = await pool.query(
      `SELECT ${MEMORY_RELATIONSHIP_COLUMNS} FROM memory_relationships WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];

    if (!row) return null;

    return {
      id: row.id,
      fromMemoryId: row.from_memory_id,
      toMemoryId: row.to_memory_id,
      relationshipType: row.relationship_type,
      strength: row.strength,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Gets relationships for a memory entry
   */
  getMemoryRelationships: async (
    pool: pg.Pool,
    memoryId: number,
  ): Promise<MemoryRelationship[]> => {
    const res = await pool.query(
      `
      SELECT ${MEMORY_RELATIONSHIP_COLUMNS} FROM memory_relationships
      WHERE from_memory_id = $1 OR to_memory_id = $1
      ORDER BY strength DESC
    `,
      [memoryId],
    );

    return res.rows.map((row) => ({
      id: row.id,
      fromMemoryId: row.from_memory_id,
      toMemoryId: row.to_memory_id,
      relationshipType: row.relationship_type,
      strength: row.strength,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Logs an audit event for a memory operation
   */
  logMemoryAuditEvent: async (pool: pg.Pool, input: CreateMemoryAuditLogInput): Promise<void> => {
    const sql = `
      INSERT INTO memory_audit_log (
        memory_entry_id, action, actor, old_values_json, new_values_json, metadata_json
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      )
    `;

    await pool.query(sql, [
      input.memoryEntryId,
      input.action,
      input.actor,
      input.oldValues ? JSON.stringify(input.oldValues) : null,
      input.newValues ? JSON.stringify(input.newValues) : null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]);
  },

  /**
   * Gets audit log for a memory entry
   */
  getMemoryAuditLog: async (pool: pg.Pool, memoryEntryId: number): Promise<MemoryAuditLog[]> => {
    const res = await pool.query(
      `
      SELECT ${MEMORY_AUDIT_COLUMNS} FROM memory_audit_log
      WHERE memory_entry_id = $1
      ORDER BY timestamp DESC
    `,
      [memoryEntryId],
    );

    return res.rows.map((row) => ({
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      action: row.action as 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS',
      actor: row.actor,
      timestamp: row.timestamp,
      oldValues: row.old_values_json
        ? typeof row.old_values_json === 'string'
          ? JSON.parse(row.old_values_json)
          : row.old_values_json
        : undefined,
      newValues: row.new_values_json
        ? typeof row.new_values_json === 'string'
          ? JSON.parse(row.new_values_json)
          : row.new_values_json
        : undefined,
      metadata: row.metadata_json
        ? typeof row.metadata_json === 'string'
          ? JSON.parse(row.metadata_json)
          : row.metadata_json
        : undefined,
    }));
  },

  /**
   * Creates quality metrics for a memory entry
   */
  createMemoryQualityMetrics: async (
    pool: pg.Pool,
    input: CreateMemoryQualityMetricsInput,
  ): Promise<MemoryQualityMetrics> => {
    const sql = `
      INSERT INTO memory_quality_metrics (
        memory_entry_id, source_reliability, evidence_strength, 
        temporal_relevance, entity_confidence
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      RETURNING id
    `;

    const res = await pool.query(sql, [
      input.memoryEntryId,
      input.sourceReliability,
      input.evidenceStrength,
      input.temporalRelevance,
      input.entityConfidence,
    ]);

    const newId = res.rows[0].id;
    const newMetrics = await memoryRepository.getMemoryQualityMetricsById(pool, newId);
    if (!newMetrics) throw new Error('Failed to retrieve created memory quality metrics');
    return newMetrics;
  },

  /**
   * Gets quality metrics for a memory entry
   */
  getMemoryQualityMetricsById: async (
    pool: pg.Pool,
    id: number,
  ): Promise<MemoryQualityMetrics | null> => {
    const res = await pool.query(
      `SELECT ${MEMORY_QUALITY_COLUMNS} FROM memory_quality_metrics WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];

    if (!row) return null;

    return {
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      sourceReliability: row.source_reliability,
      evidenceStrength: row.evidence_strength,
      temporalRelevance: row.temporal_relevance,
      entityConfidence: row.entity_confidence,
      overallScore: row.overall_score,
      calculatedAt: row.calculated_at,
    };
  },

  /**
   * Gets the latest quality metrics for a memory entry
   */
  getLatestMemoryQualityMetrics: async (
    pool: pg.Pool,
    memoryEntryId: number,
  ): Promise<MemoryQualityMetrics | null> => {
    const sql = `
      SELECT ${MEMORY_QUALITY_COLUMNS} FROM memory_quality_metrics
      WHERE memory_entry_id = $1
      ORDER BY calculated_at DESC
      LIMIT 1
    `;
    const res = await pool.query(sql, [memoryEntryId]);
    const row = res.rows[0];

    if (!row) return null;

    return {
      id: row.id,
      memoryEntryId: row.memory_entry_id,
      sourceReliability: row.source_reliability,
      evidenceStrength: row.evidence_strength,
      temporalRelevance: row.temporal_relevance,
      entityConfidence: row.entity_confidence,
      overallScore: row.overall_score,
      calculatedAt: row.calculated_at,
    };
  },

  /**
   * Gets audit logs for a memory entry
   */
  getMemoryAuditLogs: async (pool: pg.Pool, memoryEntryId: number): Promise<MemoryAuditLog[]> => {
    return await memoryRepository.getMemoryAuditLog(pool, memoryEntryId);
  },

  /**
   * Gets quality metrics for a memory entry (alias for getMemoryQualityMetricsById)
   */
  getQualityMetrics: async (
    pool: pg.Pool,
    memoryEntryId: number,
  ): Promise<MemoryQualityMetrics | null> => {
    return await memoryRepository.getLatestMemoryQualityMetrics(pool, memoryEntryId);
  },

  /**
   * Updates quality metrics for a memory entry
   */
  updateQualityMetrics: async (
    pool: pg.Pool,
    memoryEntryId: number,
    metrics: {
      sourceReliability: number;
      evidenceStrength: number;
      temporalRelevance: number;
      entityConfidence: number;
    },
  ): Promise<MemoryQualityMetrics> => {
    return await memoryRepository.createMemoryQualityMetrics(pool, {
      memoryEntryId,
      ...metrics,
    });
  },
};
