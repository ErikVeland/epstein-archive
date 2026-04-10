import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Backfills the media_items table with existing image documents that were
 * previously skipped by the ingestion pipeline.
 */
async function backfill() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Starting Image Media Backfill...');

    // 1. Find all image documents that don't have a corresponding media_item
    const result = await pool.query(`
      SELECT 
        d.id as "documentId",
        d.file_path as "filePath",
        d.file_name as "fileName",
        d.source_collection as "collectionName"
      FROM documents d
      LEFT JOIN media_items mi ON mi.document_id = d.id
      WHERE (d.file_path ILIKE '%.jpg' OR d.file_path ILIKE '%.png' OR d.file_path ILIKE '%.jpeg')
        AND mi.id IS NULL
    `);

    const missingItems = result.rows;
    console.log(`   Found ${missingItems.length} missing image items.`);

    if (missingItems.length === 0) {
      console.log('✅ All images are already synchronized.');
      return;
    }

    // 2. Get high water mark for IDs
    const idRes = await pool.query(`
      SELECT COALESCE(MAX(CASE WHEN id ~ '^[0-9]+$' THEN id::bigint END), 0) as max_id
      FROM media_items
    `);
    let nextId = BigInt(idRes.rows[0].max_id || '0') + 1n;

    // 3. Process in batches
    for (const item of missingItems) {
      // Get or create album
      let albumId: number;
      const albumRes = await pool.query('SELECT id FROM media_albums WHERE name = $1', [
        item.collectionName,
      ]);

      if (albumRes.rows.length > 0) {
        albumId = albumRes.rows[0].id;
      } else {
        const insertAlbum = await pool.query(
          'INSERT INTO media_albums (name, description) VALUES ($1, $2) RETURNING id',
          [item.collectionName, `Ingested from ${item.collectionName}`],
        );
        albumId = insertAlbum.rows[0].id;
      }

      const mimeType = item.filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const title = item.fileName.split('.')[0].replace(/[_-]+/g, ' ').trim() || item.fileName;

      await pool.query(
        `INSERT INTO media_items (
           id, document_id, album_id, file_type, file_path, title, 
           verification_status, red_flag_rating, is_sensitive, metadata_json, 
           created_at, file_size
         ) VALUES ($1, $2, $3, $4, $5, $6, 'unverified', 0, false, $7::jsonb, CURRENT_TIMESTAMP, 0)`,
        [
          nextId.toString(),
          item.documentId,
          albumId,
          mimeType,
          item.filePath,
          title,
          JSON.stringify({ sourceCollection: item.collectionName, backfilled: true }),
        ],
      );

      nextId++;
    }

    console.log(`✅ Successfully backfilled ${missingItems.length} media items.`);
  } catch (err) {
    console.error('❌ Backfill failed:', err);
  } finally {
    await pool.end();
  }
}

backfill();
