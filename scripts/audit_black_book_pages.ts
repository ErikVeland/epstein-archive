import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { getMaintenancePool } from '../src/server/db/connection.js';

// Read-only audit. Output contains hashes and page references, not contact data.
const pdfPath = resolve(process.argv[2] || "data/originals/Jeffrey Epstein's Black Book.pdf");
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const normalize = (text: string) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const pages = execFileSync('pdftotext', ['-layout', pdfPath, '-'], { maxBuffer: 8_000_000 })
  .toString()
  .split('\f')
  .map(normalize);
const pool = getMaintenancePool();
try {
  const { rows } = await pool.query<{ entry_text: string }>(
    "SELECT entry_text FROM black_book_entries WHERE entry_category = 'original' ORDER BY id",
  );
  const matches: Record<string, number> = {};
  for (const row of rows) {
    const fragment = normalize(row.entry_text).slice(0, 80);
    if (fragment.length < 30) continue;
    const found = pages.flatMap((page, index) => (page.includes(fragment) ? [index + 1] : []));
    if (found.length === 1) matches[sha(row.entry_text)] = found[0];
  }
  console.log(
    JSON.stringify({
      sourceSha256: sha(readFileSync(pdfPath)),
      method: 'unique_normalized_30_to_80_character_prefix',
      totalEntries: rows.length,
      matches,
    }),
  );
} finally {
  await pool.end();
}
