import dotenv from 'dotenv';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, relative, resolve, sep } from 'node:path';
import { createGunzip, createGzip } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finished } from 'node:stream/promises';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import pg from 'pg';

const { Client } = pg;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const CURRENT_SCHEMA_VERSION = 1;
const EXPORT_BATCH_SIZE = 1_000;
const MEDIA_IMPORT_BATCH_SIZE = 125;
const LINK_IMPORT_BATCH_SIZE = 750;
const SELECTED_MEDIA_PREDICATE = `m.document_id IS NOT NULL
  AND m.file_type LIKE 'image/%'
  AND COALESCE(m.metadata_json->>'source_file_status', '') <> 'missing'`;

dotenv.config({ path: resolve(REPO_ROOT, '.env') });

interface AlbumRecord {
  id: string;
  name: string;
  description: string | null;
  coverImageId: string | null;
  createdAt: string | null;
  dateModified: string | null;
  isSensitive: boolean | null;
}

interface TagRecord {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
}

interface MediaRecord {
  id: string;
  entityId: string | null;
  documentId: string;
  albumName: string;
  fileType: string | null;
  filePath: string;
  thumbnailPath: string | null;
  originalUrl: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  verificationStatus: string | null;
  redFlagRating: number | null;
  isSensitive: boolean | null;
  exif: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  fileSize: string | null;
  width: number | null;
  height: number | null;
  dateTaken: string | null;
  hasText: boolean | null;
}

interface TagLinkRecord {
  mediaItemId: string;
  tagName: string;
}

interface AssetRecord {
  path: string;
  size: number;
}

interface ReleaseFile {
  path: string;
  sha256: string;
  bytes: number;
  rows: number;
}

interface DatabaseSummary {
  mediaItems: number;
  albums: number;
  tags: number;
  tagLinks: number;
  mediaFingerprint: string;
  albumFingerprint: string;
  tagFingerprint: string;
  tagLinkFingerprint: string;
  classifications: Record<string, number>;
}

interface MediaReleaseManifest {
  schemaVersion: number;
  releaseVersion: string;
  createdAt: string;
  selection: {
    description: string;
    predicate: string;
  };
  database: DatabaseSummary;
  assets: {
    count: number;
    totalBytes: number;
  };
  files: Record<string, ReleaseFile>;
}

interface CliOptions {
  command: 'audit' | 'export' | 'import' | 'verify';
  bundle: string;
  releaseVersion?: string;
  apply: boolean;
}

interface VerificationResult {
  mediaItems: number;
  tagLinks: number;
  mediaFingerprint: string;
  albumFingerprint: string;
  tagFingerprint: string;
  tagLinkFingerprint: string;
  classifications: Record<string, number>;
}

function optionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseOptions(): CliOptions {
  const command = process.argv[2];
  if (command !== 'audit' && command !== 'export' && command !== 'import' && command !== 'verify') {
    throw new Error('Usage: media_catalog_release.ts <audit|export|import|verify> --bundle PATH');
  }
  const bundleValue = optionValue('--bundle');
  const bundle = bundleValue
    ? resolve(bundleValue)
    : resolve(REPO_ROOT, '.media-releases', 'current');
  const releaseVersion = optionValue('--release-version');
  if (command === 'export' && !releaseVersion) {
    throw new Error('--release-version is required for export');
  }
  if (
    command === 'import' &&
    !process.argv.includes('--apply') &&
    !process.argv.includes('--dry-run')
  ) {
    throw new Error('Import requires either --dry-run or --apply');
  }
  return {
    command,
    bundle,
    releaseVersion,
    apply: process.argv.includes('--apply'),
  };
}

export function assertSafeAssetPath(assetPath: string): string {
  if (
    !assetPath ||
    assetPath.includes('\0') ||
    assetPath.includes('\n') ||
    assetPath.includes('\r')
  ) {
    throw new Error(`Unsafe empty or control-character asset path: ${JSON.stringify(assetPath)}`);
  }
  if (isAbsolute(assetPath) || !assetPath.startsWith('data/')) {
    throw new Error(`Asset path must be repository-relative under data/: ${assetPath}`);
  }
  const normalized = normalize(assetPath);
  if (normalized !== assetPath || normalized === 'data' || normalized.startsWith(`..${sep}`)) {
    throw new Error(`Asset path is not canonical: ${assetPath}`);
  }
  const absolutePath = resolve(REPO_ROOT, assetPath);
  const relativePath = relative(REPO_ROOT, absolutePath);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Asset path escapes the repository: ${assetPath}`);
  }
  return absolutePath;
}

async function auditSourceAssets(options: CliOptions): Promise<void> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    const result = await client.query<{ id: string; filePath: string }>(`
      SELECT m.id, m.file_path AS "filePath"
      FROM media_items m
      WHERE m.document_id IS NOT NULL
        AND m.file_type LIKE 'image/%'
        AND COALESCE(m.metadata_json->>'source_file_status', '') <> 'missing'
      ORDER BY m.id
    `);
    const missingIds: string[] = [];
    const missingPaths: string[] = [];
    let inspected = 0;
    for (const row of result.rows) {
      const file = await stat(assertSafeAssetPath(row.filePath)).catch(() => null);
      if (!file?.isFile()) {
        missingIds.push(row.id);
        missingPaths.push(row.filePath);
      }
      inspected += 1;
      if (inspected % 10_000 === 0) {
        console.log(`[media-release] audited ${inspected} catalog asset references`);
      }
    }

    if (options.apply && missingIds.length > 0) {
      await client.query('BEGIN');
      const unknownTag = await client.query<{ id: string }>(
        `INSERT INTO media_tags (name, category, color)
         VALUES ('unknown', 'visual-type', '#6366f1')
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id::text AS id`,
      );
      await client.query(
        `UPDATE media_items
         SET metadata_json = COALESCE(metadata_json, '{}'::jsonb) || jsonb_build_object(
           'visual_classification', 'unknown',
           'visual_classification_confidence', 0,
           'visual_classification_method', 'source-file-missing-v1',
           'visual_classified_at', NOW()::text,
           'source_file_status', 'missing'
         )
         WHERE id = ANY($1::text[])`,
        [missingIds],
      );
      await client.query(
        `DELETE FROM media_item_tags item_tag
         USING media_tags tag
         WHERE item_tag.tag_id = tag.id
           AND tag.category = 'visual-type'
           AND item_tag.media_item_id = ANY($1::text[])`,
        [missingIds],
      );
      await client.query(
        `INSERT INTO media_item_tags (media_item_id, tag_id)
         SELECT media_id, $2::bigint
         FROM unnest($1::text[]) AS media_id
         ON CONFLICT DO NOTHING`,
        [missingIds, unknownTag.rows[0].id],
      );
      await client.query('COMMIT');
    }

    console.log(
      JSON.stringify(
        {
          mode: options.apply ? 'audit-applied' : 'audit',
          inspected,
          missing: missingIds.length,
          missingPaths: missingPaths.slice(0, 20),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required');
  return value;
}

function packageVersion(): string {
  const parsed = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8')) as {
    version?: string;
  };
  if (!parsed.version) throw new Error('package.json version is missing');
  return parsed.version;
}

async function hashFile(filePath: string): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash('sha256');
  let bytes = 0;
  const input = createReadStream(filePath);
  input.on('data', (chunk: string | Buffer) => {
    bytes += Buffer.byteLength(chunk);
    hash.update(chunk);
  });
  await finished(input);
  return { sha256: hash.digest('hex'), bytes };
}

async function writeJsonLine(stream: NodeJS.WritableStream, value: unknown): Promise<void> {
  if (!stream.write(`${JSON.stringify(value)}\n`)) await once(stream, 'drain');
}

async function writeGzipRecords<T>(
  filePath: string,
  records: AsyncIterable<T> | Iterable<T>,
): Promise<ReleaseFile> {
  const partialPath = `${filePath}.partial`;
  const output = createWriteStream(partialPath, { flags: 'wx' });
  const gzip = createGzip({ level: 9 });
  gzip.pipe(output);
  let rows = 0;
  try {
    for await (const record of records) {
      await writeJsonLine(gzip, record);
      rows += 1;
    }
    gzip.end();
    await finished(output);
    renameSync(partialPath, filePath);
  } catch (error) {
    gzip.destroy();
    output.destroy();
    throw error;
  }
  const hashed = await hashFile(filePath);
  return { path: filePath.split('/').pop() || filePath, ...hashed, rows };
}

async function* paginatedMedia(client: pg.Client): AsyncGenerator<MediaRecord> {
  let lastId: string | null = null;
  while (true) {
    const cursorClause: string = lastId == null ? '' : 'AND m.id > $1';
    const parameters = lastId == null ? [EXPORT_BATCH_SIZE] : [lastId, EXPORT_BATCH_SIZE];
    const limitParameter: string = lastId == null ? '$1' : '$2';
    const result: pg.QueryResult<MediaRecord> = await client.query<MediaRecord>(
      `SELECT
        m.id,
        m.entity_id::text AS "entityId",
        m.document_id::text AS "documentId",
        a.name AS "albumName",
        m.file_type AS "fileType",
        m.file_path AS "filePath",
        m.thumbnail_path AS "thumbnailPath",
        m.original_url AS "originalUrl",
        m.title,
        m.caption,
        m.description,
        m.verification_status AS "verificationStatus",
        m.red_flag_rating AS "redFlagRating",
        m.is_sensitive AS "isSensitive",
        m.exif_json AS exif,
        m.metadata_json AS metadata,
        m.created_at::text AS "createdAt",
        m.file_size::text AS "fileSize",
        m.width,
        m.height,
        m.date_taken::text AS "dateTaken",
        m.has_text AS "hasText"
      FROM media_items m
      JOIN media_albums a ON a.id = m.album_id
      WHERE ${SELECTED_MEDIA_PREDICATE}
        ${cursorClause}
      ORDER BY m.id
      LIMIT ${limitParameter}`,
      parameters,
    );
    if (result.rows.length === 0) return;
    for (const row of result.rows) yield row;
    lastId = result.rows[result.rows.length - 1].id;
  }
}

async function* paginatedTagLinks(client: pg.Client): AsyncGenerator<TagLinkRecord> {
  let lastMediaId = '';
  let lastTagName = '';
  while (true) {
    const result = await client.query<TagLinkRecord>(
      `SELECT
        mit.media_item_id AS "mediaItemId",
        t.name AS "tagName"
      FROM media_item_tags mit
      JOIN media_tags t ON t.id = mit.tag_id
      JOIN media_items m ON m.id = mit.media_item_id
      WHERE ${SELECTED_MEDIA_PREDICATE}
        AND (mit.media_item_id, t.name) > ($1, $2)
      ORDER BY mit.media_item_id, t.name
      LIMIT $3`,
      [lastMediaId, lastTagName, EXPORT_BATCH_SIZE],
    );
    if (result.rows.length === 0) return;
    for (const row of result.rows) yield row;
    const last = result.rows[result.rows.length - 1];
    lastMediaId = last.mediaItemId;
    lastTagName = last.tagName;
  }
}

async function* paginatedAssetPaths(client: pg.Client): AsyncGenerator<string> {
  let lastPath = '';
  while (true) {
    const result = await client.query<{ file_path: string }>(
      `SELECT DISTINCT m.file_path
       FROM media_items m
       WHERE ${SELECTED_MEDIA_PREDICATE}
         AND m.file_path > $1
       ORDER BY m.file_path
       LIMIT $2`,
      [lastPath, EXPORT_BATCH_SIZE],
    );
    if (result.rows.length === 0) return;
    for (const row of result.rows) yield row.file_path;
    lastPath = result.rows[result.rows.length - 1].file_path;
  }
}

const MEDIA_FINGERPRINT_EXPRESSION = `jsonb_build_object(
  'id', m.id,
  'entityId', m.entity_id,
  'documentId', m.document_id,
  'albumName', a.name,
  'fileType', m.file_type,
  'filePath', m.file_path,
  'thumbnailPath', m.thumbnail_path,
  'originalUrl', m.original_url,
  'title', m.title,
  'caption', m.caption,
  'description', m.description,
  'verificationStatus', m.verification_status,
  'redFlagRating', m.red_flag_rating,
  'isSensitive', m.is_sensitive,
  'exif', m.exif_json,
  'metadata', m.metadata_json,
  'createdAt', m.created_at,
  'fileSize', m.file_size,
  'width', m.width,
  'height', m.height,
  'dateTaken', m.date_taken,
  'hasText', m.has_text
)`;

async function sourceDatabaseSummary(client: pg.Client): Promise<DatabaseSummary> {
  const counts = await client.query<{
    media_items: string;
    albums: string;
    tags: string;
    tag_links: string;
  }>(`
    SELECT
      COUNT(DISTINCT m.id) AS media_items,
      COUNT(DISTINCT m.album_id) AS albums,
      COUNT(DISTINCT mit.tag_id) AS tags,
      COUNT(mit.media_item_id) AS tag_links
    FROM media_items m
    LEFT JOIN media_item_tags mit ON mit.media_item_id = m.id
    WHERE ${SELECTED_MEDIA_PREDICATE}
  `);
  const mediaFingerprint = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5((${MEDIA_FINGERPRINT_EXPRESSION})::text), '' ORDER BY m.id)) AS fingerprint
    FROM media_items m
    JOIN media_albums a ON a.id = m.album_id
    WHERE ${SELECTED_MEDIA_PREDICATE}
  `);
  const albumFingerprint = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5(jsonb_build_array(
      a.name, a.description, a.cover_image_id, a.created_at, a.date_modified, a.is_sensitive
    )::text), '' ORDER BY a.name)) AS fingerprint
    FROM media_albums a
    WHERE EXISTS (
      SELECT 1 FROM media_items m WHERE m.album_id = a.id AND ${SELECTED_MEDIA_PREDICATE}
    )
  `);
  const tagFingerprint = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5(jsonb_build_array(t.name, t.category, t.color)::text), '' ORDER BY t.name)) AS fingerprint
    FROM media_tags t
    WHERE EXISTS (
      SELECT 1
      FROM media_item_tags mit
      JOIN media_items m ON m.id = mit.media_item_id
      WHERE mit.tag_id = t.id AND ${SELECTED_MEDIA_PREDICATE}
    )
  `);
  const tagLinkFingerprint = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5(jsonb_build_array(mit.media_item_id, t.name)::text), '' ORDER BY mit.media_item_id, t.name)) AS fingerprint
    FROM media_item_tags mit
    JOIN media_tags t ON t.id = mit.tag_id
    JOIN media_items m ON m.id = mit.media_item_id
    WHERE ${SELECTED_MEDIA_PREDICATE}
  `);
  const classifications = await client.query<{ classification: string; count: string }>(`
    SELECT COALESCE(m.metadata_json->>'visual_classification', 'unclassified') AS classification,
           COUNT(*) AS count
    FROM media_items m
    WHERE ${SELECTED_MEDIA_PREDICATE}
    GROUP BY 1
    ORDER BY 1
  `);
  const row = counts.rows[0];
  return {
    mediaItems: Number(row.media_items),
    albums: Number(row.albums),
    tags: Number(row.tags),
    tagLinks: Number(row.tag_links),
    mediaFingerprint: mediaFingerprint.rows[0].fingerprint,
    albumFingerprint: albumFingerprint.rows[0].fingerprint,
    tagFingerprint: tagFingerprint.rows[0].fingerprint,
    tagLinkFingerprint: tagLinkFingerprint.rows[0].fingerprint,
    classifications: Object.fromEntries(
      classifications.rows.map((value) => [value.classification, Number(value.count)]),
    ),
  };
}

async function exportAssets(
  client: pg.Client,
  bundle: string,
): Promise<{
  ndjson: ReleaseFile;
  list: ReleaseFile;
  count: number;
  totalBytes: number;
}> {
  const ndjsonPath = resolve(bundle, 'assets.ndjson.gz');
  const ndjsonPartialPath = `${ndjsonPath}.partial`;
  const listPath = resolve(bundle, 'assets.txt');
  const listPartialPath = `${listPath}.partial`;
  const ndjsonOutput = createWriteStream(ndjsonPartialPath, { flags: 'wx' });
  const listOutput = createWriteStream(listPartialPath, { flags: 'wx' });
  const gzip = createGzip({ level: 9 });
  gzip.pipe(ndjsonOutput);
  let count = 0;
  let totalBytes = 0;

  try {
    for await (const assetPath of paginatedAssetPaths(client)) {
      const absolutePath = assertSafeAssetPath(assetPath);
      const file = await stat(absolutePath);
      if (!file.isFile()) throw new Error(`Referenced asset is not a regular file: ${assetPath}`);
      const record: AssetRecord = { path: assetPath, size: file.size };
      await writeJsonLine(gzip, record);
      if (!listOutput.write(`${assetPath}\n`)) await once(listOutput, 'drain');
      count += 1;
      totalBytes += file.size;
      if (count % 10_000 === 0) console.log(`[media-release] audited ${count} source assets`);
    }
    gzip.end();
    listOutput.end();
    await Promise.all([finished(ndjsonOutput), finished(listOutput)]);
    renameSync(ndjsonPartialPath, ndjsonPath);
    renameSync(listPartialPath, listPath);
  } catch (error) {
    gzip.destroy();
    ndjsonOutput.destroy();
    listOutput.destroy();
    throw error;
  }

  const [ndjsonHash, listHash] = await Promise.all([hashFile(ndjsonPath), hashFile(listPath)]);
  return {
    ndjson: { path: 'assets.ndjson.gz', ...ndjsonHash, rows: count },
    list: { path: 'assets.txt', ...listHash, rows: count },
    count,
    totalBytes,
  };
}

async function exportRelease(options: CliOptions): Promise<void> {
  if (existsSync(options.bundle)) {
    throw new Error(`Bundle directory already exists: ${options.bundle}`);
  }
  mkdirSync(options.bundle, { recursive: true });
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const summary = await sourceDatabaseSummary(client);
    const albums = await client.query<AlbumRecord>(`
      SELECT DISTINCT
        a.id::text AS id,
        a.name,
        a.description,
        a.cover_image_id AS "coverImageId",
        a.created_at::text AS "createdAt",
        a.date_modified::text AS "dateModified",
        a.is_sensitive AS "isSensitive"
      FROM media_albums a
      JOIN media_items m ON m.album_id = a.id
      WHERE ${SELECTED_MEDIA_PREDICATE}
      ORDER BY a.name
    `);
    const tags = await client.query<TagRecord>(`
      SELECT DISTINCT t.id::text AS id, t.name, t.category, t.color
      FROM media_tags t
      JOIN media_item_tags mit ON mit.tag_id = t.id
      JOIN media_items m ON m.id = mit.media_item_id
      WHERE ${SELECTED_MEDIA_PREDICATE}
      ORDER BY t.name
    `);

    const files: Record<string, ReleaseFile> = {};
    files.albums = await writeGzipRecords(resolve(options.bundle, 'albums.ndjson.gz'), albums.rows);
    files.tags = await writeGzipRecords(resolve(options.bundle, 'tags.ndjson.gz'), tags.rows);
    files.mediaItems = await writeGzipRecords(
      resolve(options.bundle, 'media-items.ndjson.gz'),
      paginatedMedia(client),
    );
    files.tagLinks = await writeGzipRecords(
      resolve(options.bundle, 'media-item-tags.ndjson.gz'),
      paginatedTagLinks(client),
    );
    const assets = await exportAssets(client, options.bundle);
    files.assets = assets.ndjson;
    files.assetList = assets.list;

    if (files.mediaItems.rows !== summary.mediaItems) {
      throw new Error(
        `Media export count mismatch: ${files.mediaItems.rows} != ${summary.mediaItems}`,
      );
    }
    if (files.albums.rows !== summary.albums || files.tags.rows !== summary.tags) {
      throw new Error('Album or tag export count does not match the source database summary');
    }
    if (files.tagLinks.rows !== summary.tagLinks) {
      throw new Error(
        `Tag-link export count mismatch: ${files.tagLinks.rows} != ${summary.tagLinks}`,
      );
    }
    if (assets.count !== summary.mediaItems) {
      throw new Error(`Asset count mismatch: ${assets.count} != ${summary.mediaItems}`);
    }

    const manifest: MediaReleaseManifest = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      releaseVersion: options.releaseVersion!,
      createdAt: new Date().toISOString(),
      selection: {
        description: 'Document-linked image media with preserved catalog and provenance metadata.',
        predicate: SELECTED_MEDIA_PREDICATE,
      },
      database: summary,
      assets: { count: assets.count, totalBytes: assets.totalBytes },
      files,
    };
    writeFileSync(
      resolve(options.bundle, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      {
        flag: 'wx',
      },
    );
    await client.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          mode: 'exported',
          bundle: options.bundle,
          releaseVersion: manifest.releaseVersion,
          database: manifest.database,
          assets: manifest.assets,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function readManifest(bundle: string): MediaReleaseManifest {
  const manifestPath = resolve(bundle, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as MediaReleaseManifest;
  if (manifest.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported media release schema version: ${manifest.schemaVersion}`);
  }
  return manifest;
}

function assertMatchingApplicationVersion(manifest: MediaReleaseManifest): void {
  const applicationVersion = packageVersion();
  if (manifest.releaseVersion !== applicationVersion) {
    throw new Error(
      `Bundle version ${manifest.releaseVersion} does not match application ${applicationVersion}`,
    );
  }
}

async function verifyBundleFiles(bundle: string, manifest: MediaReleaseManifest): Promise<void> {
  for (const [name, expected] of Object.entries(manifest.files)) {
    const filePath = resolve(bundle, expected.path);
    const actual = await hashFile(filePath);
    if (actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) {
      throw new Error(`Bundle file checksum mismatch for ${name}: ${expected.path}`);
    }
  }
}

async function* readGzipRecords<T>(filePath: string): AsyncGenerator<T> {
  const input = createReadStream(filePath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as T;
  }
}

async function readAllGzipRecords<T>(filePath: string): Promise<T[]> {
  const records: T[] = [];
  for await (const record of readGzipRecords<T>(filePath)) records.push(record);
  return records;
}

async function verifyAssets(bundle: string, manifest: MediaReleaseManifest): Promise<void> {
  let count = 0;
  let totalBytes = 0;
  for await (const asset of readGzipRecords<AssetRecord>(
    resolve(bundle, manifest.files.assets.path),
  )) {
    const absolutePath = assertSafeAssetPath(asset.path);
    const file = await stat(absolutePath).catch(() => null);
    if (!file?.isFile()) throw new Error(`Release asset is missing: ${asset.path}`);
    if (file.size !== asset.size) {
      throw new Error(`Release asset size mismatch: ${asset.path} (${file.size} != ${asset.size})`);
    }
    count += 1;
    totalBytes += file.size;
    if (count % 10_000 === 0) console.log(`[media-release] verified ${count} deployed assets`);
  }
  if (count !== manifest.assets.count || totalBytes !== manifest.assets.totalBytes) {
    throw new Error(
      `Asset manifest mismatch: ${count}/${totalBytes} != ${manifest.assets.count}/${manifest.assets.totalBytes}`,
    );
  }
}

async function insertReleaseIds(client: pg.Client, bundle: string): Promise<number> {
  await client.query(`
    CREATE TEMP TABLE media_release_ids (
      id text PRIMARY KEY,
      document_id bigint NOT NULL,
      file_path text NOT NULL
    ) ON COMMIT DROP
  `);
  let batch: MediaRecord[] = [];
  let count = 0;
  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const values: unknown[] = [];
    const rows = batch.map((record) => {
      const offset = values.length;
      values.push(record.id, record.documentId, record.filePath);
      return `($${offset + 1}::text, $${offset + 2}::bigint, $${offset + 3}::text)`;
    });
    await client.query(
      `INSERT INTO media_release_ids (id, document_id, file_path) VALUES ${rows.join(', ')}`,
      values,
    );
    count += batch.length;
    batch = [];
  };
  for await (const record of readGzipRecords<MediaRecord>(
    resolve(bundle, 'media-items.ndjson.gz'),
  )) {
    batch.push(record);
    if (batch.length >= LINK_IMPORT_BATCH_SIZE) await flush();
  }
  await flush();
  return count;
}

async function validateTargetPreconditions(
  client: pg.Client,
  manifest: MediaReleaseManifest,
): Promise<void> {
  const counts = await client.query<{
    release_rows: string;
    missing_documents: string;
    conflicting_ids: string;
  }>(`
    SELECT
      COUNT(*) AS release_rows,
      COUNT(*) FILTER (WHERE d.id IS NULL) AS missing_documents,
      COUNT(*) FILTER (
        WHERE existing.id IS NOT NULL
          AND (
            existing.document_id IS DISTINCT FROM release.document_id
            OR existing.file_path IS DISTINCT FROM release.file_path
          )
      ) AS conflicting_ids
    FROM media_release_ids release
    LEFT JOIN documents d ON d.id = release.document_id
    LEFT JOIN media_items existing ON existing.id = release.id
  `);
  const row = counts.rows[0];
  if (Number(row.release_rows) !== manifest.database.mediaItems) {
    throw new Error(
      `Release ID count mismatch: ${row.release_rows} != ${manifest.database.mediaItems}`,
    );
  }
  if (Number(row.missing_documents) > 0) {
    throw new Error(
      `${row.missing_documents} source documents are missing from the target database`,
    );
  }
  if (Number(row.conflicting_ids) > 0) {
    throw new Error(`${row.conflicting_ids} media IDs conflict with different target lineage`);
  }
}

async function upsertAlbums(
  client: pg.Client,
  albums: AlbumRecord[],
): Promise<Map<string, string>> {
  const sourceNames = new Set<string>();
  const targetIds = new Map<string, string>();
  for (const album of albums) {
    if (sourceNames.has(album.name)) throw new Error(`Duplicate source album name: ${album.name}`);
    sourceNames.add(album.name);
    const byName = await client.query<{ id: string }>(
      'SELECT id::text AS id FROM media_albums WHERE name = $1 ORDER BY id',
      [album.name],
    );
    if (byName.rows.length > 1) throw new Error(`Duplicate target album name: ${album.name}`);
    let targetId = byName.rows[0]?.id;
    if (targetId) {
      await client.query(
        `UPDATE media_albums
         SET description = $2, cover_image_id = $3, created_at = $4::timestamp,
             date_modified = $5::timestamp, is_sensitive = $6
         WHERE id = $1::bigint`,
        [
          targetId,
          album.description,
          album.coverImageId,
          album.createdAt,
          album.dateModified,
          album.isSensitive,
        ],
      );
    } else {
      const idConflict = await client.query<{ name: string }>(
        'SELECT name FROM media_albums WHERE id = $1::bigint',
        [album.id],
      );
      if (idConflict.rows[0]) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO media_albums
            (name, description, cover_image_id, created_at, date_modified, is_sensitive)
           VALUES ($1, $2, $3, $4::timestamp, $5::timestamp, $6)
           RETURNING id::text AS id`,
          [
            album.name,
            album.description,
            album.coverImageId,
            album.createdAt,
            album.dateModified,
            album.isSensitive,
          ],
        );
        targetId = inserted.rows[0].id;
      } else {
        await client.query(
          `INSERT INTO media_albums
            (id, name, description, cover_image_id, created_at, date_modified, is_sensitive)
           VALUES ($1::bigint, $2, $3, $4, $5::timestamp, $6::timestamp, $7)`,
          [
            album.id,
            album.name,
            album.description,
            album.coverImageId,
            album.createdAt,
            album.dateModified,
            album.isSensitive,
          ],
        );
        targetId = album.id;
      }
    }
    targetIds.set(album.name, targetId);
  }
  return targetIds;
}

async function upsertTags(client: pg.Client, tags: TagRecord[]): Promise<Map<string, string>> {
  const targetIds = new Map<string, string>();
  for (const tag of tags) {
    const byName = await client.query<{ id: string }>(
      'SELECT id::text AS id FROM media_tags WHERE name = $1',
      [tag.name],
    );
    let targetId = byName.rows[0]?.id;
    if (targetId) {
      await client.query('UPDATE media_tags SET category = $2, color = $3 WHERE id = $1::bigint', [
        targetId,
        tag.category,
        tag.color,
      ]);
    } else {
      const idConflict = await client.query<{ name: string }>(
        'SELECT name FROM media_tags WHERE id = $1::bigint',
        [tag.id],
      );
      if (idConflict.rows[0]) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO media_tags (name, category, color)
           VALUES ($1, $2, $3)
           RETURNING id::text AS id`,
          [tag.name, tag.category, tag.color],
        );
        targetId = inserted.rows[0].id;
      } else {
        await client.query(
          'INSERT INTO media_tags (id, name, category, color) VALUES ($1::bigint, $2, $3, $4)',
          [tag.id, tag.name, tag.category, tag.color],
        );
        targetId = tag.id;
      }
    }
    targetIds.set(tag.name, targetId);
  }
  return targetIds;
}

async function upsertMediaBatch(
  client: pg.Client,
  records: MediaRecord[],
  albumIds: Map<string, string>,
): Promise<void> {
  const values: unknown[] = [];
  const rows = records.map((record) => {
    const albumId = albumIds.get(record.albumName);
    if (!albumId) throw new Error(`Missing target album mapping for ${record.albumName}`);
    const offset = values.length;
    values.push(
      record.id,
      record.entityId,
      record.documentId,
      albumId,
      record.fileType,
      record.filePath,
      record.thumbnailPath,
      record.originalUrl,
      record.title,
      record.caption,
      record.description,
      record.verificationStatus,
      record.redFlagRating,
      record.isSensitive,
      record.exif == null ? null : JSON.stringify(record.exif),
      record.metadata == null ? null : JSON.stringify(record.metadata),
      record.createdAt,
      record.fileSize,
      record.width,
      record.height,
      record.dateTaken,
      record.hasText,
    );
    const p = (index: number): string => `$${offset + index}`;
    return `(
      ${p(1)}::text, ${p(2)}::bigint, ${p(3)}::bigint, ${p(4)}::bigint,
      ${p(5)}::text, ${p(6)}::text, ${p(7)}::text, ${p(8)}::text,
      ${p(9)}::text, ${p(10)}::text, ${p(11)}::text, ${p(12)}::text,
      ${p(13)}::integer, ${p(14)}::boolean, ${p(15)}::jsonb, ${p(16)}::jsonb,
      ${p(17)}::timestamp, ${p(18)}::bigint, ${p(19)}::integer, ${p(20)}::integer,
      ${p(21)}::timestamp, ${p(22)}::boolean
    )`;
  });
  await client.query(
    `INSERT INTO media_items (
      id, entity_id, document_id, album_id, file_type, file_path, thumbnail_path,
      original_url, title, caption, description, verification_status, red_flag_rating,
      is_sensitive, exif_json, metadata_json, created_at, file_size, width, height,
      date_taken, has_text
    ) VALUES ${rows.join(', ')}
    ON CONFLICT (id) DO UPDATE SET
      entity_id = EXCLUDED.entity_id,
      document_id = EXCLUDED.document_id,
      album_id = EXCLUDED.album_id,
      file_type = EXCLUDED.file_type,
      file_path = EXCLUDED.file_path,
      thumbnail_path = EXCLUDED.thumbnail_path,
      original_url = EXCLUDED.original_url,
      title = EXCLUDED.title,
      caption = EXCLUDED.caption,
      description = EXCLUDED.description,
      verification_status = EXCLUDED.verification_status,
      red_flag_rating = EXCLUDED.red_flag_rating,
      is_sensitive = EXCLUDED.is_sensitive,
      exif_json = EXCLUDED.exif_json,
      metadata_json = EXCLUDED.metadata_json,
      created_at = EXCLUDED.created_at,
      file_size = EXCLUDED.file_size,
      width = EXCLUDED.width,
      height = EXCLUDED.height,
      date_taken = EXCLUDED.date_taken,
      has_text = EXCLUDED.has_text`,
    values,
  );
}

async function upsertMedia(
  client: pg.Client,
  bundle: string,
  albumIds: Map<string, string>,
): Promise<number> {
  let batch: MediaRecord[] = [];
  let count = 0;
  for await (const record of readGzipRecords<MediaRecord>(
    resolve(bundle, 'media-items.ndjson.gz'),
  )) {
    batch.push(record);
    if (batch.length >= MEDIA_IMPORT_BATCH_SIZE) {
      await upsertMediaBatch(client, batch, albumIds);
      count += batch.length;
      batch = [];
      if (count % 10_000 === 0) console.log(`[media-release] imported ${count} media rows`);
    }
  }
  if (batch.length > 0) {
    await upsertMediaBatch(client, batch, albumIds);
    count += batch.length;
  }
  return count;
}

async function replaceTagLinks(
  client: pg.Client,
  bundle: string,
  tagIds: Map<string, string>,
): Promise<number> {
  await client.query(
    'DELETE FROM media_item_tags WHERE media_item_id IN (SELECT id FROM media_release_ids)',
  );
  let batch: TagLinkRecord[] = [];
  let count = 0;
  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    const values: unknown[] = [];
    const rows = batch.map((record) => {
      const tagId = tagIds.get(record.tagName);
      if (!tagId) throw new Error(`Missing target tag mapping for ${record.tagName}`);
      const offset = values.length;
      values.push(record.mediaItemId, tagId);
      return `($${offset + 1}::text, $${offset + 2}::bigint)`;
    });
    await client.query(
      `INSERT INTO media_item_tags (media_item_id, tag_id)
       VALUES ${rows.join(', ')}
       ON CONFLICT (media_item_id, tag_id) DO NOTHING`,
      values,
    );
    count += batch.length;
    batch = [];
    if (count % 30_000 === 0) console.log(`[media-release] imported ${count} tag links`);
  };
  for await (const record of readGzipRecords<TagLinkRecord>(
    resolve(bundle, 'media-item-tags.ndjson.gz'),
  )) {
    batch.push(record);
    if (batch.length >= LINK_IMPORT_BATCH_SIZE) await flush();
  }
  await flush();
  return count;
}

async function targetVerification(client: pg.Client): Promise<VerificationResult> {
  const media = await client.query<{ count: string; fingerprint: string }>(`
    SELECT COUNT(*) AS count,
           md5(string_agg(md5((${MEDIA_FINGERPRINT_EXPRESSION})::text), '' ORDER BY m.id)) AS fingerprint
    FROM media_items m
    JOIN media_release_ids release ON release.id = m.id
    JOIN media_albums a ON a.id = m.album_id
  `);
  const albums = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5(jsonb_build_array(
      a.name, a.description, a.cover_image_id, a.created_at, a.date_modified, a.is_sensitive
    )::text), '' ORDER BY a.name)) AS fingerprint
    FROM media_albums a
    WHERE EXISTS (
      SELECT 1
      FROM media_items m
      JOIN media_release_ids release ON release.id = m.id
      WHERE m.album_id = a.id
    )
  `);
  const tags = await client.query<{ fingerprint: string }>(`
    SELECT md5(string_agg(md5(jsonb_build_array(t.name, t.category, t.color)::text), '' ORDER BY t.name)) AS fingerprint
    FROM media_tags t
    WHERE EXISTS (
      SELECT 1
      FROM media_item_tags mit
      JOIN media_release_ids release ON release.id = mit.media_item_id
      WHERE mit.tag_id = t.id
    )
  `);
  const tagLinks = await client.query<{ count: string; fingerprint: string }>(`
    SELECT COUNT(*) AS count,
           md5(string_agg(md5(jsonb_build_array(mit.media_item_id, t.name)::text), '' ORDER BY mit.media_item_id, t.name)) AS fingerprint
    FROM media_item_tags mit
    JOIN media_release_ids release ON release.id = mit.media_item_id
    JOIN media_tags t ON t.id = mit.tag_id
  `);
  const classifications = await client.query<{ classification: string; count: string }>(`
    SELECT COALESCE(m.metadata_json->>'visual_classification', 'unclassified') AS classification,
           COUNT(*) AS count
    FROM media_items m
    JOIN media_release_ids release ON release.id = m.id
    GROUP BY 1
    ORDER BY 1
  `);
  return {
    mediaItems: Number(media.rows[0].count),
    tagLinks: Number(tagLinks.rows[0].count),
    mediaFingerprint: media.rows[0].fingerprint,
    albumFingerprint: albums.rows[0].fingerprint,
    tagFingerprint: tags.rows[0].fingerprint,
    tagLinkFingerprint: tagLinks.rows[0].fingerprint,
    classifications: Object.fromEntries(
      classifications.rows.map((value) => [value.classification, Number(value.count)]),
    ),
  };
}

function assertVerification(manifest: MediaReleaseManifest, actual: VerificationResult): void {
  const expected = manifest.database;
  const comparisons: Array<[string, unknown, unknown]> = [
    ['media item count', actual.mediaItems, expected.mediaItems],
    ['tag-link count', actual.tagLinks, expected.tagLinks],
    ['media fingerprint', actual.mediaFingerprint, expected.mediaFingerprint],
    ['album fingerprint', actual.albumFingerprint, expected.albumFingerprint],
    ['tag fingerprint', actual.tagFingerprint, expected.tagFingerprint],
    ['tag-link fingerprint', actual.tagLinkFingerprint, expected.tagLinkFingerprint],
    [
      'classification distribution',
      JSON.stringify(actual.classifications),
      JSON.stringify(expected.classifications),
    ],
  ];
  const failures = comparisons.filter(([, value, expectedValue]) => value !== expectedValue);
  if (failures.length > 0) {
    throw new Error(
      `Media release verification failed:\n${failures
        .map(
          ([name, value, expectedValue]) =>
            `- ${name}: ${String(value)} != ${String(expectedValue)}`,
        )
        .join('\n')}`,
    );
  }
}

async function resetSequences(client: pg.Client): Promise<void> {
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('media_albums', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM media_albums), 1),
      true
    )
  `);
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('media_tags', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM media_tags), 1),
      true
    )
  `);
}

function activateRelease(bundle: string): void {
  const releaseRoot = resolve(REPO_ROOT, '.media-releases');
  mkdirSync(releaseRoot, { recursive: true });
  const currentPath = resolve(releaseRoot, 'current');
  const temporaryPath = resolve(releaseRoot, `.current-${process.pid}`);
  const target = relative(releaseRoot, bundle);
  symlinkSync(target, temporaryPath, 'dir');
  renameSync(temporaryPath, currentPath);
}

async function importRelease(options: CliOptions): Promise<void> {
  const manifest = readManifest(options.bundle);
  assertMatchingApplicationVersion(manifest);
  await verifyBundleFiles(options.bundle, manifest);
  await verifyAssets(options.bundle, manifest);
  const albums = await readAllGzipRecords<AlbumRecord>(resolve(options.bundle, 'albums.ndjson.gz'));
  const tags = await readAllGzipRecords<TagRecord>(resolve(options.bundle, 'tags.ndjson.gz'));
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '0'");
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('media-catalog-release'))");
    const stagedIds = await insertReleaseIds(client, options.bundle);
    if (stagedIds !== manifest.database.mediaItems) {
      throw new Error(`Staged ${stagedIds} media IDs; expected ${manifest.database.mediaItems}`);
    }
    await validateTargetPreconditions(client, manifest);
    const albumIds = await upsertAlbums(client, albums);
    const tagIds = await upsertTags(client, tags);
    const importedMedia = await upsertMedia(client, options.bundle, albumIds);
    const importedLinks = await replaceTagLinks(client, options.bundle, tagIds);
    await resetSequences(client);
    const verification = await targetVerification(client);
    assertVerification(manifest, verification);

    if (options.apply) {
      await client.query('COMMIT');
      activateRelease(options.bundle);
    } else {
      await client.query('ROLLBACK');
    }
    console.log(
      JSON.stringify(
        {
          mode: options.apply ? 'applied' : 'dry-run',
          releaseVersion: manifest.releaseVersion,
          importedMedia,
          importedLinks,
          database: verification,
          assets: manifest.assets,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyRelease(options: CliOptions): Promise<void> {
  const manifest = readManifest(options.bundle);
  await verifyBundleFiles(options.bundle, manifest);
  await verifyAssets(options.bundle, manifest);
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const stagedIds = await insertReleaseIds(client, options.bundle);
    if (stagedIds !== manifest.database.mediaItems) {
      throw new Error(`Staged ${stagedIds} media IDs; expected ${manifest.database.mediaItems}`);
    }
    await validateTargetPreconditions(client, manifest);
    const verification = await targetVerification(client);
    assertVerification(manifest, verification);
    await client.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          mode: 'verified',
          releaseVersion: manifest.releaseVersion,
          database: verification,
          assets: manifest.assets,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const options = parseOptions();
  if (options.command === 'audit') await auditSourceAssets(options);
  else if (options.command === 'export') await exportRelease(options);
  else if (options.command === 'import') await importRelease(options);
  else await verifyRelease(options);
}

const isMain =
  Boolean(process.argv[1]) && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
