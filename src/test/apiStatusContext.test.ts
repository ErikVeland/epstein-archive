/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_HEALTH_POLL_INTERVAL_MS, API_LIVENESS_PATH } from '@client/contexts/apiStatusConfig';
import { ApiStatusProvider, useApiStatus } from '@client/contexts/ApiStatusContext';

const successfulHealthResponse = (): Response =>
  ({
    ok: true,
    status: 200,
  }) as Response;

describe('ApiStatusProvider', () => {
  let container: HTMLDivElement;
  let root: Root;

  const StatusProbe = (): React.ReactElement => {
    const { status } = useApiStatus();
    return React.createElement('span', null, status);
  };

  const renderProvider = async (): Promise<void> => {
    await act(async () => {
      root.render(React.createElement(ApiStatusProvider, null, React.createElement(StatusProbe)));
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('uses the lightweight liveness route and keeps a healthy state during polling', async () => {
    let resolveSecondCheck: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(successfulHealthResponse())
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecondCheck = resolve;
          }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();

    expect(fetchMock).toHaveBeenCalledWith(
      API_LIVENESS_PATH,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(container.textContent).toBe('up');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(API_HEALTH_POLL_INTERVAL_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('up');

    await act(async () => {
      resolveSecondCheck?.(successfulHealthResponse());
      await Promise.resolve();
    });

    expect(container.textContent).toBe('up');
  });

  it('ignores one transient failure before reporting the API as unavailable', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(successfulHealthResponse())
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockRejectedValueOnce(new Error('sustained failure'));
    vi.stubGlobal('fetch', fetchMock);

    await renderProvider();
    expect(container.textContent).toBe('up');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(API_HEALTH_POLL_INTERVAL_MS);
    });
    expect(container.textContent).toBe('up');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(API_HEALTH_POLL_INTERVAL_MS);
    });
    expect(container.textContent).toBe('down');
  });
});
