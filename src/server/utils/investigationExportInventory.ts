import fs from 'fs';
import path from 'path';
import type { ExportManifestIncludedFile, ExportManifestSkippedFile } from './exportManifest.js';

type EvidenceRow = Record<string, unknown>;

export type ExportFileToAdd = {
  evidenceId: number;
  absolutePath: string;
  zipPath: string;
};

function normalizeDataRoot(dataRoot: string): string {
  const resolved = path.resolve(dataRoot);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isWithinDataRoot(dataRootNormalized: string, absolutePath: string): boolean {
  return (
    absolutePath === dataRootNormalized.slice(0, -path.sep.length) ||
    absolutePath.startsWith(dataRootNormalized)
  );
}

function toZipRelative(dataRootNormalized: string, absolutePath: string): string | null {
  const rel = path.relative(dataRootNormalized, absolutePath).replace(/\\/g, '/');
  const normalized = path.posix.normalize(rel);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  return normalized;
}

export async function buildExportFileInventory(options: {
  evidenceList: EvidenceRow[];
  dataRoot: string;
  fileCountCap: number;
  sizeLimitBytes: number;
}): Promise<{
  includedFiles: ExportManifestIncludedFile[];
  skippedFiles: ExportManifestSkippedFile[];
  filesToAdd: ExportFileToAdd[];
  totalBytes: number;
}> {
  const dataRootNormalized = normalizeDataRoot(options.dataRoot);
  const fileCountCap = Math.max(1, options.fileCountCap);
  const sizeLimitBytes = Math.max(1, options.sizeLimitBytes);

  // Deterministic iteration: sort by evidence ID ascending.
  const evidenceSorted = [...options.evidenceList].sort((a, b) => {
    const aId = Number(a.id ?? a.investigation_evidence_id ?? 0);
    const bId = Number(b.id ?? b.investigation_evidence_id ?? 0);
    return aId - bId;
  });

  const includedFiles: ExportManifestIncludedFile[] = [];
  const skippedFiles: ExportManifestSkippedFile[] = [];
  const filesToAdd: ExportFileToAdd[] = [];
  const usedZipPaths = new Set<string>();

  let totalBytes = 0;

  for (const row of evidenceSorted) {
    const evidenceId = Number(row.id ?? row.investigation_evidence_id ?? 0);
    const rawFilePath = row.file_path;
    if (typeof rawFilePath !== 'string' || rawFilePath.trim().length === 0) continue;

    if (includedFiles.length >= fileCountCap) {
      skippedFiles.push({ evidenceId, reason: 'file_limit' });
      break;
    }

    const cleanedPath = rawFilePath.replace(/\0/g, '');
    const absolutePath = path.resolve(cleanedPath);

    // Path traversal guard — must stay within DATA_ROOT.
    if (!isWithinDataRoot(dataRootNormalized, absolutePath)) {
      skippedFiles.push({ evidenceId, reason: 'path_traversal' });
      continue;
    }

    // Stat first (fast fail) before resolving symlinks.
    let stat: import('fs').Stats;
    try {
      stat = await fs.promises.stat(absolutePath);
    } catch {
      skippedFiles.push({ evidenceId, reason: 'file_not_found' });
      continue;
    }

    if (!stat.isFile()) {
      skippedFiles.push({ evidenceId, reason: 'not_a_file' });
      continue;
    }

    // Resolve symlinks so "dataRoot/link -> /etc" can't escape.
    let realPath: string;
    try {
      realPath = await fs.promises.realpath(absolutePath);
    } catch {
      skippedFiles.push({ evidenceId, reason: 'file_not_found' });
      continue;
    }
    if (!isWithinDataRoot(dataRootNormalized, realPath)) {
      skippedFiles.push({ evidenceId, reason: 'symlink_escape' });
      continue;
    }

    const zipRel = toZipRelative(dataRootNormalized, realPath);
    if (!zipRel) {
      skippedFiles.push({ evidenceId, reason: 'path_traversal' });
      continue;
    }

    if (totalBytes + stat.size > sizeLimitBytes) {
      skippedFiles.push({ evidenceId, reason: 'size_limit' });
      continue;
    }

    const fileName = path.posix.basename(zipRel);
    const zipPath = `files/${evidenceId}/${zipRel}`;
    if (usedZipPaths.has(zipPath)) {
      skippedFiles.push({ evidenceId, reason: 'duplicate_path' });
      continue;
    }
    usedZipPaths.add(zipPath);

    totalBytes += stat.size;
    includedFiles.push({
      evidenceId,
      fileName,
      sizeBytes: stat.size,
      zipPath,
      dataRootRelativePath: zipRel,
    });
    filesToAdd.push({ evidenceId, absolutePath: realPath, zipPath });
  }

  return { includedFiles, skippedFiles, filesToAdd, totalBytes };
}
