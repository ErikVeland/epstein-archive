import 'dotenv/config';
import sharp from 'sharp';
import { getMaintenancePool, drainPools } from '../src/server/db/connection.js';
import { resolveMediaPath } from '../src/server/utils/pathResolver.js';
import { MediaService } from '../src/server/services/MediaService.js';
import {
  calculateVisualStatsFromPixelSample,
  classifyExtractedVisual,
  type ExtractedVisualClassification,
  type ExtractedVisualStats,
} from '../src/server/services/mediaExtractionMetadata.js';

interface MediaRow {
  id: string;
  file_path: string;
  width: number | null;
  height: number | null;
  metadata_json: Record<string, unknown> | null;
  current_classification: string | null;
}

interface ClassifiedMedia {
  id: string;
  previousClassification: string | null;
  classification: ExtractedVisualClassification;
  stats: ExtractedVisualStats;
}

interface FailedMedia {
  id: string;
  error: string;
  sourceMissing: boolean;
}

interface Options {
  apply: boolean;
  all: boolean;
  extractedOnly: boolean;
  limit: number;
  batchSize: number;
  concurrency: number;
  storedMetrics: boolean;
}

function readPositiveInteger(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const raw = index >= 0 ? process.argv[index + 1] : null;
  const value = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function parseOptions(): Options {
  return {
    apply: process.argv.includes('--apply'),
    all: process.argv.includes('--all'),
    extractedOnly: process.argv.includes('--extracted-only'),
    limit: readPositiveInteger('--limit', 500),
    batchSize: readPositiveInteger('--batch-size', 250),
    concurrency: readPositiveInteger('--concurrency', 8),
    storedMetrics: process.argv.includes('--stored-metrics'),
  };
}

function readStoredStats(row: MediaRow): ExtractedVisualStats | null {
  const metrics = row.metadata_json?.['visual_metrics'];
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return null;
  const value = metrics as Record<string, unknown>;
  const channelMeans = value['channelMeans'];
  const channelStdevs = value['channelStdevs'];
  if (!Array.isArray(channelMeans) || !Array.isArray(channelStdevs)) return null;

  const numberValue = (name: string): number | undefined => {
    const result = Number(value[name]);
    return Number.isFinite(result) ? result : undefined;
  };
  const entropy = numberValue('entropy');
  if (entropy == null || !row.width || !row.height) return null;

  return {
    width: row.width,
    height: row.height,
    entropy,
    channelMeans: channelMeans.map(Number),
    channelStdevs: channelStdevs.map(Number),
    whitePixelRatio: numberValue('whitePixelRatio'),
    nearWhitePixelRatio: numberValue('nearWhitePixelRatio'),
    blackPixelRatio: numberValue('blackPixelRatio'),
    colorPixelRatio: numberValue('colorPixelRatio'),
    dominantColorRatio: numberValue('dominantColorRatio'),
    edgePixelRatio: numberValue('edgePixelRatio'),
  };
}

async function classifyMedia(row: MediaRow, storedMetrics: boolean): Promise<ClassifiedMedia> {
  const storedStats = storedMetrics ? readStoredStats(row) : null;
  if (storedStats) {
    return {
      id: row.id,
      previousClassification: row.current_classification,
      classification: classifyExtractedVisual(storedStats),
      stats: storedStats,
    };
  }

  const resolvedPath = resolveMediaPath(row.file_path);
  const image = sharp(resolvedPath).rotate();
  const [metadata, pixelSample] = await Promise.all([
    image.clone().metadata(),
    image
      .clone()
      .resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  const originalWidth = metadata.width || row.width || pixelSample.info.width;
  const originalHeight = metadata.height || row.height || pixelSample.info.height;
  const stats = calculateVisualStatsFromPixelSample({
    data: pixelSample.data,
    width: pixelSample.info.width,
    height: pixelSample.info.height,
    channels: pixelSample.info.channels,
    originalWidth,
    originalHeight,
  });

  return {
    id: row.id,
    previousClassification: row.current_classification,
    classification: classifyExtractedVisual(stats),
    stats,
  };
}

async function classifyBatch(
  rows: MediaRow[],
  concurrency: number,
  storedMetrics: boolean,
): Promise<{ classified: ClassifiedMedia[]; failed: FailedMedia[] }> {
  const classified: ClassifiedMedia[] = [];
  const failed: FailedMedia[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, rows.length) }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor++];
      try {
        classified.push(await classifyMedia(row, storedMetrics));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({
          id: row.id,
          error: message,
          sourceMissing: message.startsWith('Input file is missing:'),
        });
      }
    }
  });
  await Promise.all(workers);
  return { classified, failed };
}

async function main(): Promise<void> {
  const options = parseOptions();
  const pool = getMaintenancePool();
  const mediaService = new MediaService(pool);
  const tagIds = new Map<string, number>();
  if (options.apply) {
    for (const name of ['probable-photograph', 'document-scan', 'graphic', 'unknown']) {
      const tag = await mediaService.getOrCreateTag(name, 'visual-type');
      tagIds.set(name.replaceAll('-', '_'), Number(tag.id));
    }
  }

  let lastId = 0;
  let inspected = 0;
  let updated = 0;
  let failed = 0;
  let markedUnavailable = 0;
  const counts = new Map<string, number>();
  const maximum = options.all ? Number.POSITIVE_INFINITY : options.limit;

  while (inspected < maximum) {
    const pageLimit = Math.min(options.batchSize, maximum - inspected);
    const params: Array<number> = [lastId, pageLimit];
    const extractedWhere = options.extractedOnly
      ? `AND (
          metadata_json->>'is_document_extract' = 'true'
          OR file_path ILIKE '%/media/extracted/%'
        )`
      : '';
    const result = await pool.query<MediaRow>(
      `SELECT
         id::text,
         file_path,
         width,
         height,
         metadata_json,
         metadata_json->>'visual_classification' AS current_classification
       FROM media_items
       WHERE file_type LIKE 'image/%'
         AND id ~ '^[0-9]+$'
         AND id::bigint > $1::bigint
         AND COALESCE(metadata_json->>'visual_classification_method', '') NOT IN (
           'pixel-statistics-v4',
           'source-file-missing-v1'
         )
         ${extractedWhere}
       ORDER BY id::bigint
       LIMIT $2::int`,
      params,
    );
    if (result.rows.length === 0) break;

    lastId = Number(result.rows[result.rows.length - 1].id);
    inspected += result.rows.length;
    const batch = await classifyBatch(result.rows, options.concurrency, options.storedMetrics);
    const missingSources = batch.failed.filter((failure) => failure.sourceMissing);
    const unexpectedFailures = batch.failed.filter((failure) => !failure.sourceMissing);
    markedUnavailable += missingSources.length;
    failed += unexpectedFailures.length;
    for (const failure of unexpectedFailures.slice(0, 3)) {
      console.warn(`[classification] media ${failure.id} skipped: ${failure.error}`);
    }
    for (const failure of missingSources.slice(0, 3)) {
      console.warn(
        `[classification] media ${failure.id} marked unavailable: source file is missing`,
      );
    }
    for (const item of batch.classified) {
      counts.set(item.classification.type, (counts.get(item.classification.type) || 0) + 1);
    }

    if (options.apply && batch.classified.length > 0) {
      const payload = batch.classified.map((item) => ({
        id: item.id,
        classification: item.classification.type,
        confidence: item.classification.confidence,
        method: item.classification.method,
        metrics: {
          entropy: item.stats.entropy,
          channelMeans: item.stats.channelMeans,
          channelStdevs: item.stats.channelStdevs,
          whitePixelRatio: item.stats.whitePixelRatio,
          nearWhitePixelRatio: item.stats.nearWhitePixelRatio,
          blackPixelRatio: item.stats.blackPixelRatio,
          colorPixelRatio: item.stats.colorPixelRatio,
          dominantColorRatio: item.stats.dominantColorRatio,
          edgePixelRatio: item.stats.edgePixelRatio,
        },
      }));
      await pool.query(
        `WITH input AS (
           SELECT *
           FROM jsonb_to_recordset($1::jsonb) AS classified(
             id text,
             classification text,
             confidence double precision,
             method text,
             metrics jsonb
           )
         )
         UPDATE media_items media
         SET metadata_json = COALESCE(media.metadata_json, '{}'::jsonb) || jsonb_build_object(
               'visual_classification', input.classification,
               'visual_classification_confidence', input.confidence,
               'visual_classification_method', input.method,
               'visual_classified_at', NOW()::text,
               'visual_metrics', input.metrics,
               'is_text_only', input.classification = 'document_scan'
             ),
             has_text = CASE
               WHEN input.classification = 'document_scan' THEN TRUE
               WHEN media.metadata_json->>'is_document_extract' = 'true'
                 OR media.file_path ILIKE '%/media/extracted/%'
               THEN FALSE
               ELSE media.has_text
             END
         FROM input
         WHERE media.id = input.id`,
        [JSON.stringify(payload)],
      );

      const tagChanges = batch.classified.filter(
        (item) => item.previousClassification !== item.classification.type,
      );
      if (tagChanges.length > 0) {
        const ids = tagChanges.map((item) => item.id);
        await pool.query(
          `DELETE FROM media_item_tags item_tag
           USING media_tags tag
           WHERE item_tag.tag_id = tag.id
             AND tag.category = 'visual-type'
             AND item_tag.media_item_id = ANY($1::text[])`,
          [ids],
        );
        const tagPayload = tagChanges.map((item) => ({
          id: item.id,
          tagId: tagIds.get(item.classification.type)!,
        }));
        await pool.query(
          `INSERT INTO media_item_tags (media_item_id, tag_id)
           SELECT tagged.id, tagged.tag_id
           FROM jsonb_to_recordset($1::jsonb) AS tagged(id text, tag_id bigint)
           ON CONFLICT DO NOTHING`,
          [JSON.stringify(tagPayload.map((item) => ({ id: item.id, tag_id: item.tagId })))],
        );
      }
      updated += batch.classified.length;
    }

    if (options.apply && missingSources.length > 0) {
      const missingIds = missingSources.map((failure) => failure.id);
      await pool.query(
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
      await pool.query(
        `DELETE FROM media_item_tags item_tag
         USING media_tags tag
         WHERE item_tag.tag_id = tag.id
           AND tag.category = 'visual-type'
           AND item_tag.media_item_id = ANY($1::text[])`,
        [missingIds],
      );
      await pool.query(
        `INSERT INTO media_item_tags (media_item_id, tag_id)
         SELECT media_id, $2::bigint
         FROM unnest($1::text[]) AS media_id
         ON CONFLICT DO NOTHING`,
        [missingIds, tagIds.get('unknown')!],
      );
    }

    console.log(
      `[classification] inspected=${inspected} updated=${updated} failed=${failed} counts=${JSON.stringify(Object.fromEntries(counts))}`,
    );
  }

  if (!options.apply) {
    console.log('Dry run only. Add --apply to store classifications and visual-type tags.');
  }
  console.log(
    `Completed visual classification. Inspected ${inspected}, updated ${updated}, marked unavailable ${markedUnavailable}, failed ${failed}.`,
  );
  if (failed > 0) {
    throw new Error(`Visual classification failed for ${failed} media item(s).`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await drainPools();
  });
