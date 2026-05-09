import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MobileStackHeader } from '../layout/MobileStackHeader';
import styles from './EmailClient.module.css';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { useListScrollRestoration } from '@client/hooks/useListScrollRestoration';
import {
  useBackLinkState,
  useReliableBackNavigation,
} from '@client/hooks/useReliableBackNavigation';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import Icon from '@client/components/common/Icon';
import { EmailMailboxDTO, EmailThreadDTO } from '@client/services/apiClient';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { EvidenceModal } from '../common/EvidenceModal';
import { ViewerShell } from '../viewer/ViewerShell';
import { riskToneFromRating } from '@client/utils/riskSemantics';
import { useFilters } from '@client/contexts/useFilters';
import { useEmailWorkspaceData } from '@client/hooks/useEmailWorkspaceData';
import { EmptyCorpus } from '../common/EmptyCorpus';
import { isJunkEntity } from '@client/utils/entityFilters';
import { Button, Flex, SearchField, Select, Surface, TextInput } from '@client/design-system/lib';

type EmailDensity = 'comfortable' | 'compact';

const tabOptions: Array<{
  id: 'all' | 'primary' | 'updates' | 'promotions' | 'analytics';
  label: string;
}> = [
  { id: 'all', label: 'All' },
  { id: 'primary', label: 'Primary' },
  { id: 'updates', label: 'Updates' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'analytics', label: 'Forensic Analytics' },
];

const minRiskOptions = [
  { value: 0, label: 'Any' },
  { value: 1, label: '≥ 1' },
  { value: 2, label: '≥ 2' },
  { value: 3, label: '≥ 3' },
  { value: 4, label: '≥ 4' },
];

const ladderTone = (ladder: string | null): string => {
  const value = (ladder || '').toLowerCase();
  if (value.includes('direct')) return styles.ladderDirect;
  if (value.includes('infer')) return styles.ladderInfer;
  if (value.includes('agentic')) return styles.ladderAgentic;
  return styles.ladderDefault;
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
      <Button
        style={style}
        onClick={() => data.onOpen(thread.threadId)}
        type="button"
        variant="ghost"
        size="sm"
        data-thread-id={thread.threadId}
        data-testid="email-thread-row"
        className={`${styles.emailRow} ${selected ? styles.active : ''} ${
          compact ? styles.threadRowCompact : styles.threadRowComfortable
        }`}
      >
        <div className={styles.rowShell}>
          <div className={styles.rowMain}>
            <div className={styles.rowSubject}>{thread.subject}</div>
            <div className={styles.rowParticipants}>
              {thread.participants.slice(0, 3).join(' · ') || 'Unknown participants'}
            </div>
            {!compact && thread.snippet && (
              <div className={styles.rowSnippet}>{thread.snippet}</div>
            )}
            {!compact && thread.linkedEntities && thread.linkedEntities.length > 0 && (
              <div className={styles.rowEntityPills}>
                {thread.linkedEntities.slice(0, 3).map((e) => (
                  <span key={e.entityId} className={styles.entityPill}>
                    {e.name}
                  </span>
                ))}
                {thread.linkedEntities.length > 3 && (
                  <span className={styles.entityPillMore}>+{thread.linkedEntities.length - 3}</span>
                )}
              </div>
            )}
          </div>
          <div className={styles.rowAside}>
            <div className={styles.rowTime}>{formatTime(thread.lastMessageAt)}</div>
            <div className={styles.rowMetaRight}>
              {thread.hasAttachments && (
                <Icon name="Paperclip" className={styles.paperclipIconSmall} />
              )}
              <span className={`${styles.riskBadge} ${riskTone(thread.risk)}`}>
                R{thread.risk ?? '0'}
              </span>
            </div>
          </div>
        </div>
      </Button>
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
    const isVip = mailbox.isVip;

    return (
      <Button
        style={style}
        onClick={() => data.onSelect(mailbox.mailboxId)}
        type="button"
        variant="ghost"
        size="sm"
        className={`${styles.emailRow} ${styles.mailboxRow} ${active ? styles.active : ''} ${
          isVip ? styles.vipMailbox : ''
        }`}
      >
        <div className={styles.mailboxRowInner}>
          <div className={styles.rowMain}>
            <div className={styles.mailboxTitleRow}>
              <div className={styles.rowSubject}>{mailbox.displayName}</div>
              {isVip && (
                <span className={styles.mailboxVipBadge} title="VIP">
                  <Icon name="Sparkles" className={styles.mailboxVipIcon} />
                </span>
              )}
              {mailbox.isVerified && !isVip && (
                <span className={styles.verifiedBadge} title="Verified">
                  <Icon name="ShieldCheck" className={styles.verifiedIcon} />
                </span>
              )}
            </div>
            <div className={styles.mailboxCount}>
              {mailbox.totalThreads.toLocaleString()} THREADS
            </div>
          </div>
          <div className={styles.rowAside}>
            <div>{formatTime(mailbox.lastActivityAt)}</div>
            {isVip && <div className={styles.mailboxPriority}>PRIORITY VIP</div>}
          </div>
        </div>
      </Button>
    );
  },
);

export const EmailClient: React.FC = () => {
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const { goBack } = useReliableBackNavigation('/emails');
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedMessageId = searchParams.get('messageId') || searchParams.get('id');
  const { filters: globalFilters } = useFilters();

  const [showSuppressedJunk, setShowSuppressedJunk] = useState(false);

  const [selectedMailboxId, setSelectedMailboxId] = useState(
    searchParams.get('mailboxId') || 'all',
  );
  const [activeTab, setActiveTab] = useState<
    'all' | 'primary' | 'updates' | 'promotions' | 'analytics'
  >(
    (searchParams.get('tab') || 'all') as
      | 'all'
      | 'primary'
      | 'updates'
      | 'promotions'
      | 'analytics',
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

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const { data: analyticsData } = useQuery<{
    matrix: Array<{ sender: string; recipient: string; count: number }>;
  }>({
    queryKey: ['emailAnalytics'],
    queryFn: async () => {
      const res = await fetch('/api/emails/analytics/matrix');
      if (!res.ok) throw new Error('Failed to fetch email analytics');
      return await res.json();
    },
    enabled: activeTab === 'analytics',
  });

  const VALID_PANES = new Set(['mailboxes', 'threads', 'messages']);
  type MobilePane = 'mailboxes' | 'threads' | 'messages';
  const rawPane = searchParams.get('pane') ?? 'mailboxes';
  const mobilePane: MobilePane = VALID_PANES.has(rawPane) ? (rawPane as MobilePane) : 'mailboxes';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const desktopLayoutRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [mailboxWidth, setMailboxWidth] = useState(() => {
    const saved = window.localStorage.getItem('email-pane-mailbox-width');
    return saved ? Number(saved) : 320;
  });

  const updateUrlState = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (!value) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
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
  const [prevGlobalTimeStart, setPrevGlobalTimeStart] = useState(globalTimeStart);
  const [prevGlobalTimeEnd, setPrevGlobalTimeEnd] = useState(globalTimeEnd);

  if (!searchParams.get('dateFrom') && globalTimeStart !== prevGlobalTimeStart) {
    setPrevGlobalTimeStart(globalTimeStart);
    if (globalTimeStart) setDateFrom(globalTimeStart);
  }
  if (!searchParams.get('dateTo') && globalTimeEnd !== prevGlobalTimeEnd) {
    setPrevGlobalTimeEnd(globalTimeEnd);
    if (globalTimeEnd) setDateTo(globalTimeEnd);
  }

  const {
    mailboxes: rawMailboxes,
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
    loadThreads,
    loadMessageBody: _loadMessageBody,
    handleOpenThread: baseHandleOpenThread,
    handleToggleMessage,
    handleToggleRaw,
    handleToggleQuoted,
  } = useEmailWorkspaceData({
    searchParams,
    deepLinkedMessageId,
    selectedMailboxId,
    activeTab: activeTab === 'analytics' ? 'all' : activeTab,
    debouncedSearch,
    fromFilter,
    toFilter,
    dateFrom,
    dateTo,
    hasAttachmentsOnly,
    minRisk,
    showSuppressedJunk,
    updateUrlState,
  });

  const mailboxes = useMemo(() => {
    // Filter out junk entities and unverified/non-VIP accounts if junk is suppressed
    if (!showSuppressedJunk) {
      return rawMailboxes.filter((m) => (m.isVip || m.isVerified) && !isJunkEntity(m.displayName));
    }
    return rawMailboxes;
  }, [rawMailboxes, showSuppressedJunk]);

  const selectedMailbox = useMemo(() => {
    return (
      mailboxes.find((mailbox) => mailbox.mailboxId === selectedMailboxId) ||
      mailboxes.find((m) => m.isVip) ||
      mailboxes[0] ||
      null
    );
  }, [mailboxes, selectedMailboxId]);

  const handleOpenThread = useCallback(
    (threadId: string) => {
      baseHandleOpenThread(threadId);
      // Push a history entry so device-back returns to the thread list.
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('threadId', threadId);
          next.delete('messageId');
          next.set('pane', 'messages');
          return next;
        },
        { replace: false },
      );
    },
    [baseHandleOpenThread, setSearchParams],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (selectedThread) {
      setActiveMessageIndex(selectedThread.messages.length - 1);
    }
  }, [selectedThread?.threadId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const inInput =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement | null)?.isContentEditable;

      // / focuses search regardless of context
      if (e.key === '/') {
        if (!inInput) {
          e.preventDefault();
          searchRef.current?.focus();
          searchRef.current?.select();
        }
        return;
      }

      if (inInput) return;

      const threadIndex = threads.findIndex((t) => t.threadId === selectedThreadId);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (threadIndex < threads.length - 1) handleOpenThread(threads[threadIndex + 1].threadId);
          break;

        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (threadIndex > 0) handleOpenThread(threads[threadIndex - 1].threadId);
          break;

        case 'Enter':
        case 'o':
          if (!selectedThreadId && threads.length > 0) handleOpenThread(threads[0].threadId);
          break;

        case 'Escape':
        case 'u':
          if (selectedThreadId) {
            if (window.innerWidth < 768) {
              updateUrlState({ pane: 'threads' });
            } else {
              setSelectedThreadId(null);
              updateUrlState({ threadId: null, messageId: null });
            }
          }
          break;

        case 'n': {
          if (!selectedThread) break;
          const nextIdx = Math.min(activeMessageIndex + 1, selectedThread.messages.length - 1);
          const nextMsg = selectedThread.messages[nextIdx];
          if (nextMsg) {
            setActiveMessageIndex(nextIdx);
            handleToggleMessage(nextMsg.messageId, true);
            setTimeout(() => {
              document
                .querySelector(`[data-message-id="${nextMsg.messageId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }
          break;
        }

        case 'p': {
          if (!selectedThread) break;
          const prevIdx = Math.max(activeMessageIndex - 1, 0);
          const prevMsg = selectedThread.messages[prevIdx];
          if (prevMsg) {
            setActiveMessageIndex(prevIdx);
            handleToggleMessage(prevMsg.messageId, true);
            setTimeout(() => {
              document
                .querySelector(`[data-message-id="${prevMsg.messageId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    threads,
    selectedThreadId,
    selectedThread,
    activeMessageIndex,
    handleOpenThread,
    handleToggleMessage,
    setSelectedThreadId,
    updateUrlState,
  ]);

  useEffect(() => {
    updateUrlState({
      density: density === 'compact' ? 'compact' : null,
    });
  }, [density, updateUrlState]);

  const tabsWithData = useMemo(() => {
    if (threadsTotal === 0) return [{ id: 'all', label: 'All' }];
    return tabOptions;
  }, [threadsTotal]);

  const canLoadMore = threadsHasMore && !!threadsNextCursor;
  const threadRowHeight = density === 'compact' ? 72 : 94;

  const { initialScrollOffset: threadScrollOffset, onScroll: onThreadScroll } =
    useListScrollRestoration(`/emails:${selectedMailboxId}`);

  const clampWidths = useCallback((nextMailbox: number, containerWidth: number) => {
    const threadMin = 280;
    const contentMin = 320;
    const handleWidth = 10;
    const maxMailbox = Math.max(240, containerWidth - threadMin - contentMin - handleWidth);
    const mailbox = Math.min(Math.max(nextMailbox, 240), maxMailbox);
    return { mailbox };
  }, []);

  const startResize = useCallback(
    () => (event: React.MouseEvent<HTMLDivElement>) => {
      if (window.innerWidth < 768) return;
      event.preventDefault();
      const startX = event.clientX;
      const startMailbox = mailboxWidth;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const containerWidth = desktopLayoutRef.current?.clientWidth || window.innerWidth;
        const { mailbox } = clampWidths(startMailbox + delta, containerWidth);
        setMailboxWidth(mailbox);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [mailboxWidth, clampWidths],
  );

  // Layout clamping using useLayoutEffect to avoid visual flickering
  // This runs synchronously after DOM updates but before paint
  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: clamping widths before paint */
  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      const containerWidth = window.innerWidth;
      const { mailbox } = clampWidths(mailboxWidth, containerWidth);
      if (mailbox !== mailboxWidth) setMailboxWidth(mailbox);
    }
  }, [mailboxWidth, clampWidths]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    window.localStorage.setItem('email-pane-mailbox-width', String(Math.round(mailboxWidth)));
  }, [mailboxWidth]);

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
    <div className={styles.emailWorkspace}>
      <div className={styles.mobileOnly}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderTop}>
            <div className={styles.mobileTitle}>Mail</div>
            <div className={styles.mobileCount}>{threadsTotal.toLocaleString()} threads</div>
          </div>
          <div className={styles.mobileTabs}>
            <Button
              onClick={() => updateUrlState({ pane: 'mailboxes' })}
              type="button"
              variant="ghost"
              size="sm"
              className={`${styles.mobileTabButton} ${
                mobilePane === 'mailboxes' ? styles.mobileTabActive : ''
              }`}
            >
              Mailboxes
            </Button>
            <Button
              onClick={() => updateUrlState({ pane: 'threads' })}
              type="button"
              variant="ghost"
              size="sm"
              className={`${styles.mobileTabButton} ${
                mobilePane === 'threads' ? styles.mobileTabActive : ''
              }`}
            >
              Threads
            </Button>
            <Button
              onClick={() => selectedThreadId && updateUrlState({ pane: 'messages' })}
              type="button"
              variant="ghost"
              size="sm"
              disabled={!selectedThreadId}
              className={`${styles.mobileTabButton} ${
                mobilePane === 'messages' ? styles.mobileTabActive : ''
              } ${!selectedThreadId ? styles.mobileTabDisabled : ''}`}
            >
              Message
            </Button>
          </div>
          {mobilePane === 'threads' && (
            <div className={styles.searchWrap}>
              <SearchField
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search threads"
                density="compact"
                rootClassName={styles.searchFieldRoot}
              />
            </div>
          )}
        </div>
      </div>

      <div
        ref={desktopLayoutRef}
        className={styles.desktopLayout}
        style={
          {
            '--mailbox-pane-width': `${mailboxWidth}px`,
          } as React.CSSProperties
        }
      >
        <aside
          className={`${styles.mailboxPane} ${
            mobilePane === 'mailboxes' ? styles.mobilePaneVisible : styles.mobilePaneHidden
          }`}
        >
          <div className={styles.mailboxHeader}>
            <div className={styles.mailboxHeaderTop}>
              <span>Real People & VIPs</span>
              {showSuppressedJunk && (
                <Button
                  onClick={() => setShowSuppressedJunk(false)}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={styles.mailboxToggle}
                >
                  Clear Filters
                </Button>
              )}
            </div>
            <div className={styles.mailboxSubnote}>
              Verified human entities and prioritized forensic targets
            </div>
            <div className={styles.searchWrap}>
              <SearchField
                ref={searchRef}
                data-testid="email-search-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search threads"
                density="compact"
                rootClassName={styles.searchFieldRoot}
              />
            </div>
            <div className={styles.tabPills}>
              {tabsWithData.map((option) => (
                <Button
                  key={option.id}
                  onClick={() => setActiveTab(option.id as Parameters<typeof setActiveTab>[0])}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`${styles.tabPill} ${
                    activeTab === option.id ? styles.tabPillActive : styles.tabPillInactive
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <div className={styles.densityRow}>
              <div className={styles.densityToggle}>
                <Button
                  onClick={() => setDensity('comfortable')}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`${styles.densityButton} ${
                    density === 'comfortable'
                      ? styles.densityButtonActive
                      : styles.densityButtonInactive
                  }`}
                >
                  Comfortable
                </Button>
                <Button
                  onClick={() => setDensity('compact')}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={`${styles.densityButton} ${
                    density === 'compact'
                      ? styles.densityButtonActive
                      : styles.densityButtonInactive
                  }`}
                >
                  Compact
                </Button>
              </div>
              <div className={styles.filterCountText}>
                {activeQuickFilterCount > 0
                  ? `${activeQuickFilterCount} active filter${activeQuickFilterCount > 1 ? 's' : ''}`
                  : 'No active filters'}
              </div>
            </div>
          </div>

          <div className={styles.paneBody}>
            {mailboxesLoading ? (
              <div className={styles.stateLoading}>
                <Icon name="Loader2" className={styles.loaderInline} /> Loading mailboxes
              </div>
            ) : mailboxesError ? (
              <div className={styles.stateError}>{mailboxesError}</div>
            ) : mailboxes.length === 0 ? (
              <EmptyCorpus
                icon="Inbox"
                title="No Mailboxes"
                body="Email archives are imported from .mbox or .pst files during ingestion. No mailbox data has been loaded into the corpus yet — run the email ingestion pipeline to populate this section."
              />
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
                          updateUrlState({ pane: 'threads' });
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

        <div
          className={`${styles.paneResizer} ${styles.desktopOnly}`}
          onMouseDown={startResize()}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize mailbox pane"
        />

        <section
          className={`${styles.threadPane} ${
            mobilePane === 'threads' ? styles.threadPaneVisible : styles.threadPaneHidden
          }`}
        >
          <div className={styles.paneHeader}>
            <div className={styles.threadHeaderLeft}>
              <Button
                onClick={() => updateUrlState({ pane: 'mailboxes' })}
                type="button"
                variant="ghost"
                size="sm"
                iconOnly
                className={`${styles.backButtonMobile} ${styles.mobileOnly}`}
              >
                <Icon name="ArrowLeft" className={styles.backIcon} />
              </Button>
              <span className={styles.threadLabel}>Conversations</span>
            </div>
            <div className={styles.threadCount}>{threadsTotal.toLocaleString()} total</div>
          </div>
          <div className={styles.paneSubheader}>
            <div className={styles.threadMetaRow}>
              <span>
                {threads.length.toLocaleString()} of {threadsTotal.toLocaleString()} threads
              </span>
              <span
                className={styles.metadataOnly}
                title="Thread lists are metadata-only; message bodies are lazy-loaded."
              >
                <Icon name="ShieldCheck" className={styles.metadataOnlyIcon} />
                Metadata-only list
              </span>
            </div>
            <div className={styles.headerActions}>
              <Button
                onClick={() => setShowFilterPanel((prev) => !prev)}
                type="button"
                variant="ghost"
                size="sm"
                className={`${styles.filterToggleButton} ${
                  showFilterPanel ? styles.filterToggleActive : styles.filterToggleInactive
                }`}
                title="Show or hide conversation filters"
              >
                <Icon name="SlidersHorizontal" className={styles.slidersIcon} />
                Filters
                {activeQuickFilterCount > 0 && (
                  <span className={styles.filterCountBadge}>{activeQuickFilterCount}</span>
                )}
                <Icon
                  name="ChevronDown"
                  className={`${styles.chevronSmallIcon} ${showFilterPanel ? styles.rotate180 : ''}`}
                />
              </Button>
              <Button
                onClick={clearQuickFilters}
                type="button"
                variant="ghost"
                size="sm"
                className={styles.clearButton}
                disabled={activeQuickFilterCount === 0}
              >
                <Icon name="X" className={styles.xIcon} />
                Clear
              </Button>
            </div>
          </div>
          {showFilterPanel && (
            <div className={styles.filterPanel}>
              <div className={styles.filterGrid}>
                <div className={styles.filterLead}>
                  Refine by sender, recipient, date, attachments, and risk.
                </div>
                <div className={styles.filterFormGrid}>
                  <label className={styles.filterField}>
                    <span className={styles.filterLabel}>From</span>
                    <TextInput
                      value={fromFilter}
                      onChange={(event) => setFromFilter(event.target.value)}
                      placeholder="sender@domain.com or name"
                      aria-label="From"
                      density="compact"
                      className={styles.filterTextInput}
                    />
                  </label>
                  <label className={styles.filterField}>
                    <span className={styles.filterLabel}>To</span>
                    <TextInput
                      value={toFilter}
                      onChange={(event) => setToFilter(event.target.value)}
                      placeholder="recipient@domain.com or name"
                      aria-label="To"
                      density="compact"
                      className={styles.filterTextInput}
                    />
                  </label>
                  <label className={styles.filterField}>
                    <span className={styles.filterLabel}>Date From</span>
                    <TextInput
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      type="date"
                      aria-label="Date from"
                      density="compact"
                      className={styles.filterDateInput}
                    />
                  </label>
                  <label className={styles.filterField}>
                    <span className={styles.filterLabel}>Date To</span>
                    <TextInput
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      type="date"
                      aria-label="Date to"
                      density="compact"
                      className={styles.filterDateInput}
                    />
                  </label>
                </div>

                <div className={styles.filterQuickRow}>
                  <span className={styles.quickLabel}>Quick Toggles</span>
                  <Button
                    onClick={() => setHasAttachmentsOnly((prev) => !prev)}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`${styles.toggleChip} ${
                      hasAttachmentsOnly ? styles.toggleChipActive : styles.toggleChipInactive
                    }`}
                  >
                    Has attachments
                  </Button>
                  <div className={styles.riskPicker}>
                    <span className={styles.riskLabel}>Min Risk</span>
                    <Select
                      value={minRisk}
                      onChange={(event) => setMinRisk(Number(event.target.value))}
                      options={minRiskOptions}
                      size="sm"
                      className={styles.riskSelect}
                      aria-label="Minimum risk"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.threadPaneBody}>
            {activeTab === 'analytics' ? (
              <div style={{ padding: 'var(--space-5)', height: '100%', overflowY: 'auto' }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h3
                    style={{
                      margin: 0,
                      color: 'var(--text-primary)',
                      fontSize: '1.25rem',
                      fontWeight: 'var(--weight-light)',
                    }}
                  >
                    Forensic Communication Heatmap
                  </h3>
                  <p
                    style={{
                      margin: 'var(--space-1) 0 0',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Pairwise communication frequency analysis mapped between foreclosure targets and
                    senders.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {(analyticsData?.matrix || []).map((item, idx) => {
                    const maxVal = Math.max(
                      ...(analyticsData?.matrix || []).map((m) => m.count),
                      1,
                    );
                    const percent = (item.count / maxVal) * 100;
                    return (
                      <Surface
                        key={idx}
                        variant="glass"
                        style={{
                          padding: 'var(--space-4)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <Flex
                          justify="between"
                          align="center"
                          style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                              flexWrap: 'wrap',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 'bold',
                                color: 'var(--accent)',
                                fontSize: '0.9rem',
                              }}
                            >
                              {item.sender}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              ➔
                            </span>
                            <span
                              style={{
                                fontWeight: 'bold',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                              }}
                            >
                              {item.recipient}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              color: 'var(--status-success)',
                            }}
                          >
                            {item.count} messages
                          </span>
                        </Flex>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                background:
                                  'linear-gradient(90deg, var(--accent), var(--status-success))',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      </Surface>
                    );
                  })}
                  {(!analyticsData || (analyticsData?.matrix || []).length === 0) && (
                    <div
                      style={{
                        padding: 'var(--space-6)',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      No analytical communications data has been indexed for this mailbox yet.
                    </div>
                  )}
                </div>
              </div>
            ) : threadsLoading ? (
              <div className={styles.stateLoading}>
                <Icon name="Loader2" className={styles.loaderInline} /> Loading conversations
              </div>
            ) : threadsError ? (
              <div className={styles.stateError}>{threadsError}</div>
            ) : threads.length === 0 ? (
              searchInput || activeTab !== 'all' ? (
                <div className={styles.stateEmpty}>
                  <div className={styles.emptyTitle}>No conversations match these filters</div>
                  <p>
                    {searchInput
                      ? `No threads contain "${searchInput}" in this mailbox.`
                      : `The "${activeTab}" tab returned no threads for this mailbox.`}
                  </p>
                  <div className={styles.emptyActions}>
                    <Button
                      onClick={() => setActiveTab('all')}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={styles.emptyActionButton}
                    >
                      Use All tab
                    </Button>
                    <Button
                      onClick={() => setSearchInput('')}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={styles.emptyActionButton}
                    >
                      Clear search
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyCorpus
                  icon="Mail"
                  title="No Emails in This Mailbox"
                  body="This mailbox is empty. Email archives are imported from .mbox or .pst source files during ingestion. If you expected messages here, ensure the ingestion pipeline has been run for this mailbox."
                />
              )
            ) : (
              <AutoSizer
                renderProp={({ height, width }) =>
                  height && width ? (
                    <List
                      height={height}
                      width={width}
                      itemCount={threads.length}
                      itemSize={threadRowHeight}
                      initialScrollOffset={threadScrollOffset}
                      onScroll={onThreadScroll}
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

          <div className={styles.footerBar}>
            {canLoadMore ? (
              <Button
                onClick={() => {
                  if (!threadsNextCursor || loadingMoreThreads) return;
                  void loadThreads(threadsNextCursor, true);
                }}
                type="button"
                variant="secondary"
                size="sm"
                className={styles.loadMoreButton}
                disabled={loadingMoreThreads}
              >
                {loadingMoreThreads ? 'Loading...' : 'Load more'}
              </Button>
            ) : (
              <div className={styles.endText}>End of results</div>
            )}
          </div>
        </section>
        <section
          className={`${styles.contentPane} ${styles.contentPaneShell} ${
            mobilePane === 'messages' ? styles.threadPaneVisible : styles.threadPaneHidden
          }`}
        >
          {selectedThreadId ? (
            threadLoading && !selectedThread ? (
              <div className={styles.stateLoading}>
                <Icon name="Loader2" className={styles.loaderInline} /> Opening thread
              </div>
            ) : threadError ? (
              <div className={styles.stateError}>{threadError}</div>
            ) : selectedThread ? (
              isMobile ? (
                <div className={styles.fullScreenMobile}>
                  <MobileStackHeader
                    title={selectedThread.subject}
                    subtitle={`${selectedThread.messages.length} messages · ${selectedMailbox?.displayName || 'Archive'}`}
                    onBack={() => goBack('/emails')}
                  />
                  <div className={styles.fullScreenContent}>
                    <div className={styles.messageThread}>
                      {selectedThread.messages.map((message) => {
                        const expanded = Boolean(expandedMessages[message.messageId]);
                        const body = bodyState[message.messageId];
                        return (
                          <article
                            key={message.messageId}
                            className={`${styles.messageCard} ${expanded ? styles.expanded : ''}`}
                          >
                            <Button
                              onClick={() => handleToggleMessage(message.messageId, !expanded)}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={styles.messageToggle}
                            >
                              <div className={styles.messageHeader}>
                                <div className={styles.messageMetaMain}>
                                  <div className={styles.messageFromRow}>
                                    <div className={styles.messageFrom}>{message.from}</div>
                                    <div className={styles.messageTime}>
                                      {formatTime(message.date)}
                                    </div>
                                  </div>
                                </div>
                                <Icon
                                  name="ChevronRight"
                                  className={`${styles.chevronIcon} ${expanded ? styles.rotate90 : ''}`}
                                />
                              </div>
                            </Button>
                            {expanded && (
                              <div className={styles.messageBody}>
                                <div className={styles.messageActionRow}>
                                  <Button
                                    onClick={() => void copyText(`message_id=${message.messageId}`)}
                                    variant="secondary"
                                    size="sm"
                                  >
                                    Citation
                                  </Button>
                                  <Button
                                    onClick={() => handleToggleQuoted(message.messageId)}
                                    variant="secondary"
                                    size="sm"
                                  >
                                    History
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      navigate(`/documents/${message.messageId}`, {
                                        state: backLinkState,
                                      })
                                    }
                                    variant="primary"
                                    size="sm"
                                  >
                                    Evidence
                                  </Button>
                                </div>
                                <div className={styles.mimeContent}>
                                  {body?.loading
                                    ? 'Loading...'
                                    : body?.data?.cleanedText || 'No body content.'}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <ViewerShell
                  header={
                    <div className={styles.viewerHeaderMeta}>
                      <div className={styles.subjectLine}>{selectedThread.subject}</div>
                      <div className={styles.viewerHeaderSub}>
                        {selectedThread.messages.length.toLocaleString()} messages · mailbox{' '}
                        {selectedMailbox?.displayName || 'All'}
                      </div>
                    </div>
                  }
                  actions={
                    <div data-testid="email-thread-actions" className={styles.viewerActions}>
                      <Button
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            updateUrlState({ pane: 'threads' });
                          } else {
                            setSelectedThreadId(null);
                            updateUrlState({ threadId: null, messageId: null });
                          }
                        }}
                        type="button"
                        variant="ghost"
                        size="sm"
                        iconOnly
                        className={styles.backToThreadsButton}
                      >
                        <Icon name="ArrowLeft" className={styles.backIcon} />
                      </Button>
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
                        className={styles.backToThreadsButton}
                      />
                    </div>
                  }
                  className={styles.viewerShellRoot}
                  headerClassName={styles.viewerShellHeader}
                  bodyClassName={styles.viewerShellBody}
                >
                  <div className={styles.messageThread}>
                    {selectedThread.messages.map((message) => {
                      const expanded = Boolean(expandedMessages[message.messageId]);
                      const body = bodyState[message.messageId];
                      const citation = `message_id=${message.messageId}; date=${message.date}; mailbox=${selectedMailbox?.displayName || 'All'}; ingest_run_id=${message.ingestRunId ?? 'unknown'}`;

                      return (
                        <article
                          key={message.messageId}
                          className={`${styles.messageCard} ${expanded ? styles.expanded : ''}`}
                          data-message-id={message.messageId}
                        >
                          <Button
                            onClick={() => handleToggleMessage(message.messageId, !expanded)}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={styles.messageToggle}
                          >
                            <div className={styles.messageHeader}>
                              <div className={styles.messageAvatar}>
                                <Icon name="User" className={styles.messageAvatarIcon} />
                              </div>
                              <div className={styles.messageMetaMain}>
                                <div className={styles.messageFromRow}>
                                  <div className={styles.messageFrom}>
                                    {message.from || 'Unknown Sender'}
                                  </div>
                                  <div className={styles.messageTime}>
                                    {formatTime(message.date)}
                                  </div>
                                </div>
                                <div className={styles.messageTo}>
                                  To: {message.to.join(' · ') || 'Unknown recipient'}
                                </div>
                              </div>
                              <Icon
                                name="ChevronRight"
                                className={`${styles.chevronIcon} ${expanded ? styles.rotate90 : ''}`}
                              />
                            </div>
                          </Button>

                          {expanded && (
                            <div className={`${styles.messageBody} ${styles.messageBodyExpanded}`}>
                              <div className={styles.messageTagRow}>
                                <div
                                  className={`${styles.messageTagPill} ${ladderTone(message.ladder)}`}
                                >
                                  LADDER: {message.ladder || 'N/A'}
                                </div>
                                <div
                                  className={`${styles.messageTagPill} ${styles.messagePillMuted}`}
                                >
                                  CONFIDENCE:{' '}
                                  {typeof message.confidence === 'number'
                                    ? (message.confidence * 100).toFixed(0)
                                    : '0'}
                                  %
                                </div>
                                <div
                                  className={`${styles.messageTagPill} ${styles.messagePillSecondary}`}
                                >
                                  ID: {message.ingestRunId || 'RAW_INGEST'}
                                </div>
                                {message.wasAgentic && (
                                  <div className={styles.agenticBadge}>
                                    <Icon name="Sparkles" className={styles.agenticIcon} />
                                    Agentic Highlighting
                                  </div>
                                )}
                              </div>

                              <div className={styles.messageActionRow}>
                                <Button
                                  onClick={() => void copyText(citation)}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={styles.messageActionButton}
                                >
                                  Copy Citation
                                </Button>
                                <Button
                                  onClick={() => handleToggleRaw(message.messageId)}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={styles.messageActionButton}
                                >
                                  {body?.showRaw ? 'Show Cleaned' : 'View MIME'}
                                </Button>
                                <Button
                                  onClick={() => handleToggleQuoted(message.messageId)}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={styles.messageActionButton}
                                >
                                  {body?.showQuoted ? 'Hide History' : 'Show History'}
                                </Button>
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
                                  className={styles.messageActionButton}
                                />
                              </div>

                              <div data-testid="email-message-body" className={styles.mimeContent}>
                                {body?.loading ? (
                                  <div className={styles.bodyLoading}>
                                    <Icon name="Loader2" className={styles.bodyLoaderIcon} />
                                    <span className={styles.bodyLoadingLabel}>
                                      Decompressing MIME Stream
                                    </span>
                                  </div>
                                ) : body?.error ? (
                                  <div className={styles.bodyError}>{body.error}</div>
                                ) : body?.showRaw ? (
                                  <pre className={styles.rawPre}>
                                    {body.raw || 'No raw content available.'}
                                  </pre>
                                ) : (
                                  <div className={styles.cleanBody}>
                                    {body?.data?.cleanedText || 'No readable body available.'}
                                  </div>
                                )}
                              </div>

                              {(message.linkedEntities || []).length > 0 && (
                                <div className={styles.entityPills}>
                                  {(message.linkedEntities || []).map((entity) => (
                                    <Button
                                      key={`${message.messageId}-${entity.entityId}`}
                                      onClick={() => setSelectedEntityId(String(entity.entityId))}
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className={styles.entityChip}
                                      title={`Open entity ${entity.name}`}
                                    >
                                      <Icon name="User" className={styles.entityChipIcon} />
                                      {entity.name}
                                    </Button>
                                  ))}
                                </div>
                              )}

                              {(message.attachmentsMeta || []).length > 0 && (
                                <div className={styles.attachmentSection}>
                                  <div className={styles.attachmentTitle}>
                                    <Icon name="Paperclip" className={styles.entityChipIcon} />
                                    Forensic Attachments ({(message.attachmentsMeta || []).length})
                                  </div>
                                  <div className={styles.attachmentGrid}>
                                    {(message.attachmentsMeta || []).map((attachment, index) => {
                                      const linkedDocumentId = attachment.linkedDocumentId;
                                      const canOpen = Boolean(linkedDocumentId);
                                      return (
                                        <div
                                          key={`${message.messageId}-attachment-${index}`}
                                          className={styles.attachmentCard}
                                        >
                                          <div className={styles.attachmentInfo}>
                                            <div className={styles.attachmentName}>
                                              {attachment.filename || `Attachment ${index + 1}`}
                                            </div>
                                            <div className={styles.attachmentMeta}>
                                              {attachment.mimeType || 'UNKNOWN_MIME'} ·{' '}
                                              {attachment.size
                                                ? `${(attachment.size / 1024).toFixed(1)}KB`
                                                : 'SIZE_UNKNOWN'}
                                            </div>
                                          </div>
                                          {canOpen ? (
                                            <Button
                                              onClick={() =>
                                                navigate(
                                                  `/documents/${encodeURIComponent(
                                                    String(linkedDocumentId),
                                                  )}`,
                                                  { state: backLinkState },
                                                )
                                              }
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className={styles.attachmentOpenButton}
                                            >
                                              Open
                                            </Button>
                                          ) : (
                                            <span className={styles.attachmentMissingWrap}>
                                              <span className={styles.attachmentMissing}>
                                                Not Ingested
                                              </span>
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
              )
            ) : (
              <div className={styles.stateNotFound}>Thread not found.</div>
            )
          ) : threadError ? (
            <div className={styles.stateError}>{threadError}</div>
          ) : (
            <div className={styles.placeholderState}>
              <div className={styles.placeholderInner}>
                <Icon name="Mail" className={styles.placeholderIcon} />
                <div className={styles.placeholderTitle}>Investigation-grade Email Workspace</div>
                <p className={styles.placeholderBody}>
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
