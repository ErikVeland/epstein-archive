// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import Footer from '../client/components/layout/Footer';
import { apiClient } from '../client/services/apiClient';
vi.mock('../client/contexts/SensitiveSettingsContext', () => ({
  useSensitiveSettings: () => ({
    showAllSensitive: false,
    toggleShowAllSensitive: () => undefined,
  }),
}));
vi.stubGlobal('__APP_VERSION__', 'test');
vi.stubGlobal('__BUILD_DATE__', '2026-11-05');
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
afterAll(() => vi.unstubAllGlobals());
afterEach(() => vi.restoreAllMocks());

describe('footer readiness', () => {
  it.each([true, false])(
    'uses live readiness counts without archive statistics (data=%s)',
    async (hasData) => {
      vi.spyOn(apiClient, 'readinessCheck').mockResolvedValue({
        status: 'ok',
        checks: {
          db: { ok: true },
          data: { entities: hasData ? 42 : 0, documents: hasData ? 100 : 0 },
        },
      } as never);
      const statistics = vi
        .spyOn(apiClient, 'getStats')
        .mockResolvedValue({ totalEntities: 42, totalDocuments: 100 } as never);
      const container = document.createElement('div');
      const root = createRoot(container);
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      try {
        await act(async () =>
          root.render(
            <QueryClientProvider client={client}>
              <MemoryRouter>
                <Footer />
              </MemoryRouter>
            </QueryClientProvider>,
          ),
        );
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });
        expect(statistics).not.toHaveBeenCalled();
        expect(container.textContent).toContain(
          hasData ? 'Live Data Available' : 'Limited Live Data',
        );
      } finally {
        await act(async () => root.unmount());
        client.clear();
      }
    },
  );
});
