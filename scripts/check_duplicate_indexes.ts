import 'dotenv/config';
import pg from 'pg';

const ALLOWED_OVERLAPS = new Set([
  // Unique constraints intentionally overlap a lookup index until the v21 index migration lands.
  'palm_beach_properties::{idx_properties_pcn,palm_beach_properties_pcn_key}',
  'pipeline_runs::{pipeline_runs_run_uuid_key,pipeline_runs_uuid}',
]);

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query<{
      tablename: string;
      names: string;
      count: string;
    }>(`
      WITH normalized AS (
        SELECT
          tablename,
          indexname,
          regexp_replace(
            regexp_replace(indexdef, 'CREATE (UNIQUE )?INDEX [^ ]+ ON ', 'CREATE INDEX ON '),
            ' USING [^ ]+',
            ''
          ) AS normalized_def
        FROM pg_indexes
        WHERE schemaname = 'public'
      )
      SELECT
        tablename,
        array_agg(indexname ORDER BY indexname)::text AS names,
        count(*)::text AS count
      FROM normalized
      GROUP BY tablename, normalized_def
      HAVING count(*) > 1
      ORDER BY tablename, names
    `);

    const failures = rows.filter((row) => !ALLOWED_OVERLAPS.has(`${row.tablename}::${row.names}`));

    if (failures.length > 0) {
      console.error('[duplicate-indexes] Duplicate index definitions found:');
      for (const row of failures) {
        console.error(` - ${row.tablename}: ${row.names}`);
      }
      process.exit(1);
    }

    console.log('[duplicate-indexes] No unapproved duplicate indexes found.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[duplicate-indexes] Fatal error:', error);
  process.exit(1);
});
