import { mediaQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

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
}

interface SingleMediaItemRow extends MediaItemRow {
  metadataJson: unknown;
}

export const mediaRepository = {
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
    )) as AlbumRow[];
    return result.map((row: AlbumRow) => ({
      ...row,
      itemCount: Number(row.itemCount || 0),
      sensitiveCount: Number(row.sensitiveCount || 0),
    }));
  },

  // Get media items for an entity
  getMediaItems: async (entityId: string) => {
    const mediaItems = (await mediaQueries.getMediaItemsByEntity.run(
      { entityId },
      getApiPool(),
    )) as MediaItemRow[];

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

      return {
        ...item,
        id: Number(item.id),
        fileSize: 0,
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
      };
    });
  },

  // Get all media items (for Evidence Media tab)
  getAllMediaItems: async () => {
    const mediaItems = (await mediaQueries.getAllMediaItems.run(
      undefined,
      getApiPool(),
    )) as MediaItemRow[];

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
    )) as SingleMediaItemRow[];
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

    const whereParts: string[] = [];
    const queryParams: Array<string | number | bigint | null> = [];
    const addParam = (value: string | number | bigint | null) => {
      queryParams.push(value);
      return `$${queryParams.length}`;
    };

    if (filters?.entityId) {
      whereParts.push(`m.entity_id = ${addParam(BigInt(filters.entityId))}::bigint`);
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
      whereParts.push(`m.album_id = ${addParam(filters.albumId)}::int`);
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
        SELECT * FROM (
          SELECT DISTINCT
            m.id,
            COALESCE(mip.entity_id, m.entity_id) as "entityId",
            m.file_path as "filePath",
            m.title,
            m.is_sensitive as "isSensitive",
            m.red_flag_rating as "redFlagRating",
            ROW_NUMBER() OVER (
              PARTITION BY COALESCE(mip.entity_id, m.entity_id)
              ORDER BY m.red_flag_rating DESC, m.created_at DESC
            ) as rn
          FROM media_items m
          LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
          WHERE (
            mip.entity_id = ANY($1::bigint[])
            OR m.entity_id = ANY($1::bigint[])
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
