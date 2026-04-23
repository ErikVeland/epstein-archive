import { evidenceQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

// Helper to call pgtyped query objects whose method signatures aren't fully
// reflected in the generated types (e.g. optional/extended queries).
function runQuery<TParams, TRow>(
  query: unknown,
  params: TParams,
  pool: ReturnType<typeof getApiPool>,
): Promise<TRow[]> {
  return (query as { run(p: TParams, c: typeof pool): Promise<TRow[]> }).run(params, pool);
}

export const evidenceRepository = {
  // Get evidence summary for a specific entity
  getEntityEvidence: async (entityId: string) => {
    // Get entity details
    const [entity] = await evidenceQueries.getEntitySummary.run({ entityId }, getApiPool());

    if (!entity) {
      return null;
    }

    // Get evidence linked to this entity
    const evidenceRecords = await runQuery<
      { entityId: string; limit: number; offset: number },
      { redFlagRating?: number; confidence?: number }
    >(evidenceQueries.getEntityEvidence, { entityId, limit: 100, offset: 0 }, getApiPool());

    // Get evidence type breakdown
    const typeBreakdown = await runQuery<{ entityId: string }, unknown>(
      evidenceQueries.getEvidenceTypeBreakdownByEntity,
      { entityId },
      getApiPool(),
    );

    // Get role breakdown
    const roleBreakdown = await runQuery<{ entityId: string }, unknown>(
      evidenceQueries.getRoleBreakdownByEntity,
      { entityId },
      getApiPool(),
    );

    // Get red flag distribution
    const redFlagDistribution = await runQuery<{ entityId: string }, unknown>(
      evidenceQueries.getRedFlagDistributionByEntity,
      { entityId },
      getApiPool(),
    );

    // Get related entities (entities that appear in same evidence)
    const relatedEntities = await runQuery<{ entityId: string; limit: number }, unknown>(
      evidenceQueries.getRelatedEntitiesByEntity,
      { entityId, limit: 20 },
      getApiPool(),
    );

    return {
      entity,
      evidence: evidenceRecords,
      stats: {
        totalEvidence: Number(evidenceRecords.length),
        typeBreakdown,
        roleBreakdown,
        redFlagDistribution,
        relatedEntities,
        highRiskCount: evidenceRecords.filter(
          (e) => ((e.redFlagRating as number | undefined) || 0) >= 4,
        ).length,
        averageConfidence:
          evidenceRecords.reduce(
            (sum: number, e) => sum + ((e.confidence as number | undefined) || 0),
            0,
          ) / evidenceRecords.length || 0,
      },
    };
  },
  addSnippetToInvestigation: async (
    investigationId: string,
    documentId: string,
    snippetText: string,
    notes: string,
    relevance: string,
  ) => {
    interface DocRow {
      id: number;
      file_path?: string;
      file_name?: string;
      evidence_type?: string;
      red_flag_rating?: number;
    }
    const [doc] = await runQuery<{ id: string }, DocRow>(
      evidenceQueries.getDocumentDetailsForEvidence,
      { id: documentId },
      getApiPool(),
    );
    if (!doc) {
      throw new Error('Document not found');
    }
    const sourcePath = doc.file_path || `doc:${doc.id}`;

    const client = await getApiPool().connect();
    try {
      await client.query('BEGIN');

      const [evidenceIdRow] = await runQuery<
        {
          evidenceType: string;
          sourcePath: string;
          originalFilename: string;
          title: string;
          description: string;
          extractedText: string;
          redFlagRating: number;
          evidenceTags: string;
          metadata: string;
        },
        { id: number }
      >(
        evidenceQueries.createEvidenceFull,
        {
          evidenceType: doc.evidence_type || 'investigative_report',
          sourcePath,
          originalFilename: doc.file_name || `Document ${doc.id}`,
          title: `Snippet from ${doc.file_name || 'Document'} (${doc.id})`,
          description: notes || '',
          extractedText: snippetText || '',
          redFlagRating: doc.red_flag_rating || 0,
          evidenceTags: '[]',
          metadata: JSON.stringify({ document_id: doc.id }),
        },
        client as unknown as ReturnType<typeof getApiPool>,
      );
      const evidenceId = String(evidenceIdRow.id);

      const [link] = await runQuery<
        { investigationId: string; evidenceId: string; notes: string; relevance: string },
        { id: number }
      >(
        evidenceQueries.addEvidenceToInvestigation,
        {
          investigationId,
          evidenceId,
          notes: notes || '',
          relevance: relevance || 'medium',
        },
        client as unknown as ReturnType<typeof getApiPool>,
      );

      await client.query('COMMIT');

      const [evidence] = await runQuery<{ id: string }, unknown>(
        evidenceQueries.getEvidenceByIdDetailed,
        { id: evidenceId },
        getApiPool(),
      );
      return {
        investigationEvidenceId: link.id,
        evidence,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Add evidence to an investigation session
  addEvidenceToInvestigation: async (
    investigationId: string,
    evidenceId: string,
    notes: string,
    relevance: string,
  ) => {
    // Get evidence details
    const [evidence] = await runQuery<{ id: string }, unknown>(
      evidenceQueries.getEvidenceByIdDetailed,
      { id: evidenceId },
      getApiPool(),
    );

    if (!evidence) {
      throw new Error('Evidence not found');
    }

    // Get entities linked to this evidence
    const entities = await runQuery<{ evidenceId: string }, unknown>(
      evidenceQueries.getEvidenceEntities,
      { evidenceId },
      getApiPool(),
    );

    // Insert into investigation_evidence table
    const [result] = await runQuery<
      { investigationId: string; evidenceId: string; notes: string; relevance: string },
      { id: number }
    >(
      evidenceQueries.addEvidenceToInvestigation,
      {
        investigationId,
        evidenceId,
        notes: notes || '',
        relevance: relevance || 'medium',
      },
      getApiPool(),
    );

    return {
      investigationEvidenceId: result.id,
      evidence,
      entities,
    };
  },
  addMediaToInvestigation: async (
    investigationId: string,
    mediaItemId: string,
    notes: string,
    relevance: string,
  ) => {
    interface MediaItemRow {
      id: number;
      filePath: string;
      fileType?: string;
      title?: string;
      description?: string;
      redFlagRating?: number;
      metadataJson?: string | Record<string, unknown>;
    }
    const [media] = await runQuery<{ id: string }, MediaItemRow>(
      evidenceQueries.getMediaItemForEvidence,
      { id: mediaItemId },
      getApiPool(),
    );
    if (!media) {
      throw new Error('Media not found');
    }
    const sourcePath = media.filePath;
    const [existing] = await runQuery<{ sourcePath: string }, { id: number }>(
      evidenceQueries.getEvidenceBySourcePath,
      { sourcePath },
      getApiPool(),
    );

    let evidenceId: string;
    if (existing) {
      evidenceId = String(existing.id);
    } else {
      let metadata: Record<string, unknown> = {};
      try {
        metadata =
          typeof media.metadataJson === 'string'
            ? (JSON.parse(media.metadataJson) as Record<string, unknown>)
            : (media.metadataJson as Record<string, unknown>) || {};
      } catch (err) {
        // Previously this fell back silently to {} which can mask metadata corruption.
        logger.warn(
          {
            err,
            mediaItemId,
            metadataLength:
              typeof media.metadataJson === 'string' ? media.metadataJson.length : null,
          },
          '[Evidence] Failed to parse media metadataJson; falling back to {}',
        );
        metadata = {};
      }
      const transcriptText =
        (metadata.external_transcript_text as string | undefined) ||
        (Array.isArray(metadata.transcript)
          ? (metadata.transcript as Array<{ text: string }>).map((s) => s.text).join('\n')
          : null);
      const evidenceType =
        media.fileType === 'audio' ? 'audio' : media.fileType === 'video' ? 'video' : 'media_scan';

      const tags = await runQuery<{ mediaItemId: string }, { name: string }>(
        evidenceQueries.getMediaItemTags,
        { mediaItemId },
        getApiPool(),
      );
      const evidenceTags = JSON.stringify(tags.map((t) => t.name));

      const client = await getApiPool().connect();
      try {
        await client.query('BEGIN');

        const [ins] = await runQuery<
          {
            evidenceType: string;
            sourcePath: string;
            originalFilename: string;
            title: string;
            description: string;
            extractedText: string;
            redFlagRating: number;
            evidenceTags: string;
            metadata: string;
          },
          { id: number }
        >(
          evidenceQueries.createEvidenceFull,
          {
            evidenceType,
            sourcePath,
            originalFilename: sourcePath ? sourcePath.split('/').pop()! : `media_${media.id}`,
            title: media.title || `Media ${media.id}`,
            description: media.description || '',
            extractedText: transcriptText || '',
            redFlagRating: Number(media.redFlagRating || 0),
            evidenceTags,
            metadata: JSON.stringify({
              media_item_id: media.id,
              file_type: media.fileType,
              duration: metadata.duration,
              chapters: metadata.chapters,
            }),
          },
          client as unknown as ReturnType<typeof getApiPool>,
        );
        evidenceId = String(ins.id);

        interface MediaPersonRow {
          entity_id: number;
          role?: string;
        }
        const people = await runQuery<{ mediaItemId: string }, MediaPersonRow>(
          evidenceQueries.getMediaItemPeople,
          { mediaItemId },
          getApiPool(),
        );
        if (people.length > 0) {
          // Batch insert all entity links in one query instead of N+1 individual inserts
          const values = people.map((_: MediaPersonRow, i: number) => {
            const base = i * 5;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
          });
          const params: (string | number)[] = [];
          for (const p of people) {
            params.push(evidenceId, String(p.entity_id), String(p.role || 'participant'), 0.8, '');
          }
          await client.query(
            `INSERT INTO evidence_entity (evidence_id, entity_id, role, confidence, mention_context)
             VALUES ${values.join(', ')}
             ON CONFLICT DO NOTHING`,
            params,
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        throw err;
      }
      client.release();
    }

    const [res] = await runQuery<
      { investigationId: string; evidenceId: string; notes: string; relevance: string },
      { id: number }
    >(
      evidenceQueries.addEvidenceToInvestigation,
      {
        investigationId,
        evidenceId,
        notes: notes || '',
        relevance: relevance || 'medium',
      },
      getApiPool(),
    );

    const [evidence] = await runQuery<{ id: string }, unknown>(
      evidenceQueries.getEvidenceByIdDetailed,
      { id: evidenceId },
      getApiPool(),
    );
    return {
      investigationEvidenceId: res.id,
      evidence,
    };
  },

  // Get evidence summary for an investigation
  getInvestigationEvidenceSummary: async (investigationId: string) => {
    // Get all evidence for this investigation
    const evidence = await runQuery<
      { investigationId: string },
      { evidenceType?: string; relevance?: string }
    >(evidenceQueries.getInvestigationEvidenceSummary, { investigationId }, getApiPool());

    // Get entity coverage
    const entityCoverage = await runQuery<{ investigationId: string; limit: number }, unknown>(
      evidenceQueries.getInvestigationEntityCoverage,
      { investigationId, limit: 50 },
      getApiPool(),
    );

    // Get entity-evidence membership for chips and pivot filtering
    const memberRows = await getApiPool().query<{
      evidenceId: string;
      entityId: string;
      fullName: string;
      entityCategory: string;
    }>(
      `SELECT ie.evidence_id::text AS "evidenceId",
              ent.id::text         AS "entityId",
              ent.full_name        AS "fullName",
              ent.entity_category  AS "entityCategory"
       FROM investigation_evidence ie
       JOIN evidence_entity ee  ON ee.evidence_id = ie.evidence_id
       JOIN entities        ent ON ent.id = ee.entity_id
       WHERE ie.investigation_id = $1`,
      [investigationId],
    );

    const entityByEvidence: Record<
      string,
      Array<{ entityId: string; fullName: string; entityCategory: string }>
    > = {};
    const evidenceByEntity: Record<string, string[]> = {};
    for (const row of memberRows.rows) {
      (entityByEvidence[row.evidenceId] ??= []).push({
        entityId: row.entityId,
        fullName: row.fullName,
        entityCategory: row.entityCategory,
      });
      (evidenceByEntity[row.entityId] ??= []).push(row.evidenceId);
    }

    return {
      totalEvidence: evidence.length,
      evidence,
      entityCoverage,
      entityByEvidence,
      evidenceByEntity,
      typeBreakdown: evidence.reduce((acc: Record<string, number>, e) => {
        const key = e.evidenceType ?? 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
      relevanceBreakdown: evidence.reduce((acc: Record<string, number>, e) => {
        const key = e.relevance || 'medium';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    };
  },

  // Remove evidence from an investigation
  removeEvidenceFromInvestigation: async (investigationEvidenceId: string) => {
    const result = await runQuery<{ id: string }, unknown>(
      evidenceQueries.removeEvidenceFromInvestigation,
      { id: investigationEvidenceId },
      getApiPool(),
    );
    return result.length > 0;
  },

  // Search evidence with filtering and pagination
  searchEvidence: async (params: {
    q?: string;
    type?: string;
    entityId?: string;
    dateFrom?: string;
    dateTo?: string;
    redFlagMin?: string;
    page?: string;
    limit?: string;
  }) => {
    const {
      q = '',
      type,
      entityId,
      dateFrom,
      dateTo,
      redFlagMin,
      page = '1',
      limit = '20',
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    interface SearchEvidenceRow {
      id: number;
      evidenceTags?: string;
      [key: string]: unknown;
    }
    const results = await runQuery<
      {
        query: string;
        type: string | null;
        entityId: string | null;
        dateFrom: string | null;
        dateTo: string | null;
        redFlagMin: number | null;
        limit: number;
        offset: number;
      },
      SearchEvidenceRow
    >(
      evidenceQueries.searchEvidenceFull,
      {
        query: q || '',
        type: type || null,
        entityId: entityId ? String(entityId) : null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        redFlagMin: redFlagMin ? Number(redFlagMin) : null,
        limit: limitNum,
        offset: offset,
      },
      getApiPool(),
    );

    const [{ total }] = await runQuery<
      {
        query: string;
        type: string | null;
        entityId: string | null;
        dateFrom: string | null;
        dateTo: string | null;
        redFlagMin: number | null;
      },
      { total: number | string }
    >(
      evidenceQueries.countSearchEvidenceFull,
      {
        query: q || '',
        type: type || null,
        entityId: entityId ? String(entityId) : null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        redFlagMin: redFlagMin ? Number(redFlagMin) : null,
      },
      getApiPool(),
    );

    // Enrich with entities — single batch query instead of N+1
    const resultIds: number[] = results.map((r) => Number(r.id));
    const entityRows = resultIds.length
      ? await getApiPool()
          .query<{
            evidence_id: number;
            id: string;
            name: string;
            category: string;
            role: string;
          }>(
            `SELECT ee.evidence_id, ent.id, ent.full_name AS name,
                  ent.primary_role AS category, ee.role
           FROM evidence_entity ee
           INNER JOIN entities ent ON ent.id = ee.entity_id
           WHERE ee.evidence_id = ANY($1::int[])`,
            [resultIds],
          )
          .then((r) => r.rows)
      : [];
    const entityMap = new Map<number, typeof entityRows>();
    for (const row of entityRows) {
      const key = Number(row.evidence_id);
      if (!entityMap.has(key)) entityMap.set(key, []);
      entityMap.get(key)!.push(row);
    }
    const finalResults = results.map((result) => ({
      ...result,
      entities: (entityMap.get(Number(result.id)) ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        role: e.role,
      })),
      tags: result.evidenceTags ? (JSON.parse(result.evidenceTags) as unknown[]) : [],
    }));

    const totalNum = Number(total || 0);
    const totalPages = Math.ceil(totalNum / limitNum);

    return {
      results: finalResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        totalPages,
      },
    };
  },

  // Get single evidence record with full details
  getEvidenceById: async (id: string) => {
    const [evidence] = await runQuery<
      { id: string },
      { evidenceTags?: string; [key: string]: unknown }
    >(evidenceQueries.getEvidenceByIdDetailed, { id }, getApiPool());

    if (!evidence) {
      return null;
    }

    // Get linked entities
    const entities = await runQuery<{ evidenceId: string }, unknown>(
      evidenceQueries.getEvidenceEntities,
      { evidenceId: id },
      getApiPool(),
    );

    // Get timeline events if any
    const events = await runQuery<{ evidenceId: string }, unknown>(
      evidenceQueries.getEvidenceTimelineEvents,
      { evidenceId: id },
      getApiPool(),
    );

    return {
      ...evidence,
      entities,
      events,
      tags: evidence.evidenceTags ? (JSON.parse(evidence.evidenceTags) as unknown[]) : [],
    };
  },

  // List all evidence types with counts
  getEvidenceTypes: async () => {
    const types = await runQuery<undefined, { type?: string; [key: string]: unknown }>(
      evidenceQueries.getEvidenceTypeCounts,
      undefined,
      getApiPool(),
    );

    // Add descriptions
    const typeDescriptions: Record<string, string> = {
      court_deposition: 'Legal depositions and sworn testimony',
      court_filing: 'Indictments, motions, court exhibits',
      contact_directory: 'Address books, contact lists',
      correspondence: 'Emails, messages',
      financial_record: 'Flight logs, cash ledgers, expense records',
      investigative_report: 'House Oversight Committee productions',
      testimony: 'Victim testimony and witness statements',
      timeline_data: 'Chronological event records',
      media_scan: 'Image scans of documents',
      evidence_list: 'Catalogued evidence inventories',
    };

    const enrichedTypes = types.map((t) => ({
      ...t,
      description: typeDescriptions[String(t.type || '')] || '',
    }));

    return enrichedTypes;
  },

  // Get all evidence associated with an entity
  getEntityEvidenceList: async (
    entityId: string,
    params: { page?: string; limit?: string; type?: string },
  ) => {
    const { page = '1', limit = '20', type } = params;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const results = await runQuery<
      { entityId: string; type: string | null; limit: number; offset: number },
      unknown
    >(
      evidenceQueries.getEntityEvidenceDetailed,
      {
        entityId,
        type: type || null,
        limit: limitNum,
        offset: offset,
      },
      getApiPool(),
    );

    const [{ total }] = await runQuery<
      { entityId: string; type: string | null },
      { total: number | string }
    >(
      evidenceQueries.countEntityEvidenceDetailed,
      {
        entityId,
        type: type || null,
      },
      getApiPool(),
    );

    const totalNum = Number(total || 0);
    const totalPages = Math.ceil(totalNum / limitNum);

    return {
      results,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalNum,
        totalPages,
      },
    };
  },
};
