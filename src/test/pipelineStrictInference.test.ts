import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIEnrichmentService } from '../server/services/AIEnrichmentService.js';
const internal = AIEnrichmentService as unknown as { callLLM: () => Promise<string> };
beforeEach(() => {
  vi.stubEnv('ENABLE_AI_ENRICHMENT', 'true');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('strict corpus inference', () => {
  it('retains transport failures rather than counting empty successful extraction', async () => {
    vi.stubEnv('PIPELINE_STRICT_AI', 'true');
    vi.spyOn(internal, 'callLLM').mockRejectedValue(new Error('fetch failed'));
    await expect(
      AIEnrichmentService.extractTimelineEvents('a'.repeat(120), 'test.pdf'),
    ).rejects.toThrow('fetch failed');
  });
  it('retains malformed output as a failure', async () => {
    vi.stubEnv('PIPELINE_STRICT_AI', 'true');
    vi.spyOn(internal, 'callLLM').mockResolvedValue('not JSON');
    await expect(
      AIEnrichmentService.extractTimelineEvents('a'.repeat(120), 'test.pdf'),
    ).rejects.toThrow('Unparseable');
  });
  it('accepts a valid empty extraction result', async () => {
    vi.stubEnv('PIPELINE_STRICT_AI', 'true');
    vi.spyOn(internal, 'callLLM').mockResolvedValue('[]');
    await expect(
      AIEnrichmentService.extractTimelineEvents('a'.repeat(120), 'test.pdf'),
    ).resolves.toEqual([]);
  });
  it('preserves the existing best-effort API behaviour', async () => {
    vi.stubEnv('PIPELINE_STRICT_AI', 'false');
    vi.spyOn(internal, 'callLLM').mockRejectedValue(new Error('fetch failed'));
    await expect(
      AIEnrichmentService.extractTimelineEvents('a'.repeat(120), 'test.pdf'),
    ).resolves.toEqual([]);
  });
});
