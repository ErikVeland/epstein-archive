// ============================================================================
// MEDIA — album management and media item sync
// ============================================================================

import type { Pool } from 'pg';
import { evidenceRoleForCollection } from '../../src/server/db/mediaEvidenceScope.js';

export async function getOrCreateMediaAlbumId(
  name: string,
  db: Pool,
  description?: string,
): Promise<number> {
  const existing =
    (await db.query<{ id: string | number }>('SELECT id FROM media_albums WHERE name = $1', [name]))
      .rows[0] ?? null;

  if (existing) {
    return Number(existing.id);
  }

  const inserted =
    (
      await db.query<{ id: string | number }>(
        `INSERT INTO media_albums (name, description)
         VALUES ($1, $2)
         RETURNING id`,
        [name, description || null],
      )
    ).rows[0] ?? null;

  if (!inserted) {
    throw new Error(`Failed to create media album for ${name}`);
  }

  return Number(inserted.id);
}

export async function syncMediaItemFromDocument(
  params: {
    documentId: number;
    filePath: string;
    mimeType: string;
    fileSize: number;
    collectionName: string;
    collectionDescription?: string;
    title: string;
    description?: string;
    metadata: Record<string, unknown>;
    dateTaken?: string | Date | null;
    hasText?: boolean;
  },
  db: Pool,
): Promise<void> {
  const {
    documentId,
    filePath,
    mimeType,
    fileSize,
    collectionName,
    collectionDescription,
    title,
    description,
    metadata,
    dateTaken,
    hasText = false,
  } = params;

  if (
    !mimeType.startsWith('audio/') &&
    !mimeType.startsWith('video/') &&
    !mimeType.startsWith('image/')
  ) {
    return;
  }

  let albumId = await getOrCreateMediaAlbumId(collectionName, db, collectionDescription);

  // Keep extracted assets grouped by dataset. The media browser should not turn every
  // source document into a separate album.
  const isExtracted =
    filePath.includes('data/extracted') ||
    filePath.includes('data/attachments') ||
    filePath.includes('data/temp_extraction');
  if (isExtracted) {
    albumId = await getOrCreateMediaAlbumId(
      collectionName,
      db,
      collectionDescription || `Extracted media assets from the ${collectionName} dataset.`,
    );
  }
  const existing =
    (
      await db.query<{ id: string }>(
        `SELECT id
         FROM media_items
         WHERE document_id = $1 OR file_path = $2
         LIMIT 1`,
        [documentId, filePath],
      )
    ).rows[0] ?? null;

  const dateTakenValue =
    dateTaken instanceof Date
      ? dateTaken.toISOString()
      : typeof dateTaken === 'string' && dateTaken.trim().length > 0
        ? dateTaken
        : null;
  const metadataJson = JSON.stringify({
    ...metadata,
    documentId,
    sourceCollection: collectionName,
    evidenceRole: evidenceRoleForCollection(collectionName),
  });
  const descriptionValue = description?.trim() || null;

  if (existing) {
    await db.query(
      `UPDATE media_items
       SET document_id = $1,
           album_id = $2,
           file_type = $3,
           file_path = $4,
           title = $5,
           description = COALESCE($6::text, description),
           metadata_json = $7::jsonb,
           file_size = $8,
           date_taken = COALESCE($9::timestamp, date_taken),
           has_text = $11
       WHERE id = $10`,
      [
        documentId,
        albumId,
        mimeType,
        filePath,
        title,
        descriptionValue,
        metadataJson,
        fileSize,
        dateTakenValue,
        Number(existing.id),
        hasText,
      ],
    );
    return;
  }

  const nextIdResult =
    (
      await db.query<{ next_id: string }>(
        `SELECT COALESCE(MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::bigint END), 0) + 1 AS next_id
         FROM media_items`,
      )
    ).rows[0] ?? null;
  const nextId = String(nextIdResult?.next_id ?? '1');

  await db.query(
    `INSERT INTO media_items (
       id,
       document_id,
       album_id,
       file_type,
       file_path,
       title,
       description,
       verification_status,
       red_flag_rating,
       is_sensitive,
       metadata_json,
       created_at,
       file_size,
       date_taken,
       has_text
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, 'unverified', 0, false, $8::jsonb, CURRENT_TIMESTAMP, $9, $10, $11
     )`,
    [
      nextId,
      documentId,
      albumId,
      mimeType,
      filePath,
      title,
      descriptionValue,
      metadataJson,
      fileSize,
      dateTakenValue,
      hasText,
    ],
  );
}
