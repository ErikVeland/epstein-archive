import { getApiPool, initPools } from '../src/server/db/connection.js';

async function findSascha() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();
  const res = await pool.query(
    "SELECT id, full_name FROM entities WHERE full_name ILIKE '%Sascha%' OR full_name ILIKE '%Barros%'",
  );
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

findSascha().catch((err) => {
  console.error(err);
  process.exit(1);
});
