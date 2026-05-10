import 'dotenv/config';
import pg from 'pg';

const SHOULD_STAY_EMPTY = ['mentions', 'resolution_candidates', 'timeline_events'] as const;

const MUST_NOT_EXIST_IN_PUBLIC = [
  'media_assets',
  'evidence_entity',
  'evidence',
  'relations',
  'collections',
  'document_collections',
  'entity_merge_candidates',
  'evidence_types',
  'entity_evidence_types',
] as const;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const failures: string[] = [];

    for (const table of SHOULD_STAY_EMPTY) {
      const exists = await client.query<{ exists: string | null }>(
        `SELECT to_regclass($1)::text AS exists`,
        [`public.${table}`],
      );
      if (!exists.rows[0]?.exists) continue;

      const { rows } = await client.query<{ count: string }>(`SELECT count(*)::text FROM ${table}`);
      const count = Number(rows[0]?.count ?? 0);
      if (count > 0) {
        failures.push(`${table}: ${count} rows`);
      }
    }

    for (const table of MUST_NOT_EXIST_IN_PUBLIC) {
      const exists = await client.query<{ exists: string | null }>(
        `SELECT to_regclass($1)::text AS exists`,
        [`public.${table}`],
      );
      if (exists.rows[0]?.exists) {
        failures.push(`${table}: still exists in public schema`);
      }
    }

    if (failures.length > 0) {
      console.error('[dead-schema-surfaces] Expected-dead tables accumulated rows:');
      for (const failure of failures) console.error(` - ${failure}`);
      process.exit(1);
    }

    console.log('[dead-schema-surfaces] Expected-dead public tables are empty or archived.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[dead-schema-surfaces] Fatal error:', error);
  process.exit(1);
});
