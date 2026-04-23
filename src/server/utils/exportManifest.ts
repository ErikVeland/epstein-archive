import { createHash } from 'crypto';
import type {
  ExportManifest,
  ExportManifestIncludedFile,
  ExportManifestSkippedFile,
} from '../../shared/schemas/exportManifest.js';

export type { ExportManifest, ExportManifestIncludedFile, ExportManifestSkippedFile };

/**
 * Compute a deterministic SHA-256 checksum over the export inventory.
 *
 * The hash covers evidenceIds (sorted ascending) and includedFiles (sorted by
 * evidenceId ascending), serialised as canonical JSON.  It intentionally
 * excludes mutable fields like `generatedAt` so the checksum stays stable for
 * the same logical content.
 */
export function buildManifestChecksum(
  evidenceIds: number[],
  includedFiles: ExportManifestIncludedFile[],
): string {
  const canonicalIncluded = [...includedFiles].sort((a, b) => {
    const aPath = a.zipPath ?? '';
    const bPath = b.zipPath ?? '';
    const byPath = aPath.localeCompare(bPath);
    if (byPath !== 0) return byPath;
    return a.evidenceId - b.evidenceId;
  });
  const canonical = JSON.stringify({
    evidenceIds: [...evidenceIds].sort((a, b) => a - b),
    includedFiles: canonicalIncluded,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Build the full manifest object (without checksum set yet), then inject the
 * checksum.  Returns the complete manifest ready to serialise into the ZIP.
 */
export function buildManifest(options: {
  investigationId: number;
  title: string;
  status: string;
  appVersion: string;
  exportLimits: { fileCountCap: number; sizeLimitBytes: number };
  evidenceIds: number[];
  includedFiles: ExportManifestIncludedFile[];
  skippedFiles: ExportManifestSkippedFile[];
}): ExportManifest {
  const {
    investigationId,
    title,
    status,
    appVersion,
    exportLimits,
    evidenceIds,
    includedFiles,
    skippedFiles,
  } = options;

  const sortedEvidenceIds = [...evidenceIds].sort((a, b) => a - b);
  const sortedIncluded = [...includedFiles].sort((a, b) => {
    const aPath = a.zipPath ?? '';
    const bPath = b.zipPath ?? '';
    const byPath = aPath.localeCompare(bPath);
    if (byPath !== 0) return byPath;
    return a.evidenceId - b.evidenceId;
  });
  const sortedSkipped = [...skippedFiles].sort((a, b) => a.evidenceId - b.evidenceId);

  const checksum = buildManifestChecksum(sortedEvidenceIds, sortedIncluded);

  return {
    investigationId,
    title,
    status,
    generatedAt: new Date().toISOString(),
    appVersion,
    checksumAlgorithm: 'sha256',
    exportLimits,
    evidenceIds: sortedEvidenceIds,
    includedFiles: sortedIncluded,
    skippedFiles: sortedSkipped,
    checksum,
  };
}

type EvidenceRow = Record<string, unknown>;

/** Escape a CSV cell value: wrap in quotes and double any internal quotes. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const CSV_COLUMNS = ['id', 'type', 'title', 'description', 'source_path', 'relevance'] as const;

/**
 * Render an evidence list as a CSV string.
 *
 * Columns: id, type, title, description, source_path, relevance.
 * Values are sanitised with RFC-4180 quoting; no external library required.
 */
export function buildEvidenceCsv(evidenceList: EvidenceRow[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = evidenceList.map((row) => CSV_COLUMNS.map((col) => csvCell(row[col])).join(','));
  return [header, ...rows].join('\n');
}

/** Static README bundled into every export ZIP. */
export const BUNDLE_README = `# Investigation Evidence Bundle

## Contents

| File | Description |
|------|-------------|
| investigation.json | Investigation metadata (title, status, owner, timestamps) |
| manifest.json      | Export manifest: evidence inventory, limits applied, checksum |
| evidence.json      | Full evidence list (raw metadata) |
| evidence.csv       | Evidence list in CSV format (id, type, title, description, source_path, relevance) |
| timeline.json      | Investigation timeline events |
| annotations.json   | Evidence annotations for the investigation (only present when annotations exist) |
| files/             | Supporting source files (up to the limits shown in manifest.json) |

## Integrity Verification

The \`manifest.json\` file contains a \`checksum\` field computed as:

    sha256( JSON.stringify({ evidenceIds: <sorted>, includedFiles: <sorted by zipPath then evidenceId> }) )

To verify manually:

1. Open \`manifest.json\` and note the \`evidenceIds\` and \`includedFiles\` arrays.
2. Sort both arrays (evidenceIds numerically ascending; includedFiles by zipPath then evidenceId).
3. Compute SHA-256 of \`JSON.stringify({ evidenceIds, includedFiles })\` (UTF-8, no extra whitespace).
4. Compare with the \`checksum\` field.

## Export Limits

File count cap and size limit are recorded in \`manifest.json\` under \`exportLimits\`.
Skipped files (and the reason each was skipped) are listed in \`skippedFiles\`.
`;
