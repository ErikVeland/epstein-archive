import { mkdir } from 'fs/promises';
import 'dotenv/config';

const DEFAULT_DIRS = [
  './data',
  './data/ingest',
  './data/media',
  './data/media/videos',
  './data/media/videos/KatieJohnson',
  './data/thumbnails',
  './logs',
  './backups',
  './pipeline_checkpoints',
];

async function main() {
  const extraDirs = (process.env.EXTRA_DIRS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const dirs = [...DEFAULT_DIRS, ...extraDirs];
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: dirs,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ensure_structure] ${message}`);
  process.exit(1);
});
