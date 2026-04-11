import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilters } from '../../../contexts/useFilters';
import { useEmailWorkspaceData } from '../../../hooks/useEmailWorkspaceData';
import { EvidenceModal } from '../../common/EvidenceModal';
import { MobileEmailBottomNav, type EmailDest } from './MobileEmailBottomNav';
import { MobileMailboxList } from './MobileMailboxList';
import { MobileThreadList } from './MobileThreadList';
import { MobileMessageView } from './MobileMessageView';
import { MobileEmailFilterSheet } from './MobileEmailFilterSheet';
import styles from './MobileEmailShell.module.css';

export function MobileEmailShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkedMessageId = searchParams.get('messageId') || searchParams.get('id');
  const { filters: globalFilters } = useFilters();

  const [activeDest, setActiveDest] = useState<EmailDest>('threads');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [showSuppressedJunk, setShowSuppressedJunk] = useState(false);

  const [selectedMailboxId, setSelectedMailboxId] = useState(
    searchParams.get('mailboxId') ?? 'all',
  );
  const [activeTab, setActiveTab] = useState<'all' | 'primary' | 'updates' | 'promotions'>(
    (searchParams.get('tab') ?? 'all') as 'all' | 'primary' | 'updates' | 'promotions',
  );
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') ?? '');
  const [fromFilter, setFromFilter] = useState(searchParams.get('from') ?? '');
  const [toFilter, setToFilter] = useState(searchParams.get('to') ?? '');
  const [dateFrom, setDateFrom] = useState(
    searchParams.get('dateFrom') ?? globalFilters.timeRange[0] ?? '',
  );
  const [dateTo, setDateTo] = useState(
    searchParams.get('dateTo') ?? globalFilters.timeRange[1] ?? '',
  );
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(
    searchParams.get('hasAttachments') === '1',
  );
  const [minRisk, setMinRisk] = useState(Number(searchParams.get('minRisk') ?? 0));

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

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    const timer = window.setTimeout(() => setDebouncedSearch(value.trim()), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const {
    mailboxes,
    mailboxesLoading: _mailboxesLoading,
    threads,
    threadsLoading,
    threadsError,
    threadsHasMore,
    threadsNextCursor,
    threadsTotal,
    loadingMoreThreads,
    selectedThreadId,
    selectedThread,
    threadLoading,
    expandedMessages,
    bodyState,
    loadThreads,
    handleOpenThread: baseHandleOpenThread,
    handleToggleMessage,
    handleToggleRaw,
    handleToggleQuoted,
  } = useEmailWorkspaceData({
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
    updateUrlState,
  });

  const handleOpenThread = useCallback(
    (threadId: string) => {
      baseHandleOpenThread(threadId);
      setActiveDest('message');
    },
    [baseHandleOpenThread],
  );

  const handleSelectMailbox = useCallback((mailboxId: string) => {
    setSelectedMailboxId(mailboxId);
    setActiveDest('threads');
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!threadsNextCursor || loadingMoreThreads) return;
    void loadThreads(threadsNextCursor, true);
  }, [threadsNextCursor, loadingMoreThreads, loadThreads]);

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setFromFilter('');
    setToFilter('');
    setDateFrom('');
    setDateTo('');
    setHasAttachmentsOnly(false);
    setMinRisk(0);
    setActiveTab('all');
  }, []);

  const activeFilterCount = [
    debouncedSearch.length > 0,
    fromFilter.trim().length > 0,
    toFilter.trim().length > 0,
    dateFrom.length > 0,
    dateTo.length > 0,
    hasAttachmentsOnly,
    minRisk > 0,
    activeTab !== 'all',
  ].filter(Boolean).length;

  const selectedMailbox =
    mailboxes.find((m) => m.mailboxId === selectedMailboxId) ?? mailboxes[0] ?? null;

  const mailboxName = selectedMailbox?.displayName ?? 'All Mailboxes';

  return (
    <div className={styles.root}>
      <div className={styles.screenHeader}>
        <span className={styles.appTitle}>Mail</span>
        {activeFilterCount > 0 && (
          <span className={styles.filterCount}>
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
          </span>
        )}
      </div>

      <div className={styles.content}>
        {activeDest === 'mailboxes' && (
          <MobileMailboxList
            mailboxes={mailboxes}
            selectedMailboxId={selectedMailboxId}
            onSelect={handleSelectMailbox}
            showSuppressedJunk={showSuppressedJunk}
            onToggleJunk={() => setShowSuppressedJunk((prev) => !prev)}
          />
        )}

        {activeDest === 'threads' && (
          <MobileThreadList
            mailboxName={mailboxName}
            threads={threads}
            threadsTotal={threadsTotal}
            threadsLoading={threadsLoading}
            threadsError={threadsError}
            loadingMore={loadingMoreThreads}
            hasMore={threadsHasMore}
            selectedThreadId={selectedThreadId}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            onOpenThread={handleOpenThread}
            onLoadMore={handleLoadMore}
          />
        )}

        {activeDest === 'message' && selectedThread ? (
          <MobileMessageView
            thread={selectedThread}
            selectedMailbox={selectedMailbox}
            expandedMessages={expandedMessages}
            bodyState={bodyState}
            threadLoading={threadLoading}
            onBack={() => setActiveDest('threads')}
            onToggleMessage={handleToggleMessage}
            onToggleRaw={(id) => void handleToggleRaw(id)}
            onToggleQuoted={handleToggleQuoted}
            onEntityClick={setSelectedEntityId}
          />
        ) : activeDest === 'message' ? (
          <div className={styles.noThread}>Select a thread to read messages</div>
        ) : null}
      </div>

      <MobileEmailBottomNav
        activeDest={activeDest}
        onSetActiveDest={setActiveDest}
        hasSelectedThread={Boolean(selectedThreadId)}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFilterOpen(true)}
      />

      {filterOpen && (
        <MobileEmailFilterSheet
          searchInput={searchInput}
          fromFilter={fromFilter}
          toFilter={toFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          hasAttachmentsOnly={hasAttachmentsOnly}
          minRisk={minRisk}
          activeTab={activeTab}
          onSearchChange={handleSearchChange}
          onFromChange={setFromFilter}
          onToChange={setToFilter}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onHasAttachmentsChange={setHasAttachmentsOnly}
          onMinRiskChange={setMinRisk}
          onTabChange={setActiveTab}
          onClear={handleClearFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {selectedEntityId && (
        <EvidenceModal
          entityId={selectedEntityId}
          isOpen={Boolean(selectedEntityId)}
          onClose={() => setSelectedEntityId(null)}
        />
      )}
    </div>
  );
}
