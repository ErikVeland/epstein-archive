// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client/services/apiClient';
import { useEmailWorkspaceData } from '../client/hooks/useEmailWorkspaceData';

afterEach(() => vi.restoreAllMocks());

describe('email body requests', () => {
  it.each([false, true])(
    'stops automatic requests and allows a retry with cached body=%s',
    async (hasCachedBody) => {
      vi.spyOn(apiClient, 'getEmailMailboxes').mockResolvedValue({
        data: [{ mailboxId: 'all', displayName: 'All' }],
      } as Awaited<ReturnType<typeof apiClient.getEmailMailboxes>>);
      vi.spyOn(apiClient, 'getEmailThreads').mockResolvedValue({
        data: [{ threadId: 'thread-1' }],
        meta: { hasMore: false, nextCursor: null, total: 1 },
      } as Awaited<ReturnType<typeof apiClient.getEmailThreads>>);
      vi.spyOn(apiClient, 'getEmailThread').mockResolvedValue({
        threadId: 'thread-1',
        subject: 'Synthetic thread',
        messages: [{ messageId: '42' }],
      } as Awaited<ReturnType<typeof apiClient.getEmailThread>>);
      const bodyRequest = vi.spyOn(apiClient, 'getEmailMessageBody');
      if (hasCachedBody)
        bodyRequest.mockResolvedValueOnce({ cleanedText: 'Synthetic body' } as Awaited<
          ReturnType<typeof apiClient.getEmailMessageBody>
        >);
      bodyRequest
        .mockRejectedValueOnce(new Error('Unavailable'))
        .mockImplementation(() => new Promise(() => undefined));
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const container = document.createElement('div');
      const root = createRoot(container);
      let workspace: ReturnType<typeof useEmailWorkspaceData>;
      const options: Parameters<typeof useEmailWorkspaceData>[0] = {
        searchParams: new URLSearchParams('threadId=thread-1&messageId=42'),
        deepLinkedMessageId: null,
        selectedMailboxId: 'all',
        activeTab: 'all',
        debouncedSearch: '',
        fromFilter: '',
        toFilter: '',
        dateFrom: '',
        dateTo: '',
        hasAttachmentsOnly: false,
        minRisk: 0,
        showSuppressedJunk: false,
        showYahooPostMortem: false,
        showEmptyBodies: false,
        topic: '',
        collection: 'all',
        sortBy: 'date',
        sortOrder: 'desc',
        updateUrlState: () => undefined,
      };
      function Harness() {
        workspace = useEmailWorkspaceData(options);
        return <span>{workspace.bodyState['42']?.error}</span>;
      }
      const actEnvironment = globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      };
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
      try {
        await act(async () => {
          root.render(
            <QueryClientProvider client={queryClient}>
              <Harness />
            </QueryClientProvider>,
          );
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        if (hasCachedBody) {
          await act(async () => workspace!.handleToggleQuoted('42'));
        }
        const expectedRequests = hasCachedBody ? 2 : 1;
        expect(bodyRequest).toHaveBeenCalledTimes(expectedRequests);
        expect(container.textContent).toContain('Unavailable');
        await act(async () => workspace!.handleToggleMessage('42', true));
        expect(bodyRequest).toHaveBeenCalledTimes(expectedRequests + 1);
      } finally {
        await act(async () => root.unmount());
        queryClient.clear();
        delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
      }
    },
  );
});
