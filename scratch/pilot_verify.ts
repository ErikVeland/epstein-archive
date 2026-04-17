import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function check() {
  const pool = getApiPool();
  try {
    const res = await pool.query('SELECT name FROM media_albums ORDER BY id DESC LIMIT 10');
    console.log(JSON.stringify(res.rows, null, 2));

    const resItems = await pool.query(
      'SELECT title, filename FROM media_items ORDER BY id DESC LIMIT 5',
    );
    console.log(JSON.stringify(resItems.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
