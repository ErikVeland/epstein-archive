import { useMemo, useState } from 'react';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Button,
  EmptyState,
  Select,
  Skeleton,
  Surface,
  TextInput,
} from '@client/design-system/lib';
import { apiClient } from '@client/services/apiClient';
import { financialRecordsSchema } from '@shared/contracts/financial';
import type { FinancialTransactionDto } from '@shared/dto/financial';
import {
  currencyTotals,
  financialAmount,
  financialDate,
  needsPartyReview,
} from '@client/utils/financialReview';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import styles from './FinancialTransactionMapper.module.css';

interface FinancialTransactionMapperProps {
  investigationId?: string | number;
}

export default function FinancialTransactionMapper({
  investigationId,
}: FinancialTransactionMapperProps = {}) {
  const [search, setSearch] = useState('');
  const [currency, setCurrency] = useState('all');
  const [review, setReview] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const backState = useBackLinkState();
  const query = useInfiniteQuery<
    FinancialTransactionDto[],
    Error,
    InfiniteData<FinancialTransactionDto[]>,
    readonly unknown[],
    number
  >({
    queryKey: ['financial-evidence', investigationId],
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      !investigationId && lastPage.length === 500 ? pages.length * 500 : undefined,
    queryFn: async ({ pageParam }): Promise<FinancialTransactionDto[]> =>
      financialRecordsSchema.parse(
        await apiClient.get<unknown>(
          investigationId
            ? `/investigations/${encodeURIComponent(investigationId)}/transactions`
            : `/financial/transactions?limit=500&offset=${pageParam}`,
        ),
      ),
    staleTime: 60_000,
  });
  const records = useMemo(
    () => [
      ...new Map((query.data?.pages.flat() || []).map((record) => [record.id, record])).values(),
    ],
    [query.data],
  );
  const filtered = useMemo(
    () =>
      records
        .filter((record) => {
          const matches = [
            record.fromEntityName,
            record.toEntityName,
            record.description,
            record.id,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search.trim().toLowerCase());
          return (
            matches &&
            (currency === 'all' || record.currency === currency) &&
            (review !== 'sourced' || !!record.sourceDocumentId) &&
            (review !== 'missing-source' || !record.sourceDocumentId) &&
            (review !== 'parties' || needsPartyReview(record))
          );
        })
        .sort((a, b) => {
          if (sort === 'amount' && currency !== 'all') return b.amount - a.amount;
          const aDate = Date.parse(a.date),
            bDate = Date.parse(b.date);
          if (!Number.isFinite(aDate)) return Number.isFinite(bDate) ? 1 : 0;
          if (!Number.isFinite(bDate)) return -1;
          return sort === 'oldest' ? aDate - bDate : bDate - aDate;
        }),
    [records, search, currency, review, sort],
  );
  const totals = currencyTotals(filtered);
  const sourceCount = new Set(filtered.map((record) => record.sourceDocumentId).filter(Boolean))
    .size;
  const reset = () => {
    setSearch('');
    setCurrency('all');
    setReview('all');
    setSort('newest');
    setPage(1);
  };
  const exportRecords = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            scope: 'Filtered loaded records, not the full corpus',
            filters: { search, currency, review, sort },
            caveat:
              'AI-extracted mentions, not verified payments. Repeated mentions may duplicate amounts.',
            records: filtered,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'financial-evidence.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Evidence review · Financial records</p>
        <h1>Follow the money. Check the source.</h1>
        <p>Trace named parties and stated amounts back to original documents.</p>
      </header>
      <Surface variant="panel" className={styles.context}>
        <details>
          <summary>Extracted mentions, not verified payments · Review limitations</summary>
          <p>
            These rows come from document extraction, not a reconciled bank ledger. Repeated
            mentions can duplicate amounts. A name or amount does not establish wrongdoing.
          </p>
          <p>
            Trace the named sender and recipient, inspect the stated purpose, and compare the record
            with its source. Source links establish traceability, not verification. Extraction may
            substitute January or the first day when a source date is incomplete. Dates, parties and
            currencies require source review. No automated laundering verdict or confidence score is
            shown.
          </p>
        </details>
      </Surface>
      {query.isPending ? (
        <div role="status" aria-label="Loading financial records">
          <Skeleton height={160} />
        </div>
      ) : query.isError && !query.data ? (
        <EmptyState
          title="Financial records could not be loaded"
          description="No cached or unrelated records have been substituted. Check your connection or access and retry."
          actions={<Button onClick={() => void query.refetch()}>Retry</Button>}
        />
      ) : (
        <>
          <div className={styles.controls}>
            <TextInput
              id="financial-search"
              label="Person, organisation or purpose"
              placeholder="Search the loaded records"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <label>
              Review queue
              <Select
                aria-label="Review queue"
                value={review}
                onChange={(event) => {
                  setReview(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All records' },
                  { value: 'sourced', label: 'With source documents' },
                  { value: 'missing-source', label: 'Missing source links' },
                  { value: 'parties', label: 'Unknown parties' },
                ]}
              />
            </label>
            <label>
              Currency
              <Select
                aria-label="Currency"
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value);
                  setSort('newest');
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'All currencies (not combined)' },
                  ...[...new Set(records.map((record) => record.currency))]
                    .sort()
                    .map((value) => ({ value, label: value || 'Unknown' })),
                ]}
              />
            </label>
            <label>
              Order
              <Select
                aria-label="Order"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                  ...(currency !== 'all'
                    ? [{ value: 'amount', label: 'Largest stated amount' }]
                    : []),
                ]}
              />
            </label>
          </div>
          <div className={styles.toolbar}>
            <p aria-live="polite">
              {filtered.length.toLocaleString()} matching / {records.length.toLocaleString()} loaded
              records · {sourceCount.toLocaleString()} distinct source documents
            </p>
            <Button variant="secondary" onClick={reset}>
              Clear filters
            </Button>
            <Button variant="secondary" disabled={!filtered.length} onClick={exportRecords}>
              Export matching records
            </Button>
          </div>
          <p className={styles.scope}>
            {investigationId
              ? 'Scope: this investigation.'
              : query.hasNextPage
                ? 'More records are available. Filters and totals cover the loaded subset only. Load older records to extend your review.'
                : 'All available financial records loaded. Filters and totals apply to this selection, not the full document archive.'}
          </p>
          {!!totals.length && (
            <Surface variant="panel" className={styles.context}>
              <h2>Stated amounts in this selection</h2>
              <div className={styles.totals}>
                {totals.map(([unit, amount]) => (
                  <div key={unit}>
                    <strong>{financialAmount(amount, unit)}</strong>
                    <span>{unit || 'Unknown currency'}</span>
                  </div>
                ))}
              </div>
              <p>
                Gross sum of extracted mentions, not net flow or confirmed money moved. Currencies
                are kept separate; duplicate mentions are not deducted.
              </p>
            </Surface>
          )}
          {!filtered.length ? (
            <EmptyState
              title={records.length ? 'No matching records' : 'No financial records available'}
              description="Try another person or clear the filters. An empty result does not prove that no financial activity occurred."
            />
          ) : (
            <div className={styles.records}>
              {filtered.slice(0, page * 30).map((record) => (
                <Surface variant="panel" className={styles.record} key={record.id}>
                  <div className={styles.recordTop}>
                    <span>{financialDate(record.date)}</span>
                    <strong>{financialAmount(record.amount, record.currency)}</strong>
                  </div>
                  <h2>
                    {record.fromEntityName || 'Unknown sender'} <span aria-label="to">→</span>{' '}
                    {record.toEntityName || 'Unknown recipient'}
                  </h2>
                  <p>
                    {record.description ||
                      'No purpose or description recorded. Inspect the original document.'}
                  </p>
                  <p className={styles.scope}>
                    {record.transactionType || 'Type unknown'} · {record.method || 'Method unknown'}{' '}
                    · Extracted record #{record.id}
                  </p>
                  <div className={styles.links}>
                    <Link to={`/financial/${encodeURIComponent(record.id)}`} state={backState}>
                      Review record →
                    </Link>
                    {record.sourceDocumentId ? (
                      <Link
                        to={`/documents?id=${encodeURIComponent(record.sourceDocumentId)}`}
                        state={backState}
                      >
                        Open source document →
                      </Link>
                    ) : (
                      <span>Source link unavailable</span>
                    )}
                    {record.fromEntityId && (
                      <Link to={`/entity/${record.fromEntityId}`}>Sender profile</Link>
                    )}
                    {record.toEntityId && (
                      <Link to={`/entity/${record.toEntityId}`}>Recipient profile</Link>
                    )}
                    {record.sourceDocumentId && (
                      <AddToInvestigationButton
                        size="sm"
                        item={{
                          id: record.sourceDocumentId,
                          sourceId: record.sourceDocumentId,
                          type: 'document',
                          title: `Financial source for record #${record.id}`,
                          description:
                            record.description ||
                            'Source document for an extracted financial mention.',
                          metadata: { financialRecordId: record.id },
                        }}
                      />
                    )}
                  </div>
                </Surface>
              ))}
            </div>
          )}
          {filtered.length > page * 30 && (
            <Button onClick={() => setPage((value) => value + 1)}>Show next 30 records</Button>
          )}
          {query.hasNextPage && (
            <Button
              variant="secondary"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage
                ? 'Loading older records…'
                : 'Load older records (up to 500)'}
            </Button>
          )}
          {query.isFetchNextPageError && (
            <p role="alert">
              Older records could not be loaded. The current selection is unchanged. Try loading
              again.
            </p>
          )}
        </>
      )}
    </section>
  );
}
