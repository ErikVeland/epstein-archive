import 'dotenv/config';
import { getMaintenancePool, drainPools } from '../src/server/db/connection.js';
import { MediaService } from '../src/server/services/MediaService.js';
import { MediaExtractionService } from '../src/server/services/MediaExtractionService.js';

interface SourceDocumentRow {
  id: string;
  file_path: string;
  file_name: string | null;
  source_collection: string | null;
}

interface BackfillOptions {
  apply: boolean;
  all: boolean;
  documentId: string | null;
  limit: number;
}

function readArgument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
}

function parseOptions(): BackfillOptions {
  const limitRaw = readArgument('--limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : 25;
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    throw new Error('--limit must be a positive integer');
  }

  return {
    apply: process.argv.includes('--apply'),
    all: process.argv.includes('--all'),
    documentId: readArgument('--document-id'),
    limit: parsedLimit,
  };
}

async function main(): Promise<void> {
  const options = parseOptions();
  const pool = getMaintenancePool();
  const params: Array<string | number> = [];
  const whereParts = [`(d.file_type = 'pdf' OR d.file_path ILIKE '%.pdf')`];

  if (!options.documentId) {
    whereParts.push(`EXISTS (
       SELECT 1
       FROM media_items m
       WHERE m.document_id = d.id
         AND (
           m.metadata_json->>'is_document_extract' = 'true'
           OR m.file_path ILIKE '%/media/extracted/%'
         )
         AND m.metadata_json->>'source_page' IS NULL
     )`);
  }

  if (options.documentId) {
    params.push(options.documentId);
    whereParts.push(`d.id = $${params.length}::bigint`);
  }
  if (!options.all) {
    params.push(options.limit);
  }

  const result = await pool.query<SourceDocumentRow>(
    `SELECT d.id::text, d.file_path, d.file_name, d.source_collection
     FROM documents d
     WHERE ${whereParts.join(' AND ')}
     ORDER BY d.id
     ${options.all ? '' : `LIMIT $${params.length}`}`,
    params,
  );

  console.log(
    options.documentId
      ? `Selected ${result.rows.length} source document for provenance repair.`
      : `Found ${result.rows.length} source documents with incomplete media provenance.`,
  );
  if (!options.apply) {
    console.log('Dry run only. Add --apply to re-extract and repair these records.');
    return;
  }

  const extractor = new MediaExtractionService(new MediaService(pool));
  let completed = 0;
  let acceptedObjects = 0;

  for (const document of result.rows) {
    const objectCount = await extractor.extractFromPdf(
      document.id,
      document.file_path,
      document.file_name || `Document ${document.id}`,
      document.source_collection || undefined,
    );
    acceptedObjects += objectCount;
    completed++;

    await pool.query(
      `UPDATE documents
       SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object(
         'media_extraction_version', 'pdf-object-v2',
         'media_provenance_repaired_at', NOW()::text,
         'media_extraction_count', $2::int
       )
       WHERE id = $1::bigint`,
      [document.id, objectCount],
    );
    console.log(
      `[${completed}/${result.rows.length}] ${document.id}: ${objectCount} objects matched.`,
    );
  }

  console.log(
    `Completed ${completed} source documents. Matched or created ${acceptedObjects} image objects.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await drainPools();
  });
