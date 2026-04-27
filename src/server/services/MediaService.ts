import {
  MediaImage,
  Album,
  MediaTag,
  ImageFilter,
  ImageSort,
  MediaStats,
} from '../../types/media.types';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import exifParser from 'exif-parser';
import archiver from 'archiver';
import type { Pool, QueryResultRow } from 'pg';
import { getApiPool } from '../db/runtime.js';
import { logger } from './Logger.js';

export class MediaService {
  private db: Pool;

  constructor(db: Pool | null) {
    // Preserve passed db for compatibility, but default to shared API pool.
    this.db = (db || getApiPool()) as Pool;
    if (process.env.NODE_ENV === 'production' && this.isLegacyPrepareClient()) {
      throw new Error(
        '[MediaService] Legacy prepare()-based DB client is not allowed in production. Use Postgres pool-backed runtime.',
      );
    }
  }

  private isLegacyPrepareClient(): boolean {
    return typeof (this.db as Pool & { prepare?: unknown })?.prepare === 'function';
  }

  private async pgRows<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const { rows } = await this.db.query<T>(sql, params);
    return rows;
  }

  private async pgRow<T extends QueryResultRow = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | undefined> {
    const rows = await this.pgRows<T>(sql, params);
    return rows[0];
  }

  private async pgExec(sql: string, params: unknown[] = []): Promise<void> {
    await this.db.query(sql, params);
  }

  private mapRowToMediaImage(row: Record<string, unknown>): MediaImage {
    const mediaPath = String(row['file_path'] ?? row['filePath'] ?? row['path'] ?? '');
    const filename = String(row['filename'] ?? row['file_name'] ?? path.basename(mediaPath));
    const thumbnailValue = row['thumbnail_path'] ?? row['thumbnailPath'];

    return {
      ...row,
      id: Number(row['id']),
      filename,
      file_name: filename,
      originalFilename: String(row['original_filename'] ?? row['originalFilename'] ?? filename),
      path: mediaPath,
      file_path: mediaPath,
      thumbnailPath: thumbnailValue == null ? undefined : String(thumbnailValue),
      thumbnail_path: thumbnailValue == null ? undefined : String(thumbnailValue),
      title: row['title'] == null ? undefined : String(row['title']),
      description: row['description'] == null ? undefined : String(row['description']),
      albumId:
        row['album_id'] == null && row['albumId'] == null
          ? undefined
          : Number(row['album_id'] ?? row['albumId']),
      albumName: row['albumName'] == null ? undefined : String(row['albumName']),
      width: row['width'] == null ? undefined : Number(row['width']),
      height: row['height'] == null ? undefined : Number(row['height']),
      fileSize: Number(row['file_size'] ?? row['fileSize'] ?? 0),
      format: String(row['file_type'] ?? row['fileType'] ?? ''),
      dateTaken: row['date_taken']
        ? new Date(String(row['date_taken'])).toISOString()
        : row['dateTaken']
          ? new Date(String(row['dateTaken'])).toISOString()
          : undefined,
      dateAdded: row['created_at']
        ? new Date(String(row['created_at'])).toISOString()
        : row['createdAt']
          ? new Date(String(row['createdAt'])).toISOString()
          : '',
      dateModified: row['date_modified']
        ? new Date(String(row['date_modified'])).toISOString()
        : row['dateModified']
          ? new Date(String(row['dateModified'])).toISOString()
          : row['created_at']
            ? new Date(String(row['created_at'])).toISOString()
            : row['createdAt']
              ? new Date(String(row['createdAt'])).toISOString()
              : '',
      tags: [],
      isSensitive: Boolean(row['is_sensitive'] ?? row['isSensitive']),
      rating:
        row['rating'] == null
          ? row['red_flag_rating'] == null && row['redFlagRating'] == null
            ? undefined
            : Number(row['red_flag_rating'] ?? row['redFlagRating'])
          : Number(row['rating']),
      redFlagRating:
        row['red_flag_rating'] == null && row['redFlagRating'] == null
          ? undefined
          : Number(row['red_flag_rating'] ?? row['redFlagRating']),
    };
  }

  // ============ TAG OPERATIONS ============

  async getAllTags(): Promise<MediaTag[]> {
    return await this.pgRows<MediaTag>(
      `SELECT id, name, category, NULL::text as "dateCreated"
       FROM media_tags
       ORDER BY name`,
    );
  }

  // ============ ALBUM OPERATIONS ============

  async getAllAlbums(): Promise<Album[]> {
    const results = await this.pgRows<Record<string, unknown>>(`
      SELECT
        a.id, a.name, a.description, a.cover_image_id as "coverImageId",
        a.created_at as "dateCreated", a.date_modified as "dateModified",
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id::text
      GROUP BY a.id, ci.file_path
      HAVING COUNT(i.id) > 0
      ORDER BY a.name
    `);
    return results.map((row) => ({ ...row, imageCount: Number(row['imageCount']) })) as Album[];
  }

  async getAlbumById(id: number): Promise<Album | undefined> {
    const row = await this.pgRow<Record<string, unknown>>(
      `
      SELECT
        a.id, a.name, a.description, a.cover_image_id as "coverImageId",
        a.created_at as "dateCreated", a.date_modified as "dateModified",
        COUNT(i.id) as "imageCount",
        ci.file_path as "coverImagePath"
      FROM media_albums a
      LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
      LEFT JOIN media_items ci ON a.cover_image_id = ci.id::text
      WHERE a.id = $1
      GROUP BY a.id, ci.file_path
    `,
      [id],
    );
    if (!row) return undefined;
    return { ...row, imageCount: Number(row['imageCount']) } as Album;
  }

  async createAlbum(name: string, description?: string): Promise<Album> {
    const query = `
      INSERT INTO media_albums (name, description)
      VALUES ($1, $2) RETURNING id
    `;
    const result = await this.pgRow<{ id: number }>(query, [name, description || null]);
    if (!result) throw new Error('Failed to create album');
    return (await this.getAlbumById(Number(result.id)))!;
  }

  async updateAlbum(id: number, updates: Partial<Album>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description');
      values.push(updates.description || null);
    }
    if (updates.coverImageId !== undefined) {
      fields.push('cover_image_id');
      values.push(updates.coverImageId);
    }

    if (fields.length > 0) {
      const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
      values.push(id);
      await this.pgExec(
        `
        UPDATE media_albums
        SET ${setClauses.join(', ')}, date_modified = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
      `,
        values,
      );
    }
  }

  async deleteAlbum(id: number): Promise<void> {
    await this.pgExec('DELETE FROM media_albums WHERE id = $1', [id]);
  }

  /**
   * Get existing album by name or create a new one (idempotent)
   */
  async getOrCreateAlbum(name: string, description?: string): Promise<Album> {
    const existing = await this.pgRow<{ id: number }>(
      'SELECT id FROM media_albums WHERE name = $1',
      [name],
    );

    if (existing) {
      return (await this.getAlbumById(existing.id))!;
    }

    return await this.createAlbum(name, description);
  }

  /**
   * Check if an image already exists by original filename and album
   */
  async imageExists(originalFilename: string, albumId?: number): Promise<boolean> {
    const query = albumId
      ? "SELECT id FROM media_items WHERE original_filename = $1 AND album_id = $2 AND file_type LIKE 'image/%'"
      : "SELECT id FROM media_items WHERE original_filename = $1 AND file_type LIKE 'image/%'";

    const row = albumId
      ? await this.pgRow(query, [originalFilename, albumId])
      : await this.pgRow(query, [originalFilename]);

    return !!row;
  }

  /**
   * Check if an image with the given hash already exists in metadata
   */
  async imageByHashExists(hash: string): Promise<boolean> {
    const result = await this.pgRow(
      "SELECT id FROM media_items WHERE metadata_json->>'sha256' = $1",
      [hash],
    );
    return !!result;
  }

  // ============ IMAGE OPERATIONS ============

  async getAllImages(filter?: ImageFilter, sort?: ImageSort): Promise<MediaImage[]> {
    let query = `
      SELECT
        i.*,
        i.file_path as path,
        i.file_path as "filePath",
        a.name as "albumName"
      FROM media_items i
      LEFT JOIN media_albums a ON i.album_id = a.id
      WHERE i.file_type LIKE 'image/%'
    `;

    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filter) {
      if (filter.albumId) conditions.push(`i.album_id = ${bind(filter.albumId)}`);
      if (filter.documentId) conditions.push(`i.document_id = ${bind(filter.documentId)}`);
      if (filter.excludeTextScans) {
        conditions.push(
          `(i.metadata_json->>'is_text_only' IS NULL OR i.metadata_json->>'is_text_only' != 'true')`,
        );
      }
      if (filter.personId) {
        conditions.push(
          `i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ${bind(filter.personId)})`,
        );
      }
      if (filter.tagId) {
        conditions.push(
          `i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ${bind(filter.tagId)})`,
        );
      }
      if (filter.hasPeople) {
        conditions.push(
          'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
        );
      }
      if (filter.format) conditions.push(`i.file_type = ${bind(`image/${filter.format}`)}`);
      if (filter.dateFrom) conditions.push(`i.date_taken >= ${bind(filter.dateFrom)}`);
      if (filter.dateTo) conditions.push(`i.date_taken <= ${bind(filter.dateTo)}`);
      if (filter.searchQuery) {
        const p1 = bind(`%${filter.searchQuery}%`);
        const p2 = bind(`%${filter.searchQuery}%`);
        conditions.push(`(i.title ILIKE ${p1} OR i.description ILIKE ${p2})`);
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    const sortFieldMap: Record<string, string> = {
      id: 'i.id',
      created_at: 'i.created_at',
      date_added: 'i.created_at',
      date_taken: 'i.date_taken',
      title: 'i.title',
      file_size: 'i.file_size',
    };
    const fieldRaw = Array.isArray(sort?.field) ? sort?.field[0] : sort?.field;
    const orderRaw = Array.isArray(sort?.order) ? sort?.order[0] : sort?.order;
    const orderDir = String(orderRaw || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const orderField = sortFieldMap[String(fieldRaw || 'created_at')] || 'i.created_at';
    query += ` ORDER BY ${orderField} ${orderDir}, i.id DESC`;

    if (filter?.limit) {
      const cappedLimit = Math.min(Math.max(1, Number(filter.limit)), 1000);
      query += ` LIMIT ${bind(cappedLimit)}`;
      if (filter?.offset) query += ` OFFSET ${bind(Number(filter.offset))}`;
    }

    const rows = await this.pgRows<Record<string, unknown>>(query, params);
    return rows.map((row) => this.mapRowToMediaImage(row));
  }

  async getImageCount(filter?: ImageFilter): Promise<number> {
    let query =
      "SELECT COUNT(DISTINCT i.id) as count FROM media_items i WHERE i.file_type LIKE 'image/%'";
    const conditions: string[] = [];
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filter) {
      if (filter.albumId) conditions.push(`i.album_id = ${bind(filter.albumId)}`);
      if (filter.documentId) conditions.push(`i.document_id = ${bind(filter.documentId)}`);
      if (filter.excludeTextScans) {
        conditions.push(
          `(i.metadata_json->>'is_text_only' IS NULL OR i.metadata_json->>'is_text_only' != 'true')`,
        );
      }
      if (filter.personId) {
        conditions.push(
          `i.id IN (SELECT media_item_id FROM media_item_people WHERE entity_id = ${bind(filter.personId)})`,
        );
      }
      if (filter.tagId) {
        conditions.push(
          `i.id IN (SELECT media_item_id FROM media_item_tags WHERE tag_id = ${bind(filter.tagId)})`,
        );
      }
      if (filter.hasPeople) {
        conditions.push(
          'EXISTS (SELECT 1 FROM media_item_people mp WHERE mp.media_item_id = i.id)',
        );
      }
      if (filter.format) conditions.push(`i.file_type = ${bind(`image/${filter.format}`)}`);
      if (filter.dateFrom) conditions.push(`i.date_taken >= ${bind(filter.dateFrom)}`);
      if (filter.dateTo) conditions.push(`i.date_taken <= ${bind(filter.dateTo)}`);
      if (filter.searchQuery) {
        const p1 = bind(`%${filter.searchQuery}%`);
        const p2 = bind(`%${filter.searchQuery}%`);
        conditions.push(`(i.title ILIKE ${p1} OR i.description ILIKE ${p2})`);
      }
    }

    if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
    const res = await this.pgRow<{ count: string | number }>(query, params);
    return Number(res?.count || 0);
  }

  async getImageById(id: number): Promise<MediaImage | undefined> {
    const item = await this.pgRow<Record<string, unknown>>(
      `
        SELECT
          id,
          entity_id as "entityId",
          document_id as "documentId",
          file_path as "filePath",
          thumbnail_path as "thumbnailPath",
          file_type as "fileType",
          file_size as "fileSize",
          width,
          height,
          title,
          description,
          album_id as "albumId",
          is_sensitive as "isSensitive",
          verification_status as "verificationStatus",
          red_flag_rating as "redFlagRating",
          metadata_json as "metadataJson",
          exif_json as "exifJson",
          date_taken as "dateTaken",
          created_at as "createdAt"
        FROM media_items
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );
    if (!item) return undefined;

    return this.mapRowToMediaImage(item);
  }

  async createImage(
    image: Omit<MediaImage, 'id' | 'dateAdded' | 'dateModified'> & {
      documentId?: string | number;
      hasText?: boolean;
    },
  ): Promise<MediaImage> {
    // Determine the next numeric ID if none exists in this schema's serials
    const idRes = await this.pgRow<{ max_id: string }>(
      "SELECT MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::bigint END)::text as max_id FROM media_items",
    );
    const nextId = (BigInt(idRes?.max_id || '0') + 1n).toString();

    const query = `
      INSERT INTO media_items (
        id, document_id, album_id, file_type, file_path, thumbnail_path, 
        title, description, verification_status, red_flag_rating, 
        is_sensitive, metadata_json, created_at, file_size, 
        width, height, date_taken, has_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13, $14, $15, $16, $17)
      RETURNING id
    `;

    // Ensure metadata contains extra fields
    const metadata = {
      ...(image.metadata || {}),
      camera: image.cameraMake ? { make: image.cameraMake, model: image.cameraModel } : undefined,
      location: image.latitude ? { lat: image.latitude, lng: image.longitude } : undefined,
    };

    const result = await this.pgRow<{ id: string | number }>(query, [
      nextId,
      image.documentId || null,
      image.albumId || null,
      image.format || 'image/jpeg',
      image.path || image.file_path,
      image.thumbnailPath || null,
      image.title || null,
      image.description || null,
      'unverified', // verification_status
      0, // red_flag_rating
      Boolean(image.isSensitive),
      JSON.stringify(metadata),
      image.fileSize || 0,
      image.width || 0,
      image.height || 0,
      image.dateTaken || null,
      image.hasText ?? null,
    ]);

    if (!result) throw new Error('Failed to create image');
    return (await this.getImageById(Number(result.id)))!;
  }

  async updateImage(id: number, updates: Partial<MediaImage>): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      albumId: 'album_id',
      thumbnailPath: 'thumbnail_path',
      orientation: 'orientation',
      width: 'width',
      height: 'height',
      fileSize: 'file_size',
      redFlagRating: 'red_flag_rating',
    };

    Object.entries(updates).forEach(([key, value]) => {
      const dbField = fieldMap[key];
      if (dbField) {
        fields.push(dbField);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      const setClauses = fields.map((f, i) => `${f} = $${i + 1}`);
      values.push(id);
      await this.pgExec(
        `
        UPDATE media_items
        SET ${setClauses.join(', ')}
        WHERE id = $${values.length}
      `,
        values,
      );
    }
  }

  async rotateImage(id: number, degrees: number): Promise<void> {
    const image = await this.getImageById(id);
    if (!image) throw new Error('Image not found');

    // Resolve image path
    let imagePath = image.path;

    // Check if the path exists as-is (absolute path)
    if (!fs.existsSync(imagePath)) {
      if (imagePath.startsWith('/data/') || imagePath.startsWith('/')) {
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const resolvedPath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(resolvedPath)) {
          imagePath = resolvedPath;
        }
      }
    }

    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at: ${imagePath}`);
    }

    let cssRotation = 0;
    switch (image.orientation) {
      case 6:
        cssRotation = 90;
        break;
      case 3:
        cssRotation = 180;
        break;
      case 8:
        cssRotation = 270;
        break;
    }

    const totalRotation = (cssRotation + degrees) % 360;
    const imageExt = path.extname(imagePath) || '.jpg';
    const tempPath = `${imagePath}.tmp${imageExt}`;

    await sharp(imagePath).rotate().rotate(totalRotation).withMetadata().toFile(tempPath);

    fs.renameSync(tempPath, imagePath);
    const metadata = await sharp(imagePath).metadata();

    await this.updateImage(id, {
      width: metadata.width,
      height: metadata.height,
      fileSize: metadata.size,
    });
  }

  async deleteImage(id: number): Promise<void> {
    await this.pgExec('DELETE FROM media_items WHERE id = $1', [id]);
  }

  // ============ TAG OPERATIONS ============

  async createTag(name: string, category?: string): Promise<MediaTag> {
    const query = `
      INSERT INTO media_tags (name, category)
      VALUES ($1, $2) RETURNING id
    `;
    const result = await this.pgRow<{ id: number }>(query, [name, category || null]);
    if (!result) throw new Error('Failed to create tag');
    return (await this.getTagById(Number(result.id)))!;
  }

  async getTagById(id: number): Promise<MediaTag | undefined> {
    return await this.pgRow<MediaTag>('SELECT * FROM media_tags WHERE id = $1', [id]);
  }

  async getOrCreateTag(name: string, category?: string): Promise<MediaTag> {
    let tag = await this.pgRow<MediaTag>('SELECT * FROM media_tags WHERE name = $1', [name]);

    if (!tag) {
      tag = await this.createTag(name, category);
    }

    return tag;
  }

  async addTagToImage(imageId: number, tagId: number): Promise<void> {
    await this.pgExec(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `,
      [imageId, tagId],
    );
  }

  async removeTagFromImage(imageId: number, tagId: number): Promise<void> {
    await this.pgExec(
      `
      DELETE FROM media_item_tags
      WHERE media_item_id = $1 AND tag_id = $2
    `,
      [imageId, tagId],
    );
  }

  async getImageTags(imageId: number): Promise<MediaTag[]> {
    return await this.pgRows<MediaTag>(
      `
      SELECT t.*
      FROM media_tags t
      JOIN media_item_tags it ON t.id = it.tag_id
      WHERE it.media_item_id = $1
      ORDER BY t.name
    `,
      [imageId],
    );
  }

  async getImagePeople(
    imageId: number,
  ): Promise<Array<{ id: number; name: string; role: string; redFlagRating: number }>> {
    const rows = await this.pgRows<{
      id: string | number;
      name: string;
      primaryRole: string | null;
      redFlagRating: string | number | null;
    }>(
      `
      SELECT
        e.id,
        e.full_name as name,
        e.primary_role as "primaryRole",
        e.red_flag_rating as "redFlagRating"
      FROM media_item_people mp
      JOIN entities e ON e.id = mp.entity_id
      WHERE mp.media_item_id = $1
      ORDER BY e.full_name ASC
    `,
      [imageId],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      role: String(row.primaryRole || 'Unknown'),
      redFlagRating: Number(row.redFlagRating || 0),
    }));
  }

  // ============ MEDIA ITEM (AUDIO/VIDEO) TAGS ============

  async addTagToItem(itemId: number, tagId: number): Promise<void> {
    await this.pgExec(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `,
      [itemId, tagId],
    );
  }

  async removeTagFromItem(itemId: number, tagId: number): Promise<void> {
    await this.pgExec(
      `
      DELETE FROM media_item_tags
      WHERE media_item_id = $1 AND tag_id = $2
    `,
      [itemId, tagId],
    );
  }

  async addPersonToItem(itemId: number, personId: number): Promise<void> {
    await this.pgExec(
      `
      INSERT INTO media_item_people (media_item_id, entity_id)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `,
      [itemId, personId],
    );
  }

  async removePersonFromItem(itemId: number, personId: number): Promise<void> {
    await this.pgExec(
      `
      DELETE FROM media_item_people
      WHERE media_item_id = $1 AND entity_id = $2
    `,
      [itemId, personId],
    );
  }

  async batchAddTagsToItems(itemIds: number[], tagIds: number[]): Promise<void> {
    if (itemIds.length === 0 || tagIds.length === 0) return;
    await this.pgExec(
      `
      INSERT INTO media_item_tags (media_item_id, tag_id)
      SELECT i.item_id, t.tag_id
      FROM unnest($1::text[]) AS i(item_id)
      CROSS JOIN unnest($2::int[]) AS t(tag_id)
      ON CONFLICT DO NOTHING
      `,
      [itemIds.map(String), tagIds],
    );
  }

  async batchRemoveTagsFromItems(itemIds: number[], tagIds: number[]): Promise<void> {
    if (itemIds.length === 0 || tagIds.length === 0) return;
    await this.pgExec(
      `
      DELETE FROM media_item_tags
      WHERE media_item_id = ANY($1::text[])
        AND tag_id = ANY($2::int[])
      `,
      [itemIds.map(String), tagIds],
    );
  }

  async batchAddPeopleToItems(itemIds: number[], personIds: number[]): Promise<void> {
    if (itemIds.length === 0 || personIds.length === 0) return;
    await this.pgExec(
      `
      INSERT INTO media_item_people (media_item_id, entity_id)
      SELECT i.item_id, p.person_id
      FROM unnest($1::int[]) AS i(item_id)
      CROSS JOIN unnest($2::int[]) AS p(person_id)
      ON CONFLICT DO NOTHING
      `,
      [itemIds, personIds],
    );
  }

  async batchRemovePeopleFromItems(itemIds: number[], personIds: number[]): Promise<void> {
    if (itemIds.length === 0 || personIds.length === 0) return;
    await this.pgExec(
      `
      DELETE FROM media_item_people
      WHERE media_item_id = ANY($1::int[])
        AND entity_id = ANY($2::int[])
      `,
      [itemIds, personIds],
    );
  }

  // ============ STATISTICS ============

  async getMediaStats(): Promise<MediaStats> {
    const totalImagesRes = (await this.pgRow<{ count: string | number }>(
      "SELECT COUNT(*) as count FROM media_items WHERE file_type LIKE 'image/%'",
    )) || { count: 0 };
    const totalAlbumsRes = (await this.pgRow<{ count: string | number }>(
      'SELECT COUNT(*) as count FROM media_albums',
    )) || { count: 0 };
    const totalSizeRes = (await this.pgRow<{ size: string | number | null }>(
      "SELECT COALESCE(SUM(file_size), 0) as size FROM media_items WHERE file_type LIKE 'image/%'",
    )) || { size: 0 };

    const formatBreakdown = await this.pgRows<{ format: string; count: string | number }>(`
        SELECT file_type as format, COUNT(*) as count
        FROM media_items
        WHERE file_type LIKE 'image/%'
        GROUP BY file_type
      `);

    const albumBreakdown = await this.pgRows<{ name: string; count: string | number }>(`
        SELECT a.name, COUNT(i.id) as count
        FROM media_albums a
        LEFT JOIN media_items i ON a.id = i.album_id AND i.file_type LIKE 'image/%'
        GROUP BY a.id, a.name
      `);

    return {
      totalImages: Number(totalImagesRes.count || 0),
      totalAlbums: Number(totalAlbumsRes.count || 0),
      totalSize: Number(totalSizeRes.size || 0),
      formatBreakdown: Object.fromEntries(formatBreakdown.map((f) => [f.format, Number(f.count)])),
      albumBreakdown: Object.fromEntries(albumBreakdown.map((a) => [a.name, Number(a.count)])),
    };
  }

  // ============ SEARCH ============

  async searchImages(query: string): Promise<MediaImage[]> {
    return await this.getAllImages({ searchQuery: query });
  }

  // ============ ADVANCED OPERATIONS ============

  async generateThumbnail(
    imagePath: string,
    outputDir: string,
    options: { force?: boolean; orientation?: number } = {},
  ): Promise<string> {
    // Resolve image path for production (relative to app root)
    let resolvedPath = imagePath;

    if (!fs.existsSync(resolvedPath)) {
      if (imagePath.startsWith('/data/') || imagePath.startsWith('/')) {
        const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        const candidatePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(candidatePath)) {
          resolvedPath = candidatePath;
        }
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`Source image for thumbnail not found: ${resolvedPath}`);
      return imagePath;
    }

    // Resolve output dir for production
    let resolvedOutputDir = outputDir;
    if (outputDir.startsWith('/data/') || outputDir.startsWith('/')) {
      const relativePath = outputDir.startsWith('/') ? outputDir.slice(1) : outputDir;
      resolvedOutputDir = path.join(process.cwd(), relativePath);
    }

    const filename = path.basename(imagePath);
    const thumbnailPath = path.join(resolvedOutputDir, `thumb_${filename}`);

    if (fs.existsSync(thumbnailPath) && !options.force) {
      return thumbnailPath;
    }

    if (!fs.existsSync(resolvedOutputDir)) {
      fs.mkdirSync(resolvedOutputDir, { recursive: true });
    }

    try {
      let pipeline = sharp(resolvedPath).rotate();

      // Apply DB-specified orientation if provided
      // 1: 0deg, 3: 180deg, 6: 90deg, 8: 270deg
      if (options.orientation) {
        let degrees = 0;
        switch (options.orientation) {
          case 3:
            degrees = 180;
            break;
          case 6:
            degrees = 90;
            break;
          case 8:
            degrees = 270;
            break;
        }
        if (degrees > 0) {
          pipeline = pipeline.rotate(degrees);
        }
      }

      const isFake =
        /fake/i.test(imagePath) ||
        /confirmed[\s_-]*fake/i.test(imagePath) ||
        /\/fake\//i.test(imagePath);
      const resized = pipeline.resize(300, 300, { fit: 'cover' });
      if (isFake) {
        const svg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="rgba(255,0,0,0.0)"/>
                <stop offset="0.5" stop-color="rgba(255,0,0,0.18)"/>
                <stop offset="1" stop-color="rgba(255,0,0,0.0)"/>
              </linearGradient>
            </defs>
            <rect width="300" height="300" fill="url(#g)"/>
            <g transform="translate(150,150) rotate(-30)">
              <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial, Helvetica, sans-serif" font-size="72"
                fill="rgba(255,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="2">
                FAKE
              </text>
            </g>
          </svg>`,
        );
        await resized.composite([{ input: svg, gravity: 'center' }]).toFile(thumbnailPath);
      } else {
        await resized.toFile(thumbnailPath);
      }

      return thumbnailPath;
    } catch (error) {
      logger.error({ err: error }, 'Error generating thumbnail');
      return imagePath; // Fallback to original if thumb fails
    }
  }

  async processUpload(file: Express.Multer.File, albumId?: number): Promise<MediaImage> {
    const buffer = await fs.promises.readFile(file.path);
    let tags: Record<string, unknown> = {};
    let imageSize: { width?: number; height?: number } = {};

    try {
      const parser = exifParser.create(buffer) as {
        parse: () => {
          tags?: Record<string, unknown>;
          imageSize?: { width?: number; height?: number };
        };
      };
      const result = parser.parse();
      tags = result.tags || {};
      imageSize = result.imageSize || {};
    } catch (e) {
      logger.warn({ detail: e }, 'Failed to parse EXIF data');
    }

    const isFakePath =
      /fake/i.test(file.path) ||
      /confirmed[\s_-]*fake/i.test(file.path) ||
      /\/fake\//i.test(file.path);
    if (isFakePath) {
      try {
        const meta = await sharp(buffer).metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        const svg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="rgba(255,0,0,0.0)"/>
                <stop offset="0.5" stop-color="rgba(255,0,0,0.18)"/>
                <stop offset="1" stop-color="rgba(255,0,0,0.0)"/>
              </linearGradient>
            </defs>
            <rect width="${w}" height="${h}" fill="url(#g)"/>
            <g transform="translate(${Math.floor(w / 2)},${Math.floor(h / 2)}) rotate(-30)">
              <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
                font-family="Arial, Helvetica, sans-serif" font-size="${Math.floor(Math.min(w, h) * 0.18)}"
                fill="rgba(255,0,0,0.35)" stroke="rgba(255,255,255,0.25)" stroke-width="${Math.max(1, Math.floor(Math.min(w, h) * 0.005))}">
                FAKE
              </text>
            </g>
          </svg>`,
        );
        await sharp(buffer)
          .rotate()
          .composite([{ input: svg, gravity: 'center' }])
          .toFile(file.path);
      } catch (e) {
        logger.warn({ detail: e }, 'Failed to overlay FAKE watermark on media upload');
      }
    }
    // Insert into DB
    const query = `
      INSERT INTO media_items (
        filename, original_filename, file_path, file_size, file_type,
        width, height, date_taken, album_id,
        camera_make, camera_model, focal_length, aperture,
        shutter_speed, iso, latitude, longitude,
        created_at, date_modified
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id
    `;

    const info = await this.pgRow<{ id: number }>(query, [
      file.filename,
      file.originalname,
      file.path,
      file.size,
      path.extname(file.originalname).slice(1).toLowerCase(),
      imageSize.width || 0,
      imageSize.height || 0,
      tags['DateTimeOriginal']
        ? new Date(Number(tags['DateTimeOriginal']) * 1000).toISOString()
        : null,
      albumId || null,
      tags['Make'] || null,
      tags['Model'] || null,
      tags['FocalLength'] != null ? String(tags['FocalLength']) : null,
      tags['FNumber'] != null ? String(tags['FNumber']) : null,
      tags['ExposureTime'] != null ? String(tags['ExposureTime']) : null,
      tags['ISO'] || null,
      tags['GPSLatitude'] || null,
      tags['GPSLongitude'] || null,
    ]);

    if (!info) throw new Error('Failed to create media item after upload');
    const finalImage = await this.getImageById(Number(info.id));
    return finalImage!;
  }

  async deleteImages(ids: number[]): Promise<void> {
    for (const id of ids) {
      try {
        await this.deleteImage(id);
      } catch (err) {
        logger.error({ err }, `Failed to delete image ${id} in bulk`);
      }
    }
  }

  async createAlbumArchive(albumId: number, res: import('express').Response): Promise<void> {
    const album = await this.getAlbumById(albumId);
    if (!album) throw new Error('Album not found');

    const images = await this.getAllImages({ albumId });
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      logger.error({ err }, `Archive error for album ${albumId}`);
      // Headers may already be sent; destroy the response stream to signal failure
      res.destroy(err);
    });

    res.attachment(`${album.name.replace(/[^a-z0-9]/gi, '_')}.zip`);
    archive.pipe(res);

    for (const image of images) {
      const imgPath = image.path || image.file_path;
      if (imgPath && fs.existsSync(imgPath)) {
        archive.file(imgPath, { name: image.filename || image.file_name || 'image' });
      }
    }

    await archive.finalize();
  }

  close(): void {
    // Shared PG pool handles closing.
  }
}
