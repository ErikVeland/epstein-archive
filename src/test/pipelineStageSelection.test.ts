import { afterEach, describe, expect, it } from 'vitest';
import { stagesForMode, UNIFIED_STAGES } from '../../scripts/pipeline/stages.js';
const originalArgs = [...process.argv];
afterEach(() => {
  process.argv = [...originalArgs];
});
describe('corpus pass stage coverage', () => {
  it('includes all registered workloads in a corpus pass', () => {
    process.argv = [...originalArgs, '--corpus-pass'];
    expect(stagesForMode('full').map((stage) => stage.name)).toEqual(
      UNIFIED_STAGES.map((stage) => stage.name),
    );
  });
  it('extracts embedded assets before analysing them', () => {
    const stages = stagesForMode('backfill').map((stage) => stage.name);
    expect(stages.indexOf('media-extraction')).toBeLessThan(stages.indexOf('vlm-visuals'));
  });
});
