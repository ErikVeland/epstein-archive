import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const stylesheetPath = path.resolve(
  testDirectory,
  '../../src/client/features/media/MediaViewerModal.module.css',
);

describe('MediaViewerModal navigation controls', () => {
  it('keeps carousel buttons above the clickable image stage', () => {
    const stylesheet = fs.readFileSync(stylesheetPath, 'utf8');
    const navigationRule = stylesheet.match(/\.navButton\s*{(?<declarations>[^}]*)}/)?.groups?.[
      'declarations'
    ];

    expect(navigationRule).toBeDefined();
    expect(navigationRule).toContain('z-index: var(--z-above)');
  });
});
