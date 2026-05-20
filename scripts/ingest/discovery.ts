// ============================================================================
// DISCOVERY — file walking and collection processing
// ============================================================================

import { join, extname, basename } from 'path';
import { statSync, existsSync } from 'fs';
import { opendir } from 'fs/promises';
import { WorkerPool } from '../../src/server/pipeline/workerPool.js';
import { intFromEnv } from '../../src/server/pipeline/workerConfig.js';
import { INGEST_EXTENSIONS } from './config.js';
import { processDocument } from './document_processor.js';
import type { CollectionConfig } from './types.js';
import type { IngestContext } from './context.js';

/**
 * Stream files from a directory tree one entry at a time.
 * Uses fs.opendir (async, streaming) instead of glob to avoid OOM on
 * directories with 300K+ files. Follows symlinks to support volumes mounted
 * via symlink (e.g. data/ingest/DOJVOL00009 → /Volumes/Music/Torrents/...).
 */
export async function* walkDir(dir: string): AsyncGenerator<string> {
  let d;
  try {
    d = await opendir(dir);
  } catch {
    return;
  }
  for await (const entry of d) {
    if (entry.name === '.DS_Store' || entry.name.startsWith('._')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.toLowerCase() !== 'thumbs') yield* walkDir(full);
    } else if (entry.isSymbolicLink()) {
      try {
        const s = statSync(full);
        if (s.isDirectory()) {
          if (entry.name.toLowerCase() !== 'thumbs') yield* walkDir(full);
        } else if (s.isFile()) {
          const ext = extname(entry.name).slice(1).toLowerCase();
          if (INGEST_EXTENSIONS.has(ext)) yield full;
        }
      } catch {
        /* broken symlink */
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).slice(1).toLowerCase();
      if (INGEST_EXTENSIONS.has(ext)) yield full;
    }
  }
}

export async function processCollection(
  collection: CollectionConfig,
  ctx: IngestContext,
): Promise<{ processed: number; skipped: number; errors: number }> {
  console.log(`\n📦 Processing: ${collection.name}`);
  console.log(`   Path: ${collection.rootPath}`);

  if (!existsSync(collection.rootPath)) {
    console.log(`   ⚠️  Directory not found, skipping...`);
    return { processed: 0, skipped: 0, errors: 0 };
  }

  // Stream files via walkDir (fs.opendir) — reads one entry at a time to avoid
  // OOM / event-loop blocking on collections with 300K+ files in one directory.
  const CONCURRENCY_LIMIT = intFromEnv('INGEST_CONCURRENCY', 30, 1, 64);
  const pool = new WorkerPool();

  const results: { processed: number; skipped: number; errors: number } = {
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  for await (const file of walkDir(collection.rootPath)) {
    await pool.waitForCapacity(CONCURRENCY_LIMIT);

    pool.run(async () => {
      try {
        const result = await processDocument(file, collection, ctx);
        if (result.success && result.documentId) {
          results.processed++;
          if (results.processed % 50 === 0) {
            process.stdout.write(
              `   Progress: ${results.processed} processed (Active: ${pool.size})...\r`,
            );
          }
        } else if (result.success) {
          results.skipped++;
        } else {
          results.errors++;
          console.error(`   ❌ Error processing ${basename(file)}: ${result.error}`);
        }
      } catch (err) {
        results.errors++;
        console.error(`   ❌ Unhandled error processing ${basename(file)}:`, err);
      }
    });
  }

  await pool.drain();

  console.log(
    `   ✅ Complete: ${results.processed} processed, ${results.skipped} skipped, ${results.errors} errors`,
  );

  return results;
}
