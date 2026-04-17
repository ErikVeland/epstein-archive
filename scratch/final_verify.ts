import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function verify() {
  const pool = getApiPool();
  try {
    const res = await pool.query("SELECT * FROM media_items WHERE document_id = '34039'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
verify();
