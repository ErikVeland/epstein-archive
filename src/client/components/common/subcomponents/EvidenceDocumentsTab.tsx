import React from 'react';
import { Search, FileText } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { InfiniteLoader } from 'react-window-infinite-loader';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { EvidenceCard } from './EvidenceCard';
import s from './EvidenceDocumentsTab.module.css';

// Type-safe wrappers for virtualized components to bypass React 18/TS mismatches
const TypedAutoSizer = AutoSizer as unknown as React.ComponentType<{
  children: (props: { width: number; height: number }) => React.ReactNode;
}>;

const TypedInfiniteLoader = InfiniteLoader as unknown as React.ComponentType<{
  isItemLoaded: (index: number) => boolean;
  itemCount: number;
  loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void> | void;
  children: (props: {
    onItemsRendered: (props: {
      visibleStartIndex: number;
      visibleStopIndex: number;
      overscanStartIndex: number;
      overscanStopIndex: number;
    }) => void;
    ref: React.Ref<HTMLElement> | ((instance: HTMLElement | null) => void);
  }) => React.ReactNode;
}>;

import { EvidenceDocument } from '../EvidenceModal';

interface DocFilterUpdates {
  search?: string;
  source?: string;
  sort?: string;
}

interface EvidenceDocumentsTabProps {
  docFilters: { search: string; source: string; sort: string };
  handleFilterChange: (updates: DocFilterUpdates) => void;
  isDocsLoading: boolean;
  totalDocs: number;
  documents: EvidenceDocument[];
  loadNextPage: (startIndex: number) => Promise<void>;
  hasNextPage: boolean;
  isItemLoaded: (index: number) => boolean;
  isNextPageLoading: boolean;
  usePlainEvidenceList: boolean;
  entityName: string;
  openDocument: (id: string | number | undefined, options?: { newTab?: boolean }) => void;
}

export const EvidenceDocumentsTab: React.FC<EvidenceDocumentsTabProps> = ({
  docFilters,
  handleFilterChange,
  isDocsLoading,
  totalDocs,
  documents,
  loadNextPage,
  hasNextPage,
  isItemLoaded,
  isNextPageLoading,
  usePlainEvidenceList,
  entityName,
  openDocument,
}) => {
  return (
    <div className={s.tabContainer} data-testid="entity-modal-tab-evidence">
      {/* FILTERS TOOLBAR */}
      <div className={s.toolbar}>
        <div className={s.searchWrapper}>
          <Search className={s.searchIcon} size={18} />
          <input
            type="text"
            placeholder="Search relevant documents..."
            className={s.searchInput}
            value={docFilters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
          />
        </div>
        <div className={s.countBadge}>
          <span data-testid="entity-evidence-count">
            {isDocsLoading
              ? 'Loading evidence...'
              : `${totalDocs.toLocaleString()} evidence sources`}
          </span>
        </div>
      </div>

      <div className={s.listContainer}>
        {isDocsLoading && documents.length === 0 ? (
          <div className={s.skeletonStack}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={s.skeletonCard}>
                <div className={s.skeletonIcon} />
                <div className={s.skeletonText}>
                  <div className={s.skeletonLine} />
                  <div className={s.skeletonSubline} />
                </div>
              </div>
            ))}
          </div>
        ) : !isDocsLoading && documents.length === 0 ? (
          <div className={s.emptyState}>
            <FileText size={44} className={s.emptyIcon} />
            <h4 className={s.emptyTitle}>No Linked Evidence Found</h4>
            <p className={s.emptyText}>
              We could not find evidence items for "{entityName}" using current filters.
            </p>
          </div>
        ) : (
          <div className={s.listWrapper} data-testid="entity-evidence-list-container">
            {usePlainEvidenceList ? (
              <div className={s.plainList} data-testid="entity-evidence-plain-list">
                {documents.map((doc) => (
                  <div key={String(doc.id)} className={s.itemWrapper}>
                    <EvidenceCard
                      document={doc}
                      onOpen={openDocument}
                      entityName={entityName}
                      testId="entity-evidence-row"
                    />
                  </div>
                ))}
                {hasNextPage && (
                  <div className={s.loadMoreWrapper}>
                    <button
                      type="button"
                      className={s.loadMoreBtn}
                      disabled={isNextPageLoading}
                      onClick={() => void loadNextPage(documents.length)}
                      data-testid="entity-evidence-load-more"
                    >
                      {isNextPageLoading ? 'Loading more…' : 'Load more evidence'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <TypedAutoSizer>
                {({ height, width }: { height: number; width: number }) => {
                  const effectiveHeight = height > 0 ? height : 400; // Fallback if height is 0
                  const effectiveWidth = width > 0 ? width : 800;

                  return !Number.isFinite(height) ||
                    !Number.isFinite(width) ||
                    height < 120 ||
                    width < 200 ? (
                    <div className={s.plainList} data-testid="entity-evidence-fallback-list">
                      {documents.slice(0, 20).map((doc) => (
                        <div key={String(doc.id)} className={s.itemWrapper}>
                          <EvidenceCard
                            document={doc}
                            onOpen={openDocument}
                            entityName={entityName}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <TypedInfiniteLoader
                      isItemLoaded={isItemLoaded}
                      itemCount={totalDocs}
                      loadMoreItems={loadNextPage}
                    >
                      {({ onItemsRendered, ref }) => (
                        <List
                          className={s.virtualList}
                          data-testid="entity-evidence-virtual-list"
                          height={effectiveHeight}
                          itemCount={totalDocs}
                          itemSize={180}
                          width={effectiveWidth}
                          onItemsRendered={onItemsRendered}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ref={ref as any}
                        >
                          {({ index, style }) => {
                            const doc = documents[index];
                            if (!doc) {
                              return (
                                <div style={style} className={s.virtualPadding}>
                                  <div className={s.virtualSkeleton} />
                                </div>
                              );
                            }
                            return (
                              <div style={style} className={s.virtualPadding}>
                                <EvidenceCard
                                  document={doc}
                                  onOpen={openDocument}
                                  entityName={entityName}
                                />
                              </div>
                            );
                          }}
                        </List>
                      )}
                    </TypedInfiniteLoader>
                  );
                }}
              </TypedAutoSizer>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
