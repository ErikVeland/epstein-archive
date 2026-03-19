import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

type TimelineQueryFilters = {
  startDate?: string;
  endDate?: string;
};

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

function timelineRowPreferenceScore(row: any): number {
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

      const deduped = new Map<string, any>();
      for (const row of res.rows) {
        const key = getTimelineGroupKey(String(row.title || ''), String(row.start_date || ''));
        const existing = deduped.get(key);
        if (!existing || timelineRowPreferenceScore(row) > timelineRowPreferenceScore(existing)) {
          deduped.set(key, row);
        }
      }

      const globalEvents = Array.from(deduped.values());

      // Transform Global Events
      const mappedEvents = await Promise.all(
        globalEvents.map(async (e: any) => {
          let entityData: Array<{ id: number | null; name: string }> = [];
          let resolvedEntityIds: number[] = [];

          // Parse entity IDs and look up names
          if (e.entities) {
            try {
              const parsed = typeof e.entities === 'string' ? JSON.parse(e.entities) : e.entities;
              if (Array.isArray(parsed) && parsed.length > 0) {
                const numericIds = parsed
                  .map((value) =>
                    typeof value === 'number'
                      ? value
                      : typeof value === 'string' && /^\d+$/.test(value)
                        ? Number(value)
                        : null,
                  )
                  .filter((value): value is number => Number.isInteger(value));

                const names = parsed
                  .filter(
                    (value): value is string =>
                      typeof value === 'string' && value.trim().length > 0 && !/^\d+$/.test(value),
                  )
                  .map((value) => value.trim());

                const entityRows: Array<{ id: number; full_name: string }> = [];

                if (numericIds.length > 0) {
                  const entRes = await pool.query(
                    'SELECT id, full_name FROM entities WHERE id = ANY($1::bigint[])',
                    [numericIds],
                  );
                  entityRows.push(...(entRes.rows as Array<{ id: number; full_name: string }>));
                }

                if (names.length > 0) {
                  const entByNameRes = await pool.query(
                    'SELECT id, full_name FROM entities WHERE full_name = ANY($1::text[])',
                    [names],
                  );
                  entityRows.push(
                    ...(entByNameRes.rows as Array<{ id: number; full_name: string }>),
                  );
                }

                const byName = new Map(
                  entityRows.map((ent) => [
                    String(ent.full_name).toLowerCase(),
                    { id: ent.id, name: ent.full_name },
                  ]),
                );
                const byId = new Map(
                  entityRows.map((ent) => [
                    Number(ent.id),
                    { id: Number(ent.id), name: ent.full_name },
                  ]),
                );

                entityData = parsed
                  .map((value) => {
                    if (
                      typeof value === 'number' ||
                      (typeof value === 'string' && /^\d+$/.test(value))
                    ) {
                      const id = Number(value);
                      return byId.get(id) ?? null;
                    }
                    if (typeof value === 'string' && value.trim()) {
                      return (
                        byName.get(value.trim().toLowerCase()) ?? { id: null, name: value.trim() }
                      );
                    }
                    return null;
                  })
                  .filter((value): value is { id: number | null; name: string } => Boolean(value));

                resolvedEntityIds = Array.from(
                  new Set(
                    entityData
                      .map((entity) => Number(entity.id))
                      .filter((id) => Number.isInteger(id) && id > 0),
                  ),
                );
              }
            } catch (err) {
              logger.warn('[Timeline] Failed to parse entities for event', e.id, err);
              entityData = [];
              resolvedEntityIds = [];
            }
          }

          // Lookup related document info
          let relatedDocument: { id: number; name: string; path: string } | null = null;
          if (e.related_document_id) {
            try {
              const docRes = await pool.query(
                `SELECT id, file_name, file_path FROM documents WHERE id = $1`,
                [e.related_document_id],
              );
              const doc = docRes.rows[0];
              if (doc) {
                relatedDocument = { id: doc.id, name: doc.file_name, path: doc.file_path };
              }
            } catch (err) {
              logger.warn(
                '[Timeline] Failed to fetch related document',
                e.related_document_id,
                err,
              );
              relatedDocument = null;
            }
          }

          let support = {
            evidence_count: 0,
            document_count: relatedDocument ? 1 : 0,
            media_count: 0,
            top_documents: relatedDocument
              ? [{ id: relatedDocument.id, name: relatedDocument.name }]
              : ([] as Array<{ id: number; name: string }>),
          };

          if (resolvedEntityIds.length > 0) {
            try {
              const supportRes = await pool.query<{
                evidence_count: string | number;
                document_count: string | number;
                media_count: string | number;
                top_documents: Array<{ id: number; name: string }> | string | null | undefined;
              }>(
                `
                  WITH mention_rows AS (
                    SELECT em.document_id
                    FROM entity_mentions em
                    WHERE em.entity_id = ANY($1::bigint[])
                  ),
                  docs AS (
                    SELECT DISTINCT d.id, d.file_name, d.file_path, d.evidence_type, d.file_type, COALESCE(d.red_flag_rating, 0) AS red_flag
                    FROM mention_rows mr
                    JOIN documents d ON d.id = mr.document_id
                  ),
                  top_docs AS (
                    SELECT id, COALESCE(NULLIF(BTRIM(file_name), ''), CONCAT('Document #', id)) AS name
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
                [resolvedEntityIds],
              );

              const row = supportRes.rows[0];
              if (row) {
                let topDocs: Array<{ id: number; name: string }> = [];
                if (Array.isArray(row.top_documents)) {
                  topDocs = row.top_documents as Array<{ id: number; name: string }>;
                } else if (typeof row.top_documents === 'string') {
                  try {
                    const parsed = JSON.parse(row.top_documents);
                    if (Array.isArray(parsed)) {
                      topDocs = parsed;
                    }
                  } catch {
                    topDocs = [];
                  }
                }

                if (
                  relatedDocument &&
                  !topDocs.some((doc) => Number(doc.id) === Number(relatedDocument?.id))
                ) {
                  topDocs = [relatedDocument, ...topDocs].slice(0, 3);
                }

                support = {
                  evidence_count: Number(row.evidence_count || 0),
                  document_count: Math.max(
                    Number(row.document_count || 0),
                    relatedDocument ? 1 : 0,
                  ),
                  media_count: Number(row.media_count || 0),
                  top_documents: topDocs,
                };
              }
            } catch (err) {
              logger.warn('[Timeline] Failed to compute support stats for event', e.id, err);
            }
          }

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
        }),
      );

      return mappedEvents;
    } catch (error) {
      logger.error({ err: error }, 'Error getting timeline events');
      throw error;
    }
  },
};
