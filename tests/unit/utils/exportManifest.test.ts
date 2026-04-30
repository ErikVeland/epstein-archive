import { describe, it, expect } from 'vitest';
import {
  buildManifestChecksum,
  buildManifest,
  buildEvidenceCsv,
  BUNDLE_README,
  buildBundleReadme,
} from '../../../src/server/utils/exportManifest';

// ---------------------------------------------------------------------------
// buildManifestChecksum
// ---------------------------------------------------------------------------

describe('buildManifestChecksum', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const checksum = buildManifestChecksum(
      [1, 2],
      [{ evidenceId: 1, fileName: 'a.pdf', sizeBytes: 100 }],
    );
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for the same input regardless of array ordering', () => {
    const files = [
      { evidenceId: 2, fileName: 'b.pdf', sizeBytes: 200 },
      { evidenceId: 1, fileName: 'a.pdf', sizeBytes: 100 },
    ];
    const c1 = buildManifestChecksum([2, 1], files);
    const c2 = buildManifestChecksum([1, 2], [...files].reverse());
    expect(c1).toBe(c2);
  });

  it('produces different checksums for different evidence sets', () => {
    const c1 = buildManifestChecksum([1], [{ evidenceId: 1, fileName: 'a.pdf', sizeBytes: 100 }]);
    const c2 = buildManifestChecksum([2], [{ evidenceId: 2, fileName: 'b.pdf', sizeBytes: 200 }]);
    expect(c1).not.toBe(c2);
  });

  it('handles empty evidence (no files exported)', () => {
    const checksum = buildManifestChecksum([], []);
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// buildManifest
// ---------------------------------------------------------------------------

describe('buildManifest', () => {
  const base = {
    investigationId: 42,
    title: 'Test Investigation',
    status: 'open',
    appVersion: '19.5.0',
    schemaHash: 'schema-test',
    exportLimits: { fileCountCap: 100, sizeLimitBytes: 524288000 },
    evidenceIds: [3, 1, 2],
    includedFiles: [
      { evidenceId: 3, fileName: 'c.pdf', sizeBytes: 300 },
      { evidenceId: 1, fileName: 'a.pdf', sizeBytes: 100 },
    ],
    skippedFiles: [{ evidenceId: 2, reason: 'file_not_found' as const }],
  };

  it('sorts evidenceIds ascending', () => {
    const manifest = buildManifest(base);
    expect(manifest.evidenceIds).toEqual([1, 2, 3]);
  });

  it('sorts includedFiles by evidenceId ascending', () => {
    const manifest = buildManifest(base);
    expect(manifest.includedFiles.map((f) => f.evidenceId)).toEqual([1, 3]);
  });

  it('sorts skippedFiles by evidenceId ascending', () => {
    const manifest = buildManifest({
      ...base,
      skippedFiles: [
        { evidenceId: 5, reason: 'size_limit' as const },
        { evidenceId: 2, reason: 'file_not_found' as const },
      ],
    });
    expect(manifest.skippedFiles.map((f) => f.evidenceId)).toEqual([2, 5]);
  });

  it('embeds a valid sha256 hex checksum', () => {
    const manifest = buildManifest(base);
    expect(manifest.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.checksumAlgorithm).toBe('sha256');
  });

  it('checksum matches independently computed value', () => {
    const manifest = buildManifest(base);
    const expected = buildManifestChecksum(manifest.evidenceIds, manifest.includedFiles);
    expect(manifest.checksum).toBe(expected);
  });

  it('records investigationId, title, status, appVersion, and schemaHash', () => {
    const manifest = buildManifest(base);
    expect(manifest.investigationId).toBe(42);
    expect(manifest.title).toBe('Test Investigation');
    expect(manifest.status).toBe('open');
    expect(manifest.appVersion).toBe('19.5.0');
    expect(manifest.schemaHash).toBe('schema-test');
  });

  it('sets generatedAt to a valid ISO timestamp', () => {
    const before = Date.now();
    const manifest = buildManifest(base);
    const after = Date.now();
    const ts = new Date(manifest.generatedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// buildEvidenceCsv
// ---------------------------------------------------------------------------

describe('buildEvidenceCsv', () => {
  it('returns a header row followed by data rows', () => {
    const csv = buildEvidenceCsv([
      {
        id: 1,
        type: 'document',
        title: 'Doc A',
        description: '',
        source_path: '/data/a.pdf',
        relevance: 'high',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,type,title,description,source_path,relevance');
    expect(lines[1]).toBe('1,document,Doc A,,/data/a.pdf,high');
  });

  it('quotes cells containing commas', () => {
    const csv = buildEvidenceCsv([
      {
        id: 2,
        type: 'email',
        title: 'Hello, World',
        description: '',
        source_path: '',
        relevance: '',
      },
    ]);
    expect(csv).toContain('"Hello, World"');
  });

  it('doubles internal quotes per RFC-4180', () => {
    const csv = buildEvidenceCsv([
      {
        id: 3,
        type: 'note',
        title: 'She said "hi"',
        description: '',
        source_path: '',
        relevance: '',
      },
    ]);
    expect(csv).toContain('"She said ""hi"""');
  });

  it('handles null and undefined cells as empty strings', () => {
    const csv = buildEvidenceCsv([{ id: 4 }]);
    const dataLine = csv.split('\n')[1];
    // id present; remaining five columns are empty
    expect(dataLine).toBe('4,,,,,');
    expect(dataLine).toContain('4');
  });

  it('returns only the header for an empty list', () => {
    const csv = buildEvidenceCsv([]);
    expect(csv).toBe('id,type,title,description,source_path,relevance');
  });
});

// ---------------------------------------------------------------------------
// Path traversal regression
// ---------------------------------------------------------------------------

describe('path traversal guard (sanity check)', () => {
  it('DATA_ROOT detection rejects parent-directory paths', () => {
    // This mirrors the exact guard in the route handler
    const DATA_ROOT = '/app/data';
    const sep = '/';

    const safe = '/app/data/corpus/file.pdf';
    const traversal = '/app/data/../secrets/key.pem';
    const resolved = (p: string) => {
      // Simulate path.resolve behaviour (simplified — good enough for the test)
      const parts: string[] = [];
      for (const seg of p.split('/')) {
        if (seg === '..') parts.pop();
        else if (seg && seg !== '.') parts.push(seg);
      }
      return '/' + parts.join('/');
    };

    const isInDataRoot = (raw: string) => {
      const abs = resolved(raw);
      return abs.startsWith(DATA_ROOT + sep) || abs.startsWith(DATA_ROOT + '/');
    };

    expect(isInDataRoot(safe)).toBe(true);
    expect(isInDataRoot(traversal)).toBe(false);
    expect(isInDataRoot('/etc/passwd')).toBe(false);
    expect(isInDataRoot('/app/data-other/file.pdf')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// README content
// ---------------------------------------------------------------------------

describe('BUNDLE_README', () => {
  it('documents the checksum algorithm', () => {
    expect(BUNDLE_README).toContain('SHA-256');
    expect(BUNDLE_README).toContain('manifest.json');
  });

  it('lists all expected bundle files', () => {
    for (const f of [
      'README.md',
      'investigation.json',
      'evidence.json',
      'evidence.csv',
      'timeline.json',
      'files/',
    ]) {
      // README doesn't list itself, but the others should be there
      if (f !== 'README.md') {
        expect(BUNDLE_README).toContain(f);
      }
    }
  });

  it('adds generated chain-of-custody metadata', () => {
    const readme = buildBundleReadme({
      appVersion: '20.0.0',
      schemaHash: 'abc123',
      generatedAt: '2026-04-29T00:00:00.000Z',
    });

    expect(readme).toContain('Chain of Custody');
    expect(readme).toContain('20.0.0');
    expect(readme).toContain('abc123');
    expect(readme).toContain('2026-04-29T00:00:00.000Z');
  });
});
