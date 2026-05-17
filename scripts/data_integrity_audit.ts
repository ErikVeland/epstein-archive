#!/usr/bin/env tsx
import 'dotenv/config';
import pg from 'pg';

interface AuditCheck {
  name: string;
  sql: string;
}

const checks: AuditCheck[] = [
  {
    name: 'media_item_people.media_item_id references media_items.id',
    sql: `
      SELECT COUNT(*)::int AS violations
      FROM media_item_people mip
      LEFT JOIN media_items mi ON mi.id::text = mip.media_item_id::text
      WHERE mi.id IS NULL
    `,
  },
  {
    name: 'media_item_tags.media_item_id references media_items.id',
    sql: `
      SELECT COUNT(*)::int AS violations
      FROM media_item_tags mit
      LEFT JOIN media_items mi ON mi.id::text = mit.media_item_id::text
      WHERE mi.id IS NULL
    `,
  },
  {
    name: 'faces.media_item_id references media_items.id',
    sql: `
      SELECT COUNT(*)::int AS violations
      FROM faces f
      LEFT JOIN media_items mi ON mi.id::text = f.media_item_id::text
      WHERE mi.id IS NULL
    `,
  },
  {
    name: 'media relationship IDs are numeric-normalizable',
    sql: `
      SELECT COUNT(*)::int AS violations
      FROM (
        SELECT media_item_id::text AS id_text FROM media_item_people
        UNION ALL
        SELECT media_item_id::text AS id_text FROM media_item_tags
        UNION ALL
        SELECT media_item_id::text AS id_text FROM faces
      ) ids
      WHERE id_text !~ '^[0-9]+$'
    `,
  },
  {
    name: 'verified_media entities have resolvable linked media',
    sql: `
      WITH entity_media_links AS (
        SELECT entity_id::bigint AS entity_id, id::text AS media_item_id FROM media_items WHERE entity_id IS NOT NULL
        UNION
        SELECT entity_id::bigint AS entity_id, media_item_id::text AS media_item_id FROM media_item_people
        UNION
        SELECT fc.entity_id::bigint AS entity_id, f.media_item_id::text AS media_item_id
        FROM faces f
        JOIN face_clusters fc ON fc.id = f.cluster_id
        WHERE fc.entity_id IS NOT NULL
      ),
      media_linked_entities AS (
        SELECT DISTINCT entity_id AS canonical_id
        FROM entity_media_links
      ),
      entity_media_counts AS (
        SELECT
          mle.canonical_id,
          COUNT(DISTINCT eml.media_item_id)::int AS media_count
        FROM media_linked_entities mle
        LEFT JOIN entities e ON COALESCE(e.canonical_id, e.id) = mle.canonical_id
        LEFT JOIN entity_media_links eml ON eml.entity_id = e.id
        GROUP BY mle.canonical_id
      )
      SELECT COUNT(*)::int AS violations
      FROM entity_media_counts
      WHERE media_count = 0
    `,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for data integrity audits');
  }

  const pool = new pg.Pool({
    connectionString: databaseUrl,
    application_name: 'data-integrity-audit',
    max: 2,
  });

  let failed = false;
  try {
    for (const check of checks) {
      const result = await pool.query<{ violations: number }>(check.sql);
      const violations = Number(result.rows[0]?.violations || 0);
      const status = violations === 0 ? 'PASS' : 'FAIL';
      console.log(`[${status}] ${check.name}: ${violations}`);
      if (violations > 0) failed = true;
    }
  } finally {
    await pool.end();
  }

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[data_integrity_audit] failed:', error);
  process.exit(1);
});
