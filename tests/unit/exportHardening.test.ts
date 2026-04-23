import { describe, it, expect } from 'vitest';
import { buildManifestChecksum, buildManifest } from '../../src/server/utils/exportManifest.js';
import type { ExportManifestIncludedFile } from '../../src/shared/schemas/exportManifest.js';

describe('Export Hardening — Manifest & Checksum', () => {
  const mockIncluded: ExportManifestIncludedFile[] = [
    { evidenceId: 10, fileName: 'a.pdf', sizeBytes: 100, zipPath: 'files/10/a.pdf' },
    { evidenceId: 5, fileName: 'b.pdf', sizeBytes: 200, zipPath: 'files/5/b.pdf' },
  ];
  const mockEvidenceIds = [5, 10];

  it('should generate a deterministic checksum regardless of input order', () => {
    const checksum1 = buildManifestChecksum(mockEvidenceIds, mockIncluded);

    // Reversed input order
    const checksum2 = buildManifestChecksum([10, 5], [mockIncluded[1], mockIncluded[0]]);

    expect(checksum1).toBe(checksum2);
    expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
  });

  it('should build a complete manifest with correct metadata', () => {
    const manifest = buildManifest({
      investigationId: 1,
      title: 'Test Investigation',
      status: 'open',
      appVersion: '19.5.0',
      exportLimits: { fileCountCap: 100, sizeLimitBytes: 1000 },
      evidenceIds: mockEvidenceIds,
      includedFiles: mockIncluded,
      skippedFiles: [],
    });

    expect(manifest.investigationId).toBe(1);
    expect(manifest.checksum).toBeDefined();
    expect(manifest.appVersion).toBe('19.5.0');
    expect(manifest.includedFiles).toHaveLength(2);
    // Ensure sorting in manifest
    // zipPath sorting: 'files/10/a.pdf' < 'files/5/b.pdf'
    expect(manifest.includedFiles[0].evidenceId).toBe(10);
  });
});
