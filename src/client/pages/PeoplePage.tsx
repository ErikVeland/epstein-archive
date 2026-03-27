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

interface DataStats {
  totalPeople: number;
  totalFiles: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  totalMentions: number;
  totalRelationships: number;
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
        <div data-testid="people-page" className="space-y-5 h-full flex flex-col">
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

          <div className="surface-glass-card relative z-40 p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Icon name="Users" size="sm" color="info" className="flex-shrink-0" />
              <p className="text-[var(--text-primary)] text-sm">
                {total.toLocaleString()} subjects • Page {page}/{totalPagesLocal || 1}
              </p>
            </div>

            <div className="w-full md:w-auto grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 md:flex md:items-center font-sans">
              {isAdmin && (
                <GlassButton
                  onClick={onAddSubject}
                  variant="secondary"
                  size="sm"
                  className="hidden md:flex items-center gap-2"
                >
                  <Icon name="Plus" size="sm" />
                  <span className="hidden sm:inline">Add Subject</span>
                </GlassButton>
              )}

              <EntityTypeFilter
                value={entityType}
                onChange={onEntityTypeChange}
                className="w-full md:w-auto"
              />

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
                className="w-full md:w-auto"
              />

              <GlassButton
                onClick={onSortOrderToggle}
                variant="ghost"
                size="sm"
                className="h-11 w-11 shrink-0 !px-0 !py-0"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                aria-label={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </GlassButton>
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-[0.12em]">
              Sort: {sortBy.replace('_', ' ')} ({sortOrder})
            </div>
          </div>

          <div className="flex-1 min-h-[600px] w-full">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <PersonCardSkeleton key={i} />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="surface-glass-card text-center py-12 px-4">
                <Icon name="Users" size="xl" color="gray" className="mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  No results found
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Try adjusting search or entity filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {subjects.map((subject) => (
                  <SubjectCardV2
                    key={subject.id}
                    subject={subject}
                    onClick={() => handleSubjectClick(subject)}
                  />
                ))}
              </div>
            )}
          </div>

          {totalPagesLocal > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4 flex-shrink-0 pb-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="control px-4 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--glass-bg-highlight)] flex items-center gap-2"
              >
                <Icon name="ChevronLeft" size="sm" />
                <span>Previous</span>
              </button>

              <div className="chip px-4 h-11 flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Page</span>
                <span className="text-[var(--text-primary)] font-medium">{page}</span>
                <span className="text-[var(--text-muted)]">of</span>
                <span className="text-[var(--text-primary)] font-medium">{totalPagesLocal}</span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPagesLocal, p + 1))}
                disabled={page === totalPagesLocal}
                className="control px-4 text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--glass-bg-highlight)] flex items-center gap-2"
              >
                <span>Next</span>
                <Icon name="ChevronRight" size="sm" />
              </button>
            </div>
          )}
        </div>
      </Profiler>
    </ScopedErrorBoundary>
  );
};
