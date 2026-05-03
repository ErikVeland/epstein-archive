import React, { useState, useEffect, useCallback, Profiler } from 'react';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import Icon from '@client/components/common/Icon';
import { StatsDisplay } from '@client/components/pages/StatsDisplay';
import StatsSkeleton from '@client/components/pages/StatsSkeleton';
import EntityTypeFilter from '@client/components/entities/EntityTypeFilter';
import SortFilter from '@client/components/layout/SortFilter';
import SubjectCardV2 from '@client/components/entities/SubjectCardV2';
import PersonCardSkeleton from '@client/components/entities/PersonCardSkeleton';
import { Person, SubjectCardDTO } from '@client/types';
import { useSubjectsQuery } from '@client/hooks/useSubjectsQuery';
import {
  Badge,
  Button,
  EmptyState,
  Grid,
  Flex,
  Pagination,
  Stack,
  Surface,
} from '@client/design-system/lib';
import { ProgressiveIntelligencePanel } from '@client/components/intelligence/ProgressiveIntelligencePanel';
import { usePageScrollRestoration } from '@client/hooks/usePageScrollRestoration';
import styles from './PeoplePage.module.css';

interface DataStats {
  totalPeople: number;
  totalFiles: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalMentions: number;
}

interface PeoplePageProps {
  dataStats: DataStats;
  selectedRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  onRiskLevelClick: (level: 'HIGH' | 'MEDIUM' | 'LOW') => void;
  onResetFilters: () => void;
  isAdmin: boolean;
  onAddSubject: () => void;
  entityType: string;
  onEntityTypeChange: (type: string) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  searchTerm: string;
  onPersonClick: (person: Person, searchTerm?: string) => void;
}

export const PeoplePage: React.FC<PeoplePageProps> = ({
  dataStats,
  selectedRiskLevel,
  onRiskLevelClick,
  onResetFilters,
  isAdmin,
  onAddSubject,
  entityType,
  onEntityTypeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  searchTerm,
  onPersonClick,
}) => {
  const [page, setPage] = useState(1);
  usePageScrollRestoration(
    `/people:${searchTerm}:${entityType}:${sortBy}:${sortOrder}:${selectedRiskLevel || 'all'}:${page}`,
  );

  const PAGE_SIZE = 24;
  const {
    data: subjectsResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useSubjectsQuery({
    page,
    pageSize: PAGE_SIZE,
    searchTerm,
    entityType,
    sortBy,
    sortOrder,
    selectedRiskLevel,
  });

  const subjects: SubjectCardDTO[] = subjectsResponse?.subjects || [];
  const total = subjectsResponse?.total || 0;
  const loading = isLoading || (isFetching && subjects.length === 0);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, entityType, sortBy, sortOrder, selectedRiskLevel]);

  const handleSubjectClick = useCallback(
    (subject: SubjectCardDTO) => {
      const personLike: Person = {
        id: subject.id,
        name: subject.name,
        fullName: subject.name,
        primaryRole: subject.role,
        role: subject.role,
        mentions: subject.stats.mentions,
        files: subject.stats.documents,
        evidenceTypes: [],
        contexts: [],
        significantPassages: [],
        fileReferences: [],
        redFlagRating: 0,
      };
      onPersonClick(personLike, searchTerm);
    },
    [onPersonClick, searchTerm],
  );

  const onRenderCallback = useCallback(
    (id: string, phase: 'mount' | 'update' | 'nested-update', actualDuration: number) => {
      if (typeof window !== 'undefined' && actualDuration > 16) {
        import('@client/utils/performanceMonitor.js')
          .then(({ PerformanceMonitor }) => {
            PerformanceMonitor.logRender(
              `PeoplePage-${id}`,
              actualDuration,
              phase === 'nested-update' ? 'update' : phase,
            );
          })
          .catch(() => {});
      }
    },
    [],
  );

  const totalPagesLocal = Math.ceil(total / PAGE_SIZE);

  return (
    <ScopedErrorBoundary>
      <Profiler id="PeoplePage" onRender={onRenderCallback}>
        <Surface as={Stack} data-testid="people-page" className={styles.page} gap="lg">
          {loading && !dataStats.totalPeople ? (
            <StatsSkeleton />
          ) : (
            <StatsDisplay
              stats={dataStats}
              selectedRiskLevel={selectedRiskLevel}
              onRiskLevelClick={onRiskLevelClick}
              onResetFilters={onResetFilters}
            />
          )}

          <ProgressiveIntelligencePanel />

          <Surface variant="panel" className={styles.toolbarCard}>
            <Flex wrap="wrap" align="center" justify="between" gap="md" fullWidth>
              <Flex align="center" className={styles.toolbarMetaRow}>
                <Icon name="Users" size="sm" color="info" className={styles.toolbarIcon} />
                <p className={styles.toolbarMeta}>
                  {total.toLocaleString()} subjects • Page {page}/{totalPagesLocal || 1}
                </p>
              </Flex>

              <Flex gap="md" align="center" className={styles.toolbarControls}>
                {isAdmin && (
                  <Button
                    onClick={onAddSubject}
                    variant="secondary"
                    size="sm"
                    className={styles.addButton}
                  >
                    <Icon name="Plus" size="sm" />
                    <span className={styles.addButtonLabel}>Add Subject</span>
                  </Button>
                )}

                <div className={styles.filterWrap}>
                  <EntityTypeFilter
                    value={entityType}
                    onChange={onEntityTypeChange}
                    className={styles.fullWidth}
                  />
                </div>

                <div className={styles.filterWrap}>
                  <SortFilter
                    value={sortBy}
                    onChange={(val) => onSortByChange(val)}
                    options={[
                      {
                        value: 'red_flag',
                        label: 'Red Flag',
                        icon: <Icon name="Flag" size="sm" />,
                      },
                      {
                        value: 'mentions',
                        label: 'Mentions',
                        icon: <Icon name="BarChart3" size="sm" />,
                      },
                      {
                        value: 'risk',
                        label: 'Risk',
                        icon: <Icon name="AlertTriangle" size="sm" />,
                      },
                      { value: 'name', label: 'Name', icon: <Icon name="User" size="sm" /> },
                    ]}
                    className={styles.fullWidth}
                  />
                </div>

                <Button
                  onClick={onSortOrderToggle}
                  variant="ghost"
                  size="sm"
                  className={styles.sortOrderButton}
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  aria-label={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </Button>
              </Flex>

              <div className={styles.toolbarSummary}>
                Sort: {sortBy.replace('_', ' ')} ({sortOrder})
              </div>
            </Flex>
          </Surface>

          <div className={styles.resultsShell}>
            {loading ? (
              <Grid cols={{ base: 1, md: 2, xl: 3 }} gap="none" className={styles.resultsGrid}>
                {[...Array(6)].map((_, i) => (
                  <PersonCardSkeleton key={i} />
                ))}
              </Grid>
            ) : isError ? (
              <Stack align="center" justify="center" gap="xl" className={styles.emptyState}>
                <EmptyState
                  title="Error Loading Subjects"
                  description={
                    error instanceof Error
                      ? error.message
                      : 'Failed to fetch subject data from the server.'
                  }
                  icon={
                    <Icon
                      name="AlertTriangle"
                      size="xl"
                      color="danger"
                      className={styles.emptyIcon}
                    />
                  }
                />
              </Stack>
            ) : subjects.length === 0 ? (
              <Stack align="center" justify="center" gap="xl" className={styles.emptyState}>
                <EmptyState
                  title="No results found"
                  description={
                    searchTerm || entityType !== 'all' || selectedRiskLevel
                      ? 'Try adjusting search or entity filters to broaden your investigation.'
                      : 'The forensic corpus is currently empty or still being indexed.'
                  }
                  icon={<Icon name="Users" size="xl" color="gray" className={styles.emptyIcon} />}
                />
                {(searchTerm || entityType !== 'all' || selectedRiskLevel) && (
                  <Button variant="glass" onClick={onResetFilters} size="sm">
                    Clear All Filters
                  </Button>
                )}
              </Stack>
            ) : (
              <Grid cols={{ base: 1, md: 2, xl: 3 }} gap="none" className={styles.resultsGrid}>
                {subjects.map((subject) => (
                  <SubjectCardV2
                    key={subject.id}
                    subject={subject}
                    onClick={() => handleSubjectClick(subject)}
                  />
                ))}
              </Grid>
            )}
          </div>

          {totalPagesLocal > 1 && (
            <Flex justify="center" align="center" gap="md" className={styles.pagination}>
              <Pagination
                page={page}
                totalPages={totalPagesLocal}
                onPageChange={setPage}
                previousLabel="Previous people page"
                nextLabel="Next people page"
              />

              <Badge tone="neutral" className={styles.pageChip}>
                <span className={styles.pageChipLabel}>Page</span>
                <span className={styles.pageChipValue}>{page}</span>
                <span className={styles.pageChipLabel}>of</span>
                <span className={styles.pageChipValue}>{totalPagesLocal}</span>
              </Badge>
            </Flex>
          )}
        </Surface>
      </Profiler>
    </ScopedErrorBoundary>
  );
};
