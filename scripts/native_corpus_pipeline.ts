import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getIngestPool, drainPools } from '../src/server/db/connection.js';
import { documentProvenanceService } from '../src/server/services/documentProvenanceService.js';
import { getDojNativeSourceUrl } from '../src/shared/utils/dojNativeSource.js';

interface Source {
  id: string;
  url: string;
  path: string;
  filename: string;
  verified: boolean;
}
interface Job {
  document_id: string;
  sha256: string | null;
  path: string;
  size: number;
  file_type: string;
  sources: Source[];
}
interface Manifest {
  version: number;
  run_id: string;
  max_server_file_bytes: number;
  documents: Job[];
}
interface Probe {
  sha256: string;
  size: number;
  format?: { duration?: string; format_name?: string };
  streams?: { codec_type?: string; width?: number; height?: number }[];
}
interface ExtractionStatus {
  status: 'queued' | 'running' | 'succeeded' | 'not_applicable' | 'failed';
  sha256?: string;
  reason?: string;
  tool?: string;
  artifact_sha256?: string;
  error_type?: string;
}
interface Transcript {
  text: string;
  segments: { start: number; end: number; text: string }[];
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return path.resolve(process.argv[index + 1]);
}
function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(filename, 'utf8')) as T;
}
function save(filename: string, value: unknown): void {
  writeFileSync(`${filename}.tmp`, JSON.stringify(value, null, 2));
  renameSync(`${filename}.tmp`, filename);
}

function mediaType(job: Job, probe: Probe): string {
  const video = probe.streams?.some((stream) => stream.codec_type === 'video');
  const format = probe.format?.format_name || '';
  if (format === 'amr') return 'audio/amr';
  if (format === 'mp3') return 'audio/mpeg';
  if (format === 'ogg') return 'audio/ogg';
  if (format === 'wav') return 'audio/wav';
  if (format === 'mpeg') return 'video/mpeg';
  if (format === 'mpegts') return 'video/mp2t';
  if (format === 'avi') return 'video/x-msvideo';
  if (format === 'asf') return video ? 'video/x-ms-wmv' : 'audio/x-ms-wma';
  if (format.includes('mov'))
    return video
      ? job.file_type === 'video/quicktime'
        ? job.file_type
        : 'video/mp4'
      : 'audio/mp4';
  return job.file_type;
}

async function main(): Promise<void> {
  const manifest = readJson<Manifest>(option('--manifest'));
  const output = option('--output');
  if (manifest.version !== 1) throw new Error('Unsupported native manifest');
  const dbUrl = new URL(process.env.DATABASE_URL || '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(dbUrl.hostname)) {
    throw new Error('Native extraction must run against the local corpus');
  }
  mkdirSync(output, { recursive: true });
  const pool = getIngestPool();
  const lock = await pool.connect();
  const locked = await lock.query<{ acquired: boolean }>(
    'SELECT pg_try_advisory_lock(hashtext($1)) AS acquired',
    [manifest.run_id],
  );
  if (!locked.rows[0]?.acquired) throw new Error('This native run already has an importer');
  const receiptPath = path.join(output, 'import-receipt.json');
  const receipt = existsSync(receiptPath)
    ? readJson<{ runId: string; imported: Record<string, string>; catalogued: string[] }>(
        receiptPath,
      )
    : { runId: randomUUID(), imported: {}, catalogued: [] as string[] };
  const catalogued = new Set(receipt.catalogued);
  await pool.query(
    `INSERT INTO ingest_runs (id,status,pipeline_version,agentic_enabled,notes)
     VALUES ($1,'running','native-corpus-v1',0,$2)
     ON CONFLICT (id) DO UPDATE SET status='running',finished_at=NULL`,
    [
      receipt.runId,
      JSON.stringify({ scope: manifest.run_id, documents: manifest.documents.length }),
    ],
  );
  save(receiptPath, receipt);
  await pool.query(
    `UPDATE documents SET processing_status='queued'
     WHERE id=ANY($1::bigint[]) AND content IS NULL AND processing_status='completed'`,
    [manifest.documents.map((job) => job.document_id)],
  );
  try {
    const importFailures: Record<string, string> = {};
    let active = true;
    while (active) {
      const counts: Record<string, number> = {};
      for (const job of manifest.documents) {
        try {
          const directory = path.join(output, job.document_id);
          const statusPath = path.join(directory, 'status.json');
          const probePath = path.join(directory, 'probe.json');
          if (!existsSync(statusPath)) {
            counts.pending = (counts.pending || 0) + 1;
            continue;
          }
          const status = readJson<ExtractionStatus>(statusPath);
          counts[status.status] = (counts[status.status] || 0) + 1;
          if (existsSync(probePath) && !catalogued.has(job.document_id)) {
            const probe = readJson<Probe>(probePath);
            const fileType = mediaType(job, probe);
            if (job.sha256 && probe.sha256 !== job.sha256)
              throw new Error('Probe identity mismatch');
            const video = probe.streams?.find((stream) => stream.codec_type === 'video');
            const isMedia = probe.streams?.some((stream) =>
              ['audio', 'video'].includes(stream.codec_type || ''),
            );
            for (const source of job.sources) {
              const sourceUrl = getDojNativeSourceUrl({
                doj_url: source.url,
                source_id: source.id,
              });
              if (!sourceUrl) throw new Error(`Invalid official source for ${source.id}`);
              const metadata = {
                native_pipeline_run: manifest.run_id,
                source_id: source.id,
                doj_url: sourceUrl,
                file_sha256: probe.sha256,
                documentId: job.document_id,
                storage_policy: job.size > manifest.max_server_file_bytes ? 'doj_remote' : 'local',
                server_file_limit_bytes: manifest.max_server_file_bytes,
                duration: Number(probe.format?.duration || 0),
                extraction_status: status.status,
                transcript_review_status: 'unreviewed',
              };
              if (isMedia) {
                const mediaId = String(8_000_000_000_000 + Number(source.id.slice(4)));
                await pool.query(
                  `INSERT INTO media_items (id,document_id,file_path,file_type,file_size,original_url,
                    title,is_sensitive,verification_status,metadata_json,width,height)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9::jsonb,$10,$11)
                 ON CONFLICT (id) DO UPDATE SET
                    file_type=EXCLUDED.file_type,
                    original_url=EXCLUDED.original_url,
                    metadata_json=COALESCE(media_items.metadata_json,'{}'::jsonb)||EXCLUDED.metadata_json
                 WHERE media_items.document_id=EXCLUDED.document_id`,
                  [
                    mediaId,
                    job.document_id,
                    path.relative(process.cwd(), source.path),
                    fileType,
                    job.size,
                    sourceUrl,
                    source.id,
                    source.verified ? 'source_verified' : 'unverified',
                    JSON.stringify(metadata),
                    video?.width || null,
                    video?.height || null,
                  ],
                );
              }
            }
            await pool.query(
              `UPDATE documents SET content_sha256=COALESCE(content_sha256,$2),
              metadata_json=COALESCE(metadata_json,'{}'::jsonb)||$3::jsonb,file_type=$4
             WHERE id=$1 AND (content_sha256 IS NULL OR content_sha256=$2)`,
              [
                job.document_id,
                probe.sha256,
                JSON.stringify({
                  native_pipeline_run: manifest.run_id,
                  native_sources: job.sources.map((source) => ({ id: source.id, url: source.url })),
                  storage_policy:
                    job.size > manifest.max_server_file_bytes ? 'doj_remote' : 'local',
                }),
                fileType,
              ],
            );
            catalogued.add(job.document_id);
            receipt.catalogued = [...catalogued];
          }
          if (!['succeeded', 'not_applicable', 'failed'].includes(status.status)) continue;
          const statusHash = createHash('sha256').update(JSON.stringify(status)).digest('hex');
          if (receipt.imported[job.document_id] === statusHash) continue;
          let transcript: Transcript | null = null;
          if (status.status === 'succeeded') {
            const raw = readFileSync(path.join(directory, 'transcript.json'));
            if (createHash('sha256').update(raw).digest('hex') !== status.artifact_sha256) {
              throw new Error('Transcript artifact checksum mismatch');
            }
            transcript = JSON.parse(raw.toString('utf8')) as Transcript;
          }
          const text = transcript?.text.trim() || null;
          const textHash = text ? createHash('sha256').update(text).digest('hex') : null;
          const metadata = {
            native_extraction: {
              ...status,
              run_id: manifest.run_id,
              canonical_text_sha256: textHash,
              review_status: 'unreviewed',
              downstream_analysis: text ? 'queued' : 'not_applicable',
            },
          };
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            const current = await client.query<{ content: string | null }>(
              'SELECT content FROM documents WHERE id=$1 FOR UPDATE',
              [job.document_id],
            );
            if (!current.rows[0]) throw new Error('Document no longer exists');
            if (text && current.rows[0].content && current.rows[0].content !== text) {
              throw new Error('Canonical text exists. Preserve it and review the new artifact');
            }
            await client.query(
              `UPDATE documents SET content=COALESCE(content,$2),
              normalized_text_sha256=COALESCE(normalized_text_sha256,$3),
              word_count=CASE WHEN $2::text IS NULL THEN word_count ELSE $4 END,
              content_preview=CASE WHEN $2::text IS NULL THEN content_preview ELSE left($2,500) END,
              processing_status=$5,processing_error=$6,last_processed_at=NOW(),
              metadata_json=COALESCE(metadata_json,'{}'::jsonb)||$7::jsonb WHERE id=$1`,
              [
                job.document_id,
                text,
                textHash,
                text?.split(/\s+/).length || 0,
                status.status === 'failed' ? 'failed' : text ? 'completed' : 'skipped',
                status.status === 'failed' ? status.error_type || 'Extraction failed' : null,
                JSON.stringify(metadata),
              ],
            );
            await client.query(
              `UPDATE media_items SET has_text=$2,
              metadata_json=COALESCE(metadata_json,'{}'::jsonb)||$3::jsonb WHERE document_id=$1`,
              [
                job.document_id,
                Boolean(text),
                JSON.stringify({
                  extraction_status: status.status,
                  transcript_review_status: 'unreviewed',
                  transcript: transcript?.segments || [],
                  native_extraction: metadata.native_extraction,
                }),
              ],
            );
            await documentProvenanceService.upsertEvent(
              {
                documentId: Number(job.document_id),
                runId: receipt.runId,
                eventType: 'native_text_extraction',
                toolName: status.tool || 'ffprobe',
                toolVersion: 'native-corpus-v1',
                fileSha256: status.sha256,
                textSha256: textHash,
                sourcePath: path.relative(process.cwd(), job.path),
                metadata: metadata.native_extraction,
                eventKey: `native-corpus-v1:${job.document_id}:${statusHash}`,
              },
              client,
            );
            await client.query('COMMIT');
            receipt.imported[job.document_id] = statusHash;
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          } finally {
            client.release();
          }
          delete importFailures[job.document_id];
          save(receiptPath, receipt);
        } catch (error) {
          importFailures[job.document_id] = error instanceof Error ? error.name : 'UnknownError';
        }
      }
      save(receiptPath, receipt);
      const finished = existsSync(path.join(output, 'extract-finished.json'));
      const summary = {
        run_id: receipt.runId,
        scope: manifest.run_id,
        updated_at: new Date().toISOString(),
        documents: manifest.documents.length,
        catalogued: catalogued.size,
        import_failures: importFailures,
        extraction: counts,
        downstream_analysis: 'queued_in_existing_backfill_pipeline',
        complete: false,
        extraction_finished: finished,
      };
      save(path.join(output, 'pipeline-status.json'), summary);
      await pool.query('UPDATE ingest_runs SET notes=$2 WHERE id=$1', [
        receipt.runId,
        JSON.stringify(summary),
      ]);
      if (finished) {
        await pool.query('UPDATE ingest_runs SET status=$2,finished_at=NOW() WHERE id=$1', [
          receipt.runId,
          counts.failed || Object.keys(importFailures).length ? 'failed' : 'extracted',
        ]);
        active = false;
      }
      if (active) await new Promise((resolve) => setTimeout(resolve, 15000));
    }
  } finally {
    await lock.query('SELECT pg_advisory_unlock(hashtext($1))', [manifest.run_id]);
    lock.release();
    await drainPools();
  }
}

main().catch((error: unknown) => {
  console.error('Native pipeline failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exit(1);
});
