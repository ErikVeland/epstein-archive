import { getApiPool } from './src/server/db/connection.js';

async function checkEntity() {
  const pool = getApiPool();
  try {
    const { rows } = await pool.query(
      "SELECT id, full_name, aliases, is_vip FROM entities WHERE full_name ILIKE '%Doronin%' OR aliases ILIKE '%dvycut%' OR aliases ILIKE '%DV%'",
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkEntity();
