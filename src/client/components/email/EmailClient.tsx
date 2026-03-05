import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './EmailClient.css';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Folder,
  Loader2,
  Mail,
  Paperclip,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {
  apiClient,
  EmailMailboxDTO,
  EmailMessageBodyDTO,
  EmailThreadDTO,
  EmailThreadDetailsDTO,
} from '../../services/apiClient';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { EvidenceModal } from '../common/EvidenceModal';
import { ViewerShell } from '../viewer/ViewerShell';
import { riskToneFromRating } from '../../utils/riskSemantics';
import { useFilters } from '../../contexts/useFilters';

const THREAD_PAGE_SIZE = 50;
type EmailDensity = 'comfortable' | 'compact';

const tabOptions: Array<{ id: 'all' | 'primary' | 'updates' | 'promotions'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'updates', label: 'Updates' },
  { id: 'promotions', label: 'Promotions' },
];

type BodyState = {
  loading: boolean;
  error: string | null;
  data: EmailMessageBodyDTO | null;
  showRaw: boolean;
  raw: string | null;
  showQuoted: boolean;
};

const ladderTone = (ladder: string | null): string => {
  const value = (ladder || '').toLowerCase();
  if (value.includes('direct')) return 'text-emerald-300 border-emerald-500/60 bg-emerald-600/15';
  if (value.includes('infer')) return 'text-amber-300 border-amber-500/60 bg-amber-600/15';
  if (value.includes('agentic')) return 'text-fuchsia-300 border-fuchsia-500/60 bg-fuchsia-600/15';
  return 'text-slate-300 border-slate-600/60 bg-slate-700/30';
};

const riskTone = (risk: number | null): string => {
  return riskToneFromRating(risk).className;
};

const formatTime = (value: string | null): string => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const age = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (age < oneDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (age < oneDay * 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const copyText = async (value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures.
  }
};

const formatUiError = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const maybe = (error as any).message || (error as any).error || (error as any).detail;
    if (typeof maybe === 'string' && maybe.trim()) return maybe;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const ThreadRow = React.memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<{
    rows: EmailThreadDTO[];
    selectedThreadId: string | null;
    onOpen: (threadId: string) => void;
    density: EmailDensity;
  }>) => {
    const thread = data.rows[index];
    const selected = data.selectedThreadId === thread.threadId;
    const compact = data.density === 'compact';

    return (
      <button
        style={style}
        onClick={() => data.onOpen(thread.threadId)}
        data-thread-id={thread.threadId}
        data-testid="email-thread-row"
        className={`w-full text-left email-row ${compact ? 'py-2' : 'py-3'} px-5 focus:outline-none ${
          selected ? 'active' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-slate-100 truncate tracking-tight">
              {thread.subject}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
              {thread.participants.slice(0, 3).join(' · ') || 'Unknown participants'}
            </div>
            {!compact && thread.snippet && (
              <div className="text-[11px] text-slate-500 truncate mt-1 leading-normal">
                {thread.snippet}
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {formatTime(thread.lastMessageAt)}
            </div>
            <div className="mt-1.5 flex items-center justify-end gap-1.5">
              {thread.hasAttachments && <Paperclip className="w-3 h-3 text-amber-400/80" />}
              <span
                className={`px-1 rounded-[4px] border border-white/5 text-[9px] font-black ${riskTone(thread.risk)}`}
              >
                R{thread.risk ?? '0'}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  },
);

const MailboxRow = React.memo(
  ({
    index,
    style,
    data,
  }: ListChildComponentProps<{
    rows: EmailMailboxDTO[];
    selectedMailboxId: string;
    onSelect: (mailboxId: string) => void;
  }>) => {
    const mailbox = data.rows[index];
    const active = mailbox.mailboxId === data.selectedMailboxId;
    return (
      <button
        style={style}
        onClick={() => data.onSelect(mailbox.mailboxId)}
        className={`w-full email-row py-3 px-4 focus:outline-none ${active ? 'active' : ''}`}
      >
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-slate-100 truncate tracking-tight">
              {mailbox.displayName}
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              {mailbox.totalThreads.toLocaleString()} THREADS
            </div>
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">
            {formatTime(mailbox.lastActivityAt)}
          </div>
        </div>
      </button>
    );
  },
);

export const EmailClient: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedMessageId = searchParams.get('messageId') || searchParams.get('id');
  const { filters: globalFilters } = useFilters();

  const [mailboxes, setMailboxes] = useState<EmailMailboxDTO[]>([]);
  const [mailboxesLoading, setMailboxesLoading] = useState(true);
  const [mailboxesError, setMailboxesError] = useState<string | null>(null);
  const [showSuppressedJunk, setShowSuppressedJunk] = useState(false);

  const [selectedMailboxId, setSelectedMailboxId] = useState(
    searchParams.get('mailboxId') || 'all',
  );
  const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'updates' | 'promotions'>(
    ((searchParams.get('tab') as any) || 'all') as 'all' | 'primary' | 'updates' | 'promotions',
  );
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') || '');
  const [fromFilter, setFromFilter] = useState(searchParams.get('from') || '');
  const [toFilter, setToFilter] = useState(searchParams.get('to') || '');
  const [dateFrom, setDateFrom] = useState(
    searchParams.get('dateFrom') || globalFilters.timeRange[0] || '',
  );
  const [dateTo, setDateTo] = useState(
    searchParams.get('dateTo') || globalFilters.timeRange[1] || '',
  );
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(
    searchParams.get('hasAttachments') === '1',
  );
  const [minRisk, setMinRisk] = useState(Number(searchParams.get('minRisk') || 0));
  const [density, setDensity] = useState<EmailDensity>(
    searchParams.get('density') === 'compact' ? 'compact' : 'comfortable',
  );

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

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'mailboxes' | 'threads' | 'messages'>('threads');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const selectedThread = selectedThreadId ? threadDetails[selectedThreadId] || null : null;
  const selectedMailbox =
    mailboxes.find((mailbox) => mailbox.mailboxId === selectedMailboxId) || mailboxes[0] || null;

  const updateUrlState = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Sync global date range into local state when URL params are absent.
  // Use a ref to track the last value we synced so that a user clearing
  // their local date (which doesn't change globalTime*) won't be immediately
  // re-populated on the next render.
  const globalTimeStart = globalFilters.timeRange[0];
  const globalTimeEnd = globalFilters.timeRange[1];
  const lastSyncedFromRef = useRef<string | null | undefined>(undefined);
  const lastSyncedToRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!searchParams.get('dateFrom') && globalTimeStart !== lastSyncedFromRef.current) {
      lastSyncedFromRef.current = globalTimeStart;
      if (globalTimeStart) setDateFrom(globalTimeStart);
    }
    if (!searchParams.get('dateTo') && globalTimeEnd !== lastSyncedToRef.current) {
      lastSyncedToRef.current = globalTimeEnd;
      if (globalTimeEnd) setDateTo(globalTimeEnd);
    }
  }, [globalTimeStart, globalTimeEnd, searchParams]);

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

  const loadMailboxes = useCallback(async () => {
    setMailboxesLoading(true);
    setMailboxesError(null);
    try {
      const { PerformanceMonitor } = await import('../../utils/performanceMonitor');
      PerformanceMonitor.mark('email-mailboxes-load-start');
      const response = await apiClient.getEmailMailboxes({ showSuppressedJunk });
      setMailboxes(response.data);
      if (!response.data.some((mailbox) => mailbox.mailboxId === selectedMailboxId)) {
        setSelectedMailboxId('all');
      }
      PerformanceMonitor.mark('email-mailboxes-load-end');
      PerformanceMonitor.measure(
        'email-mailboxes-load',
        'email-mailboxes-load-start',
        'email-mailboxes-load-end',
      );
    } catch (error) {
      console.error(error);
      setMailboxesError(formatUiError(error, 'Failed to load mailboxes'));
    } finally {
      setMailboxesLoading(false);
    }
  }, [selectedMailboxId, showSuppressedJunk]);

  const loadThreads = useCallback(
    async (cursor: string | null, append: boolean) => {
      if (!append) {
        setThreadsLoading(true);
        setThreadsError(null);
      } else {
        setLoadingMoreThreads(true);
      }

      try {
        const { PerformanceMonitor } = await import('../../utils/performanceMonitor');
        PerformanceMonitor.mark('email-thread-list-load-start');
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

        PerformanceMonitor.mark('email-thread-list-load-end');
        PerformanceMonitor.measure(
          'email-thread-list-load',
          'email-thread-list-load-start',
          'email-thread-list-load-end',
        );
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
      toFilter,
    ],
  );

  const loadThread = useCallback(
    async (threadId: string) => {
      if (threadDetails[threadId]) return;
      setThreadLoading(true);
      setThreadError(null);
      try {
        const { PerformanceMonitor } = await import('../../utils/performanceMonitor');
        PerformanceMonitor.mark('email-thread-open-start');
        const detail = await apiClient.getEmailThread(threadId);
        setThreadDetails((prev) => ({ ...prev, [threadId]: detail }));
        PerformanceMonitor.mark('email-thread-open-end');
        PerformanceMonitor.measure(
          'email-thread-open',
          'email-thread-open-start',
          'email-thread-open-end',
        );
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
          const { PerformanceMonitor } = await import('../../utils/performanceMonitor');
          PerformanceMonitor.mark('email-message-body-load-start');
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
          PerformanceMonitor.mark('email-message-body-load-end');
          PerformanceMonitor.measure(
            'email-message-body-load',
            'email-message-body-load-start',
            'email-message-body-load-end',
          );
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
      setMobilePane('messages');
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

  // j/k Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'j') {
        const index = threads.findIndex((t) => t.threadId === selectedThreadId);
        if (index < threads.length - 1) handleOpenThread(threads[index + 1].threadId);
      } else if (e.key === 'k') {
        const index = threads.findIndex((t) => t.threadId === selectedThreadId);
        if (index > 0) handleOpenThread(threads[index - 1].threadId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [threads, selectedThreadId, handleOpenThread]);

  useEffect(() => {
    void loadMailboxes();
  }, [loadMailboxes]);

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
      density: density === 'compact' ? 'compact' : null,
    });
    void loadThreads(null, false);
  }, [
    activeTab,
    dateFrom,
    dateTo,
    debouncedSearch,
    density,
    fromFilter,
    hasAttachmentsOnly,
    loadThreads,
    minRisk,
    selectedMailboxId,
    toFilter,
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
        // Ignore deep-link misses.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deepLinkedMessageId, selectedThreadId, updateUrlState]);

  useEffect(() => {
    const deepLinkedMessageId = searchParams.get('messageId');
    if (!deepLinkedMessageId || !selectedThread) return;
    const hasMessage = selectedThread.messages.some(
      (message) => message.messageId === deepLinkedMessageId,
    );
    if (!hasMessage) return;
    setExpandedMessages((prev) => ({ ...prev, [deepLinkedMessageId]: true }));
    void loadMessageBody(deepLinkedMessageId, bodyState[deepLinkedMessageId]?.showQuoted || false);
  }, [searchParams, selectedThread, loadMessageBody, bodyState]);

  const tabsWithData = useMemo(() => {
    if (threadsTotal === 0) return [{ id: 'all', label: 'All' }];
    return tabOptions;
  }, [threadsTotal]);

  const canLoadMore = threadsHasMore && !!threadsNextCursor;
  const threadRowHeight = density === 'compact' ? 72 : 94;
  const clearQuickFilters = useCallback(() => {
    setFromFilter('');
    setToFilter('');
    setDateFrom('');
    setDateTo('');
    setHasAttachmentsOnly(false);
    setMinRisk(0);
  }, []);

  const activeQuickFilterCount = [
    debouncedSearch.length > 0,
    fromFilter.trim().length > 0,
    toFilter.trim().length > 0,
    dateFrom.length > 0,
    dateTo.length > 0,
    hasAttachmentsOnly,
    minRisk > 0,
    activeTab !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="email-workspace flex flex-col">
      <div className="md:hidden px-4 py-3 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
        <button
          onClick={() => setMobilePane(mobilePane === 'mailboxes' ? 'threads' : 'mailboxes')}
          className="text-sm text-cyan-300 flex items-center gap-2"
        >
          {mobilePane === 'messages' ? (
            <ArrowLeft
              className="w-4 h-4"
              onClick={(e) => {
                e.stopPropagation();
                setMobilePane('threads');
              }}
            />
          ) : (
            <Folder className="w-4 h-4" />
          )}
          <span className="truncate max-w-[220px]">
            {mobilePane === 'messages'
              ? 'Back to Threads'
              : selectedMailbox?.displayName || 'Mailboxes'}
          </span>
          {mobilePane !== 'messages' && <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="text-xs text-slate-400">{threadsTotal.toLocaleString()} threads</div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <aside
          className={`mailbox-pane ${mobilePane === 'mailboxes' ? 'flex absolute inset-0 z-50 w-full' : 'hidden md:flex'}`}
        >
          <div className="p-4 border-b border-white/5 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wide">
              <span>Entity mailboxes</span>
              <button
                onClick={() => setShowSuppressedJunk((prev) => !prev)}
                className="text-[11px] text-cyan-300 hover:text-cyan-200"
                title={
                  showSuppressedJunk
                    ? 'Hide junk-tagged entities from the mailbox list'
                    : 'Include junk-tagged entities in the mailbox list'
                }
              >
                {showSuppressedJunk ? 'Hide junk' : 'Show junk'}
              </button>
            </div>
            <div className="-mt-2 text-[11px] text-slate-500">
              All Inboxes + top-mentioned entities from email evidence
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                data-testid="email-search-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search threads"
                className="w-full h-10 rounded-full bg-slate-900 border border-slate-700 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabsWithData.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveTab(option.id as any)}
                  className={`h-8 px-3 rounded-full text-xs border whitespace-nowrap ${
                    activeTab === option.id
                      ? 'text-cyan-200 border-cyan-400 bg-cyan-500/10'
                      : 'text-slate-300 border-slate-700 bg-slate-900/60'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center rounded-full border border-slate-700 overflow-hidden">
                <button
                  onClick={() => setDensity('comfortable')}
                  className={`h-7 px-2.5 text-[11px] ${
                    density === 'comfortable'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'text-slate-300 bg-slate-900/70'
                  }`}
                >
                  Comfortable
                </button>
                <button
                  onClick={() => setDensity('compact')}
                  className={`h-7 px-2.5 text-[11px] ${
                    density === 'compact'
                      ? 'bg-cyan-500/20 text-cyan-200'
                      : 'text-slate-300 bg-slate-900/70'
                  }`}
                >
                  Compact
                </button>
              </div>
              <div className="text-[11px] text-slate-500">
                {activeQuickFilterCount > 0
                  ? `${activeQuickFilterCount} active filter${activeQuickFilterCount > 1 ? 's' : ''}`
                  : 'No active filters'}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {mailboxesLoading ? (
              <div className="h-full flex items-start justify-start p-4 text-slate-400 text-sm text-left">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading mailboxes
              </div>
            ) : mailboxesError ? (
              <div className="p-4 text-sm text-red-300">{mailboxesError}</div>
            ) : (
              <AutoSizer
                renderProp={({ height, width }) =>
                  height && width ? (
                    <List
                      height={height}
                      width={width}
                      itemCount={mailboxes.length}
                      itemSize={58}
                      itemData={{
                        rows: mailboxes,
                        selectedMailboxId,
                        onSelect: (mailboxId: string) => {
                          setSelectedMailboxId(mailboxId);
                          setMobilePane('threads');
                        },
                      }}
                    >
                      {MailboxRow}
                    </List>
                  ) : null
                }
              />
            )}
          </div>
        </aside>

        <section
          className={`thread-pane ${mobilePane === 'threads' ? 'flex w-full md:w-auto' : 'hidden md:flex'}`}
        >
          <div className="pane-header">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobilePane('mailboxes')}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Conversations
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {threadsTotal.toLocaleString()} total
            </div>
          </div>
          <div className="pane-subheader">
            <div className="flex items-center gap-3 flex-wrap">
              <span>
                {threads.length.toLocaleString()} of {threadsTotal.toLocaleString()} threads
              </span>
              <span
                className="flex items-center gap-1"
                title="Thread lists are metadata-only; message bodies are lazy-loaded."
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Metadata-only list
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterPanel((prev) => !prev)}
                className={`h-8 px-3 rounded-full border text-[11px] inline-flex items-center gap-1.5 transition-colors ${
                  showFilterPanel
                    ? 'border-cyan-400/60 text-cyan-200 bg-cyan-500/10'
                    : 'border-slate-700 text-slate-300 bg-slate-900/70 hover:border-slate-600'
                }`}
                title="Show or hide conversation filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeQuickFilterCount > 0 && (
                  <span className="h-5 min-w-5 px-1 rounded-full bg-cyan-400/20 text-cyan-100 text-[10px] font-bold inline-flex items-center justify-center">
                    {activeQuickFilterCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`}
                />
              </button>
              <button
                onClick={clearQuickFilters}
                className="h-8 px-3 rounded-full border border-slate-700 text-[11px] text-slate-300 bg-slate-900/70 inline-flex items-center gap-1 disabled:opacity-50"
                disabled={activeQuickFilterCount === 0}
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
          {showFilterPanel && (
            <div className="px-3 py-3 border-b border-slate-800/80 bg-gradient-to-b from-slate-950/80 to-slate-950/50">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/45 backdrop-blur-sm p-3 md:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="text-[11px] font-medium text-slate-400 mb-3">
                  Refine by sender, recipient, date, attachments, and risk.
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1.15fr_0.95fr_0.95fr] gap-2 md:gap-3">
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                      From
                    </span>
                    <input
                      value={fromFilter}
                      onChange={(event) => setFromFilter(event.target.value)}
                      placeholder="sender@domain.com or name"
                      className="h-9 w-full rounded-xl bg-slate-950/80 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                      To
                    </span>
                    <input
                      value={toFilter}
                      onChange={(event) => setToFilter(event.target.value)}
                      placeholder="recipient@domain.com or name"
                      className="h-9 w-full rounded-xl bg-slate-950/80 border border-slate-700 px-3 text-xs text-white placeholder:text-slate-500"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                      Date From
                    </span>
                    <input
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      type="date"
                      className="h-9 w-full rounded-xl bg-slate-950/80 border border-slate-700 px-3 text-xs text-white"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                      Date To
                    </span>
                    <input
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      type="date"
                      className="h-9 w-full rounded-xl bg-slate-950/80 border border-slate-700 px-3 text-xs text-white"
                    />
                  </label>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 md:gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                    Quick Toggles
                  </span>
                  <button
                    onClick={() => setHasAttachmentsOnly((prev) => !prev)}
                    className={`h-8 px-3 rounded-full border text-[11px] font-medium ${
                      hasAttachmentsOnly
                        ? 'border-amber-400 text-amber-200 bg-amber-500/10'
                        : 'border-slate-700 text-slate-300 bg-slate-900/70'
                    }`}
                  >
                    Has attachments
                  </button>
                  <div className="inline-flex items-center gap-2 h-8 px-2 rounded-full border border-slate-700 bg-slate-900/70">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">
                      Min Risk
                    </span>
                    <select
                      value={minRisk}
                      onChange={(event) => setMinRisk(Number(event.target.value))}
                      className="h-6 rounded-lg border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-200 min-w-[110px]"
                      aria-label="Minimum risk"
                    >
                      <option value={0}>Any</option>
                      <option value={1}>≥ 1</option>
                      <option value={2}>≥ 2</option>
                      <option value={3}>≥ 3</option>
                      <option value={4}>≥ 4</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            {threadsLoading ? (
              <div className="h-full flex items-start justify-start p-4 text-slate-400 text-sm text-left">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading conversations
              </div>
            ) : threadsError ? (
              <div className="p-4 text-sm text-red-300">{threadsError}</div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-sm text-slate-300 space-y-3">
                <div className="font-semibold text-white">No conversations found</div>
                <p>Why: this mailbox + filter combination returned no matching threads.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className="h-8 px-3 rounded-full border border-slate-700 bg-slate-900 text-xs"
                  >
                    Use All tab
                  </button>
                  <button
                    onClick={() => setSearchInput('')}
                    className="h-8 px-3 rounded-full border border-slate-700 bg-slate-900 text-xs"
                  >
                    Clear search
                  </button>
                </div>
              </div>
            ) : (
              <AutoSizer
                renderProp={({ height, width }) =>
                  height && width ? (
                    <List
                      height={height}
                      width={width}
                      itemCount={threads.length}
                      itemSize={threadRowHeight}
                      itemData={{
                        rows: threads,
                        selectedThreadId,
                        onOpen: handleOpenThread,
                        density,
                      }}
                    >
                      {ThreadRow}
                    </List>
                  ) : null
                }
              />
            )}
          </div>

          <div className="px-3 py-2 border-t border-slate-800/80">
            {canLoadMore ? (
              <button
                onClick={() => {
                  if (!threadsNextCursor || loadingMoreThreads) return;
                  void loadThreads(threadsNextCursor, true);
                }}
                className="w-full h-9 rounded-full border border-slate-700 text-sm text-slate-200 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-60 inline-flex items-center justify-start px-4 text-left"
                disabled={loadingMoreThreads}
              >
                {loadingMoreThreads ? 'Loading...' : 'Load more'}
              </button>
            ) : (
              <div className="text-[11px] text-slate-500 text-left w-full pl-1">End of results</div>
            )}
          </div>
        </section>

        <section
          className={`content-pane overflow-hidden flex flex-col ${mobilePane === 'messages' ? 'flex w-full md:w-auto' : 'hidden md:flex'}`}
        >
          {selectedThreadId ? (
            threadLoading && !selectedThread ? (
              <div className="h-full flex items-start justify-start p-4 text-slate-400 text-sm text-left">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Opening thread
              </div>
            ) : threadError ? (
              <div className="p-4 text-sm text-red-300">{threadError}</div>
            ) : selectedThread ? (
              <ViewerShell
                header={
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-white truncate">
                      {selectedThread.subject}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {selectedThread.messages.length.toLocaleString()} messages · mailbox{' '}
                      {selectedMailbox?.displayName || 'All'}
                    </div>
                  </div>
                }
                actions={
                  <div data-testid="email-thread-actions" className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          setMobilePane('threads');
                        } else {
                          setSelectedThreadId(null);
                          updateUrlState({ threadId: null, messageId: null });
                        }
                      }}
                      className="h-9 px-3 rounded-full border border-slate-700 bg-slate-900 text-sm text-slate-200"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <AddToInvestigationButton
                      item={{
                        id: selectedThread.threadId,
                        type: 'evidence',
                        title: selectedThread.subject,
                        description: `Email thread with ${selectedThread.messages.length} messages`,
                        sourceId: selectedThread.threadId,
                        metadata: {
                          sourceType: 'email_thread',
                          threadId: selectedThread.threadId,
                          messageCount: selectedThread.messages.length,
                        },
                      }}
                      variant="quick"
                      className="h-9"
                    />
                  </div>
                }
                headerClassName="px-4 py-3"
                bodyClassName="bg-slate-900/10"
              >
                <div className="message-thread">
                  {selectedThread.messages.map((message) => {
                    const expanded = Boolean(expandedMessages[message.messageId]);
                    const body = bodyState[message.messageId];
                    const citation = `message_id=${message.messageId}; date=${message.date}; mailbox=${selectedMailbox?.displayName || 'All'}; ingest_run_id=${message.ingestRunId ?? 'unknown'}`;

                    return (
                      <article
                        key={message.messageId}
                        className={`message-card ${expanded ? 'expanded' : ''}`}
                        data-message-id={message.messageId}
                      >
                        <button
                          onClick={() => handleToggleMessage(message.messageId, !expanded)}
                          className="w-full text-left"
                        >
                          <div className="message-header">
                            <div className="w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center shrink-0 border border-white/5">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-bold text-slate-100 truncate">
                                  {message.from || 'Unknown Sender'}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                  {formatTime(message.date)}
                                </div>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                To: {message.to.join(' · ') || 'Unknown recipient'}
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`}
                            />
                          </div>
                        </button>

                        {expanded && (
                          <div className="message-body space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-wrap items-center gap-3">
                              <div
                                className={`px-2.5 py-1 rounded-md border text-[9px] font-black uppercase tracking-wider ${ladderTone(message.ladder)}`}
                              >
                                LADDER: {message.ladder || 'N/A'}
                              </div>
                              <div className="px-2.5 py-1 rounded-md border border-white/5 bg-white/5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                CONFIDENCE:{' '}
                                {typeof message.confidence === 'number'
                                  ? (message.confidence * 100).toFixed(0)
                                  : '0'}
                                %
                              </div>
                              <div className="px-2.5 py-1 rounded-md border border-white/5 bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                ID: {message.ingestRunId || 'RAW_INGEST'}
                              </div>
                              {message.wasAgentic && (
                                <div className="px-2.5 py-1 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 text-[9px] font-black text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3" />
                                  Agentic Highlighting
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => void copyText(citation)}
                                className="h-8 px-4 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors uppercase tracking-wide"
                              >
                                Copy Citation
                              </button>
                              <button
                                onClick={() => handleToggleRaw(message.messageId)}
                                className="h-8 px-4 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors uppercase tracking-wide"
                              >
                                {body?.showRaw ? 'Show Cleaned' : 'View MIME'}
                              </button>
                              <button
                                onClick={() => handleToggleQuoted(message.messageId)}
                                className="h-8 px-4 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 transition-colors uppercase tracking-wide"
                              >
                                {body?.showQuoted ? 'Hide History' : 'Show History'}
                              </button>
                              <AddToInvestigationButton
                                item={{
                                  id: message.messageId,
                                  type: 'evidence',
                                  title: message.subject || selectedThread.subject,
                                  description: `Email message from ${message.from}`,
                                  sourceId: message.messageId,
                                  metadata: {
                                    sourceType: 'email_message',
                                    threadId: selectedThread.threadId,
                                    messageId: message.messageId,
                                    ingestRunId: message.ingestRunId,
                                  },
                                }}
                                variant="quick"
                                className="h-8"
                              />
                            </div>

                            <div
                              data-testid="email-message-body"
                              className="mime-content glass-surface p-6 rounded-2xl border-white/5"
                            >
                              {body?.loading ? (
                                <div className="py-12 flex flex-col items-start justify-start text-slate-500 gap-3 text-left">
                                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500/50" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    Decompressing MIME Stream
                                  </span>
                                </div>
                              ) : body?.error ? (
                                <div className="p-4 text-xs text-rose-400 font-bold bg-rose-500/10 rounded-lg border border-rose-500/20">
                                  {body.error}
                                </div>
                              ) : body?.showRaw ? (
                                <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap break-words">
                                  {body.raw || 'No raw content available.'}
                                </pre>
                              ) : (
                                <div className="whitespace-pre-wrap selection:bg-cyan-500/30">
                                  {body?.data?.cleanedText || 'No readable body available.'}
                                </div>
                              )}
                            </div>

                            {(message.linkedEntities || []).length > 0 && (
                              <div className="flex flex-wrap gap-2 px-1">
                                {(message.linkedEntities || []).map((entity) => (
                                  <button
                                    key={`${message.messageId}-${entity.entityId}`}
                                    onClick={() => setSelectedEntityId(String(entity.entityId))}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                                    title={`Open entity ${entity.name}`}
                                  >
                                    <User className="w-3 h-3" />
                                    {entity.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            {(message.attachmentsMeta || []).length > 0 && (
                              <div className="space-y-2 px-1">
                                <div className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Paperclip className="w-3 h-3" />
                                  Forensic Attachments ({(message.attachmentsMeta || []).length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {(message.attachmentsMeta || []).map((attachment, index) => {
                                    const linkedDocumentId =
                                      attachment.linkedDocumentId ||
                                      (attachment as any).documentId ||
                                      (attachment as any).docId;
                                    const canOpen = Boolean(linkedDocumentId);
                                    return (
                                      <div
                                        key={`${message.messageId}-attachment-${index}`}
                                        className="flex items-center justify-between gap-3 p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-default group"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[11px] font-bold text-slate-300 truncate">
                                            {attachment.filename || `Attachment ${index + 1}`}
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                            {attachment.mimeType || 'UNKNOWN_MIME'} ·{' '}
                                            {attachment.size
                                              ? `${(attachment.size / 1024).toFixed(1)}KB`
                                              : 'SIZE_UNKNOWN'}
                                          </div>
                                        </div>
                                        {canOpen ? (
                                          <button
                                            onClick={() =>
                                              navigate(`/documents/${linkedDocumentId}`)
                                            }
                                            className="h-7 px-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-[10px] font-black text-cyan-400 hover:bg-cyan-500/20 transition-colors uppercase tracking-widest"
                                          >
                                            Open
                                          </button>
                                        ) : (
                                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter px-2">
                                            Not Ingested
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </ViewerShell>
            ) : (
              <div className="h-full flex items-start justify-start p-4 text-slate-400 text-sm text-left">
                Thread not found.
              </div>
            )
          ) : (
            <div className="h-full flex items-start justify-start px-6 py-6">
              <div className="text-left text-slate-400 max-w-md">
                <Mail className="w-14 h-14 mb-4 opacity-30" />
                <div className="text-lg text-white mb-2">Investigation-grade Email Workspace</div>
                <p className="text-sm text-slate-400">
                  Select a thread to load message headers first, then lazy-load bodies. Use linked
                  entities and Add to Investigation for evidence chaining.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedEntityId && (
        <EvidenceModal
          entityId={selectedEntityId}
          isOpen={Boolean(selectedEntityId)}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </div>
  );
};

export default EmailClient;
