#!/usr/bin/env tsx

import path from 'path';
import pg from 'pg';

const OLD_COLLECTION_NAME = 'Sasha Riley TikTok Q&A';
const NEW_COLLECTION_NAME = 'Sascha Riley TikTok Q&A';
const TARGET_PATH_FRAGMENT = 'data/media/videos/Sasha Riley TikTok Q&A/';
const ALBUM_DESCRIPTION = 'Sascha Riley TikTok Q&A video';

function deriveTitle(filePath: string): string {
  const filename = path.basename(filePath, path.extname(filePath)).toLowerCase();
  if (filename === 'sasha-riley-tiktok-qa') {
    return NEW_COLLECTION_NAME;
  }

  return (
    path
      .basename(filePath, path.extname(filePath))
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || NEW_COLLECTION_NAME
  );
}

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.mp4':
    case '.m4v':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.avi':
      return 'video/x-msvideo';
    case '.mkv':
      return 'video/x-matroska';
    case '.webm':
      return 'video/webm';
    default:
      return 'video/mp4';
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE documents
       SET source_collection = $1
       WHERE source_collection = $2
          OR file_path LIKE $3`,
      [NEW_COLLECTION_NAME, OLD_COLLECTION_NAME, `%${TARGET_PATH_FRAGMENT}%`],
    );

    const albumRow =
      (
        await client.query<{ id: string | number }>(
          `INSERT INTO media_albums (name, description)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [NEW_COLLECTION_NAME, ALBUM_DESCRIPTION],
        )
      ).rows[0] ?? null;

    const existingAlbum =
      (
        await client.query<{ id: string | number }>(
          `SELECT id FROM media_albums WHERE name = $1 LIMIT 1`,
          [NEW_COLLECTION_NAME],
        )
      ).rows[0] ?? null;

    const albumId = Number(albumRow?.id ?? existingAlbum?.id);
    if (!albumId) {
      throw new Error('Unable to resolve Sascha TikTok album id');
    }

    const { rows: documents } = await client.query<{
      id: number;
      file_path: string;
      file_name: string | null;
      created_at: string | null;
      metadata_json: Record<string, unknown> | null;
    }>(
      `SELECT id, file_path, file_name, created_at, metadata_json
       FROM documents
       WHERE file_path LIKE $1
       ORDER BY id`,
      [`%${TARGET_PATH_FRAGMENT}%`],
    );

    if (!documents.length) {
      throw new Error('No Sascha TikTok documents found to backfill');
    }

    for (const doc of documents) {
      const metadataJson = {
        ...(doc.metadata_json ?? {}),
        documentId: doc.id,
        sourceCollection: NEW_COLLECTION_NAME,
      };

      const existingItem =
        (
          await client.query<{ id: string }>(
            `SELECT id
             FROM media_items
             WHERE document_id = $1 OR file_path = $2
             LIMIT 1`,
            [doc.id, doc.file_path],
          )
        ).rows[0] ?? null;

      const title = deriveTitle(doc.file_path || doc.file_name || NEW_COLLECTION_NAME);
      const fileType = inferMimeType(doc.file_path);

      if (existingItem) {
        await client.query(
          `UPDATE media_items
           SET document_id = $1,
               album_id = $2,
               file_type = $3,
               file_path = $4,
               title = $5,
               metadata_json = $6::jsonb,
               created_at = COALESCE($7::timestamp, created_at)
           WHERE id = $8`,
          [
            doc.id,
            albumId,
            fileType,
            doc.file_path,
            title,
            JSON.stringify(metadataJson),
            doc.created_at,
            existingItem.id,
          ],
        );
        continue;
      }

      const nextIdRow =
        (
          await client.query<{ next_id: string }>(
            `SELECT COALESCE(MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::bigint END), 0) + 1 AS next_id
             FROM media_items`,
          )
        ).rows[0] ?? null;

      await client.query(
        `INSERT INTO media_items (
           id,
           document_id,
           album_id,
           file_type,
           file_path,
           title,
           verification_status,
           red_flag_rating,
           is_sensitive,
           metadata_json,
           created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'unverified', 0, false, $7::jsonb, COALESCE($8::timestamp, CURRENT_TIMESTAMP)
         )`,
        [
          String(nextIdRow?.next_id ?? '1'),
          doc.id,
          albumId,
          fileType,
          doc.file_path,
          title,
          JSON.stringify(metadataJson),
          doc.created_at,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `Backfilled ${documents.length} Sascha TikTok media item(s) into album ${albumId}.`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
