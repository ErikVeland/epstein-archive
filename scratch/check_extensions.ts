import { getApiPool } from '../src/server/db/connection.js';

async function checkExtensions() {
  const pool = getApiPool();
  try {
    const res = await pool.query('SELECT * FROM pg_extension;');
    console.log('Available Extensions:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error checking extensions:', err);
  } finally {
    process.exit();
  }
}

checkExtensions();
