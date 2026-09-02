import { describe, expect, it } from 'vitest';
import {
  currentDateInTimeZone,
  validateReleaseMetadata,
  type ReleaseMetadataInput,
} from '../../scripts/release_metadata_guard';

const baseNotes = `# Release Notes

## 22.2.0 - 2026-08-27 - Evidence Hypertext Library

### Search

- Added evidence-addressable search.
`;

const currentNotes = `# Release Notes

## 22.3.0 - 2026-09-02 - Mobile Reader and Release Integrity

### Mobile experience

- Improved the mobile document reader.
`;

function input(overrides: Partial<ReleaseMetadataInput> = {}): ReleaseMetadataInput {
  return {
    currentVersion: '22.3.0',
    baseVersion: '22.2.0',
    currentNotes,
    baseNotes,
    expectedDate: '2026-09-02',
    ...overrides,
  };
}

describe('release metadata deployment guard', () => {
  it('accepts a new version with current structured release notes', () => {
    expect(validateReleaseMetadata(input())).toEqual([]);
  });

  it('blocks reuse of the deployed version and notes', () => {
    const errors = validateReleaseMetadata(
      input({ currentVersion: '22.2.0', currentNotes: baseNotes }),
    );

    expect(errors).toContain(
      'package.json version must increase for every deployment; 22.2.0 is not greater than 22.2.0',
    );
    expect(errors).toContain('release_notes.md must change for every deployment');
  });

  it('blocks a version bump when the top release entry does not match', () => {
    const errors = validateReleaseMetadata(input({ currentNotes: baseNotes }));

    expect(errors).toContain('release_notes.md must change for every deployment');
    expect(errors).toContain('top release-note version 22.2.0 does not match package.json 22.3.0');
  });

  it('blocks stale release dates and empty release bodies', () => {
    const errors = validateReleaseMetadata(
      input({
        currentNotes: `# Release Notes

## 22.3.0 - 2026-09-01 - UI
`,
      }),
    );

    expect(errors).toContain(
      'top release-note date must be 2026-09-02 (Australia/Brisbane); found 2026-09-01',
    );
    expect(errors).toContain('top release note must contain at least one named section');
    expect(errors).toContain('top release note must contain at least one change bullet');
  });

  it('uses the repository release timezone', () => {
    expect(currentDateInTimeZone(new Date('2026-09-01T14:30:00Z'))).toBe('2026-09-02');
  });
});
