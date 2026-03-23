/* eslint-disable no-undef */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const shorthands = undefined;

const LEGACY_RESTORE_FILES = [
  '1741570000000_restore_flights_dataset.js',
  '1741580000000_restore_properties_dataset.js',
  '1741590000000_restore_global_timeline_events.js',
  '1741600000000_restore_articles_dataset.js',
  '1741610000000_restore_black_book_dataset.js',
];

const CONFLICT_SUFFIX = 'ON CONFLICT (id) DO NOTHING;';

function parseColumnList(insertLine) {
  const match = insertLine.match(
    /INSERT INTO\s+[^\s(]+\s*\(([^)]+)\)\s*OVERRIDING SYSTEM VALUE VALUES/i,
  );
  if (!match) return [];
  return match[1]
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
}

function toUpsertLine(insertLine) {
  if (!insertLine.includes(CONFLICT_SUFFIX)) return null;
  const columns = parseColumnList(insertLine);
  const updatableColumns = columns.filter((column) => column.replace(/"/g, '') !== 'id');
  if (!updatableColumns.length) return null;
  const updateSetClause = updatableColumns
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');
  return insertLine.replace(CONFLICT_SUFFIX, `ON CONFLICT (id) DO UPDATE SET ${updateSetClause};`);
}

function migrationDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

export async function up(pgm) {
  const batches = [];
  let batch = [];

  for (const fileName of LEGACY_RESTORE_FILES) {
    const fullPath = path.join(migrationDir(), fileName);
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('INSERT INTO') || !trimmed.includes(CONFLICT_SUFFIX)) {
        continue;
      }
      const upsertLine = toUpsertLine(trimmed);
      if (!upsertLine) {
        continue;
      }
      batch.push(upsertLine);
      if (batch.length >= 100) {
        batches.push(batch.join('\n'));
        batch = [];
      }
    }
  }

  if (batch.length) {
    batches.push(batch.join('\n'));
  }

  for (const sqlBatch of batches) {
    pgm.sql(sqlBatch);
  }
}

export async function down(_pgm) {}
