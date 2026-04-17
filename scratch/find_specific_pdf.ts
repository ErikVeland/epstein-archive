import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function findDoc() {
  const pool = getApiPool();
  try {
    const res = await pool.query(
      "SELECT id, file_name, file_path FROM documents WHERE file_path ILIKE '%Florida%Part_1.pdf%'",
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
findDoc();
