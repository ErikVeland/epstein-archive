import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

process.env.JWT_SECRET ||= 'test-only-pinned-evidence-asset-secret';
const { verifyPinnedAssetFile } = await import('../server/routes/documentsRoutes.js');

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'evidence-asset-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function readOpenHandle(fileHandle: fs.promises.FileHandle): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const stream = fileHandle.createReadStream({ autoClose: false, start: 0 });
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.promises.rm(directory, { recursive: true, force: true })),
  );
});

describe('pinned evidence asset verification', () => {
  it('keeps serving the verified open inode after an atomic path replacement', async () => {
    const directory = await makeTemporaryDirectory();
    const assetPath = path.join(directory, 'source.pdf');
    const replacementPath = path.join(directory, 'replacement.pdf');
    const original = Buffer.from('immutable original evidence');
    const replacement = Buffer.from('different replacement bytes');
    const expectedSha256 = createHash('sha256').update(original).digest('hex');
    await fs.promises.writeFile(assetPath, original);
    await fs.promises.writeFile(replacementPath, replacement);

    const fileHandle = await fs.promises.open(
      assetPath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );
    try {
      expect(await verifyPinnedAssetFile(fileHandle, assetPath, expectedSha256)).not.toBeNull();
      await fs.promises.rename(replacementPath, assetPath);

      expect(await readOpenHandle(fileHandle)).toEqual(original);
      expect(await fs.promises.readFile(assetPath)).toEqual(replacement);
    } finally {
      await fileHandle.close();
    }
  });

  it('rejects bytes that do not match the pinned SHA-256', async () => {
    const directory = await makeTemporaryDirectory();
    const assetPath = path.join(directory, 'source.pdf');
    await fs.promises.writeFile(assetPath, 'actual bytes');
    const fileHandle = await fs.promises.open(
      assetPath,
      fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
    );

    try {
      expect(await verifyPinnedAssetFile(fileHandle, assetPath, '0'.repeat(64))).toBeNull();
    } finally {
      await fileHandle.close();
    }
  });
});
