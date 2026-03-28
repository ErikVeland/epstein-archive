import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useFilters } from '../../contexts/useFilters';
import { useScrollLock } from '../../hooks/useScrollLock';
import ScopedErrorBoundary from '../common/ScopedErrorBoundary';

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
  related_document?: { id: number; name: string; path: string } | null; // Linked source document
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
  ]); // Default to show all
  useScrollLock(!!selectedEvent);

  // Filter events based on significance
  const filteredEvents = useMemo(() => {
    return events.filter((event) => filteredSignificance.includes(event.significance));
  }, [events, filteredSignificance]);

  // Sort events based on current sort order
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = a.date.getTime();
      const dateB = b.date.getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEvents, sortOrder]);

  // Toggle significance filter
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

      // Fetch events from API — apply global date range if set
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);
      const qs = params.toString();
      const response = await fetch(`/api/timeline${qs ? `?${qs}` : ''}`);
      if (!response.ok) throw new Error(`Timeline API error: ${response.status}`);
      const data = await response.json();

      console.log('Timeline API response:', data);

      if (Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} timeline events from API`);

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

        console.log(`After filtering invalid dates: ${timelineEvents.length} events`);
        setEvents(timelineEvents);
      } else {
        console.warn('No timeline events found in API response');
        console.log('API response was:', JSON.stringify(data).substring(0, 500));
        // Do not use fallback records; render empty state
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
      // Do not use fallback records; render empty state
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
        return <FileText className="h-4 w-4" />;
      case 'flight':
        return <Calendar className="h-4 w-4" />;
      case 'legal':
        return <Users className="h-4 w-4" />;
      case 'financial':
        return <FileText className="h-4 w-4" />;
      case 'testimony':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSignificanceColor = (significance: 'high' | 'medium' | 'low') => {
    switch (significance) {
      case 'high':
        return 'border-red-500/50 bg-red-900/10 hover:bg-red-900/20';
      case 'medium':
        return 'border-yellow-500/50 bg-yellow-900/10 hover:bg-yellow-900/20';
      case 'low':
        return 'border-green-500/50 bg-green-900/10 hover:bg-green-900/20';
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-[var(--glass-bg)] backdrop-blur-sm border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-8 ${className}`}
      >
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mr-3"></div>
          <span className="text-[var(--text-primary)]">
            Loading timeline data from evidence database...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Filters and Sort - Sticky bar */}
      <div className="sticky top-0 z-20 bg-[var(--glass-bg-strong)] backdrop-blur-sm py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-[var(--glass-border)]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Significance Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => toggleSignificanceFilter('high')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('high')
                  ? 'bg-red-900/40 border-red-500/50 text-red-200'
                  : 'bg-red-900/20 border-red-500/30 text-red-300/60 hover:bg-red-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="hidden sm:inline">High</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('medium')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('medium')
                  ? 'bg-yellow-900/40 border-yellow-500/50 text-yellow-200'
                  : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300/60 hover:bg-yellow-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="hidden sm:inline">Medium</span>
            </button>
            <button
              onClick={() => toggleSignificanceFilter('low')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-full transition-all duration-200 text-xs h-7 ${
                filteredSignificance.includes('low')
                  ? 'bg-green-900/40 border-green-500/50 text-green-200'
                  : 'bg-green-900/20 border-green-500/30 text-green-300/60 hover:bg-green-900/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="hidden sm:inline">Low</span>
            </button>
          </div>

          {/* Spacer to push sort button right */}
          <div className="flex-grow"></div>

          {/* Sort Toggle - Far Right */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-full hover:bg-[var(--glass-bg-highlight)] hover:border-[var(--glass-border)] transition-all duration-200 text-xs text-[var(--text-secondary)] h-7 whitespace-nowrap"
            title={sortOrder === 'desc' ? 'Showing newest first' : 'Showing oldest first'}
          >
            {sortOrder === 'desc' ? (
              <>
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Newest First</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Oldest First</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="relative border-l-2 border-[var(--glass-border)] ml-4 md:ml-6 space-y-8">
        <ScopedErrorBoundary
          fallback={
            <div className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 text-[var(--accent-danger)] text-sm rounded-[var(--radius-lg)] p-8 text-center ml-8 md:ml-12">
              <p className="font-bold mb-2">Timeline Event Error</p>
              <p>One or more events failed to render. The dataset may contain invalid entries.</p>
            </div>
          }
        >
          {sortedEvents.map((event, index) => (
            <div key={index} className="relative pl-8 md:pl-12">
              {/* Timeline Dot */}
              <div
                className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-[var(--app-bg)] ${
                  event.significance === 'high'
                    ? 'bg-red-500'
                    : event.significance === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
              ></div>

              {/* Event Card */}
              <div
                className={`rounded-[var(--radius-xl)] border p-5 cursor-pointer backdrop-blur-sm transition-all duration-300 ${
                  event.is_curated
                    ? 'border-amber-500/50 bg-amber-900/10 hover:bg-amber-900/20'
                    : getSignificanceColor(event.significance)
                }`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--accent)]/20">
                        {formatDate(event.date)}
                      </span>
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-xs font-medium uppercase tracking-wider ${
                          event.type === 'legal'
                            ? 'bg-purple-900/30 text-purple-300 border border-purple-500/20'
                            : event.type === 'flight'
                              ? 'bg-blue-900/30 text-[var(--accent)] border border-[var(--accent)]/20'
                              : event.type === 'financial'
                                ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-500/20'
                                : event.type === 'incident'
                                  ? 'bg-amber-900/30 text-amber-300 border border-amber-500/20'
                                  : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
                        }`}
                      >
                        {getTypeIcon(event.type)}
                        <span>{event.type}</span>
                      </div>
                      {event.is_curated && (
                        <span className="text-xs font-bold text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded bg-amber-900/20">
                          KEY EVENT
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors">
                      {event.title}
                    </h3>

                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3 line-clamp-2">
                      {event.description}
                    </p>

                    {event.entities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {event.entities.slice(0, 4).map((entity, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[var(--radius-sm)] text-xs flex items-center gap-1 shadow-sm"
                          >
                            <Users className="w-3 h-3" />
                            {typeof entity === 'string' ? entity : entity.name}
                          </span>
                        ))}
                        {event.entities.length > 4 && (
                          <span className="px-2 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-muted)] rounded-[var(--radius-sm)] text-xs shadow-sm">
                            +{event.entities.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {event.support && (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[var(--radius-sm)] shadow-sm">
                          Evidence: {event.support.evidence_count}
                        </span>
                        <span className="px-2 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[var(--radius-sm)] shadow-sm">
                          Docs: {event.support.document_count}
                        </span>
                        <span className="px-2 py-1 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] rounded-[var(--radius-sm)] shadow-sm">
                          Media: {event.support.media_count}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="hidden md:block shrink-0">
                    <div className="w-32 h-24 bg-[var(--glass-bg)] rounded-[var(--radius-lg)] border border-[var(--glass-border)] flex items-center justify-center overflow-hidden relative group">
                      <FileText className="w-8 h-8 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-bg)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <span className="text-xs text-[var(--text-primary)] font-medium drop-shadow-[var(--glass-shadow)]">
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
          <div
            className="fixed inset-0 bg-[var(--app-bg)]/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] max-w-2xl w-full shadow-[var(--glass-shadow)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg)]/50">
                <h3 className="text-xl font-bold text-[var(--text-primary)] pr-8">
                  {selectedEvent.title}
                </h3>
                <CloseButton
                  onClick={() => setSelectedEvent(null)}
                  size="sm"
                  label="Close timeline event"
                  className="bg-transparent hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                />
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3 rounded-[var(--radius-lg)] shadow-sm">
                    <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-1">
                      Date
                    </span>
                    <span className="text-[var(--text-primary)] font-mono">
                      {formatDate(selectedEvent.date)}
                    </span>
                  </div>
                  <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] p-3 rounded-[var(--radius-lg)] shadow-sm">
                    <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-1">
                      Type
                    </span>
                    <span className="text-[var(--text-primary)] capitalize flex items-center gap-2">
                      {getTypeIcon(selectedEvent.type)}
                      {selectedEvent.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2">
                    Description
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed bg-[var(--glass-bg)]/50 p-4 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
                    {selectedEvent.description}
                  </p>
                </div>

                <div>
                  <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2">
                    {selectedEvent.is_curated ? 'Related Documentation' : 'Source Document'}
                  </span>

                  {selectedEvent.related_document ? (
                    <Link
                      to={`/documents?id=${selectedEvent.related_document.id}`}
                      onClick={() => setSelectedEvent(null)}
                      className="flex items-center gap-3 bg-[var(--glass-bg)] p-3 rounded-[var(--radius-lg)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] transition-colors group"
                    >
                      <FileText className="w-5 h-5 text-[var(--accent)]" />
                      <span className="text-[var(--accent)] font-mono text-sm truncate flex-1 opacity-90 group-hover:opacity-100">
                        {selectedEvent.related_document.name}
                      </span>
                      <span className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs rounded-[var(--radius-sm)] border border-[var(--accent)]/30">
                        View Document
                      </span>
                    </Link>
                  ) : selectedEvent.file ? (
                    <div className="flex items-center gap-3 bg-[var(--glass-bg)] p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)]">
                      <FileText className="w-5 h-5 text-[var(--accent)]" />
                      <span className="text-[var(--accent)] opacity-90 font-mono text-sm truncate flex-1">
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
                        className="px-3 py-1 bg-[var(--accent)]/10 text-[var(--accent)] text-xs rounded-[var(--radius-sm)] hover:bg-[var(--accent)]/20 transition-colors border border-[var(--accent)]/30 flex items-center gap-1"
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="text-[var(--text-muted)] italic text-sm">
                      No direct document linked to this event.
                    </div>
                  )}
                </div>

                {selectedEvent.support && selectedEvent.support.top_documents.length > 0 && (
                  <div>
                    <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2">
                      Supporting Documents
                    </span>
                    <div className="space-y-2">
                      {selectedEvent.support.top_documents.map((doc) => (
                        <Link
                          key={doc.id}
                          to={`/documents?id=${doc.id}`}
                          onClick={() => setSelectedEvent(null)}
                          className="flex items-center gap-3 bg-[var(--glass-bg)] p-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] hover:border-[var(--accent)]/40 hover:bg-[var(--glass-bg-highlight)] transition-colors"
                        >
                          <FileText className="w-4 h-4 text-[var(--accent)]" />
                          <span className="text-[var(--text-secondary)] text-sm truncate flex-1">
                            {doc.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.entities.length > 0 && (
                  <div>
                    <span className="text-[var(--text-muted)] text-xs uppercase tracking-wider block mb-2">
                      Related Entities
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.entities.map((entity, i) => {
                        if (typeof entity === 'object' && entity.id) {
                          return (
                            <Link
                              key={i}
                              to={`/entity/${entity.id}`}
                              onClick={() => setSelectedEvent(null)}
                              className="px-3 py-1.5 bg-[var(--glass-bg)] text-[var(--accent)] rounded-[var(--radius-lg)] border border-[var(--accent)]/30 text-sm hover:bg-[var(--accent)]/10 hover:border-[var(--accent)] transition-colors cursor-pointer"
                            >
                              {entity.name}
                            </Link>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-[var(--glass-bg)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-sm"
                          >
                            {typeof entity === 'string' ? entity : entity.name}
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
