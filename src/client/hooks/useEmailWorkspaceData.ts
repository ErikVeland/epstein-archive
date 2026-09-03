import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  apiClient,
  EmailMailboxDTO,
  EmailMessageBodyDTO,
  EmailThreadDTO,
  EmailThreadDetailsDTO,
} from '@client/services/apiClient';

const THREAD_PAGE_SIZE = 50;

export type BodyState = {
  loading: boolean;
  error: string | null;
  data: EmailMessageBodyDTO | null;
  showRaw: boolean;
  raw: string | null;
  showQuoted: boolean;
};

const formatUiError = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const maybe = errorObj.message || errorObj.error || errorObj.detail;
    if (typeof maybe === 'string' && maybe.trim()) return maybe;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

interface UseEmailWorkspaceDataOptions {
  searchParams: URLSearchParams;
  deepLinkedMessageId: string | null;
  selectedMailboxId: string;
  activeTab: 'all' | 'primary' | 'updates' | 'promotions';
  debouncedSearch: string;
  fromFilter: string;
  toFilter: string;
  dateFrom: string;
  dateTo: string;
  hasAttachmentsOnly: boolean;
  minRisk: number;
  showSuppressedJunk: boolean;
  showYahooPostMortem: boolean;
  showEmptyBodies: boolean;
  topic: string;
  collection: 'all' | 'curated';
  sortBy: string;
  sortOrder: string;
  updateUrlState: (updates: Record<string, string | null>) => void;
}

export function useEmailWorkspaceData({
  searchParams,
  deepLinkedMessageId,
  selectedMailboxId,
  activeTab,
  debouncedSearch,
  fromFilter,
  toFilter,
  dateFrom,
  dateTo,
  hasAttachmentsOnly,
  minRisk,
  showSuppressedJunk,
  showYahooPostMortem,
  showEmptyBodies,
  topic,
  collection,
  sortBy,
  sortOrder,
  updateUrlState,
}: UseEmailWorkspaceDataOptions) {
  const {
    data: mailboxesData,
    isLoading: mailboxesLoading,
    error: mailboxesQueryError,
  } = useQuery<EmailMailboxDTO[]>({
    queryKey: ['email-mailboxes', showSuppressedJunk],
    queryFn: async () => {
      const response = await apiClient.getEmailMailboxes({ showSuppressedJunk });
      return response.data;
    },
    staleTime: 30_000,
  });

  const mailboxes = mailboxesData ?? [];
  const mailboxesError = mailboxesQueryError
    ? formatUiError(mailboxesQueryError, 'Failed to load mailboxes')
    : null;

  const [threads, setThreads] = useState<EmailThreadDTO[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadsHasMore, setThreadsHasMore] = useState(false);
  const [threadsNextCursor, setThreadsNextCursor] = useState<string | null>(null);
  const [threadsTotal, setThreadsTotal] = useState(0);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    searchParams.get('threadId') || null,
  );
  const [threadDetails, setThreadDetails] = useState<Record<string, EmailThreadDetailsDTO>>({});
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);

  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [bodyState, setBodyState] = useState<Record<string, BodyState>>({});
  const autoOpenedThreadRef = useRef<string | null>(null);
  const limiterRef = useRef({ active: 0, queue: [] as Array<() => void> });

  // Deselect thread if selected mailbox no longer contains it
  useEffect(() => {
    if (!mailboxesData) return;
    if (!mailboxesData.some((mailbox) => mailbox.mailboxId === selectedMailboxId)) {
      setSelectedThreadId(null);
    }
  }, [mailboxesData, selectedMailboxId]);

  const withBodyLimiter = useCallback(async (task: () => Promise<void>) => {
    await new Promise<void>((resolve, reject) => {
      const run = () => {
        limiterRef.current.active += 1;
        task()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            limiterRef.current.active -= 1;
            const next = limiterRef.current.queue.shift();
            if (next) next();
          });
      };

      if (limiterRef.current.active < 3) run();
      else limiterRef.current.queue.push(run);
    });
  }, []);

  const loadThreads = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!append) {
        setThreadsLoading(true);
        setThreadsError(null);
      } else {
        setLoadingMoreThreads(true);
      }

      try {
        const response = await apiClient.getEmailThreads({
          mailboxId: selectedMailboxId,
          q: debouncedSearch,
          tab: activeTab,
          from: fromFilter.trim() || undefined,
          to: toFilter.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          hasAttachments: hasAttachmentsOnly || undefined,
          minRisk: minRisk > 0 ? minRisk : undefined,
          cursor,
          limit: THREAD_PAGE_SIZE,
          showSuppressedJunk,
          showYahooPostMortem,
          showEmptyBodies,
          topic: topic || undefined,
          collection,
          sortBy,
          sortOrder,
        });

        setThreads((prev) => (append ? [...prev, ...response.data] : response.data));
        setThreadsHasMore(response.meta.hasMore);
        setThreadsNextCursor(response.meta.nextCursor);
        setThreadsTotal(response.meta.total);

        if (
          !append &&
          selectedThreadId &&
          !response.data.find((thread) => thread.threadId === selectedThreadId)
        ) {
          setSelectedThreadId(null);
        }
      } catch (error) {
        console.error(error);
        setThreadsError(formatUiError(error, 'Failed to load threads'));
        if (!append) {
          setThreads([]);
          setThreadsHasMore(false);
          setThreadsNextCursor(null);
          setThreadsTotal(0);
        }
      } finally {
        setThreadsLoading(false);
        setLoadingMoreThreads(false);
      }
    },
    [
      activeTab,
      dateFrom,
      dateTo,
      debouncedSearch,
      fromFilter,
      hasAttachmentsOnly,
      minRisk,
      selectedMailboxId,
      selectedThreadId,
      showSuppressedJunk,
      showYahooPostMortem,
      showEmptyBodies,
      toFilter,
      topic,
      collection,
      sortBy,
      sortOrder,
    ],
  );

  const loadThread = useCallback(
    async (threadId: string) => {
      if (threadDetails[threadId]) return;
      setThreadLoading(true);
      setThreadError(null);
      try {
        const detail = await apiClient.getEmailThread(threadId);
        setThreadDetails((prev) => ({ ...prev, [threadId]: detail }));
      } catch (error) {
        console.error(error);
        setThreadError(formatUiError(error, 'Failed to load thread'));
      } finally {
        setThreadLoading(false);
      }
    },
    [threadDetails],
  );

  const loadMessageBody = useCallback(
    async (messageId: string, showQuoted: boolean = false) => {
      const state = bodyState[messageId];
      if (state?.loading) return;
      if (state?.data && state.showQuoted === showQuoted) return;

      setBodyState((prev) => ({
        ...prev,
        [messageId]: {
          loading: true,
          error: null,
          data: prev[messageId]?.data || null,
          showRaw: prev[messageId]?.showRaw || false,
          raw: prev[messageId]?.raw || null,
          showQuoted,
        },
      }));

      await withBodyLimiter(async () => {
        try {
          const body = await apiClient.getEmailMessageBody(messageId, { showQuoted });
          setBodyState((prev) => ({
            ...prev,
            [messageId]: {
              loading: false,
              error: null,
              data: body,
              showRaw: prev[messageId]?.showRaw || false,
              raw: prev[messageId]?.raw || null,
              showQuoted,
            },
          }));
        } catch (error) {
          setBodyState((prev) => ({
            ...prev,
            [messageId]: {
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to load message body',
              data: prev[messageId]?.data || null,
              showRaw: prev[messageId]?.showRaw || false,
              raw: prev[messageId]?.raw || null,
              showQuoted,
            },
          }));
        }
      });
    },
    [bodyState, withBodyLimiter],
  );

  const handleOpenThread = useCallback(
    (threadId: string) => {
      autoOpenedThreadRef.current = null;
      setSelectedThreadId(threadId);
      setExpandedMessages({});
      updateUrlState({ threadId, messageId: null });
      void loadThread(threadId);
    },
    [loadThread, updateUrlState],
  );

  const handleToggleMessage = useCallback(
    (messageId: string, expanded: boolean) => {
      setExpandedMessages((prev) => ({ ...prev, [messageId]: expanded }));
      updateUrlState({ messageId: expanded ? messageId : null });
      if (expanded) {
        void loadMessageBody(messageId, bodyState[messageId]?.showQuoted || false);
      }
    },
    [bodyState, loadMessageBody, updateUrlState],
  );

  const handleToggleRaw = useCallback(
    async (messageId: string) => {
      const state = bodyState[messageId];
      if (!state) return;

      if (!state.raw) {
        try {
          const raw = await apiClient.getEmailRawMessage(messageId);
          setBodyState((prev) => ({
            ...prev,
            [messageId]: {
              ...(prev[messageId] || state),
              showRaw: !(prev[messageId]?.showRaw || false),
              raw: raw.raw,
            },
          }));
        } catch (error) {
          setBodyState((prev) => ({
            ...prev,
            [messageId]: {
              ...(prev[messageId] || state),
              error: error instanceof Error ? error.message : 'Failed to load raw MIME',
            },
          }));
        }
        return;
      }

      setBodyState((prev) => ({
        ...prev,
        [messageId]: {
          ...(prev[messageId] || state),
          showRaw: !(prev[messageId]?.showRaw || false),
        },
      }));
    },
    [bodyState],
  );

  const handleToggleQuoted = useCallback(
    (messageId: string) => {
      const showQuoted = !(bodyState[messageId]?.showQuoted || false);
      void loadMessageBody(messageId, showQuoted);
    },
    [bodyState, loadMessageBody],
  );

  const selectedThread = selectedThreadId ? threadDetails[selectedThreadId] || null : null;

  useEffect(() => {
    updateUrlState({
      mailboxId: selectedMailboxId,
      tab: activeTab,
      q: debouncedSearch || null,
      from: fromFilter.trim() || null,
      to: toFilter.trim() || null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      hasAttachments: hasAttachmentsOnly ? '1' : null,
      minRisk: minRisk > 0 ? String(minRisk) : null,
      showYahooPostMortem: showYahooPostMortem ? null : '0',
      showEmptyBodies: showEmptyBodies ? null : '0',
      topic: topic || null,
      collection: collection === 'all' ? 'all' : null,
      sortBy: sortBy !== 'date' ? sortBy : null,
      sortOrder: sortOrder !== 'desc' ? sortOrder : null,
    });
    void loadThreads(null, false);
  }, [
    activeTab,
    dateFrom,
    dateTo,
    debouncedSearch,
    fromFilter,
    hasAttachmentsOnly,
    loadThreads,
    minRisk,
    selectedMailboxId,
    showYahooPostMortem,
    showEmptyBodies,
    toFilter,
    topic,
    collection,
    sortBy,
    sortOrder,
    updateUrlState,
  ]);

  useEffect(() => {
    if (!selectedThreadId) return;
    void loadThread(selectedThreadId);
  }, [selectedThreadId, loadThread]);

  useEffect(() => {
    if (!deepLinkedMessageId || selectedThreadId) return;
    let cancelled = false;
    (async () => {
      try {
        const resolved = await apiClient.getEmailThreadForMessage(deepLinkedMessageId);
        if (cancelled) return;
        setSelectedThreadId(resolved.threadId);
        setExpandedMessages((prev) => ({ ...prev, [deepLinkedMessageId]: true }));
        updateUrlState({ threadId: resolved.threadId, messageId: deepLinkedMessageId });
      } catch {
        void 0;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deepLinkedMessageId, selectedThreadId, updateUrlState]);

  useEffect(() => {
    if (!selectedThreadId || !selectedThread) return;
    if (searchParams.get('messageId')) return;
    if (autoOpenedThreadRef.current === selectedThreadId) return;

    const lastMessage = selectedThread.messages[selectedThread.messages.length - 1];
    if (!lastMessage?.messageId) return;

    autoOpenedThreadRef.current = selectedThreadId;
    setExpandedMessages((prev) => ({ ...prev, [lastMessage.messageId]: true }));
    updateUrlState({ messageId: lastMessage.messageId });
    void loadMessageBody(
      lastMessage.messageId,
      bodyState[lastMessage.messageId]?.showQuoted || false,
    );
  }, [bodyState, loadMessageBody, searchParams, selectedThread, selectedThreadId, updateUrlState]);

  useEffect(() => {
    const messageId = searchParams.get('messageId');
    if (!messageId || !selectedThread) return;
    const hasMessage = selectedThread.messages.some((message) => message.messageId === messageId);
    if (!hasMessage) return;
    setExpandedMessages((prev) => ({ ...prev, [messageId]: true }));
    void loadMessageBody(messageId, bodyState[messageId]?.showQuoted || false);
  }, [bodyState, loadMessageBody, searchParams, selectedThread]);

  return {
    mailboxes,
    mailboxesLoading,
    mailboxesError,
    threads,
    threadsLoading,
    threadsError,
    threadsHasMore,
    threadsNextCursor,
    threadsTotal,
    loadingMoreThreads,
    selectedThreadId,
    setSelectedThreadId,
    selectedThread,
    threadLoading,
    threadError,
    expandedMessages,
    bodyState,
    setExpandedMessages,
    loadThreads,
    loadMessageBody,
    handleOpenThread,
    handleToggleMessage,
    handleToggleRaw,
    handleToggleQuoted,
  };
}
