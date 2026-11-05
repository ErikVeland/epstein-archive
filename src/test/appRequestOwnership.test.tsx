// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client/services/apiClient';
import { useAppBootstrap } from '../client/app/orchestration/useAppBootstrap';
import {
  InvestigationsProvider,
  useInvestigations,
} from '../client/contexts/InvestigationsContext';

vi.mock('../client/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', username: 'Reviewer', role: 'admin' },
    isAuthenticated: true,
  }),
}));
vi.mock('../client/contexts/ApiStatusContext', () => ({ useApiStatus: () => ({ status: 'up' }) }));
afterEach(() => vi.restoreAllMocks());

async function mount(element: React.ReactElement) {
  const container = document.createElement('div');
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(<QueryClientProvider client={client}>{element}</QueryClientProvider>),
  );
  return {
    container,
    render: async (next: React.ReactElement) =>
      act(async () =>
        root.render(<QueryClientProvider client={client}>{next}</QueryClientProvider>),
      ),
    close: async () => {
      await act(async () => root.unmount());
      client.clear();
    },
  };
}

function StatsProbe({ pathname }: { pathname: string }) {
  const { dataStats } = useAppBootstrap({ apiEnabled: true, pathname });
  return <span>{dataStats.totalPeople}</span>;
}

describe('route-owned application requests', () => {
  it.each(['/emails', '/network', '/intelligence'])(
    'does not preload people data from %s',
    async (pathname) => {
      const entities = vi.spyOn(apiClient, 'getEntities').mockResolvedValue({ data: [] } as never);
      const stats = vi
        .spyOn(apiClient, 'getStats')
        .mockResolvedValue({ totalEntities: 42 } as never);
      const view = await mount(<StatsProbe pathname={pathname} />);
      try {
        expect(entities).not.toHaveBeenCalled();
        expect(stats).not.toHaveBeenCalled();
        await view.render(<StatsProbe pathname="/people" />);
        expect(stats).toHaveBeenCalledTimes(1);
        expect(entities).not.toHaveBeenCalled();
      } finally {
        await view.close();
      }
    },
  );

  it('does not load case choices on mount and shares simultaneous requests from case actions', async () => {
    let load!: () => Promise<unknown>;
    function Probe() {
      const value = useInvestigations();
      useEffect(() => {
        load = value.loadInvestigations;
      }, [value]);
      return null;
    }
    let finish!: (value: never) => void;
    const requests = vi.spyOn(apiClient, 'getInvestigations').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const view = await mount(
      <InvestigationsProvider>
        <Probe />
      </InvestigationsProvider>,
    );
    try {
      expect(requests).not.toHaveBeenCalled();
      let first!: Promise<unknown>;
      let second!: Promise<unknown>;
      await act(async () => {
        first = load();
        second = load();
      });
      expect(requests).toHaveBeenCalledTimes(1);
      await act(async () => {
        finish({ data: [] } as never);
        await Promise.all([first, second]);
      });
    } finally {
      await view.close();
    }
  });

  it('reports a failed case load and lets the next action retry', async () => {
    let load!: () => Promise<unknown>;
    function Probe() {
      const context = useInvestigations();
      useEffect(() => {
        load = context.loadInvestigations;
      }, [context]);
      return <span>{context.error}</span>;
    }
    const requests = vi
      .spyOn(apiClient, 'getInvestigations')
      .mockRejectedValueOnce(new Error('Case list unavailable'))
      .mockResolvedValue({ data: [] } as never);
    const view = await mount(
      <InvestigationsProvider>
        <Probe />
      </InvestigationsProvider>,
    );
    try {
      await act(async () => {
        await expect(load()).rejects.toThrow('Case list unavailable');
      });
      expect(view.container.textContent).toBe('Case list unavailable');
      await act(async () => {
        await expect(load()).resolves.toEqual([]);
      });
      expect(requests).toHaveBeenCalledTimes(2);
      expect(view.container.textContent).toBe('');
    } finally {
      await view.close();
    }
  });
  it('keeps a successfully created case without requiring a list refresh', async () => {
    let context!: ReturnType<typeof useInvestigations>;
    function Probe() {
      const value = useInvestigations();
      useEffect(() => {
        context = value;
      }, [value]);
      return null;
    }
    vi.spyOn(apiClient, 'createInvestigation').mockResolvedValue({
      id: 123,
      title: 'New case',
      status: 'open',
      createdAt: '2026-11-05',
      updatedAt: '2026-11-05',
    } as never);
    const requests = vi
      .spyOn(apiClient, 'getInvestigations')
      .mockRejectedValue(new Error('List unavailable'));
    const view = await mount(
      <InvestigationsProvider>
        <Probe />
      </InvestigationsProvider>,
    );
    try {
      await act(async () => {
        await expect(
          context.createInvestigation({
            title: 'New case',
            description: '',
            hypothesis: '',
            status: 'active',
            leadInvestigator: '1',
            priority: 'medium',
          }),
        ).resolves.toMatchObject({ id: '123' });
      });
      expect(requests).not.toHaveBeenCalled();
      expect(context.investigations).toHaveLength(1);
      expect(context.investigations[0].id).toBe('123');
    } finally {
      await view.close();
    }
  });
});
