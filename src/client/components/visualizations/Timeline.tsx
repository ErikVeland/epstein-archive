import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { CloseButton } from '../common/CloseButton';
import { useFilters } from '@client/contexts/useFilters';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { Button, cn } from '@client/design-system/lib';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import { EmptyCorpus } from '../common/EmptyCorpus';
import { EntityMentionPill } from '../common/EntityMentionPill';
import styles from './Timeline.module.css';

interface EntityLink {
  id: number;
  name: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  description: string;
  type:
    | 'email'
    | 'document'
    | 'flight'
    | 'legal'
    | 'financial'
    | 'testimony'
    | 'incident'
    | 'other';
  file: string;
  original_file_path?: string;
  entities: (string | EntityLink)[];
  significance: 'high' | 'medium' | 'low';
  is_curated?: boolean;
  related_document?: { id: number; name: string; path: string } | null;
  support?: {
    evidence_count: number;
    document_count: number;
    media_count: number;
    top_documents: Array<{ id: number; name: string }>;
  };
}

interface TimelineProps {
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = React.memo(({ className = '' }) => {
  const { filters } = useFilters();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [supportLoading, setSupportLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredSignificance, setFilteredSignificance] = useState<('high' | 'medium' | 'low')[]>([
    'high',
    'medium',
    'low',
  ]);
  useScrollLock(!!selectedEvent);

  const navigate = useNavigate();
  const openEntity = React.useCallback(
    (entityId: string) => {
      navigate(`/entity/${entityId}`);
    },
    [navigate],
  );

  const filteredEvents = useMemo(() => {
    return events.filter((event) => filteredSignificance.includes(event.significance));
  }, [events, filteredSignificance]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEvents, sortOrder]);

  const toggleSignificanceFilter = (significance: 'high' | 'medium' | 'low') => {
    setFilteredSignificance((prev) => {
      if (prev.includes(significance)) {
        return prev.filter((s) => s !== significance);
      } else {
        return [...prev, significance];
      }
    });
  };

  const [startDate, endDate] = filters.timeRange;

  useEffect(() => {
    loadTimelineData(startDate, endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    const selectedId = selectedEvent?.id;
    if (!selectedId) return;

    const numericId = Number(String(selectedId).replace(/^evt-/, ''));
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    const existingEvent = events.find((event) => event.id === selectedId);
    const existingSupport = existingEvent?.support;
    const alreadyLoaded =
      !!existingSupport &&
      (existingSupport.evidence_count > 0 ||
        existingSupport.document_count > 0 ||
        existingSupport.media_count > 0 ||
        existingSupport.top_documents.length > 0);

    if (alreadyLoaded) return;

    let cancelled = false;

    const loadEventSupport = async () => {
      try {
        setSupportLoading(true);
        const response = await fetch(`/api/timeline/${numericId}/support`);
        if (!response.ok) throw new Error(`Timeline support API error: ${response.status}`);
        const support = (await response.json()) as NonNullable<TimelineEvent['support']>;
        if (cancelled || !support) return;

        setEvents((prev) =>
          prev.map((event) => (event.id === selectedId ? { ...event, support } : event)),
        );
        setSelectedEvent((prev) => {
          if (!prev || prev.id !== selectedId) return prev;
          return { ...prev, support };
        });
      } catch (error) {
        console.warn('Timeline support unavailable:', error);
      } finally {
        if (!cancelled) {
          setSupportLoading(false);
        }
      }
    };

    void loadEventSupport();

    return () => {
      cancelled = true;
    };
  }, [events, selectedEvent]);

  const loadTimelineData = async (start: string | null, end: string | null) => {
    try {
      setLoading(true);
      setFetchError(false);
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      const qs = params.toString();
      const response = await fetch(`/api/timeline${qs ? `?${qs}` : ''}`);
      if (!response.ok) throw new Error(`Timeline API error: ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        const timelineEvents: TimelineEvent[] = data
          .map((event: Record<string, unknown>) => ({
            id: String(event.id || ''),
            date: new Date(event.date as string),
            title: (event.title as string | undefined) || 'Untitled Event',
            description:
              (event.description as string | undefined) ||
              `Document: ${(event.title as string | undefined) || 'Untitled'}`,
            type:
              ((event.type as string | undefined)?.toLowerCase() as TimelineEvent['type']) ||
              'document',
            file: (event.file_path as string | undefined) || '',
            original_file_path: (event.original_file_path as string | undefined) || '',
            entities:
              (event.entities as (string | EntityLink)[] | undefined) ||
              (event.primary_entity ? [event.primary_entity as string] : []),
            significance:
              (event.significance_score as 'high' | 'medium' | 'low' | undefined) || 'medium',
            is_curated: (event.is_curated as boolean | undefined) || false,
            related_document: (event.related_document as TimelineEvent['related_document']) || null,
            support: (event.support as TimelineEvent['support']) || {
              evidence_count: 0,
              document_count: 0,
              media_count: 0,
              top_documents: [],
            },
          }))
          .filter((event) => !isNaN(event.date.getTime()));
        setEvents(timelineEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.warn('Timeline data unavailable:', error);
      setFetchError(true);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTypeIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'email':
        return <Icon name="FileText" className={styles.inlineIcon} />;
      case 'flight':
        return <Icon name="Calendar" className={styles.inlineIcon} />;
      case 'legal':
        return <Icon name="Users" className={styles.inlineIcon} />;
      case 'financial':
        return <Icon name="FileText" className={styles.inlineIcon} />;
      case 'testimony':
        return <Icon name="Users" className={styles.inlineIcon} />;
      default:
        return <Icon name="FileText" className={styles.inlineIcon} />;
    }
  };

  const getTypeBadgeClass = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'legal':
        return styles.typeLegal;
      case 'flight':
        return styles.typeFlight;
      case 'financial':
        return styles.typeFinancial;
      case 'incident':
        return styles.typeIncident;
      default:
        return styles.typeDefault;
    }
  };

  const getSignificanceCardClass = (event: TimelineEvent) => {
    if (event.is_curated) return styles.eventCardCurated;
    switch (event.significance) {
      case 'high':
        return styles.eventCardHigh;
      case 'medium':
        return styles.eventCardMedium;
      case 'low':
        return styles.eventCardLow;
    }
  };

  const getDotClass = (significance: string) => {
    switch (significance) {
      case 'high':
        return styles.dotHigh;
      case 'medium':
        return styles.dotMedium;
      case 'low':
        return styles.dotLow;
      default:
        return '';
    }
  };

  const hasSupportSignal = (support?: TimelineEvent['support'] | null) => {
    if (!support) return false;
    return (
      support.evidence_count > 0 ||
      support.document_count > 0 ||
      support.media_count > 0 ||
      support.top_documents.length > 0
    );
  };

  if (loading) {
    return (
      <div className={`${styles.loadingContainer} ${className}`}>
        <div className={styles.spinnerRow}>
          <div className={styles.spinner}></div>
          <span className={styles.loadingText}>
            Loading timeline data from evidence database...
          </span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={`${styles.root} ${className}`}>
        <EmptyCorpus
          icon="AlertCircle"
          title="Timeline Unavailable"
          body="The timeline API returned an error. Ensure the API server is running and the database is accessible."
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`${styles.root} ${className}`}>
        <EmptyCorpus
          icon="Clock"
          title="No Timeline Events"
          body="Timeline events are extracted from documents, emails, and records during corpus ingestion. No events have been loaded yet — run the ingestion pipeline to populate the timeline."
        />
      </div>
    );
  }

  return (
    <div className={`${styles.root} ${className}`}>
      <div className={styles.stickyHeader}>
        <div className={styles.filterRow}>
          <div className={styles.significanceFilters}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSignificanceFilter('high')}
              className={cn(
                styles.filterButton,
                filteredSignificance.includes('high')
                  ? styles.filterHigh
                  : styles.filterHighInactive,
              )}
            >
              <div className={`${styles.dot} ${styles.dotHigh}`}></div>
              <span>High</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSignificanceFilter('medium')}
              className={cn(
                styles.filterButton,
                filteredSignificance.includes('medium')
                  ? styles.filterMedium
                  : styles.filterMediumInactive,
              )}
            >
              <div className={`${styles.dot} ${styles.dotMedium}`}></div>
              <span>Medium</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSignificanceFilter('low')}
              className={cn(
                styles.filterButton,
                filteredSignificance.includes('low') ? styles.filterLow : styles.filterLowInactive,
              )}
            >
              <div className={`${styles.dot} ${styles.dotLow}`}></div>
              <span>Low</span>
            </Button>
          </div>

          <div className={styles.spacer}></div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className={styles.sortButton}
            title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
          >
            {sortOrder === 'desc' ? (
              <>
                <Icon name="ArrowDown" className={styles.sortIcon} />
                <span>Newest First</span>
              </>
            ) : (
              <>
                <Icon name="ArrowUp" className={styles.sortIcon} />
                <span>Oldest First</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={styles.timelineContainer}>
        <ScopedErrorBoundary
          fallback={
            <div className={styles.errorCard}>
              <p className={styles.errorTitle}>Timeline Event Error</p>
              <p>One or more events failed to render. The dataset may contain invalid entries.</p>
            </div>
          }
        >
          {sortedEvents.map((event, index) => {
            const year = event.date.getFullYear();
            const prevYear = index > 0 ? sortedEvents[index - 1].date.getFullYear() : null;
            const showYearDivider = year !== prevYear;

            return (
              <React.Fragment key={event.id}>
                {showYearDivider && (
                  <div className={styles.yearDivider}>
                    <div className={styles.yearDividerDot} />
                    <span className={styles.yearDividerLabel}>{year}</span>
                    <div className={styles.yearDividerLine} />
                  </div>
                )}
                <div className={styles.eventItem}>
                  <div className={`${styles.timelineDot} ${getDotClass(event.significance)}`}></div>

                  <div
                    className={`${styles.eventCard} ${getSignificanceCardClass(event)}`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className={styles.eventMetaRow}>
                      <span className={styles.datePill}>{formatDate(event.date)}</span>
                      <div className={`${styles.typeBadge} ${getTypeBadgeClass(event.type)}`}>
                        {getTypeIcon(event.type)}
                        <span>{event.type}</span>
                      </div>
                      {event.is_curated && <span className={styles.keyEventBadge}>KEY EVENT</span>}
                    </div>

                    <h3 className={styles.eventTitle}>{event.title}</h3>

                    <p className={styles.eventDescription}>{event.description}</p>

                    {event.entities.length > 0 && (
                      <div className={styles.pillRow}>
                        {event.entities.slice(0, 4).map((entity, i) => (
                          <EntityMentionPill
                            key={i}
                            entityId={typeof entity === 'object' && entity.id ? entity.id : null}
                            entityName={typeof entity === 'string' ? entity : entity.name}
                            onOpen={openEntity}
                            showIcon={false}
                          />
                        ))}
                        {event.entities.length > 4 && (
                          <span className={styles.pill}>+{event.entities.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {hasSupportSignal(event.support) && event.support && (
                      <div className={styles.supportRow}>
                        <span className={styles.supportPill}>
                          Evidence: {event.support.evidence_count}
                        </span>
                        <span className={styles.supportPill}>
                          Docs: {event.support.document_count}
                        </span>
                        <span className={styles.supportPill}>
                          Media: {event.support.media_count}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </ScopedErrorBoundary>
      </div>

      {selectedEvent &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>{selectedEvent.title}</h3>
                <CloseButton
                  onClick={() => setSelectedEvent(null)}
                  size="sm"
                  label="Close timeline event"
                  className={styles.closeButton}
                />
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalRow}>
                  <div className={styles.modalInfoBox}>
                    <span className={styles.modalLabel}>Date</span>
                    <span className={styles.modalValue}>{formatDate(selectedEvent.date)}</span>
                  </div>
                  <div className={styles.modalInfoBox}>
                    <span className={styles.modalLabel}>Type</span>
                    <span className={styles.modalTypeValue}>
                      {getTypeIcon(selectedEvent.type)}
                      {selectedEvent.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className={styles.modalSectionLabel}>Description</span>
                  <p className={styles.modalDescription}>{selectedEvent.description}</p>
                </div>

                <div>
                  <span className={styles.modalSectionLabel}>
                    {selectedEvent.is_curated ? 'Related Documentation' : 'Source Document'}
                  </span>

                  {selectedEvent.related_document ? (
                    <Link
                      to={`/documents?id=${selectedEvent.related_document.id}`}
                      onClick={() => setSelectedEvent(null)}
                      className={styles.sourceLink}
                    >
                      <Icon name="FileText" className={styles.sourceIcon} />
                      <span className={styles.sourceLinkText}>
                        {selectedEvent.related_document.name}
                      </span>
                      <span className={styles.sourceBadge}>View Document</span>
                    </Link>
                  ) : selectedEvent.file ? (
                    <div className={styles.sourceLink}>
                      <Icon name="FileText" className={styles.sourceIcon} />
                      <span className={styles.sourceLinkText}>
                        {selectedEvent.file.split('/').pop()}
                      </span>
                      <a
                        href={
                          selectedEvent.original_file_path
                            ? `/files/${selectedEvent.original_file_path.replace('/data/originals/', '')}`
                            : '#'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.sourceBadge}
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className={styles.mutedEmptyText}>
                      No direct document linked to this event.
                    </div>
                  )}
                </div>

                {selectedEvent.support && selectedEvent.support.top_documents.length > 0 && (
                  <div>
                    <span className={styles.modalSectionLabel}>Supporting Documents</span>
                    <div className={styles.supportingDocsList}>
                      {selectedEvent.support.top_documents.map((doc) => (
                        <Link
                          key={doc.id}
                          to={`/documents?id=${doc.id}`}
                          onClick={() => setSelectedEvent(null)}
                          className={styles.supportingDocItem}
                        >
                          <Icon name="FileText" className={styles.inlineIcon} />
                          <span className={styles.supportingDocText}>{doc.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {supportLoading && (
                  <div className={styles.mutedEmptyText}>Loading supporting evidence...</div>
                )}

                {selectedEvent.entities.length > 0 && (
                  <div>
                    <span className={styles.modalSectionLabel}>Related Entities</span>
                    <div className={styles.entityBadgeList}>
                      {selectedEvent.entities.map((entity, i) => {
                        if (typeof entity === 'object' && (entity as EntityLink).id) {
                          return (
                            <Link
                              key={i}
                              to={`/entity/${(entity as EntityLink).id}`}
                              onClick={() => setSelectedEvent(null)}
                              className={`${styles.entityBadge} ${styles.entityBadgeInteractive}`}
                            >
                              {(entity as EntityLink).name}
                            </Link>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className={`${styles.entityBadge} ${styles.entityBadgeStatic}`}
                          >
                            {typeof entity === 'string' ? entity : (entity as EntityLink).name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});

export default Timeline;
