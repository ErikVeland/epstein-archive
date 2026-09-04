import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { link, stat } from 'node:fs/promises';
import path from 'node:path';
import { getMaintenancePool, drainPools } from '../src/server/db/connection.js';
import { documentProvenanceService } from '../src/server/services/documentProvenanceService.js';
import { getDojNativeSourceUrl } from '../src/shared/utils/dojNativeSource.js';

interface Source {
  id: string;
  url: string;
  path: string;
  filename: string;
}
interface Job {
  document_id: string;
  path: string;
  size: number;
  sources: Source[];
}
interface Selection {
  version: number;
  run_id: string;
  max_server_file_bytes: number;
  documents: Job[];
}
interface DocumentRow {
  id: string;
  file_name: string;
  title: string | null;
  content: string | null;
  file_type: string;
  file_size: string;
  content_sha256: string;
  processing_status: string;
  source_collection: string | null;
  source_url: string | null;
  source_system: string | null;
  source_acquired_at: string | null;
  metadata_json: Record<string, unknown> | null;
}
interface NativeDocument extends DocumentRow {
  storage_path: string;
  sources: Source[];
}
interface MediaRow {
  id: string;
  document_id: string;
  file_type: string;
  file_size: string;
  title: string | null;
  verification_status: string | null;
  metadata_json: Record<string, unknown>;
  width: number | null;
  height: number | null;
}
interface Asset {
  path: string;
  sha256: string;
  size: number;
}
interface Bundle {
  schema: 'native-corpus-v1';
  release_version: string;
  created_at: string;
  scope: string;
  max_server_file_bytes: number;
  documents: NativeDocument[];
  media: MediaRow[];
  assets: Asset[];
}

function option(name: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}
function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(filename, 'utf8')) as T;
}
function sha(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
async function fileSha(filename: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const block of createReadStream(filename)) hash.update(block as Buffer);
  return hash.digest('hex');
}
function assetPath(base: string, relative: string): string {
  if (!/^data\/media\/native\/[a-f0-9]{64}\.[a-z0-9]+$/.test(relative)) {
    throw new Error('Unsafe native asset path');
  }
  return path.join(base, relative);
}

async function exportBundle(directory: string): Promise<void> {
  if (existsSync(path.join(directory, 'native-bundle.json')))
    throw new Error('Bundle already exists');
  const selection = readJson<Selection>(path.resolve(option('--manifest')));
  if (selection.version !== 1) throw new Error('Unsupported selection');
  const version = option('--release-version');
  if (version !== readJson<{ version: string }>('package.json').version)
    throw new Error('Release version mismatch');
  const pool = getMaintenancePool();
  const client = await pool.connect();
  const bundle: Bundle = {
    schema: 'native-corpus-v1',
    release_version: version,
    created_at: new Date().toISOString(),
    scope: selection.run_id,
    max_server_file_bytes: selection.max_server_file_bytes,
    documents: [],
    media: [],
    assets: [],
  };
  const assets = new Map<string, Asset>();
  const canonicalPaths = new Map<string, string>();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for (const job of selection.documents) {
      const result = await client.query<DocumentRow>(
        `SELECT id,file_name,title,content,file_type,file_size,content_sha256,processing_status,
           source_collection,source_url,source_system,source_acquired_at,metadata_json
         FROM documents WHERE id=$1`,
        [job.document_id],
      );
      const doc = result.rows[0];
      if (!doc || !/^[a-f0-9]{64}$/.test(doc.content_sha256 || ''))
        throw new Error(`Missing source hash: ${job.document_id}`);
      const extension = path.extname(job.sources[0].filename).slice(1).toLowerCase();
      const storagePath =
        canonicalPaths.get(doc.content_sha256) ||
        `data/media/native/${doc.content_sha256}.${extension}`;
      canonicalPaths.set(doc.content_sha256, storagePath);
      assetPath(directory, storagePath);
      for (const source of job.sources) {
        if (!getDojNativeSourceUrl({ doj_url: source.url, source_id: source.id }))
          throw new Error('Invalid source URL');
      }
      const policy = job.size > selection.max_server_file_bytes ? 'doj_remote' : 'local';
      const media = await client.query<MediaRow>(
        `SELECT id,document_id,file_type,file_size,title,verification_status,metadata_json,width,height
         FROM media_items WHERE id=ANY($1::text[])`,
        [job.sources.map((source) => String(8_000_000_000_000 + Number(source.id.slice(4))))],
      );
      if (
        (doc.file_type.startsWith('audio/') || doc.file_type.startsWith('video/')) &&
        media.rows.length !== job.sources.length
      ) {
        throw new Error(`Media catalogue is incomplete: ${job.document_id}`);
      }
      bundle.documents.push({
        ...doc,
        file_size: String(job.size),
        storage_path: storagePath,
        sources: job.sources,
        metadata_json: {
          ...doc.metadata_json,
          storage_policy: policy,
          original_archive_path: job.path,
          native_release_version: version,
        },
      });
      bundle.media.push(
        ...media.rows.map((row) => ({
          ...row,
          metadata_json: {
            ...row.metadata_json,
            storage_policy: policy,
            native_release_version: version,
          },
        })),
      );
      if (policy === 'local' && !assets.has(storagePath)) {
        if (
          (await stat(job.path)).size !== job.size ||
          (await fileSha(job.path)) !== doc.content_sha256
        )
          throw new Error('Local source integrity failure');
        const target = assetPath(path.join(directory, 'assets'), storagePath);
        mkdirSync(path.dirname(target), { recursive: true });
        if (!existsSync(target)) symlinkSync(job.path, target);
        else if ((await fileSha(target)) !== doc.content_sha256)
          throw new Error('Staged asset conflict');
        assets.set(storagePath, { path: storagePath, sha256: doc.content_sha256, size: job.size });
      }
    }
    await client.query('COMMIT');
    bundle.assets = [...assets.values()];
    mkdirSync(directory, { recursive: true });
    const serialized = JSON.stringify(bundle, null, 2);
    writeFileSync(path.join(directory, 'native-bundle.json'), serialized);
    writeFileSync(path.join(directory, 'native-bundle.sha256'), sha(serialized) + '\n');
    console.log(
      JSON.stringify({
        exported: true,
        documents: bundle.documents.length,
        media: bundle.media.length,
        local_assets: bundle.assets.length,
        bytes: bundle.assets.reduce((sum, asset) => sum + asset.size, 0),
        remote_sources: bundle.documents
          .filter((doc) => doc.metadata_json?.storage_policy === 'doj_remote')
          .reduce((n, doc) => n + doc.sources.length, 0),
      }),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function validateBundle(directory: string): Promise<Bundle> {
  const raw = readFileSync(path.join(directory, 'native-bundle.json'));
  if (sha(raw) !== readFileSync(path.join(directory, 'native-bundle.sha256'), 'utf8').trim())
    throw new Error('Bundle checksum mismatch');
  const bundle = JSON.parse(raw.toString('utf8')) as Bundle;
  if (bundle.schema !== 'native-corpus-v1') throw new Error('Unsupported bundle schema');
  const seen = new Set<string>();
  for (const doc of bundle.documents) {
    assetPath(directory, doc.storage_path);
    if (
      !/^[a-f0-9]{64}$/.test(doc.content_sha256) ||
      !doc.storage_path.includes(doc.content_sha256)
    )
      throw new Error('Document hash mismatch');
    for (const source of doc.sources) {
      if (
        seen.has(source.id) ||
        !getDojNativeSourceUrl({ doj_url: source.url, source_id: source.id })
      )
        throw new Error('Duplicate or invalid source');
      seen.add(source.id);
    }
    const asset = bundle.assets.find((entry) => entry.path === doc.storage_path);
    if (
      doc.metadata_json?.storage_policy === 'local' &&
      (!asset || asset.sha256 !== doc.content_sha256 || Number(doc.file_size) !== asset.size)
    )
      throw new Error('Missing local asset declaration');
  }
  for (const asset of bundle.assets) {
    if (asset.size > bundle.max_server_file_bytes)
      throw new Error('Asset exceeds server size limit');
    const filename = assetPath(path.join(directory, 'assets'), asset.path);
    if ((await stat(filename)).size !== asset.size || (await fileSha(filename)) !== asset.sha256)
      throw new Error(`Asset checksum mismatch: ${asset.path}`);
  }
  return bundle;
}

async function importBundle(directory: string, bundle: Bundle, apply: boolean): Promise<void> {
  if (!process.argv.includes('--apply') && !process.argv.includes('--dry-run'))
    throw new Error('Import requires --dry-run or --apply');
  if (bundle.release_version !== readJson<{ version: string }>('package.json').version)
    throw new Error('Code and bundle version differ');
  const pool = getMaintenancePool();
  const client = await pool.connect();
  const mapped = new Map<string, string>();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['native-corpus-release']);
    const targetRows = await client.query<{
      id: string;
      content: string | null;
      content_sha256: string;
    }>(
      'SELECT id,content,content_sha256 FROM documents WHERE content_sha256=ANY($1::text[]) ORDER BY id',
      [bundle.documents.map((doc) => doc.content_sha256)],
    );
    const targetByHash = new Map<string, { id: string; content: string | null }>();
    for (const row of targetRows.rows)
      if (!targetByHash.has(row.content_sha256)) targetByHash.set(row.content_sha256, row);
    // Validate conflicts before creating asset links or changing rows.
    for (const doc of bundle.documents) {
      const existing = targetByHash.get(doc.content_sha256);
      if (existing?.content && doc.content && existing.content !== doc.content)
        throw new Error(`Canonical text conflict: ${doc.id}`);
      if (existing) mapped.set(doc.id, existing.id);
    }
    for (const media of bundle.media) {
      const existing = await client.query<{ content_sha256: string }>(
        'SELECT d.content_sha256 FROM media_items m JOIN documents d ON d.id=m.document_id WHERE m.id=$1',
        [media.id],
      );
      const doc = bundle.documents.find((entry) => entry.id === media.document_id);
      if (!doc || (existing.rows[0] && existing.rows[0].content_sha256 !== doc.content_sha256))
        throw new Error('Media identity collision');
    }
    for (const asset of bundle.assets) {
      const destination = assetPath(process.cwd(), asset.path);
      if (existsSync(destination) && (await fileSha(destination)) !== asset.sha256)
        throw new Error('Destination asset conflict');
      if (apply && !existsSync(destination)) {
        mkdirSync(path.dirname(destination), { recursive: true });
        // The staged bundle and active assets share bytes, so promotion needs no second copy.
        await link(assetPath(path.join(directory, 'assets'), asset.path), destination);
      }
    }
    for (const doc of bundle.documents) {
      if (!apply) {
        if (!mapped.has(doc.id)) inserted++;
        continue;
      }
      let id = mapped.get(doc.id);
      if (!id) {
        // A previous document in this bundle may have the same bytes.
        id = targetByHash.get(doc.content_sha256)?.id;
      }
      const textHash = doc.content ? sha(doc.content) : null;
      if (!id) {
        const result = await client.query<{ id: string }>(
          `INSERT INTO documents (file_name,file_path,title,content,file_type,file_size,content_sha256,
            normalized_text_sha256,processing_status,source_collection,source_url,source_system,
            source_acquired_at,metadata_json,is_sensitive,evidence_type,word_count,content_preview)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,true,$15,$16,left($4,500)) RETURNING id`,
          [
            doc.file_name,
            doc.storage_path,
            doc.title,
            doc.content,
            doc.file_type,
            doc.file_size,
            doc.content_sha256,
            textHash,
            doc.processing_status,
            doc.source_collection,
            doc.sources[0].url,
            doc.source_system || 'DOJ',
            doc.source_acquired_at,
            JSON.stringify(doc.metadata_json),
            doc.file_type.startsWith('audio/')
              ? 'audio'
              : doc.file_type.startsWith('video/')
                ? 'video'
                : 'document',
            doc.content?.split(/\s+/).length || 0,
          ],
        );
        id = result.rows[0].id;
        inserted++;
      } else {
        await client.query(
          `UPDATE documents SET file_path=$2,content=COALESCE(NULLIF(content,''),$3),
            normalized_text_sha256=COALESCE(normalized_text_sha256,$4),
            metadata_json=COALESCE(metadata_json,'{}'::jsonb)||$5::jsonb,
            source_url=COALESCE(source_url,$6),source_system=COALESCE(source_system,'DOJ'),
            processing_status=CASE WHEN NULLIF(content,'') IS NULL THEN $7 ELSE processing_status END,
            word_count=CASE WHEN NULLIF(content,'') IS NULL THEN $8 ELSE word_count END,
            content_preview=COALESCE(content_preview,left($3,500)) WHERE id=$1`,
          [
            id,
            doc.storage_path,
            doc.content,
            textHash,
            JSON.stringify(doc.metadata_json),
            doc.sources[0].url,
            doc.processing_status,
            doc.content?.split(/\s+/).length || 0,
          ],
        );
      }
      mapped.set(doc.id, id);
      targetByHash.set(doc.content_sha256, { id, content: doc.content });
      await documentProvenanceService.upsertEvent(
        {
          documentId: Number(id),
          eventType: 'native_release_import',
          toolName: 'native-corpus-release',
          toolVersion: '1',
          sourceUrl: doc.sources[0].url,
          fileSha256: doc.content_sha256,
          textSha256: textHash,
          eventKey: `native-release:${bundle.release_version}:${doc.id}`,
          metadata: {
            release_version: bundle.release_version,
            local_document_id: doc.id,
            source_ids: doc.sources.map((source) => source.id),
            storage_policy: doc.metadata_json?.storage_policy,
            machine_transcript_review_status: doc.metadata_json?.native_extraction,
          },
        },
        client,
      );
    }
    if (apply)
      for (const media of bundle.media) {
        const doc = bundle.documents.find((entry) => entry.id === media.document_id)!;
        const documentId = mapped.get(doc.id)!;
        const metadata = { ...media.metadata_json, documentId };
        const url = getDojNativeSourceUrl(metadata);
        if (!url) throw new Error('Media source URL missing');
        await client.query(
          `INSERT INTO media_items (id,document_id,file_path,file_type,file_size,original_url,title,
          verification_status,is_sensitive,metadata_json,width,height,has_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9::jsonb,$10,$11,$12)
         ON CONFLICT (id) DO UPDATE SET document_id=EXCLUDED.document_id,file_path=EXCLUDED.file_path,
          file_type=EXCLUDED.file_type,file_size=EXCLUDED.file_size,original_url=EXCLUDED.original_url,
          metadata_json=COALESCE(media_items.metadata_json,'{}'::jsonb)||EXCLUDED.metadata_json,
          has_text=EXCLUDED.has_text`,
          [
            media.id,
            documentId,
            doc.storage_path,
            media.file_type,
            media.file_size,
            url,
            media.title,
            media.verification_status,
            JSON.stringify(metadata),
            media.width,
            media.height,
            Boolean(doc.content),
          ],
        );
      }
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    const receipt = {
      applied: apply,
      release_version: bundle.release_version,
      documents: bundle.documents.length,
      inserted,
      media: bundle.media.length,
      mapping: Object.fromEntries(mapped),
      checked_at: new Date().toISOString(),
    };
    writeFileSync(
      path.join(directory, apply ? 'native-import-receipt.json' : 'native-dry-run.json'),
      JSON.stringify(receipt, null, 2),
    );
    console.log(JSON.stringify({ ...receipt, mapping: undefined }));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function verifyBundle(directory: string, bundle: Bundle): Promise<void> {
  const receipt = readJson<{ mapping: Record<string, string> }>(
    path.join(directory, 'native-import-receipt.json'),
  );
  const pool = getMaintenancePool();
  const fingerprints: string[] = [];
  for (const doc of bundle.documents) {
    const id = receipt.mapping[doc.id];
    const result = await pool.query<{
      content_sha256: string;
      content: string | null;
      file_path: string;
    }>('SELECT content_sha256,content,file_path FROM documents WHERE id=$1', [id]);
    const row = result.rows[0];
    if (
      !row ||
      row.content_sha256 !== doc.content_sha256 ||
      row.file_path !== doc.storage_path ||
      (doc.content && sha(row.content || '') !== sha(doc.content))
    )
      throw new Error(`Document parity failure: ${doc.id}`);
    fingerprints.push(`${id}:${row.content_sha256}:${sha(row.content || '')}`);
  }
  for (const media of bundle.media) {
    const doc = bundle.documents.find((entry) => entry.id === media.document_id)!;
    const result = await pool.query<{
      document_id: string;
      file_path: string;
      original_url: string;
      metadata_json: Record<string, unknown>;
    }>('SELECT document_id,file_path,original_url,metadata_json FROM media_items WHERE id=$1', [
      media.id,
    ]);
    const row = result.rows[0];
    if (
      !row ||
      row.document_id !== receipt.mapping[doc.id] ||
      row.file_path !== doc.storage_path ||
      row.original_url !== getDojNativeSourceUrl(media.metadata_json) ||
      row.metadata_json.storage_policy !== media.metadata_json.storage_policy ||
      JSON.stringify(row.metadata_json.transcript || []) !==
        JSON.stringify(media.metadata_json.transcript || [])
    )
      throw new Error(`Media parity failure: ${media.id}`);
    fingerprints.push(
      `${media.id}:${row.document_id}:${row.original_url}:${row.metadata_json.storage_policy}`,
    );
  }
  for (const asset of bundle.assets) {
    if ((await fileSha(assetPath(process.cwd(), asset.path))) !== asset.sha256)
      throw new Error('Active asset checksum failure');
  }
  const result = {
    verified: true,
    release_version: bundle.release_version,
    documents: bundle.documents.length,
    source_ids: bundle.documents.reduce((count, doc) => count + doc.sources.length, 0),
    media: bundle.media.length,
    assets: bundle.assets.length,
    database_fingerprint: sha(fingerprints.sort().join('\n')),
    checked_at: new Date().toISOString(),
  };
  writeFileSync(path.join(directory, 'native-verify.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}

export async function runNativeRelease(): Promise<void> {
  const directory = path.resolve(option('--bundle'));
  try {
    if (process.argv[2] === 'export') await exportBundle(directory);
    else {
      const bundle = await validateBundle(directory);
      if (process.argv[2] === 'import')
        await importBundle(directory, bundle, process.argv.includes('--apply'));
      else if (process.argv[2] === 'verify') await verifyBundle(directory, bundle);
      else if (process.argv[2] === 'audit')
        console.log(JSON.stringify({ valid: true, assets: bundle.assets.length }));
      else throw new Error('Expected audit, export, import, or verify');
    }
  } finally {
    await drainPools();
  }
}
