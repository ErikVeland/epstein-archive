import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function check() {
  const pool = getApiPool();
  try {
    const resItems = await pool.query(
      'SELECT title, file_path FROM media_items ORDER BY id DESC LIMIT 5',
    );
    console.log(JSON.stringify(resItems.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
