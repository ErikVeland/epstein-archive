import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function count() {
  const pool = getApiPool();
  try {
    const res = await pool.query(
      "SELECT count(*) FROM documents WHERE file_type = 'pdf' OR file_path ILIKE '%.pdf'",
    );
    console.log(`PDF Count: ${res.rows[0].count}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
count();
