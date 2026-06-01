import { existsSync } from 'fs';
import { lstat, mkdir, readdir, symlink } from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const dest = './data/media/videos/KatieJohnson';

async function isDirEmpty(dir: string) {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch (_e) {
    return true;
  }
}

async function main() {
  const source = process.env.KJ_VIDEO_ROOT?.trim();
  await mkdir(path.dirname(dest), { recursive: true });

  if (!source) {
    await mkdir(dest, { recursive: true });
    console.log(
      JSON.stringify(
        {
          ok: true,
          message:
            'KJ_VIDEO_ROOT not set; created destination directory only. Set KJ_VIDEO_ROOT to symlink videos into ./data/media/videos/KatieJohnson.',
          dest,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (existsSync(dest)) {
    const st = await lstat(dest);
    if (st.isSymbolicLink()) {
      console.log(
        JSON.stringify({ ok: true, message: 'Destination already symlinked.', dest }, null, 2),
      );
      return;
    }
    const empty = await isDirEmpty(dest);
    if (!empty) {
      throw new Error(
        `Destination ${dest} exists and is not empty. Refusing to replace; move it aside and re-run.`,
      );
    }
  }

  await symlink(source, dest, 'dir');
  console.log(JSON.stringify({ ok: true, linked: true, source, dest }, null, 2));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ingest_katie_videos] ${message}`);
  process.exit(1);
});
