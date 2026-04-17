import * as dotenv from 'dotenv';
import { getApiPool } from '../src/server/db/connection.js';
dotenv.config();

async function checkCols() {
  const pool = getApiPool();
  try {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'media_items'",
    );
    console.log(res.rows.map((r) => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
checkCols();
