import { z } from 'zod';

export const exportManifestIncludedFileSchema = z.object({
  evidenceId: z.number(),
  fileName: z.string(),
  sizeBytes: z.number(),
  /** Path inside the ZIP (best-effort; optional for backward compatibility) */
  zipPath: z.string().optional(),
  /** Path relative to server DATA_ROOT (best-effort; optional for backward compatibility) */
  dataRootRelativePath: z.string().optional(),
});

export const exportManifestSkippedFileSchema = z.object({
  evidenceId: z.number(),
  reason: z.enum([
    'file_not_found',
    'path_traversal',
    'size_limit',
    'file_limit',
    'symlink_escape',
    'not_a_file',
    'duplicate_path',
  ]),
});

export const exportManifestSchema = z.object({
  investigationId: z.number(),
  title: z.string(),
  status: z.string(),
  generatedAt: z.string(),
  appVersion: z.string(),
  schemaHash: z.string(),
  checksumAlgorithm: z.literal('sha256'),
  exportLimits: z.object({
    fileCountCap: z.number(),
    sizeLimitBytes: z.number(),
  }),
  /** Evidence IDs in deterministic (ascending numeric) order */
  evidenceIds: z.array(z.number()),
  includedFiles: z.array(exportManifestIncludedFileSchema),
  skippedFiles: z.array(exportManifestSkippedFileSchema),
  /** SHA-256 hex of the canonical inventory JSON (evidenceIds + includedFiles) */
  checksum: z.string(),
});

export type ExportManifest = z.infer<typeof exportManifestSchema>;
export type ExportManifestIncludedFile = z.infer<typeof exportManifestIncludedFileSchema>;
export type ExportManifestSkippedFile = z.infer<typeof exportManifestSkippedFileSchema>;
export type ExportManifestSkipReason = ExportManifestSkippedFile['reason'];
