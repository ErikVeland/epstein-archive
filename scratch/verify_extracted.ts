import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function check() {
  const pool = getApiPool();
  try {
    const resItems = await pool.query(
      'SELECT title, file_path, album_id FROM media_items WHERE document_id IS NOT NULL ORDER BY id DESC LIMIT 5',
    );
    console.log(JSON.stringify(resItems.rows, null, 2));

    if (resItems.rows.length > 0 && resItems.rows[0].album_id) {
      const resAlbum = await pool.query('SELECT name FROM media_albums WHERE id = $1', [
        resItems.rows[0].album_id,
      ]);
      console.log('Album Name:', resAlbum.rows[0].name);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
