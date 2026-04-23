import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PassThrough } from 'stream';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { buildExportFileInventory } from '../../../src/server/utils/investigationExportInventory';
import { buildManifest } from '../../../src/server/utils/exportManifest';

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe('investigation export ZIP', () => {
  it('computes a stable checksum independent of input ordering', async () => {
    const includedFilesA = [
      { evidenceId: 2, fileName: 'b.txt', sizeBytes: 2, zipPath: 'files/2/b.txt' },
      { evidenceId: 1, fileName: 'a.txt', sizeBytes: 1, zipPath: 'files/1/a.txt' },
    ];
    const includedFilesB = [...includedFilesA].reverse();

    const manifestA = buildManifest({
      investigationId: 1,
      title: 'T',
      status: 'open',
      appVersion: 'test',
      exportLimits: { fileCountCap: 100, sizeLimitBytes: 123 },
      evidenceIds: [2, 1],
      includedFiles: includedFilesA,
      skippedFiles: [],
    });
    const manifestB = buildManifest({
      investigationId: 1,
      title: 'T',
      status: 'open',
      appVersion: 'test',
      exportLimits: { fileCountCap: 100, sizeLimitBytes: 123 },
      evidenceIds: [1, 2],
      includedFiles: includedFilesB,
      skippedFiles: [],
    });

    expect(manifestA.checksum).toBe(manifestB.checksum);
  });

  it('builds deterministic inventory + zip paths and blocks traversal', async () => {
    const dataRoot = path.resolve(process.cwd(), 'data');
    const baseDir = path.join(dataRoot, 'temp', 'export_zip_test');
    await fs.promises.mkdir(baseDir, { recursive: true });

    const goodFile = path.join(baseDir, 'good.txt');
    await fs.promises.writeFile(goodFile, 'ok', 'utf8');

    const evidenceList = [
      { id: 2, file_path: '/etc/passwd' }, // traversal
      { id: 1, file_path: goodFile }, // included
    ];

    const inventory = await buildExportFileInventory({
      evidenceList,
      dataRoot,
      fileCountCap: 10,
      sizeLimitBytes: 10_000,
    });

    expect(inventory.includedFiles).toHaveLength(1);
    expect(inventory.includedFiles[0].evidenceId).toBe(1);
    expect(inventory.includedFiles[0].zipPath).toContain('files/1/');
    expect(inventory.skippedFiles.some((s) => s.reason === 'path_traversal')).toBe(true);
  });

  it('detects symlink escape and records it as skipped', async () => {
    const dataRoot = path.resolve(process.cwd(), 'data');
    const baseDir = path.join(dataRoot, 'temp', 'export_zip_symlink_test');
    await fs.promises.mkdir(baseDir, { recursive: true });

    const linkPath = path.join(baseDir, 'escape-hosts');
    try {
      await fs.promises.unlink(linkPath);
    } catch {
      // ignore
    }
    await fs.promises.symlink('/etc/hosts', linkPath);

    const evidenceList = [{ id: 1, file_path: linkPath }];
    const inventory = await buildExportFileInventory({
      evidenceList,
      dataRoot,
      fileCountCap: 10,
      sizeLimitBytes: 10_000,
    });

    expect(inventory.includedFiles).toHaveLength(0);
    expect(inventory.skippedFiles).toHaveLength(1);
    expect(inventory.skippedFiles[0].reason).toBe('symlink_escape');
  });

  it('produces a ZIP containing manifest + CSV + files with stable paths', async () => {
    const dataRoot = path.resolve(process.cwd(), 'data');
    const baseDir = path.join(dataRoot, 'temp', 'export_zip_contents_test');
    await fs.promises.mkdir(baseDir, { recursive: true });

    const goodFile = path.join(baseDir, 'doc.txt');
    await fs.promises.writeFile(goodFile, 'hello', 'utf8');

    const evidenceList = [{ id: 7, type: 'document', title: 'Doc', file_path: goodFile }];
    const { includedFiles, skippedFiles, filesToAdd } = await buildExportFileInventory({
      evidenceList,
      dataRoot,
      fileCountCap: 10,
      sizeLimitBytes: 10_000,
    });

    const manifest = buildManifest({
      investigationId: 123,
      title: 'Test Investigation',
      status: 'open',
      appVersion: 'test',
      exportLimits: { fileCountCap: 10, sizeLimitBytes: 10_000 },
      evidenceIds: [7],
      includedFiles,
      skippedFiles,
    });

    const archive = archiver('zip', { zlib: { level: 6 } });
    const out = new PassThrough();
    archive.pipe(out);

    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
    archive.append('id,type,title\n7,document,Doc\n', { name: 'evidence.csv' });
    archive.append('[]', { name: 'timeline.json' });
    archive.append('{"id":123}', { name: 'investigation.json' });
    archive.append(JSON.stringify(evidenceList, null, 2), { name: 'evidence.json' });
    for (const f of filesToAdd) {
      archive.file(f.absolutePath, { name: f.zipPath });
    }
    await archive.finalize();

    const zipBuf = await streamToBuffer(out);
    const zip = new AdmZip(zipBuf);
    const entryNames = zip.getEntries().map((e) => e.entryName);

    expect(entryNames).toContain('manifest.json');
    expect(entryNames).toContain('evidence.csv');
    expect(entryNames).toContain('timeline.json');
    expect(entryNames).toContain('investigation.json');
    expect(entryNames).toContain('evidence.json');
    expect(entryNames.some((n) => n.startsWith('files/7/'))).toBe(true);
    expect(includedFiles[0].zipPath).toBeDefined();
  });
});
