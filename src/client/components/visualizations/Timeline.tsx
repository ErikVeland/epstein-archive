import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useFilters } from '../../contexts/useFilters';
import { useScrollLock } from '../../hooks/useScrollLock';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';
import styles from './Timeline.module.css';

interface EntityLink {
  id: number;
  name: string;
}

interface TimelineEvent {
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
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filteredSignificance, setFilteredSignificance] = useState<('high' | 'medium' | 'low')[]>([
    'high',
    'medium',
    'low',
  ]);
  useScrollLock(!!selectedEvent);

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

  const loadTimelineData = async (start: string | null, end: string | null) => {
    try {
      setLoading(true);
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
      console.error('Error loading timeline data:', error);
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
        return <FileText className={styles.inlineIcon} />;
      case 'flight':
        return <Calendar className={styles.inlineIcon} />;
      case 'legal':
        return <Users className={styles.inlineIcon} />;
      case 'financial':
        return <FileText className={styles.inlineIcon} />;
      case 'testimony':
        return <Users className={styles.inlineIcon} />;
      default:
        return <FileText className={styles.inlineIcon} />;
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

  return (
    <div className={`${styles.root} ${className}`}>
      <div className={styles.stickyHeader}>
        <div className={styles.filterRow}>
          <div className={styles.significanceFilters}>
            <button
              onClick={() => toggleSignificanceFilter('high')}
              className={`${styles.filterButton} ${filteredSignificance.includes('high') ? styles.filterHigh : styles.filterHighInactive}`}
            >
              <div className={`${styles.dot} ${styles.dotHigh}`}></div>
              <span>High</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('medium')}
              className={`${styles.filterButton} ${filteredSignificance.includes('medium') ? styles.filterMedium : styles.filterMediumInactive}`}
            >
              <div className={`${styles.dot} ${styles.dotMedium}`}></div>
              <span>Medium</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('low')}
              className={`${styles.filterButton} ${filteredSignificance.includes('low') ? styles.filterLow : styles.filterLowInactive}`}
            >
              <div className={`${styles.dot} ${styles.dotLow}`}></div>
              <span>Low</span>
            </button>
          </div>

          <div className={styles.spacer}></div>

          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className={styles.sortButton}
            title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className={styles.sortIcon} />
                <span>Newest First</span>
              </>
            ) : (
              <>
                <ArrowUp className={styles.sortIcon} />
                <span>Oldest First</span>
              </>
            )}
          </button>
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
          {sortedEvents.map((event, index) => (
            <div key={index} className={styles.eventItem}>
              <div className={`${styles.timelineDot} ${getDotClass(event.significance)}`}></div>

              <div
                className={`${styles.eventCard} ${getSignificanceCardClass(event)}`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className={styles.eventHeader}>
                  <div className={styles.eventMainInfo}>
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
                          <span key={i} className={styles.pill}>
                            <Users className={styles.pillIcon} />
                            {typeof entity === 'string' ? entity : entity.name}
                          </span>
                        ))}
                        {event.entities.length > 4 && (
                          <span className={styles.pill}>+{event.entities.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {event.support && (
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

                  <div className={styles.sourcePreview}>
                    <div className={styles.sourcePreviewCard}>
                      <FileText className={styles.sourcePreviewIcon} />
                      <div className={styles.sourcePreviewOverlay}>
                        <span className={styles.sourcePreviewText}>
                          {event.is_curated ? 'View Details' : 'View Source'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
                      <FileText className={styles.sourceIcon} />
                      <span className={styles.sourceLinkText}>
                        {selectedEvent.related_document.name}
                      </span>
                      <span className={styles.sourceBadge}>View Document</span>
                    </Link>
                  ) : selectedEvent.file ? (
                    <div className={styles.sourceLink}>
                      <FileText className={styles.sourceIcon} />
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
                          <FileText className={styles.inlineIcon} />
                          <span className={styles.supportingDocText}>{doc.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
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
