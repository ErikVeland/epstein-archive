import 'dotenv/config';
import { Client } from 'pg';
import { deriveDocumentTitle, type DocumentTitleSource } from '../src/shared/documentTitle.js';

const APPLY = process.argv.includes('--apply');
const batchArg = process.argv.find((arg) => arg.startsWith('--batch-size='));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const minIdArg = process.argv.find((arg) => arg.startsWith('--min-id='));
const maxIdArg = process.argv.find((arg) => arg.startsWith('--max-id='));
const BATCH_SIZE = Math.max(1, Number(batchArg?.split('=')[1] || 2_000));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split('=')[1])) : Number.POSITIVE_INFINITY;
const MIN_ID = Math.max(0, Number(minIdArg?.split('=')[1] || 0));
const MAX_ID = maxIdArg ? Math.max(MIN_ID, Number(maxIdArg.split('=')[1])) : null;

interface TitleRow {
  id: string;
  file_name: string | null;
  title: string | null;
  ai_summary: string | null;
  ocr_text: string | null;
}

interface TitleUpdate {
  id: string;
  title: string;
  source: DocumentTitleSource;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let lastId = MIN_ID;
  let processed = 0;
  const sources: Record<DocumentTitleSource, number> = {
    stored: 0,
    ai_summary: 0,
    ocr: 0,
    document_number: 0,
  };

  try {
    while (processed < LIMIT) {
      const size = Math.min(BATCH_SIZE, LIMIT - processed);
      const result = await client.query<TitleRow>(
        `SELECT
           d.id::text,
           d.file_name,
           d.title,
           ai.output_text AS ai_summary,
           LEFT(COALESCE(
             NULLIF(BTRIM(d.content_refined), ''),
             NULLIF(BTRIM(d.content), ''),
             NULLIF(BTRIM(d.metadata_json->>'ocr_text'), ''),
             NULLIF(BTRIM(d.metadata_json->>'extracted_text'), '')
           ), 3000) AS ocr_text
         FROM documents d
         LEFT JOIN LATERAL (
           SELECT output_text
           FROM document_ai_artifacts
           WHERE document_id = d.id
             AND artifact_type = 'summary'
             AND output_text IS NOT NULL
             AND BTRIM(output_text) <> ''
           ORDER BY created_at DESC
           LIMIT 1
         ) ai ON TRUE
         WHERE d.id > $1
           AND ($3::bigint IS NULL OR d.id <= $3::bigint)
           AND (
             d.title IS NULL
             OR BTRIM(d.title) = ''
             OR LOWER(BTRIM(d.title)) IN ('untitled', 'untitled source', 'untitled document')
           )
         ORDER BY d.id
         LIMIT $2`,
        [lastId, size, MAX_ID],
      );

      if (result.rows.length === 0) break;
      lastId = Number(result.rows[result.rows.length - 1].id);

      const updates: TitleUpdate[] = result.rows.map((row) => {
        const derived = deriveDocumentTitle({
          id: row.id,
          title: row.title,
          fileName: row.file_name,
          aiSummary: row.ai_summary,
          ocrText: row.ocr_text,
        });
        sources[derived.source]++;
        return { id: row.id, ...derived };
      });

      if (APPLY) {
        await client.query(
          `UPDATE documents d
           SET title = u.title
           FROM jsonb_to_recordset($1::jsonb) AS u(id bigint, title text, source text)
           WHERE d.id = u.id`,
          [JSON.stringify(updates)],
        );
      }

      processed += updates.length;
      if (processed % 20_000 === 0 || updates.length < size) {
        console.log(`${APPLY ? 'Updated' : 'Scanned'} ${processed.toLocaleString()} documents`);
      }
    }

    console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', processed, sources }, null, 2));
    if (!APPLY) console.log('Run again with --apply to save these titles.');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
