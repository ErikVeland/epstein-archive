import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/services/exoActivityGovernor.js', () => ({
  throttleExoForUserActivity: vi.fn(),
}));
vi.mock('../server/services/Logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('EXO instance discovery', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('probes the loaded quantization instead of absent preferred catalog models', async () => {
    const model = 'mlx-community/Llama-3.2-3B-Instruct-4bit';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          instances: {
            live: { MlxRingInstance: { shardAssignments: { modelId: model } } },
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'OK' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const { AIEnrichmentService } = await import('../server/services/AIEnrichmentService.js');
    expect(
      await AIEnrichmentService.discoverCallableExoModels([
        'mlx-community/Llama-3.2-3B-Instruct-8bit',
      ]),
    ).toEqual([model]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/state$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe(model);
    expect(timeout).toHaveBeenLastCalledWith(30_000);
  });

  it('does not probe the downloadable catalog when no instance is loaded', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ instances: {} }));
    vi.stubGlobal('fetch', fetchMock);
    const { AIEnrichmentService } = await import('../server/services/AIEnrichmentService.js');
    expect(await AIEnrichmentService.discoverCallableExoModels()).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('supports older EXO servers without a state endpoint', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(Response.json({ data: [{ id: 'loaded' }] }))
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'OK' } }] }));
    vi.stubGlobal('fetch', fetchMock);
    const { AIEnrichmentService } = await import('../server/services/AIEnrichmentService.js');
    expect(await AIEnrichmentService.discoverCallableExoModels()).toEqual(['loaded']);
  });

  it('does not report a timed-out loaded instance as callable', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          instances: {
            live: { MlxRingInstance: { shardAssignments: { modelId: 'busy' } } },
          },
        }),
      )
      .mockRejectedValueOnce(new DOMException('Probe timed out', 'TimeoutError'));
    vi.stubGlobal('fetch', fetchMock);
    const { AIEnrichmentService } = await import('../server/services/AIEnrichmentService.js');
    expect(await AIEnrichmentService.discoverCallableExoModels()).toEqual([]);
  });

  it('waits for a completed response body even when EXO has sent HTTP 200 headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          instances: {
            live: { MlxRingInstance: { shardAssignments: { modelId: 'stalled' } } },
          },
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new DOMException('Body timed out', 'TimeoutError')),
      });
    vi.stubGlobal('fetch', fetchMock);
    const { AIEnrichmentService } = await import('../server/services/AIEnrichmentService.js');
    expect(await AIEnrichmentService.discoverCallableExoModels()).toEqual([]);
  });
});
