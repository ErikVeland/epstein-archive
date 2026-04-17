import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function checkCollections() {
  const pool = getApiPool();
  try {
    const res = await pool.query(
      "SELECT source_collection, count(*) FROM documents WHERE file_type = 'pdf' OR file_path ILIKE '%.pdf' GROUP BY source_collection ORDER BY count(*) DESC",
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkCollections();
