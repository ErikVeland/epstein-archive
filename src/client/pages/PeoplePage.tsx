import React, { useState, useEffect, useCallback, Profiler } from 'react';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import Icon from '../components/common/Icon';
import { StatsDisplay } from '../components/pages/StatsDisplay';
import StatsSkeleton from '../components/pages/StatsSkeleton';
import EntityTypeFilter from '../components/entities/EntityTypeFilter';
import SortFilter from '../components/layout/SortFilter';
import SubjectCardV2 from '../components/entities/SubjectCardV2';
import PersonCardSkeleton from '../components/entities/PersonCardSkeleton';
import { Person, SubjectCardDTO } from '../types';
import { useSubjectsQuery } from '../hooks/useSubjectsQuery';
import { GlassButton } from '../components/ui/GlassButton';
import { Grid } from '../design-system/components/layout/Grid';
import { Flex } from '../design-system/components/layout/Flex';
import { Stack } from '../design-system/components/layout/Stack';
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

  const PAGE_SIZE = 24;
  const {
    data: subjectsResponse,
    isLoading,
    isFetching,
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
        import('../utils/performanceMonitor.js')
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
        <Stack data-testid="people-page" className={`surface-glass ${styles.page}`} gap="lg">
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

          <Flex
            wrap="wrap"
            align="center"
            justify="between"
            gap="md"
            className={`surface-glass-card ${styles.toolbarCard}`}
          >
            <Flex align="center" gap="sm">
              <Icon name="Users" size="sm" color="info" className={styles.toolbarIcon} />
              <p className={styles.toolbarMeta}>
                {total.toLocaleString()} subjects • Page {page}/{totalPagesLocal || 1}
              </p>
            </Flex>

            <Flex
              wrap="wrap"
              align="center"
              gap="sm"
              className={styles.toolbarControls}
              style={{ flex: 1, justifyContent: 'flex-end', minWidth: '320px' }}
            >
              {isAdmin && (
                <GlassButton
                  onClick={onAddSubject}
                  variant="secondary"
                  size="sm"
                  className={styles.addButton}
                  style={{ display: 'flex' }}
                >
                  <Icon name="Plus" size="sm" />
                  <span className={styles.addButtonLabel}>Add Subject</span>
                </GlassButton>
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
                    { value: 'red_flag', label: 'Red Flag', icon: <Icon name="Flag" size="sm" /> },
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

              <GlassButton
                onClick={onSortOrderToggle}
                variant="ghost"
                size="sm"
                className={styles.sortOrderButton}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                aria-label={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </GlassButton>
            </Flex>
            <div className={styles.toolbarSummary}>
              Sort: {sortBy.replace('_', ' ')} ({sortOrder})
            </div>
          </Flex>

          <div className={`surface-glass-card ${styles.resultsShell}`}>
            {loading ? (
              <Grid cols={{ base: 1, md: 2, xl: 3 }} gap="md">
                {[...Array(6)].map((_, i) => (
                  <PersonCardSkeleton key={i} />
                ))}
              </Grid>
            ) : subjects.length === 0 ? (
              <div className={`surface-glass-card ${styles.emptyState}`}>
                <Icon name="Users" size="xl" color="gray" className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>No results found</h3>
                <p className={styles.emptyBody}>Try adjusting search or entity filters.</p>
              </div>
            ) : (
              <Grid cols={{ base: 1, md: 2, xl: 3 }} gap="md">
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
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`control ${styles.paginationButton}`}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Icon name="ChevronLeft" size="sm" />
                <span>Previous</span>
              </button>

              <div className={`chip ${styles.pageChip}`}>
                <span className={styles.pageChipLabel}>Page</span>
                <span className={styles.pageChipValue}>{page}</span>
                <span className={styles.pageChipLabel}>of</span>
                <span className={styles.pageChipValue}>{totalPagesLocal}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPagesLocal, p + 1))}
                disabled={page === totalPagesLocal}
                className={`control ${styles.paginationButton}`}
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span>Next</span>
                <Icon name="ChevronRight" size="sm" />
              </button>
            </Flex>
          )}
        </Stack>
      </Profiler>
    </ScopedErrorBoundary>
  );
};
