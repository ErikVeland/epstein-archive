import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function check() {
  const pool = getApiPool();
  try {
    const resItems = await pool.query(`
      SELECT m.id, m.title, m.file_path, a.name as album_name 
      FROM media_items m
      JOIN media_albums a ON m.album_id = a.id
      WHERE m.metadata_json->>'extraction_engine' = 'pdfimages-cli'
      ORDER BY m.created_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(resItems.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
