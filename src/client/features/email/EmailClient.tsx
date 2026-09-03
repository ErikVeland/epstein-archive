import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import styles from './EmailClient.module.css';
import { FixedSizeList as List } from 'react-window';
import { useListScrollRestoration } from '@client/hooks/useListScrollRestoration';
import {
  useBackLinkState,
  useReliableBackNavigation,
} from '@client/hooks/useReliableBackNavigation';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import Icon from '@client/components/common/Icon';
import { AnimatedSegmentedControl } from '@client/components/common/AnimatedSegmentedControl';
import { EvidenceModal } from '@client/components/common/EvidenceModal';
import { useEmailWorkspaceData } from '@client/hooks/useEmailWorkspaceData';
import { EmptyCorpus } from '@client/components/common/EmptyCorpus';
import { isJunkEntity } from '@client/utils/entityFilters';
import { EmailSettingsModal } from './EmailSettingsModal';
import { EmailThreadRow, type EmailDensity } from './EmailThreadRow';
import { Button, SearchField } from '@client/design-system/lib';
import { EmailMailboxSidebar } from './EmailMailboxSidebar';
import { EmailFilterPanel } from './EmailFilterPanel';
import { EmailAnalyticsPane } from './EmailAnalyticsPane';
import { EmailContentPane } from './EmailContentPane';
import { EmailNarrativeView } from './EmailNarrativeView';

export const EmailClient: React.FC = () => {
  const backLinkState = useBackLinkState();
  const { goBack } = useReliableBackNavigation('/emails');
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedMessageId = searchParams.get('messageId') || searchParams.get('id');
  const deepLinkedThreadId = searchParams.get('threadId');
  const showSuppressedJunk = searchParams.get('showSuppressedJunk') === '1';

  const [collection, setCollection] = useState<'all' | 'curated'>(() => {
    if (searchParams.get('collection') === 'all') return 'all';
    if (deepLinkedMessageId || deepLinkedThreadId) return 'all';
    return 'curated';
  });

  const selectedMailboxId = searchParams.get('mailboxId') || 'all';
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
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(
    searchParams.get('hasAttachments') === '1',
  );
  const [minRisk, setMinRisk] = useState(Number(searchParams.get('minRisk') || 0));
  const [topic, setTopic] = useState(searchParams.get('topic') || '');
  const [sortBy, setSortBy] = useState<'date' | 'subject' | 'views' | 'stars' | 'participants'>(
    (searchParams.get('sortBy') as
      | 'date'
      | 'subject'
      | 'views'
      | 'stars'
      | 'participants'
      | null) || 'date',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ||
      (collection === 'curated' ? 'asc' : 'desc'),
  );
  const [isNavigatingRandom, setIsNavigatingRandom] = useState(false);

  const [showYahooPostMortem, setShowYahooPostMortem] = useState(
    searchParams.get('showYahooPostMortem') !== '0',
  );
  const [showEmptyBodies, setShowEmptyBodies] = useState(
    searchParams.get('showEmptyBodies') !== '0',
  );
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const density: EmailDensity =
    searchParams.get('density') === 'compact' ? 'compact' : 'comfortable';

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
  const rawPane = searchParams.get('pane') ?? 'threads';
  const mobilePane: MobilePane = VALID_PANES.has(rawPane) ? (rawPane as MobilePane) : 'threads';

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

  const handleToggleSetting = useCallback(
    (setting: 'showYahooPostMortem' | 'showEmptyBodies', val: boolean) => {
      if (setting === 'showYahooPostMortem') setShowYahooPostMortem(val);
      if (setting === 'showEmptyBodies') setShowEmptyBodies(val);
      updateUrlState({ [setting]: val ? null : '0' });
    },
    [updateUrlState],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    mailboxes: rawMailboxes,
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
    showYahooPostMortem,
    showEmptyBodies,
    topic,
    collection,
    sortBy,
    sortOrder,
    updateUrlState,
  });

  const mailboxes = useMemo(() => {
    if (showSuppressedJunk) return rawMailboxes;
    return rawMailboxes.filter((m) => m.mailboxId === 'all' || !isJunkEntity(m.displayName));
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

  const canLoadMore = threadsHasMore && !!threadsNextCursor;
  const threadRowHeight = density === 'compact' ? 42 : 96;

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
    topic.length > 0,
    fromFilter.trim().length > 0,
    toFilter.trim().length > 0,
    dateFrom.length > 0,
    dateTo.length > 0,
    hasAttachmentsOnly,
    minRisk > 0,
    activeTab !== 'all',
  ].filter(Boolean).length;

  const handleHeaderSort = useCallback((col: typeof sortBy) => {
    setSortBy((prevCol) => {
      if (prevCol === col) {
        setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
        return col;
      }
      setSortOrder('desc');
      return col;
    });
  }, []);

  const handleRandomEmail = async () => {
    if (isNavigatingRandom) return;
    setIsNavigatingRandom(true);
    try {
      const { apiClient } = await import('@client/services/apiClient');
      const { threadId } = await apiClient.getRandomEmailThread();
      handleOpenThread(threadId);
    } catch (err) {
      console.error('Failed to get random email', err);
    } finally {
      setIsNavigatingRandom(false);
    }
  };

  const showCuratedCollection = useCallback(() => {
    setCollection('curated');
    setActiveTab('all');
    setSortBy('date');
    setSortOrder('asc');
  }, []);

  const showArchiveCollection = useCallback((tab: 'all' | 'promotions' = 'all') => {
    setCollection('all');
    setActiveTab(tab);
    setSortBy('date');
    setSortOrder('desc');
  }, []);

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
        <EmailMailboxSidebar
          mobilePane={mobilePane}
          mailboxes={mailboxes}
          selectedMailboxId={selectedMailboxId}
          topic={topic}
          onTopicChange={setTopic}
          onPersonClick={(name) => {
            setSearchInput(name);
            setDebouncedSearch(name);
          }}
        />

        <section
          className={`${styles.threadPane} ${
            mobilePane === 'threads' ? styles.threadPaneVisible : styles.threadPaneHidden
          } ${!isMobile && selectedThreadId ? styles.hiddenPane : ''}`}
        >
          <div className={styles.subTabBar}>
            <Button
              unstyled
              type="button"
              className={`${styles.subTabItem} ${
                collection === 'curated' ? styles.subTabItemActive : ''
              }`}
              onClick={showCuratedCollection}
            >
              <Icon name="History" />
              <span>Key correspondence</span>
            </Button>
            <Button
              unstyled
              type="button"
              className={`${styles.subTabItem} ${
                collection === 'all' && activeTab === 'all' ? styles.subTabItemActive : ''
              }`}
              onClick={() => showArchiveCollection('all')}
            >
              <Icon name="Inbox" />
              <span>Full archive</span>
            </Button>
            <Button
              unstyled
              type="button"
              className={`${styles.subTabItem} ${
                collection === 'all' && activeTab === 'promotions' ? styles.subTabItemActive : ''
              }`}
              onClick={() => showArchiveCollection('promotions')}
            >
              <Icon name="Tags" />
              <span>Promotions</span>
              <span className={styles.subTabNewBadge}>6104 new</span>
            </Button>
            <Button
              unstyled
              type="button"
              className={styles.subTabItem}
              onClick={handleRandomEmail}
              disabled={isNavigatingRandom}
            >
              <Icon
                name={isNavigatingRandom ? 'Loader2' : 'Dices'}
                className={isNavigatingRandom ? styles.spin : ''}
              />
              <span>Random Email</span>
            </Button>
          </div>
          <div
            className={`${styles.paneHeader} ${
              collection === 'curated' ? styles.curatedPaneHeader : ''
            }`}
          >
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
              <span className={styles.threadLabel}>
                {collection === 'curated' ? 'Correspondence timeline' : 'Conversations'}
              </span>
            </div>
            <div className={styles.threadCount}>
              <div className={styles.densityToolbar}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Density:
                </span>
                <AnimatedSegmentedControl<EmailDensity>
                  ariaLabel="Email density"
                  compact
                  minItemWidth="6.25rem"
                  className={styles.densityToggle}
                  itemClassName={styles.densityButton}
                  options={[
                    { value: 'comfortable', label: 'Comfortable' },
                    { value: 'compact', label: 'Compact' },
                  ]}
                  value={density}
                  onChange={(nextDensity) =>
                    updateUrlState({
                      density: nextDensity === 'compact' ? 'compact' : null,
                    })
                  }
                />
                <Button
                  unstyled
                  type="button"
                  className={styles.gearBtn}
                  title="Inbox Settings"
                  onClick={() => setIsSettingsModalOpen(true)}
                >
                  <Icon name="Settings" size="sm" />
                </Button>
              </div>
            </div>
          </div>
          <div className={styles.paneSubheader}>
            <div className={styles.threadMetaRow}>
              <span>
                {threads.length.toLocaleString()} of {threadsTotal.toLocaleString()}{' '}
                {collection === 'curated' ? 'curated threads' : 'threads'}
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
            <EmailFilterPanel
              fromFilter={fromFilter}
              toFilter={toFilter}
              dateFrom={dateFrom}
              dateTo={dateTo}
              hasAttachmentsOnly={hasAttachmentsOnly}
              minRisk={minRisk}
              onFromChange={setFromFilter}
              onToChange={setToFilter}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onAttachmentToggle={() => setHasAttachmentsOnly((prev) => !prev)}
              onMinRiskChange={setMinRisk}
            />
          )}

          <div className={styles.threadPaneBody}>
            {activeTab === 'analytics' ? (
              <EmailAnalyticsPane analyticsData={analyticsData} />
            ) : threadsLoading ? (
              <div className={styles.stateLoading}>
                <Icon name="Loader2" className={styles.loaderInline} /> Loading conversations
              </div>
            ) : threadsError ? (
              <div className={styles.stateError}>{threadsError}</div>
            ) : threads.length === 0 ? (
              collection === 'curated' && !searchInput && activeTab === 'all' ? (
                <div className={styles.stateEmpty}>
                  <div className={styles.emptyTitle}>No key correspondence in this mailbox</div>
                  <p>
                    This reading path only includes multi-message correspondence linked to at least
                    two people in the archive's key-person index.
                  </p>
                  <div className={styles.emptyActions}>
                    <Button
                      onClick={() => showArchiveCollection('all')}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={styles.emptyActionButton}
                    >
                      Open full archive
                    </Button>
                  </div>
                </div>
              ) : searchInput || activeTab !== 'all' ? (
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
            ) : collection === 'curated' ? (
              <EmailNarrativeView
                threads={threads}
                selectedThreadId={selectedThreadId}
                onOpen={handleOpenThread}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className={styles.tableHeader}>
                  <Button
                    unstyled
                    type="button"
                    className={`${styles.headerCol} ${sortBy === 'stars' ? styles.activeSortCol : ''}`}
                    onClick={() => handleHeaderSort('stars')}
                  >
                    <span>Stars/Views</span>
                    {sortBy === 'stars' && (
                      <Icon
                        name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                        className={styles.sortIcon}
                      />
                    )}
                  </Button>
                  <Button
                    unstyled
                    type="button"
                    className={`${styles.headerCol} ${sortBy === 'participants' ? styles.activeSortCol : ''}`}
                    onClick={() => handleHeaderSort('participants')}
                  >
                    <span>From</span>
                    {sortBy === 'participants' && (
                      <Icon
                        name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                        className={styles.sortIcon}
                      />
                    )}
                  </Button>
                  <Button
                    unstyled
                    type="button"
                    className={`${styles.headerCol} ${sortBy === 'subject' ? styles.activeSortCol : ''}`}
                    onClick={() => handleHeaderSort('subject')}
                  >
                    <span>Subject / Preview</span>
                    {sortBy === 'subject' && (
                      <Icon
                        name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                        className={styles.sortIcon}
                      />
                    )}
                  </Button>
                  <Button
                    unstyled
                    type="button"
                    className={`${styles.headerCol} ${sortBy === 'date' ? styles.activeSortCol : ''}`}
                    onClick={() => handleHeaderSort('date')}
                  >
                    <span>Date</span>
                    {sortBy === 'date' && (
                      <Icon
                        name={sortOrder === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                        className={styles.sortIcon}
                      />
                    )}
                  </Button>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
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
                          {EmailThreadRow}
                        </List>
                      ) : null
                    }
                  />
                </div>
              </div>
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
        <EmailContentPane
          mobilePane={mobilePane}
          isMobile={isMobile}
          selectedThreadId={selectedThreadId}
          threadLoading={threadLoading}
          threadError={threadError}
          selectedThread={selectedThread}
          selectedMailbox={selectedMailbox}
          expandedMessages={expandedMessages}
          bodyState={bodyState}
          backLinkState={backLinkState}
          onToggleMessage={handleToggleMessage}
          onToggleRaw={handleToggleRaw}
          onToggleQuoted={handleToggleQuoted}
          onBack={() => goBack('/emails')}
          onClose={() => {
            if (window.innerWidth < 768) {
              updateUrlState({ pane: 'threads' });
            } else {
              setSelectedThreadId(null);
              updateUrlState({ threadId: null, messageId: null });
            }
          }}
          onSelectEntity={setSelectedEntityId}
        />
      </div>

      {selectedEntityId && (
        <EvidenceModal
          entityId={selectedEntityId}
          isOpen={Boolean(selectedEntityId)}
          onClose={() => setSelectedEntityId(null)}
        />
      )}

      {isSettingsModalOpen && (
        <EmailSettingsModal
          showYahooPostMortem={showYahooPostMortem}
          showEmptyBodies={showEmptyBodies}
          onClose={() => setIsSettingsModalOpen(false)}
          onToggleSetting={handleToggleSetting}
        />
      )}
    </div>
  );
};

export default EmailClient;
