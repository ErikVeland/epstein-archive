// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReviewDashboard } from '../client/pages/ReviewDashboard';
import { ToastCtx } from '../client/components/common/toastContext';
import { apiClient, ApiResponseError } from '../client/services/apiClient';

describe('review queue failure states', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the active queue visible when an older tab request fails later', async () => {
    let rejectFirst: (error: Error) => void = () => undefined;
    vi.spyOn(apiClient, 'get')
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue([]);
    const container = document.createElement('div');
    const root = createRoot(container);
    const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () =>
        root.render(
          <MemoryRouter>
            <ToastCtx.Provider value={{ addToast: () => undefined }}>
              <ReviewDashboard />
            </ToastCtx.Provider>
          </MemoryRouter>,
        ),
      );
      const claims = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Claims & Facts'),
      );
      expect(claims).toBeDefined();
      await act(async () => claims!.click());
      expect(container.textContent).toContain('Queue is Empty');
      await act(async () =>
        rejectFirst(new ApiResponseError('Old request failed', { status: 500 })),
      );
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.textContent).toContain('Queue is Empty');
    } finally {
      await act(async () => root.unmount());
      delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    }
  });

  it.each([401, 403, 500])(
    'does not claim that the queue is empty after HTTP %s',
    async (status) => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(
        new ApiResponseError('Request failed', { status }),
      );
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const container = document.createElement('div');
      const root = createRoot(container);
      const actEnvironment = globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      };
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
      try {
        await act(async () =>
          root.render(
            <MemoryRouter>
              <ToastCtx.Provider value={{ addToast: () => undefined }}>
                <ReviewDashboard />
              </ToastCtx.Provider>
            </MemoryRouter>,
          ),
        );
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        expect(container.textContent).not.toContain('Queue is Empty');
        if (status === 401 || status === 403)
          expect(container.textContent).toContain('administrator');
        else expect(container.textContent).toContain('Try again');
      } finally {
        await act(async () => root.unmount());
        delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
      }
    },
  );
});
