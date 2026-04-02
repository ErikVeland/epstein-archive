import path from 'path';
import fs from 'fs';
import { MediaService } from '../src/server/services/MediaService';

interface MediaImageLegacy {
  thumbnail_path?: string;
  thumbnailPath?: string;
  orientation?: number;
  [key: string]: unknown;
}

async function main() {
  const media = new MediaService(null);

  const BATCH_SIZE = 500;
  let offset = 0;
  let processed = 0;
  let generated = 0;
  let reused = 0;
  let failed = 0;

  console.log('Starting thumbnail backfill...');

  // Iterate in batches to avoid loading entire table into memory
  // Using the filter pagination supported by MediaService.getAllImages
  let hasMore = true;
  while (hasMore) {
    const images = await media.getAllImages({ limit: BATCH_SIZE, offset });
    hasMore = images.length > 0;
    if (!hasMore) break;

    for (const image of images) {
      processed += 1;
      try {
        // Resolve original absolute path (prefer /data)
        const p = (image.path || image.file_path || '').toString();
        const origCandidates: string[] = [];
        if (p.startsWith('/data/')) {
          origCandidates.push(path.join('/data', p.substring('/data/'.length)));
          origCandidates.push(path.join(process.cwd(), p.substring(1)));
        } else if (p.startsWith('data/')) {
          origCandidates.push(path.join('/data', p.substring('data/'.length)));
          origCandidates.push(path.join(process.cwd(), p));
        } else if (path.isAbsolute(p)) {
          origCandidates.push(p);
        } else {
          origCandidates.push(path.join('/data', p));
          origCandidates.push(path.join(process.cwd(), 'data', p));
        }
        const originalAbsPath = origCandidates.find((c) => fs.existsSync(c)) || origCandidates[0];

        if (!fs.existsSync(originalAbsPath)) {
          failed += 1;
          console.warn(`[Backfill] Original missing for image ${image.id}:`, origCandidates);
          continue;
        }

        // Determine output thumbnails dir adjacent to original
        const thumbnailDir = path.join(path.dirname(originalAbsPath), 'thumbnails');

        // If image already has a thumbnail path and the file exists, reuse
        const legacy = image as unknown as MediaImageLegacy;
        const existingThumb = legacy.thumbnail_path || legacy.thumbnailPath || '';
        if (existingThumb) {
          const thumbCandidates: string[] = [];
          const tp = existingThumb.toString();
          if (tp.startsWith('/data/')) {
            thumbCandidates.push(path.join('/data', tp.substring('/data/'.length)));
            thumbCandidates.push(path.join(process.cwd(), tp.substring(1)));
          } else if (tp.startsWith('data/')) {
            thumbCandidates.push(path.join('/data', tp.substring('data/'.length)));
            thumbCandidates.push(path.join(process.cwd(), tp));
          } else if (tp.startsWith('/thumbnails/')) {
            thumbCandidates.push(path.join('/data', tp.substring(1)));
            thumbCandidates.push(path.join(process.cwd(), 'data', tp.substring(1)));
          } else if (path.isAbsolute(tp)) {
            thumbCandidates.push(tp);
          } else {
            thumbCandidates.push(path.join('/data', tp));
            thumbCandidates.push(path.join(process.cwd(), 'data', tp));
          }
          const resolvedExisting =
            thumbCandidates.find((c) => fs.existsSync(c)) || thumbCandidates[0];
          if (fs.existsSync(resolvedExisting)) {
            reused += 1;
            continue;
          }
        }

        // Generate thumbnail
        const generatedPath = await media.generateThumbnail(originalAbsPath, thumbnailDir, {
          orientation: legacy.orientation || 1,
          force: true,
        });

        // Canonicalize thumbnail path to /data/... when applicable
        let canonicalThumb = generatedPath;
        const cwdDataPrefix = path.join(process.cwd(), 'data') + path.sep;
        if (canonicalThumb.startsWith(cwdDataPrefix)) {
          canonicalThumb = '/data/' + canonicalThumb.substring(cwdDataPrefix.length);
        }

        // Update DB record
        await media.updateImage(image.id, { thumbnailPath: canonicalThumb });
        generated += 1;
      } catch (err) {
        failed += 1;
        console.error(`[Backfill] Failed for image ${image.id}:`, (err as Error).message);
      }
    }

    offset += images.length;
    console.log(
      `Progress: processed=${processed} generated=${generated} reused=${reused} failed=${failed}`,
    );
  }

  console.log('Thumbnail backfill complete.');
  console.log(
    `Summary: processed=${processed} generated=${generated} reused=${reused} failed=${failed}`,
  );
}

main().catch((e) => {
  console.error('Backfill script error:', e);
  process.exit(1);
});
