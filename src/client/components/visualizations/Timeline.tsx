import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { CloseButton } from '../common/CloseButton';
import { useFilters } from '../../contexts/useFilters';

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
          .map((event: any) => ({
            date: new Date(event.date),
            title: event.title || 'Untitled Event',
            description: event.description || `Document: ${event.title || 'Untitled'}`,
            type: (event.type?.toLowerCase() as any) || 'document',
            file: event.file_path || '',
            original_file_path: event.original_file_path || '',
            entities: event.entities || (event.primary_entity ? [event.primary_entity] : []),
            significance: event.significance_score || 'medium',
            is_curated: event.is_curated || false,
            related_document: event.related_document || null,
            support: event.support || {
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
        className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 ${className}`}
      >
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mr-3"></div>
          <span className="text-white">Loading timeline data from evidence database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Filters and Sort - Sticky bar */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 md:-mx-6 md:px-6 border-b border-slate-700/50">
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
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-full hover:bg-slate-700 hover:border-slate-500 transition-all duration-200 text-xs text-slate-200 h-7 whitespace-nowrap"
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

      <div className="relative border-l-2 border-slate-700 ml-4 md:ml-6 space-y-8">
        {sortedEvents.map((event, index) => (
          <div key={index} className="relative pl-8 md:pl-12">
            {/* Timeline Dot */}
            <div
              className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-slate-900 ${
                event.significance === 'high'
                  ? 'bg-red-500'
                  : event.significance === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
            ></div>

            {/* Event Card */}
            <div
              className={`rounded-xl border p-5 cursor-pointer transition-all duration-300 ${
                event.is_curated
                  ? 'border-amber-500/50 bg-amber-900/10 hover:bg-amber-900/20'
                  : getSignificanceColor(event.significance)
              }`}
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-cyan-400 bg-cyan-900/20 px-2 py-0.5 rounded">
                      {formatDate(event.date)}
                    </span>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${
                        event.type === 'legal'
                          ? 'bg-purple-900/30 text-purple-300'
                          : event.type === 'flight'
                            ? 'bg-blue-900/30 text-blue-300'
                            : event.type === 'financial'
                              ? 'bg-emerald-900/30 text-emerald-300'
                              : event.type === 'incident'
                                ? 'bg-amber-900/30 text-amber-300' // New styling
                                : 'bg-slate-700 text-slate-300'
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

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {event.title}
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed mb-3 line-clamp-2">
                    {event.description}
                  </p>

                  {event.entities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {event.entities.slice(0, 4).map((entity, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded text-xs flex items-center gap-1"
                        >
                          <Users className="w-3 h-3" />
                          {typeof entity === 'string' ? entity : entity.name}
                        </span>
                      ))}
                      {event.entities.length > 4 && (
                        <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-400 rounded text-xs">
                          +{event.entities.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {event.support && (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded">
                        Evidence: {event.support.evidence_count}
                      </span>
                      <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded">
                        Docs: {event.support.document_count}
                      </span>
                      <span className="px-2 py-1 bg-slate-800 border border-slate-600 text-slate-300 rounded">
                        Media: {event.support.media_count}
                      </span>
                    </div>
                  )}
                </div>

                <div className="hidden md:block shrink-0">
                  <div className="w-32 h-24 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden relative group">
                    <FileText className="w-8 h-8 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                      <span className="text-xs text-white font-medium">
                        {event.is_curated ? 'View Details' : 'View Source'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedEvent &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-slate-900 border border-slate-600 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <h3 className="text-xl font-bold text-white pr-8">{selectedEvent.title}</h3>
                <CloseButton
                  onClick={() => setSelectedEvent(null)}
                  size="sm"
                  label="Close timeline event"
                  className="bg-transparent hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white"
                />
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                      Date
                    </span>
                    <span className="text-white font-mono">{formatDate(selectedEvent.date)}</span>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg">
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-1">
                      Type
                    </span>
                    <span className="text-white capitalize flex items-center gap-2">
                      {getTypeIcon(selectedEvent.type)}
                      {selectedEvent.type}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    Description
                  </span>
                  <p className="text-slate-200 leading-relaxed bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    {selectedEvent.description}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                    {selectedEvent.is_curated ? 'Related Documentation' : 'Source Document'}
                  </span>

                  {selectedEvent.related_document ? (
                    <Link
                      to={`/documents?id=${selectedEvent.related_document.id}`}
                      onClick={() => setSelectedEvent(null)}
                      className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-cyan-500/30 hover:bg-cyan-900/20 hover:border-cyan-400 transition-colors group"
                    >
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300 font-mono text-sm truncate flex-1 group-hover:text-cyan-200">
                        {selectedEvent.related_document.name}
                      </span>
                      <span className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded border border-cyan-500/30">
                        View Document
                      </span>
                    </Link>
                  ) : selectedEvent.file ? (
                    <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300 font-mono text-sm truncate flex-1">
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
                        className="px-3 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded hover:bg-cyan-900/50 transition-colors border border-cyan-500/30 flex items-center gap-1"
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-sm">
                      No direct document linked to this event.
                    </div>
                  )}
                </div>

                {selectedEvent.support && selectedEvent.support.top_documents.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
                      Supporting Documents
                    </span>
                    <div className="space-y-2">
                      {selectedEvent.support.top_documents.map((doc) => (
                        <Link
                          key={doc.id}
                          to={`/documents?id=${doc.id}`}
                          onClick={() => setSelectedEvent(null)}
                          className="flex items-center gap-3 bg-slate-800 p-2.5 rounded-lg border border-slate-700 hover:border-cyan-500/40 hover:bg-slate-700/70 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="text-slate-200 text-sm truncate flex-1">{doc.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEvent.entities.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase tracking-wider block mb-2">
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
                              className="px-3 py-1.5 bg-slate-800 text-cyan-300 rounded-lg border border-cyan-500/30 text-sm hover:bg-cyan-900/30 hover:border-cyan-400 transition-colors cursor-pointer"
                            >
                              {entity.name}
                            </Link>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-sm"
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
