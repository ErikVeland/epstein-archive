import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { cleanMime } from '../src/server/services/mimeCleaner.js';

type Row = {
  id: number;
  content: string | null;
  file_path: string | null;
  metadata_json: Record<string, unknown> | null;
};

type HeaderHints = {
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: Date | null;
  message_id: string;
  attachments_count: number;
  mime_parse_status: 'success' | 'failed' | 'partial';
  mime_parse_reason?: string;
};

const BATCH_SIZE = Number(process.env.EMAIL_HEADER_BACKFILL_BATCH || 200);
const MAX_ROWS = Number(process.env.EMAIL_HEADER_BACKFILL_MAX || 20000);
const BACKFILL_VERSION = 'email-headers-v2';

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value))
    return value.length === 0 || value.every((v) => String(v).trim() === '');
  return String(value).trim() === '';
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString });
  await client.connect();

  let processed = 0;
  let updated = 0;
  let failed = 0;
  let lastScannedId = 0;

  try {
    while (processed < MAX_ROWS) {
      const limit = Math.min(BATCH_SIZE, MAX_ROWS - processed);
      const { rows } = await client.query<Row>(
        `
          SELECT id, content, file_path, metadata_json
          FROM documents
          WHERE evidence_type = 'email'
            AND content IS NOT NULL
            AND id > $2
            AND (
              metadata_json IS NULL
              OR COALESCE(metadata_json ->> 'from', '') = ''
            )
            AND COALESCE(metadata_json ->> 'email_header_backfill_version', '') <> $3
          ORDER BY id ASC
          LIMIT $1
        `,
        [limit, lastScannedId, BACKFILL_VERSION],
      );

      if (rows.length === 0) break;

      for (const row of rows) {
        processed += 1;
        lastScannedId = row.id;

        try {
          const existing = (
            row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {}
          ) as Record<string, unknown>;

          const next = { ...existing } as Record<string, unknown>;
          if (!isBlank(next.from)) continue;

          const parsed = await parseBestAvailableEmailSource(row);

          if (parsed.from && parsed.from.trim()) next.from = parsed.from.trim();
          if (parsed.to.length > 0) {
            next.to = parsed.to.join(', ');
            next.to_json = parsed.to;
          }
          if (parsed.cc.length > 0) {
            next.cc = parsed.cc.join(', ');
            next.cc_json = parsed.cc;
          }
          if (parsed.bcc.length > 0) {
            next.bcc = parsed.bcc.join(', ');
            next.bcc_json = parsed.bcc;
          }
          if (!isBlank(next.subject) || !parsed.subject.trim()) {
            // keep existing
          } else {
            next.subject = parsed.subject.trim();
          }
          if (parsed.date) next.date = parsed.date.toISOString();
          if (parsed.message_id && parsed.message_id.trim()) {
            next.messageId = parsed.message_id.trim();
            next.message_id = parsed.message_id.trim();
          }
          next.attachments_count = parsed.attachments_count;
          next.mime_parse_status = parsed.mime_parse_status;
          if (parsed.mime_parse_reason) next.mime_parse_reason = parsed.mime_parse_reason;
          next.email_header_backfill_version = BACKFILL_VERSION;
          next.email_header_backfill_attempted_at = new Date().toISOString();

          await client.query(`UPDATE documents SET metadata_json = $2::jsonb WHERE id = $1`, [
            row.id,
            JSON.stringify(next),
          ]);
          updated += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : String(error);
          await client.query(
            `UPDATE documents
             SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object(
               'email_header_backfill_version', $2::text,
               'email_header_backfill_attempted_at', NOW()::text,
               'mime_parse_status', 'failed',
               'mime_parse_reason', $3::text
             )
             WHERE id = $1`,
            [row.id, BACKFILL_VERSION, message.slice(0, 500)],
          );
          if (failed <= 10) {
            console.warn(`[email-header-backfill] parse failed for document ${row.id}:`, error);
          }
        }
      }

      console.log(
        `[email-header-backfill] progress processed=${processed} updated=${updated} failed=${failed}`,
      );

      if (rows.length < limit) break;
    }

    const { rows: completenessRows } = await client.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE COALESCE(metadata_json ->> 'from', '') = '') AS missing_from,
          COUNT(*) FILTER (WHERE COALESCE(metadata_json ->> 'to', '') = '') AS missing_to,
          COUNT(*) AS total
        FROM documents
        WHERE evidence_type = 'email'
      `,
    );

    console.log(
      '[email-header-backfill] done',
      JSON.stringify({ processed, updated, failed, completeness: completenessRows[0] }),
    );
  } finally {
    await client.end();
  }
}

async function parseBestAvailableEmailSource(row: Row): Promise<HeaderHints> {
  const metaHints = await readEmailMetaSidecar(row.file_path);
  if (metaHints) return metaHints;

  const rawFromFile = await readRawEmailFromFilePath(row.file_path);
  if (rawFromFile) {
    return cleanMime(rawFromFile);
  }

  const source = String(row.content || '').trim();
  if (!source) {
    throw new Error(`No parseable source for email document ${row.id}`);
  }
  return cleanMime(source);
}

async function readRawEmailFromFilePath(filePathValue: string | null): Promise<string | null> {
  const filePath = String(filePathValue || '').trim();
  if (!filePath) return null;

  const candidates = new Set<string>();
  candidates.add(filePath);

  if (filePath.startsWith('/data/')) {
    candidates.add(path.join(process.cwd(), filePath.replace(/^\/data\/+/, 'data/')));
    candidates.add(
      path.join('/home/deploy/epstein-archive', filePath.replace(/^\/data\/+/, 'data/')),
    );
  } else if (!path.isAbsolute(filePath)) {
    candidates.add(path.join(process.cwd(), filePath));
  }

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) continue;
      return await fs.readFile(candidate, 'utf8');
    } catch {
      // try next candidate
    }
  }

  return null;
}

async function readEmailMetaSidecar(filePathValue: string | null): Promise<HeaderHints | null> {
  const filePath = String(filePathValue || '').trim();
  if (!filePath || !filePath.endsWith('.meta')) return null;

  const raw = await readRawEmailFromFilePath(filePath);
  if (!raw) return null;

  try {
    const meta = JSON.parse(raw) as Record<string, unknown>;
    const sender = String(meta.sender || '').trim();
    const subject = String(meta.subject || '').trim();
    const epoch = Number(meta.date || meta.change_date || 0);
    const date = Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1000) : null;

    return {
      from: sender,
      to: [],
      cc: [],
      bcc: [],
      subject,
      date,
      message_id: '',
      attachments_count: 0,
      mime_parse_status: sender ? 'partial' : 'failed',
      mime_parse_reason: sender ? 'meta-sidecar-sender-only' : 'meta-sidecar-no-sender',
    };
  } catch {
    return null;
  }
}

main().catch((error) => {
  console.error('[email-header-backfill] fatal', error);
  process.exit(1);
});
