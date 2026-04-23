import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

type TimelineQueryFilters = {
  startDate?: string;
  endDate?: string;
};

type TimelineEntity = { id: number | null; name: string };
type TimelineRelatedDocument = { id: number; name: string; path: string } | null;
type TimelineSupport = {
  evidence_count: number;
  document_count: number;
  media_count: number;
  top_documents: Array<{ id: number; name: string }>;
};

type ParsedTimelineEntities = {
  entityIdsToFetch: number[];
  entityNamesToFetch: string[];
};

let hasLoggedTimelineTopDocsParseFailure = false;

const TIMELINE_TITLE_GROUPS: Array<{ key: string; test: (title: string) => boolean }> = [
  {
    key: 'epstein_death_2019',
    test: (title) =>
      /epstein/.test(title) && /(found dead|death|dies|died|suicide|cell)/.test(title),
  },
  {
    key: 'doc_release_2024_batch1',
    test: (title) =>
      /epstein/.test(title) &&
      /(\bdocument\b|\bdocuments\b|\brecords?\b|\bfiles?\b|\bepstein list\b)/.test(title) &&
      /(\brelease\b|\breleased\b|\bfirst batch\b)/.test(title),
  },
  {
    key: 'jpm_290m_settlement',
    test: (title) =>
      /jpmorgan/.test(title) && /(settle|settlement)/.test(title) && /290/.test(title),
  },
  {
    key: 'deutsche_75m_settlement',
    test: (title) =>
      /deutsche bank/.test(title) && /(settle|settlement)/.test(title) && /75/.test(title),
  },
];

const PREFERRED_TITLES = new Set([
  'Jeffrey Epstein Found Dead in Cell',
  'Epstein Court Documents Released (The "Epstein List")',
  'JPMorgan Settles Epstein-Related Lawsuit for $290M',
  'Deutsche Bank Settles for $75M',
]);

function normalizeTimelineTitle(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTimelineGroupKey(title: string, date: string): string {
  const normalizedTitle = normalizeTimelineTitle(title);
  const year = String(date || '').slice(0, 4) || '0000';
  for (const group of TIMELINE_TITLE_GROUPS) {
    if (group.test(normalizedTitle)) return `${group.key}_${year}`;
  }
  return `${normalizedTitle}|${String(date || '')}`;
}

function timelineRowPreferenceScore(row: Record<string, unknown>): number {
  let score = 0;
  if (PREFERRED_TITLES.has(String(row.title || ''))) score += 100;
  if (
    String(row.source || '')
      .toLowerCase()
      .includes('court')
  )
    score += 10;
  if (
    String(row.source || '')
      .toLowerCase()
      .includes('doj')
  )
    score += 8;
  if (
    String(row.source || '')
      .toLowerCase()
      .includes('fbi')
  )
    score += 6;
  score += Number(row.id || 0) / 100000;
  return score;
}

function createDefaultSupport(relatedDocument: TimelineRelatedDocument = null): TimelineSupport {
  return {
    evidence_count: 0,
    document_count: relatedDocument ? 1 : 0,
    media_count: 0,
    top_documents: relatedDocument ? [{ id: relatedDocument.id, name: relatedDocument.name }] : [],
  };
}

function parseTimelineEntities(rawEntities: unknown): ParsedTimelineEntities {
  if (!rawEntities) {
    return {
      entityIdsToFetch: [],
      entityNamesToFetch: [],
    };
  }

  const parsed = typeof rawEntities === 'string' ? JSON.parse(rawEntities) : rawEntities;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return {
      entityIdsToFetch: [],
      entityNamesToFetch: [],
    };
  }

  const entityIdsToFetch = parsed
    .map((value) =>
      typeof value === 'number'
        ? value
        : typeof value === 'string' && /^\d+$/.test(value)
          ? Number(value)
          : null,
    )
    .filter(
      (value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0,
    );

  const entityNamesToFetch = parsed
    .filter(
      (value): value is string =>
        value != null &&
        typeof value === 'string' &&
        value.trim().length > 0 &&
        !/^\d+$/.test(value),
    )
    .map((value) => value.trim());

  return {
    entityIdsToFetch,
    entityNamesToFetch,
  };
}

async function fetchTimelineSupportForEntityIds(
  entityIds: number[],
): Promise<
  Omit<TimelineSupport, 'top_documents'> & { top_documents: Array<{ id: number; name: string }> }
> {
  if (entityIds.length === 0) {
    return {
      evidence_count: 0,
      document_count: 0,
      media_count: 0,
      top_documents: [],
    };
  }

  const pool = getApiPool();
  const supportRes = await pool.query<{
    evidence_count: string | number;
    document_count: string | number;
    media_count: string | number;
    top_documents: Array<{ id: number; name: string }> | string | null;
  }>(
    `
      WITH mention_rows AS (
        SELECT em.document_id
        FROM entity_mentions em
        WHERE em.entity_id = ANY($1::bigint[])
      ),
      docs AS (
        SELECT DISTINCT
          d.id,
          COALESCE(NULLIF(BTRIM(d.file_name), ''), CONCAT('Document #', d.id)) AS name,
          d.evidence_type,
          d.file_type,
          COALESCE(d.red_flag_rating, 0) AS red_flag
        FROM mention_rows mr
        JOIN documents d ON d.id = mr.document_id
      ),
      top_docs AS (
        SELECT id, name
        FROM docs
        ORDER BY red_flag DESC, id DESC
        LIMIT 3
      )
      SELECT
        (SELECT COUNT(*) FROM mention_rows) AS evidence_count,
        (SELECT COUNT(*) FROM docs) AS document_count,
        (
          SELECT COUNT(*)
          FROM docs
          WHERE
            LOWER(COALESCE(evidence_type, '')) = 'media'
            OR file_type ILIKE 'image/%'
            OR file_type ILIKE 'video/%'
            OR file_type ILIKE 'audio/%'
        ) AS media_count,
        (
          SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', td.id, 'name', td.name)), '[]'::json)
          FROM top_docs td
        ) AS top_documents
    `,
    [entityIds],
  );

  const row = supportRes.rows[0];
  let topDocs: Array<{ id: number; name: string }> = [];
  if (Array.isArray(row?.top_documents)) {
    topDocs = row.top_documents;
  } else if (typeof row?.top_documents === 'string') {
    try {
      const parsed = JSON.parse(row.top_documents);
      if (Array.isArray(parsed)) topDocs = parsed;
    } catch (err) {
      // Previously this silently fell back to [] which can mask upstream query/serialization issues.
      // Log once per process to prevent log spam if a DB field is consistently malformed.
      if (!hasLoggedTimelineTopDocsParseFailure) {
        hasLoggedTimelineTopDocsParseFailure = true;
        logger.warn(
          {
            err,
            entityIdsCount: entityIds.length,
            sample: row.top_documents.slice(0, 200),
          },
          '[Timeline] Failed to parse top_documents JSON; falling back to []',
        );
      }
      topDocs = [];
    }
  }

  return {
    evidence_count: Number(row?.evidence_count || 0),
    document_count: Number(row?.document_count || 0),
    media_count: Number(row?.media_count || 0),
    top_documents: topDocs,
  };
}

export const timelineRepository = {
  getTimelineEvents: async (filters?: TimelineQueryFilters) => {
    const pool = getApiPool();
    try {
      const whereParts: string[] = ['date <= CURRENT_DATE'];
      const params: Array<string> = [];
      const addParam = (value: string) => {
        params.push(value);
        return `$${params.length}`;
      };

      if (filters?.startDate) {
        whereParts.push(`date >= ${addParam(filters.startDate)}::date`);
      }
      if (filters?.endDate) {
        whereParts.push(`date <= ${addParam(filters.endDate)}::date`);
      }

      const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

      // Fetch Curated Global Events
      const res = await pool.query(
        `
        SELECT 
          id,
          title,
          date as start_date,
          description,
          type,
          significance,
          entities,
          related_document_id,
          source
        FROM global_timeline_events
        ${whereSql}
        ORDER BY date DESC
      `,
        params,
      );

      const deduped = new Map<string, Record<string, unknown>>();
      for (const row of res.rows) {
        const key = getTimelineGroupKey(String(row.title || ''), String(row.start_date || ''));
        const existing = deduped.get(key);
        if (!existing || timelineRowPreferenceScore(row) > timelineRowPreferenceScore(existing)) {
          deduped.set(key, row);
        }
      }

      const globalEvents = Array.from(deduped.values());

      const parsedEntitiesByEvent = new Map<
        number,
        { raw: unknown; entityIdsToFetch: number[]; entityNamesToFetch: string[] }
      >();
      const allEntityIds = new Set<number>();
      const allEntityNames = new Set<string>();
      const relatedDocumentIds = new Set<number>();

      for (const event of globalEvents) {
        const eventId = Number(event.id);
        if (Number.isInteger(eventId)) {
          try {
            const parsedEntities = parseTimelineEntities(event.entities);
            parsedEntitiesByEvent.set(eventId, {
              raw: typeof event.entities === 'string' ? JSON.parse(event.entities) : event.entities,
              entityIdsToFetch: parsedEntities.entityIdsToFetch,
              entityNamesToFetch: parsedEntities.entityNamesToFetch,
            });
            for (const entityId of parsedEntities.entityIdsToFetch) allEntityIds.add(entityId);
            for (const entityName of parsedEntities.entityNamesToFetch) {
              allEntityNames.add(entityName);
            }
          } catch (err) {
            logger.warn(
              { err, eventId: event.id },
              '[Timeline] Failed to parse entities for event',
            );
          }
        }

        const relatedDocumentId = Number(event.related_document_id);
        if (Number.isInteger(relatedDocumentId) && relatedDocumentId > 0) {
          relatedDocumentIds.add(relatedDocumentId);
        }
      }

      const entityRows: Array<{ id: number; full_name: string }> = [];
      if (allEntityIds.size > 0) {
        const entRes = await pool.query<{ id: number; full_name: string }>(
          'SELECT id, full_name FROM entities WHERE id = ANY($1::bigint[])',
          [Array.from(allEntityIds)],
        );
        entityRows.push(...entRes.rows);
      }

      if (allEntityNames.size > 0) {
        const entByNameRes = await pool.query<{ id: number; full_name: string }>(
          'SELECT id, full_name FROM entities WHERE full_name = ANY($1::text[])',
          [Array.from(allEntityNames)],
        );
        entityRows.push(...entByNameRes.rows);
      }

      const entityById = new Map<number, { id: number; name: string }>();
      const entityByName = new Map<string, { id: number; name: string }>();
      for (const entity of entityRows) {
        const normalizedEntity = { id: Number(entity.id), name: entity.full_name };
        entityById.set(normalizedEntity.id, normalizedEntity);
        entityByName.set(String(entity.full_name).toLowerCase(), normalizedEntity);
      }

      const relatedDocumentsById = new Map<number, NonNullable<TimelineRelatedDocument>>();
      if (relatedDocumentIds.size > 0) {
        const docRes = await pool.query<{ id: number; file_name: string; file_path: string }>(
          'SELECT id, file_name, file_path FROM documents WHERE id = ANY($1::bigint[])',
          [Array.from(relatedDocumentIds)],
        );
        for (const doc of docRes.rows) {
          relatedDocumentsById.set(Number(doc.id), {
            id: Number(doc.id),
            name: doc.file_name,
            path: doc.file_path,
          });
        }
      }

      const mappedEvents = globalEvents.map((e: Record<string, unknown>) => {
        const eventId = Number(e.id);
        const parsedEntry = parsedEntitiesByEvent.get(eventId);
        const parsedRaw = Array.isArray(parsedEntry?.raw) ? parsedEntry.raw : [];
        const entityData = parsedRaw
          .map((value) => {
            if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
              return entityById.get(Number(value)) ?? null;
            }
            if (typeof value === 'string' && value.trim()) {
              return (
                entityByName.get(value.trim().toLowerCase()) ?? { id: null, name: value.trim() }
              );
            }
            return null;
          })
          .filter((value): value is TimelineEntity => Boolean(value));

        const relatedDocumentId = Number(e.related_document_id);
        const relatedDocument =
          Number.isInteger(relatedDocumentId) && relatedDocumentId > 0
            ? (relatedDocumentsById.get(relatedDocumentId) ?? null)
            : null;

        const support = createDefaultSupport(relatedDocument);

        return {
          id: `evt-${e.id}`,
          title: e.title,
          description: e.description,
          type: e.type || 'other',
          date: e.start_date,
          entities: entityData,
          significance_score: e.significance || 'medium',
          file_path: null,
          original_file_path: null,
          is_curated: true,
          source: e.source || null,
          related_document: relatedDocument,
          support,
        };
      });

      return mappedEvents;
    } catch (error) {
      logger.error({ err: error }, 'Error getting timeline events');
      throw error;
    }
  },

  getTimelineEventSupport: async (eventId: number) => {
    const pool = getApiPool();
    try {
      const eventRes = await pool.query<{
        id: number;
        entities: unknown;
        related_document_id: number | null;
      }>(
        `
          SELECT id, entities, related_document_id
          FROM global_timeline_events
          WHERE id = $1
          LIMIT 1
        `,
        [eventId],
      );

      const event = eventRes.rows[0];
      if (!event) {
        return null;
      }

      const parsed = parseTimelineEntities(event.entities);
      const entityRows: Array<{ id: number; full_name: string }> = [];

      if (parsed.entityIdsToFetch.length > 0) {
        const byIdRes = await pool.query<{ id: number; full_name: string }>(
          'SELECT id, full_name FROM entities WHERE id = ANY($1::bigint[])',
          [parsed.entityIdsToFetch],
        );
        entityRows.push(...byIdRes.rows);
      }

      if (parsed.entityNamesToFetch.length > 0) {
        const byNameRes = await pool.query<{ id: number; full_name: string }>(
          'SELECT id, full_name FROM entities WHERE full_name = ANY($1::text[])',
          [parsed.entityNamesToFetch],
        );
        entityRows.push(...byNameRes.rows);
      }

      const entityById = new Map<number, number>();
      const entityByName = new Map<string, number>();
      for (const row of entityRows) {
        entityById.set(Number(row.id), Number(row.id));
        entityByName.set(String(row.full_name).toLowerCase(), Number(row.id));
      }

      const rawEntities =
        typeof event.entities === 'string' ? JSON.parse(event.entities) : event.entities;
      const resolvedEntityIds = Array.isArray(rawEntities)
        ? Array.from(
            new Set(
              rawEntities
                .map((value) => {
                  if (typeof value === 'number') return entityById.get(value) ?? null;
                  if (typeof value === 'string' && /^\d+$/.test(value)) {
                    return entityById.get(Number(value)) ?? null;
                  }
                  if (typeof value === 'string' && value.trim()) {
                    return entityByName.get(value.trim().toLowerCase()) ?? null;
                  }
                  return null;
                })
                .filter((value): value is number => typeof value === 'number' && value > 0),
            ),
          )
        : [];

      let relatedDocument: TimelineRelatedDocument = null;
      const relatedDocumentId = Number(event.related_document_id);
      if (Number.isInteger(relatedDocumentId) && relatedDocumentId > 0) {
        const docRes = await pool.query<{ id: number; file_name: string; file_path: string }>(
          'SELECT id, file_name, file_path FROM documents WHERE id = $1',
          [relatedDocumentId],
        );
        const doc = docRes.rows[0];
        if (doc) {
          relatedDocument = {
            id: Number(doc.id),
            name: doc.file_name,
            path: doc.file_path,
          };
        }
      }

      const support = createDefaultSupport(relatedDocument);
      if (resolvedEntityIds.length === 0) {
        return support;
      }

      const enrichedSupport = await fetchTimelineSupportForEntityIds(resolvedEntityIds);
      if (
        relatedDocument &&
        !enrichedSupport.top_documents.some((doc) => Number(doc.id) === relatedDocument.id)
      ) {
        enrichedSupport.top_documents = [
          { id: relatedDocument.id, name: relatedDocument.name },
          ...enrichedSupport.top_documents,
        ].slice(0, 3);
      }

      return {
        evidence_count: enrichedSupport.evidence_count,
        document_count: Math.max(enrichedSupport.document_count, relatedDocument ? 1 : 0),
        media_count: enrichedSupport.media_count,
        top_documents: enrichedSupport.top_documents,
      };
    } catch (error) {
      logger.error({ err: error, eventId }, 'Error getting timeline event support');
      throw error;
    }
  },
};
