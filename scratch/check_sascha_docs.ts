import { getApiPool, initPools } from '../src/server/db/connection.js';

async function checkSaschaDocs() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();
  const res = await pool.query(
    'SELECT d.id, d.title, d.date_created FROM documents d INNER JOIN entity_mentions em ON d.id = em.document_id WHERE em.entity_id = 141874',
  );
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

checkSaschaDocs().catch((err) => {
  console.error(err);
  process.exit(1);
});
