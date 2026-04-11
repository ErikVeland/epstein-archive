import { getApiPool, initPools } from '../src/server/db/connection.js';

async function checkIndices() {
  process.env.PG_NUCLEAR_STRICT = '0';
  initPools();
  const pool = getApiPool();

  console.log('--- INDICES ON entity_mentions ---');
  const resMentions = await pool.query(`
    SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name
    FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
    WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = 'entity_mentions'
  `);
  console.log(JSON.stringify(resMentions.rows, null, 2));

  console.log('--- INDICES ON media_item_people ---');
  const resMedia = await pool.query(`
    SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        a.attname AS column_name
    FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
    WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = 'media_item_people'
  `);
  console.log(JSON.stringify(resMedia.rows, null, 2));

  process.exit(0);
}

checkIndices().catch((err) => {
  console.error(err);
  process.exit(1);
});
