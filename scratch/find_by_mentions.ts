import { getApiPool, initPools } from '../src/server/db/connection.js';

async function findByMentions() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();
  const res = await pool.query(
    'SELECT id, full_name, mentions FROM entities WHERE mentions BETWEEN 11000 AND 12000',
  );
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

findByMentions().catch((err) => {
  console.error(err);
  process.exit(1);
});
