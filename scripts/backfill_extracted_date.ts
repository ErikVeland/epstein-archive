/**
 * Backfill extracted_date for documents that have parseable dates but
 * haven't been processed by the OCR/intelligence pipeline yet.
 *
 * Two strategies:
 *   1. Filename prefix YYYYMMDD  — e.g. "20181002-Subject.eml"
 *   2. Email Date: header        — "Date: Mon, 10 Dec 2012 23:21:56 +0000"
 *
 * Processes in batches to stay within statement_timeout limits.
 * Run with:  pnpm tsx scripts/backfill_extracted_date.ts
 */

import { getMaintenancePool } from '../src/server/db/connection.js';
import { markViewsDirty } from '../src/server/services/matViewRefresh.js';

const BATCH_SIZE = 10_000;

async function main() {
  const pool = getMaintenancePool();

  // Disable statement_timeout for this session (maintenance pool already has
  // a long default, but belt-and-suspenders for large UPDATE batches).
  await pool.query(`SET statement_timeout = 0`);

  const { rows: bounds } = await pool.query<{ min: number; max: number }>(
    `SELECT MIN(id)::int AS min, MAX(id)::int AS max FROM documents`,
  );
  const minId = bounds[0].min;
  const maxId = bounds[0].max;

  let totalFilename = 0;
  let totalHeader = 0;

  console.log(`[backfill_extracted_date] ID range ${minId}–${maxId}, batch size ${BATCH_SIZE}`);

  for (let lo = minId; lo <= maxId; lo += BATCH_SIZE) {
    const hi = lo + BATCH_SIZE - 1;

    // ── Strategy 1: YYYYMMDD filename prefix ─────────────────────────────
    const { rowCount: fnRows } = await pool.query(
      `
      UPDATE documents
      SET extracted_date = to_date(
        substring(file_name FROM '^([0-9]{8})[^0-9]'),
        'YYYYMMDD'
      )
      WHERE id BETWEEN $1 AND $2
        AND extracted_date IS NULL
        AND file_name ~ '^[0-9]{8}[^0-9]'
        AND (substring(file_name FROM '^([0-9]{4})'))::int        BETWEEN 1990 AND 2026
        AND (substring(file_name FROM '^[0-9]{4}([0-9]{2})'))::int BETWEEN 1  AND 12
        AND (substring(file_name FROM '^[0-9]{6}([0-9]{2})'))::int BETWEEN 1  AND 31
      `,
      [lo, hi],
    );
    totalFilename += fnRows ?? 0;

    // ── Strategy 2: Email Date: header ───────────────────────────────────
    // Pattern: "Date: Mon, 10 Dec 2012 23:21:56 +0000"
    // Use explicit month list to avoid OCR garbage like "Max" → to_date error.
    const MONTH_RE = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
    const hdrPattern = `Date: [A-Za-z]{3}, ([0-9]{1,2} (?:${MONTH_RE}) [0-9]{4})`;
    const yearPattern = `Date: [A-Za-z]{3}, [0-9]{1,2} (?:${MONTH_RE}) ([0-9]{4})`;

    const { rowCount: hdrRows } = await pool.query(
      `
      UPDATE documents
      SET extracted_date = to_date(
        (regexp_match(content, $3))[1],
        'DD Mon YYYY'
      )
      WHERE id BETWEEN $1 AND $2
        AND extracted_date IS NULL
        AND content ~ $3
        AND ((regexp_match(content, $4))[1])::int BETWEEN 1980 AND 2026
      `,
      [lo, hi, hdrPattern, yearPattern],
    );
    totalHeader += hdrRows ?? 0;

    const batchTotal = (fnRows ?? 0) + (hdrRows ?? 0);
    if (batchTotal > 0) {
      process.stdout.write(
        `[backfill_extracted_date] batch ${lo}–${hi}: +${fnRows} filename, +${hdrRows} header  (running totals: ${totalFilename} fn / ${totalHeader} hdr)\n`,
      );
    }
  }

  console.log(
    `[backfill_extracted_date] done — ${totalFilename} from filenames, ${totalHeader} from email headers`,
  );

  // Trigger matview refresh on next cycle
  markViewsDirty();
  await pool.query(`REFRESH MATERIALIZED VIEW mv_timeline_data`);
  console.log('[backfill_extracted_date] mv_timeline_data refreshed');

  await pool.end();
}

main().catch((err) => {
  console.error('[backfill_extracted_date] fatal:', err);
  process.exit(1);
});
