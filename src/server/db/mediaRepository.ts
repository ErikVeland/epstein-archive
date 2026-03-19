import { mediaQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export const mediaRepository = {
  // Get all albums with counts for a specific media type
  getAlbumsByMediaType: async (fileType: 'audio' | 'video') => {
    let likePattern: string;
    if (fileType === 'audio') {
      likePattern = '%audio%';
    } else {
      likePattern = `${fileType}/%`;
    }

    const result = await mediaQueries.getAlbumsByMediaType.run({ likePattern }, getApiPool());
    return result.map((row: any) => ({
      ...row,
      itemCount: Number(row.itemCount || 0),
      sensitiveCount: Number(row.sensitiveCount || 0),
    }));
  },

  // Get media items for an entity
  getMediaItems: async (entityId: string) => {
    const mediaItems = await mediaQueries.getMediaItemsByEntity.run({ entityId }, getApiPool());

    return mediaItems.map((item: any) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : item.metadataJson;
        }
      } catch (e) {
        logger.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        id: Number(item.id),
        fileSize: Number((item as any).fileSize || 0),
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
      };
    });
  },

  // Get all media items (for Evidence Media tab)
  getAllMediaItems: async () => {
    const mediaItems = await mediaQueries.getAllMediaItems.run(undefined, getApiPool());

    return mediaItems.map((item: any) => {
      let metadata = {};
      try {
        if (item.metadataJson) {
          metadata =
            typeof item.metadataJson === 'string'
              ? JSON.parse(item.metadataJson)
              : item.metadataJson;
        }
      } catch (e) {
        logger.error('Error parsing metadata for media item', item.id, e);
      }

      return {
        ...item,
        id: Number(item.id),
        fileSize: Number((item as any).fileSize || 0),
        redFlagRating: Number(item.redFlagRating || 0),
        metadata,
        relatedEntities: item.relatedEntities
          ? item.relatedEntities.split(',')
          : item.entityName
            ? [item.entityName]
            : [],
      };
    });
  },

  // Get single media item by ID
  getMediaItemById: async (id: number) => {
    const rows = await mediaQueries.getMediaItemById.run({ id: String(id) }, getApiPool()); // id is text in Postgres
    const item = rows[0];
    if (!item) return undefined;

    let metadata = {};
    try {
      if (item.metadataJson) {
        metadata =
          typeof item.metadataJson === 'string' ? JSON.parse(item.metadataJson) : item.metadataJson;
      }
    } catch (e) {
      logger.error('Error parsing metadata for media item', item.id, e);
    }

    return {
      ...item,
      id: Number(item.id),
      isSensitive: Boolean(item.isSensitive),
      redFlagRating: Number(item.redFlagRating || 0),
      fileSize: Number((item as any).fileSize || 0),
      metadata,
    };
  },

  // Get paginated media items
  getMediaItemsPaginated: async (
    page: number = 1,
    limit: number = 24,
    filters?: {
      entityId?: string;
      verificationStatus?: string;
      minRedFlagRating?: number;
      fileType?: string; // 'image' or 'audio' or mimetype
      albumId?: number;
      sortBy?: 'title' | 'date' | 'rating';
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
    if (fileTypePattern) {
      whereParts.push(`m.file_type LIKE ${addParam(fileTypePattern)}::text`);
    }
    if (filters?.minRedFlagRating != null) {
      whereParts.push(`m.red_flag_rating >= ${addParam(filters.minRedFlagRating)}::int`);
    }
    if (filters?.albumId != null) {
      whereParts.push(`m.album_id = ${addParam(filters.albumId)}::int`);
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
    const total = Number((countRes.rows[0] as any)?.total || 0);

    let orderBySql = 'm.red_flag_rating DESC, m.created_at DESC';
    if (filters?.sortBy === 'title') {
      orderBySql = `LOWER(COALESCE(m.title, '')) ASC, m.created_at DESC`;
    } else if (filters?.sortBy === 'date') {
      orderBySql = 'm.created_at DESC';
    } else if (filters?.sortBy === 'rating') {
      orderBySql = 'm.red_flag_rating DESC, m.created_at DESC';
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
          string_agg(DISTINCT e.id || ':' || e.full_name, ',') as people
        FROM media_items m
        LEFT JOIN media_item_people mp ON m.id = mp.media_item_id::text
        LEFT JOIN entities e ON mp.entity_id = e.id
        ${whereSql}
        GROUP BY m.id
        ORDER BY ${orderBySql}
        LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      listParams,
    );
    const mediaItems = listRes.rows as any[];

    return {
      mediaItems: mediaItems.map((item) => {
        let metadata = {};
        try {
          if (item.metadataJson) {
            metadata =
              typeof item.metadataJson === 'string'
                ? JSON.parse(item.metadataJson)
                : item.metadataJson;
          }
        } catch (e) {
          logger.error('Error parsing metadata for media item', item.id, e);
        }

        const people = item.people
          ? item.people.split(',').map((p: string) => {
              const [id, name] = p.split(':');
              return { id: parseInt(id), name };
            })
          : [];

        return {
          ...item,
          id: Number(item.id),
          fileSize: Number(item.fileSize || 0),
          isSensitive: Boolean(item.isSensitive),
          redFlagRating: Number(item.redFlagRating || 0),
          metadata,
          tags: [], // Tags missing in current Postgres schema
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
    const mediaItems = await (mediaQueries.getMediaByDocument as any).run(
      { documentId: BigInt(documentId) },
      getApiPool(),
    );
    return mediaItems.map((item: any) => {
      return {
        ...item,
        id: Number(item.id),
        is_verified: item.isVerified,
      };
    });
  },
};
