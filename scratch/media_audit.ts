import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function audit() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('--- Media Audit ---');

    // 1. Total Counts
    const { rows: counts } = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM media_items) as total_items,
        (SELECT COUNT(*) FROM media_items WHERE album_id IS NULL) as unassigned_items,
        (SELECT COUNT(*) FROM albums) as total_albums
    `);
    console.log('Counts:', counts[0]);

    // 2. Unassigned items by file type
    const { rows: unassignedTypes } = await pool.query(`
      SELECT file_type, COUNT(*) as count
      FROM media_items
      WHERE album_id IS NULL
      GROUP BY file_type
    `);
    console.log('Unassigned by Type:', unassignedTypes);

    // 3. Album status
    const { rows: albumStats } = await pool.query(`
      SELECT a.id, a.name, COUNT(m.id) as item_count
      FROM albums a
      LEFT JOIN media_items m ON a.id = m.album_id
      GROUP BY a.id, a.name
      ORDER BY item_count DESC
    `);
    console.log('Albums:', albumStats);

    // 4. Missing files check (Sample)
    const { rows: sampleItems } = await pool.query(`
      SELECT id, file_path, thumbnail_path 
      FROM media_items 
      LIMIT 10
    `);
    console.log('Sample Items:', sampleItems);
  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await pool.end();
  }
}

audit();
