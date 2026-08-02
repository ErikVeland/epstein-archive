import { mediaQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';
import { resolveCanonicalEntityId } from '../utils/id_utils.js';
import { normalMediaEvidenceWhereSql } from './mediaEvidenceScope.js';

export interface MediaItem {
  id: number;
  entityId: string | null;
  documentId: string | null;
  filePath: string;
  thumbnailPath: string | null;
  fileType: string | null;
  fileSize: number;
  width: number;
  height: number;
  title: string | null;
  description: string | null;
  isSensitive: boolean;
  verificationStatus: string | null;
  redFlagRating: number;
  metadata: Record<string, unknown>;
  dateTaken: Date | null;
  createdAt: Date | null;
  tags?: string[];
  people?: Array<{ id: number; name: string }>;
}

interface AlbumRow {
  id: number;
  name: string;
  itemCount: string | number;
  sensitiveCount: string | number;
}

const SYNTHETIC_VIDEO_ALBUMS = {
  doj: {
    id: -101,
    name: 'DOJ Videos',
    description: 'DOJ video evidence and surveillance footage.',
  },
  saschaTikTok: {
    id: -102,
    name: 'Sascha Barros TikTok',
    description: 'Standalone TikTok source video for Sascha Barros.',
  },
} as const;

function isLegacyDojVideoAlbum(name: string): boolean {
  return /doj/i.test(name);
}

function isLegacySaschaTikTokAlbum(name: string): boolean {
  return /(sascha|sasha)/i.test(name) && /tiktok/i.test(name);
}

function buildSyntheticVideoAlbumPredicate(
  albumId: number,
  addParam: (value: string | number | bigint | null) => string,
): string | null {
  if (albumId === SYNTHETIC_VIDEO_ALBUMS.doj.id) {
    const dojPath = addParam('%DOJ_VOL8%');
    const dojMeta = addParam('%DOJ%');
    const dojAlbum = addParam('%DOJ%');
    return `(
      COALESCE(m.file_path, '') ILIKE ${dojPath}::text
      OR COALESCE(m.metadata_json::text, '') ILIKE ${dojMeta}::text
      OR EXISTS (
        SELECT 1
        FROM media_albums a
        WHERE a.id = m.album_id
          AND (
            a.name ILIKE ${dojAlbum}::text
            OR COALESCE(a.description, '') ILIKE ${dojAlbum}::text
          )
      )
    )`;
  }

  if (albumId === SYNTHETIC_VIDEO_ALBUMS.saschaTikTok.id) {
    const saschaPath = addParam('%Sasha Riley TikTok Q&A%');
    const saschaAltPath = addParam('%Sascha Riley TikTok Q&A%');
    const saschaMeta = addParam('%tiktok%');
    const saschaName = addParam('%sascha%');
    const sashaName = addParam('%sasha%');
    return `(
      COALESCE(m.file_path, '') ILIKE ${saschaPath}::text
      OR COALESCE(m.file_path, '') ILIKE ${saschaAltPath}::text
      OR (
        (
          COALESCE(m.title, '') ILIKE ${saschaName}::text
          OR COALESCE(m.title, '') ILIKE ${sashaName}::text
          OR COALESCE(m.metadata_json::text, '') ILIKE ${saschaName}::text
          OR COALESCE(m.metadata_json::text, '') ILIKE ${sashaName}::text
        )
        AND (
          COALESCE(m.title, '') ILIKE ${saschaMeta}::text
          OR COALESCE(m.metadata_json::text, '') ILIKE ${saschaMeta}::text
          OR EXISTS (
            SELECT 1
            FROM media_albums a
            WHERE a.id = m.album_id
              AND (
                a.name ILIKE ${saschaMeta}::text
                OR COALESCE(a.description, '') ILIKE ${saschaMeta}::text
              )
          )
        )
      )
    )`;
  }

  return null;
}

interface MediaItemRow {
  id: number;
  entityId: string | null;
  documentId: string | null;
  filePath: string;
  thumbnailPath: string | null;
  fileType: string | null;
  fileSize: string | number;
  width: number | null;
  height: number | null;
  title: string | null;
  description: string | null;
  isSensitive: boolean | null;
  verificationStatus: string | null;
  redFlagRating: string | number | null;
  redFlagRatingRaw: string | number | null;
  metadataJson: unknown;
  dateTaken: Date | null;
  createdAt: Date | null;
  entityName?: string | null;
  relatedEntities?: string | null;
  taggedPeople?: string[] | null;
}

interface SingleMediaItemRow extends MediaItemRow {
  metadataJson: unknown;
}

export const mediaRepository = {
  // Get the preferred profile photo for an entity (Face Crop > Media Item Thumbnail)
  getEntityProfilePhoto: async (entityId: string): Promise<string | null> => {
    const pool = getApiPool();
    // 1. Try to get a representative face crop from a linked face cluster
    const clusterRes = await pool.query(
      `
        SELECT f.crop_path
        FROM face_clusters fc
        JOIN faces f ON f.id = fc.representative_face_id
        WHERE fc.entity_id = $1::bigint
        LIMIT 1
      `,
      [BigInt(entityId)],
    );

    if (clusterRes.rows.length > 0 && clusterRes.rows[0].crop_path) {
      return clusterRes.rows[0].crop_path;
    }

    // 2. Fallback to the first available media item thumbnail
    const mediaRes = await pool.query(
      `
        SELECT m.thumbnail_path, m.file_path
        FROM media_items m
        WHERE (
          m.entity_id = $1::bigint
          OR EXISTS (
            SELECT 1
            FROM media_item_people mip
            WHERE mip.media_item_id::text = m.id::text
              AND mip.entity_id = $1::bigint
          )
          OR EXISTS (
            SELECT 1
            FROM faces f
            JOIN face_clusters fc ON fc.id = f.cluster_id
            WHERE f.media_item_id::text = m.id::text
              AND fc.entity_id = $1::bigint
          )
        )
          AND m.file_type LIKE 'image/%'
          AND ${normalMediaEvidenceWhereSql('m')}
        ORDER BY m.red_flag_rating DESC, m.created_at DESC
        LIMIT 1
      `,
      [BigInt(entityId)],
    );

    if (mediaRes.rows.length > 0) {
      return mediaRes.rows[0].thumbnail_path || mediaRes.rows[0].file_path;
    }

    return null;
  },

  // Get all albums with counts for a specific media type
  getAlbumsByMediaType: async (fileType: 'audio' | 'video') => {
    let likePattern: string;
    if (fileType === 'audio') {
      likePattern = '%audio%';
    } else {
      likePattern = `${fileType}/%`;
    }

    const result = (await mediaQueries.getAlbumsByMediaType.run(
      { likePattern },
      getApiPool(),
    )) as unknown as AlbumRow[];
    const albums = result.map((row: AlbumRow) => ({
      ...row,
      itemCount: Number(row.itemCount || 0),
      sensitiveCount: Number(row.sensitiveCount || 0),
    }));

    if (fileType !== 'video') {
      return albums;
    }

    const pool = getApiPool();
    const [dojSummary, saschaSummary] = await Promise.all([
      pool.query<{ itemCount: string | number; sensitiveCount: string | number }>(
        `
          SELECT
            COUNT(*) as "itemCount",
            SUM(CASE WHEN COALESCE(m.is_sensitive, false) = true THEN 1 ELSE 0 END) as "sensitiveCount"
          FROM media_items m
          WHERE m.file_type LIKE 'video/%'
            AND (
              COALESCE(m.file_path, '') ILIKE '%DOJ_VOL8%'
              OR COALESCE(m.metadata_json::text, '') ILIKE '%DOJ%'
              OR EXISTS (
                SELECT 1
                FROM media_albums a
                WHERE a.id = m.album_id
                  AND (a.name ILIKE '%DOJ%' OR COALESCE(a.description, '') ILIKE '%DOJ%')
              )
            )
        `,
      ),
      pool.query<{ itemCount: string | number; sensitiveCount: string | number }>(
        `
          SELECT
            COUNT(*) as "itemCount",
            SUM(CASE WHEN COALESCE(m.is_sensitive, false) = true THEN 1 ELSE 0 END) as "sensitiveCount"
          FROM media_items m
          WHERE m.file_type LIKE 'video/%'
            AND (
              COALESCE(m.file_path, '') ILIKE '%Sasha Riley TikTok Q&A%'
              OR COALESCE(m.file_path, '') ILIKE '%Sascha Riley TikTok Q&A%'
              OR (
                (
                  COALESCE(m.title, '') ILIKE '%sascha%'
                  OR COALESCE(m.title, '') ILIKE '%sasha%'
                  OR COALESCE(m.metadata_json::text, '') ILIKE '%sascha%'
                  OR COALESCE(m.metadata_json::text, '') ILIKE '%sasha%'
                )
                AND (
                  COALESCE(m.title, '') ILIKE '%tiktok%'
                  OR COALESCE(m.metadata_json::text, '') ILIKE '%tiktok%'
                  OR EXISTS (
                    SELECT 1
                    FROM media_albums a
                    WHERE a.id = m.album_id
                      AND (
                        a.name ILIKE '%tiktok%'
                        OR COALESCE(a.description, '') ILIKE '%tiktok%'
                      )
                  )
                )
              )
            )
        `,
      ),
    ]);

    const filteredAlbums = albums.filter(
      (album) => !isLegacyDojVideoAlbum(album.name) && !isLegacySaschaTikTokAlbum(album.name),
    );

    const syntheticAlbums = [
      {
        ...SYNTHETIC_VIDEO_ALBUMS.doj,
        itemCount: Number(dojSummary.rows[0]?.itemCount || 0),
        sensitiveCount: Number(dojSummary.rows[0]?.sensitiveCount || 0),
      },
      {
        ...SYNTHETIC_VIDEO_ALBUMS.saschaTikTok,
        itemCount: Number(saschaSummary.rows[0]?.itemCount || 0),
        sensitiveCount: Number(saschaSummary.rows[0]?.sensitiveCount || 0),
      },
    ].filter((album) => album.itemCount > 0);

    return [...syntheticAlbums, ...filteredAlbums];
  },

  // Get media items for an entity
  getMediaItems: async (entityId: string) => {
    const pool = getApiPool();
    const { canonicalId } = await resolveCanonicalEntityId(entityId, pool);
    const result = await pool.query(
      `
        WITH canonical_entities AS (
          SELECT id, full_name
          FROM entities
          WHERE COALESCE(canonical_id, id) = $1::bigint
        )
        SELECT
          m.id,
          m.entity_id as "entityId",
          m.document_id as "documentId",
          m.file_path as "filePath",
          m.thumbnail_path as "thumbnailPath",
          m.file_type as "fileType",
          m.file_size as "fileSize",
          m.width,
          m.height,
          m.title,
          m.description,
          m.is_sensitive as "isSensitive",
          m.verification_status as "verificationStatus",
          m.red_flag_rating as "redFlagRating",
          m.metadata_json as "metadataJson",
          m.date_taken as "dateTaken",
          m.created_at as "createdAt",
          tags.tagged_people as "taggedPeople"
        FROM media_items m
        LEFT JOIN LATERAL (
          SELECT ARRAY_REMOVE(ARRAY_AGG(DISTINCT tagged_name), NULL) as tagged_people
          FROM (
            SELECT e.full_name as tagged_name
            FROM media_item_people mip2
            JOIN entities e ON e.id = mip2.entity_id
            WHERE mip2.media_item_id::text = m.id::text
            UNION
            SELECT e2.full_name as tagged_name
            FROM faces f2
            JOIN face_clusters fc2 ON fc2.id = f2.cluster_id
            JOIN entities e2 ON e2.id = fc2.entity_id
            WHERE f2.media_item_id::text = m.id::text
              AND fc2.entity_id IS NOT NULL
          ) tagged_people_union
        ) tags ON true
        WHERE (
          m.entity_id IN (SELECT id FROM canonical_entities)
          OR EXISTS (
            SELECT 1
            FROM media_item_people mip
            WHERE mip.media_item_id::text = m.id::text
              AND mip.entity_id IN (SELECT id FROM canonical_entities)
          )
          OR EXISTS (
            SELECT 1
            FROM faces f
            JOIN face_clusters fc ON fc.id = f.cluster_id
            WHERE f.media_item_id::text = m.id::text
              AND fc.entity_id IN (SELECT id FROM canonical_entities)
          )
          OR m.document_id::bigint IN (
            SELECT document_id FROM entity_mentions WHERE entity_id IN (SELECT id FROM canonical_entities)
          )
          OR EXISTS (
            SELECT 1
            FROM canonical_entities ce
            WHERE ce.full_name ILIKE ANY(ARRAY['%' || m.title || '%', '%' || m.description || '%'])
               OR m.title ILIKE '%' || ce.full_name || '%'
          )
        )
          AND ${normalMediaEvidenceWhereSql('m')}
        ORDER BY m.red_flag_rating DESC, m.created_at DESC
      `,
      [canonicalId],
    );

    const rows = result.rows as MediaItemRow[];

    return rows.map((item: MediaItemRow) => {
      let metadata: Record<string, unknown> = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : (item.metadataJson as Record<string, unknown>);
        }
      } catch (e) {
        logger.error({ err: e, mediaId: item.id }, 'Error parsing metadata for media item');
      }

      return {
        ...item,
        id: Number(item.id),
        fileSize: 0,
        redFlagRating: Number(item.redFlagRating || 0),
        taggedPeople: Array.isArray(item.taggedPeople)
          ? item.taggedPeople.filter(
              (name): name is string => typeof name === 'string' && name.length > 0,
            )
          : [],
        metadata,
      };
    });
  },

  getAllMediaItems: async () => {
    const mediaItems = (await mediaQueries.getAllMediaItems.run(
      undefined,
      getApiPool(),
    )) as unknown as MediaItemRow[];

    return mediaItems.map((item: MediaItemRow) => {
      let metadata: Record<string, unknown> = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : (item.metadataJson as Record<string, unknown>);
        }
      } catch (e) {
        logger.error({ err: e, mediaId: item.id }, 'Error parsing metadata for media item');
      }

      const relatedEntities =
        typeof item.relatedEntities === 'string'
          ? item.relatedEntities.split(',')
          : typeof item.entityName === 'string' && item.entityName.length > 0
            ? [item.entityName]
            : [];

      return {
        ...item,
        id: Number(item.id),
        fileSize: 0,
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
        relatedEntities,
      };
    });
  },

  // Get single media item by ID
  getMediaItemById: async (id: number): Promise<MediaItem | undefined> => {
    const rows = (await mediaQueries.getMediaItemById.run(
      { id: String(id) },
      getApiPool(),
    )) as unknown as SingleMediaItemRow[];
    const item = rows[0];
    if (!item) return undefined;

    let metadata: Record<string, unknown> = {};
    try {
      if (item.metadataJson) {
        metadata =
          typeof item.metadataJson === 'string'
            ? JSON.parse(item.metadataJson)
            : (item.metadataJson as Record<string, unknown>);
      }
    } catch (e) {
      logger.error({ err: e, mediaId: item.id }, 'Error parsing metadata for media item');
    }

    return {
      ...item,
      id: Number(item.id),
      entityId: item.entityId || null,
      documentId: item.documentId || null,
      filePath: item.filePath || '',
      thumbnailPath: item.thumbnailPath || null,
      fileType: item.fileType || null,
      fileSize: Number(item.fileSize || 0),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      isSensitive: Boolean(item.isSensitive),
      verificationStatus: item.verificationStatus || null,
      redFlagRating: Number(item.redFlagRating || 0),
      dateTaken: item.dateTaken || null,
      createdAt: item.createdAt || null,
      metadata,
    };
  },

  // Get paginated media items
  getMediaItemsPaginated: async (
    page: number = 1,
    limit: number = 24,
    filters?: {
      entityId?: string;
      documentId?: number;
      tagId?: number;
      personId?: number;
      verificationStatus?: string;
      minRedFlagRating?: number;
      fileType?: string; // 'image' or 'audio' or mimetype
      albumId?: number;
      sortBy?: 'title' | 'date' | 'rating' | 'date_added' | 'date_taken' | 'filename' | 'file_size';
      sortOrder?: 'asc' | 'desc';
      transcriptQuery?: string;
      hasPeople?: boolean;
      excludeTextScans?: boolean;
    },
  ) => {
    const offset = (page - 1) * limit;
    const pool = getApiPool();

    let fileTypePattern: string | null = null;
    if (filters?.fileType) {
      if (filters.fileType === 'image') {
        fileTypePattern = 'image/%';
      } else if (filters.fileType === 'audio') {
        fileTypePattern = '%audio%';
      } else {
        fileTypePattern = `${filters.fileType}%`;
      }
    }

    const whereParts: string[] = [normalMediaEvidenceWhereSql('m')];
    const queryParams: Array<string | number | bigint | null> = [];
    const addParam = (value: string | number | bigint | null) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    if (filters?.entityId) {
      const p = addParam(BigInt(filters.entityId));
      whereParts.push(
        `(m.entity_id = ${p}::bigint OR EXISTS (
          SELECT 1 FROM media_item_people mip
          WHERE mip.media_item_id::text = m.id::text
          AND mip.entity_id = ${p}::bigint
        ))`,
      );
    }
    if (filters?.documentId != null) {
      whereParts.push(`m.document_id = ${addParam(filters.documentId)}::bigint`);
    }
    if (filters?.personId != null) {
      whereParts.push(
        `EXISTS (
          SELECT 1
          FROM media_item_people mp
          WHERE mp.media_item_id::text = m.id::text
            AND mp.entity_id = ${addParam(filters.personId)}::bigint
        )`,
      );
    }
    if (filters?.tagId != null) {
      whereParts.push(
        `EXISTS (
          SELECT 1
          FROM media_item_tags mt
          WHERE mt.media_item_id::text = m.id::text
            AND mt.tag_id = ${addParam(filters.tagId)}::bigint
        )`,
      );
    }
    if (fileTypePattern) {
      whereParts.push(`m.file_type LIKE ${addParam(fileTypePattern)}::text`);
    }
    if (filters?.verificationStatus?.trim()) {
      whereParts.push(
        `m.verification_status = ${addParam(filters.verificationStatus.trim())}::text`,
      );
    }
    if (filters?.minRedFlagRating != null) {
      whereParts.push(`m.red_flag_rating >= ${addParam(filters.minRedFlagRating)}::int`);
    }
    if (filters?.albumId != null) {
      const syntheticAlbumPredicate = buildSyntheticVideoAlbumPredicate(filters.albumId, addParam);
      if (syntheticAlbumPredicate) {
        whereParts.push(syntheticAlbumPredicate);
      } else {
        whereParts.push(`m.album_id = ${addParam(filters.albumId)}::int`);
      }
    }
    if (filters?.hasPeople) {
      whereParts.push(
        `EXISTS (
          SELECT 1
          FROM media_item_people mp
          WHERE mp.media_item_id::text = m.id::text
        )`,
      );
    }
    if (filters?.transcriptQuery?.trim()) {
      const q = `%${filters.transcriptQuery.trim()}%`;
      whereParts.push(
        `(COALESCE(m.metadata_json::text, '') ILIKE ${addParam(q)}::text OR COALESCE(m.description, '') ILIKE ${addParam(q)}::text OR COALESCE(m.title, '') ILIKE ${addParam(q)}::text)`,
      );
    }
    if (filters?.excludeTextScans) {
      whereParts.push(`
        NOT (
          (
            m.has_text IS TRUE
            OR m.metadata_json->>'is_text_only' = 'true'
            OR m.file_path ILIKE '%Unconfirmed Claims%'
            OR m.file_path ILIKE '%textify%'
            OR m.file_path ILIKE '%_ocr%'
            OR m.file_path ILIKE '%-ocr-%'
            OR (m.metadata_json->>'is_document_extract' = 'true' AND LENGTH(COALESCE(m.title, '')) > 80)
          ) IS TRUE
        )
      `);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const countRes = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM media_items m
        ${whereSql}
      `,
      queryParams,
    );
    const total = Number((countRes.rows[0] as { total?: unknown })?.total || 0);

    const sortOrder = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';
    let orderBySql = `m.red_flag_rating DESC, m.created_at DESC`;
    if (filters?.sortBy === 'title') {
      orderBySql = `LOWER(COALESCE(m.title, '')) ${sortOrder}, m.created_at DESC`;
    } else if (filters?.sortBy === 'date' || filters?.sortBy === 'date_added') {
      orderBySql = `m.created_at ${sortOrder}, m.id DESC`;
    } else if (filters?.sortBy === 'date_taken') {
      orderBySql = `m.date_taken ${sortOrder} NULLS LAST, m.created_at DESC`;
    } else if (filters?.sortBy === 'filename') {
      orderBySql = `LOWER(COALESCE(m.file_path, '')) ${sortOrder}, m.created_at DESC`;
    } else if (filters?.sortBy === 'file_size') {
      orderBySql = `m.file_size ${sortOrder} NULLS LAST, m.created_at DESC`;
    } else if (filters?.sortBy === 'rating') {
      orderBySql = `m.red_flag_rating ${sortOrder}, m.created_at DESC`;
    }

    const listParams = [...queryParams];
    listParams.push(limit);
    const limitParam = `$${listParams.length}`;
    listParams.push(offset);
    const offsetParam = `$${listParams.length}`;

    const listRes = await pool.query(
      `
        SELECT
          m.id,
          m.entity_id as "entityId",
          m.document_id as "documentId",
          m.file_path as "filePath",
          m.thumbnail_path as "thumbnailPath",
          m.file_type as "fileType",
          m.file_size as "fileSize",
          m.width,
          m.height,
          m.title,
          m.description,
          m.album_id as "albumId",
          m.is_sensitive as "isSensitive",
          m.verification_status as "verificationStatus",
          m.red_flag_rating as "redFlagRating",
          m.metadata_json as "metadataJson",
          m.date_taken as "dateTaken",
          m.created_at as "createdAt",
          string_agg(DISTINCT e.id || ':' || e.full_name, ',') as people,
          COALESCE(
            json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name))
              FILTER (WHERE t.id IS NOT NULL),
            '[]'::json
          ) as tags
        FROM media_items m
        LEFT JOIN media_item_people mp ON m.id = mp.media_item_id::text
        LEFT JOIN entities e ON mp.entity_id = e.id
        LEFT JOIN media_item_tags mt ON m.id = mt.media_item_id::text
        LEFT JOIN media_tags t ON mt.tag_id = t.id
        ${whereSql}
        GROUP BY m.id
        ORDER BY ${orderBySql}
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      listParams,
    );
    interface MediaListRow {
      id: string | number;
      entityId: string | null;
      documentId: string | null;
      filePath: string;
      thumbnailPath: string | null;
      fileType: string | null;
      fileSize: string | number | null;
      width: number | null;
      height: number | null;
      title: string | null;
      description: string | null;
      albumId: number | null;
      isSensitive: boolean | null;
      verificationStatus: string | null;
      redFlagRating: number | null;
      metadataJson: unknown;
      dateTaken: Date | null;
      createdAt: Date | null;
      people: string | null;
      tags: unknown;
    }
    const mediaItems = listRes.rows as MediaListRow[];

    return {
      mediaItems: mediaItems.map((item) => {
        let metadata: Record<string, unknown> = {};
        try {
          if (item.metadataJson) {
            metadata =
              typeof item.metadataJson === 'string'
                ? JSON.parse(item.metadataJson)
                : (item.metadataJson as Record<string, unknown>);
          }
        } catch (e) {
          logger.error({ err: e, mediaId: item.id }, 'Error parsing metadata for media item');
        }

        const people = item.people
          ? item.people.split(',').map((p: string) => {
              const [id, name] = p.split(':');
              return { id: parseInt(id), name };
            })
          : [];
        const tags = Array.isArray(item.tags)
          ? item.tags
              .map((tag) => {
                const record = tag as Record<string, unknown>;
                const name = typeof record.name === 'string' ? record.name : '';
                return name || null;
              })
              .filter((tagName): tagName is string => Boolean(tagName))
          : [];

        return {
          ...item,
          id: Number(item.id),
          fileSize: Number(item.fileSize || 0),
          isSensitive: Boolean(item.isSensitive),
          redFlagRating: Number(item.redFlagRating || 0),
          metadata,
          tags,
          people,
        };
      }),
      total,
    };
  },

  // Batch get media items for multiple entities (limit 5 per entity)
  getPhotosForEntities: async (entityIds: string[]) => {
    if (!entityIds.length) return [];
    const ids = entityIds.map((id) => BigInt(id));
    const pool = getApiPool();
    const result = await pool.query(
      `
        SELECT
          id,
          "entityId",
          "filePath",
          title,
          "isSensitive",
          "redFlagRating",
          rn
        FROM (
          SELECT
            m.id,
            COALESCE(mip.entity_id, m.entity_id) as "entityId",
            COALESCE(f.crop_path, m.file_path) as "filePath",
            m.title,
            m.is_sensitive as "isSensitive",
            m.red_flag_rating as "redFlagRating",
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(mip.entity_id, m.entity_id)
              ORDER BY 
                (CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END) DESC,
                m.red_flag_rating DESC, 
                m.created_at DESC
            ) as rn
          FROM media_items m
          LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
          LEFT JOIN face_clusters fc ON fc.entity_id = COALESCE(mip.entity_id, m.entity_id)
          LEFT JOIN faces f ON f.cluster_id = fc.id AND f.media_item_id::text = m.id::text
          WHERE (
            mip.entity_id = ANY($1::bigint[])
            OR m.entity_id = ANY($1::bigint[])
            OR m.document_id::bigint IN (
              SELECT document_id FROM entity_mentions WHERE entity_id = ANY($1::bigint[])
            )
            OR EXISTS (
              SELECT 1 FROM entities e
              WHERE e.id = ANY($1::bigint[])
              AND (
                m.title ILIKE '%' || e.full_name || '%'
                OR e.full_name ILIKE '%' || m.title || '%'
              )
            )
          )
            AND m.file_type LIKE 'image/%'
        ) t
        WHERE rn <= 5
      `,
      [ids],
    );
    return result.rows;
  },

  getMediaByDocument: async (documentId: number) => {
    const pool = getApiPool();
    const res = await pool.query<{
      id: string;
      filePath: string;
      fileType: string | null;
      title: string | null;
      isVerified: boolean | null;
    }>(
      `SELECT
         id,
         file_path AS "filePath",
         file_type AS "fileType",
         title,
         is_verified AS "isVerified"
       FROM media_items
       WHERE document_id = $1
       ORDER BY created_at DESC`,
      [documentId],
    );
    return res.rows.map((item) => ({
      ...item,
      id: Number(item.id),
      is_verified: item.isVerified,
    }));
  },
};
