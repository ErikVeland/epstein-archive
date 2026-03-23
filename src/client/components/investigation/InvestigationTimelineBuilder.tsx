import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TimelineEvent, EvidenceItem, Investigation, Hypothesis } from '../../types/investigation';
import { format, parseISO, isValid } from 'date-fns';
import {
  ChevronRight,
  Calendar,
  Clock,
  Link2,
  FileText,
  Users,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useToasts } from '../common/useToasts';

interface TimelineBuilderProps {
  investigation: Investigation;
  events: TimelineEvent[];
  evidence: EvidenceItem[];
  hypotheses: Hypothesis[];
  onEventsUpdate: (events: TimelineEvent[]) => void;
  onSaveEvent?: (event: Partial<TimelineEvent>) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onOpenSource?: (event: TimelineEvent) => void;
}

interface TimelineGroup {
  startDate: string;
  events: TimelineEvent[];
}

const isTimelineScale = (value: string): value is 'day' | 'week' | 'month' | 'year' =>
  value === 'day' || value === 'week' || value === 'month' || value === 'year';

export const InvestigationTimelineBuilder: React.FC<TimelineBuilderProps> = ({
  investigation,
  events,
  evidence,
  hypotheses,
  onEventsUpdate,
  onSaveEvent,
  onDeleteEvent,
  onOpenSource,
}) => {
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [timelineScale, setTimelineScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [autoMilestones, setAutoMilestones] = useState<TimelineEvent[]>([]);
  const [orderingMode, setOrderingMode] = useState<'chronological' | 'narrative'>('chronological');
  const [narrativeOrder, setNarrativeOrder] = useState<string[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToasts();
  const narrativeOrderStorageKey = `investigation_timeline_order_mode_${investigation.id}`;
  const narrativeOrderListKey = `investigation_timeline_manual_order_${investigation.id}`;

  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent> & { startDateString: string }>({
    title: '',
    description: '',
    startDateString: new Date().toISOString(),
    type: 'document',
    confidence: 80,
    documents: [],
    hypothesisIds: [],
  });

  const eventTypes = [
    { value: 'document', label: 'Document', icon: FileText, color: 'bg-[var(--accent)]' },
    { value: 'meeting', label: 'Meeting', icon: Users, color: 'bg-green-500' },
    { value: 'location', label: 'Location', icon: MapPin, color: 'bg-purple-500' },
    { value: 'communication', label: 'Communication', icon: Link2, color: 'bg-orange-500' },
    { value: 'hypothesis', label: 'Hypothesis', icon: ChevronRight, color: 'bg-red-500' },
  ];

  const groupEventsByDate = useCallback(
    (eventsToGroup: TimelineEvent[]): TimelineGroup[] => {
      const groups: { [key: string]: TimelineEvent[] } = {};

      eventsToGroup.forEach((event) => {
        const eventDate = new Date(event.startDate);
        let groupKey = '';

        switch (timelineScale) {
          case 'day':
            groupKey = format(eventDate, 'yyyy-MM-dd');
            break;
          case 'week':
            groupKey = format(eventDate, 'yyyy-MM-dd'); // First day of week
            break;
          case 'month':
            groupKey = format(eventDate, 'yyyy-MM');
            break;
          case 'year':
            groupKey = format(eventDate, 'yyyy');
            break;
        }

        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(event);
      });

      return Object.keys(groups)
        .sort()
        .map((key) => ({
          startDate: key,
          events: groups[key].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
          ),
        }));
    },
    [timelineScale],
  );

  useEffect(() => {
    try {
      const storedMode = window.localStorage.getItem(narrativeOrderStorageKey);
      if (storedMode === 'narrative' || storedMode === 'chronological') {
        setOrderingMode(storedMode);
      }
      const storedOrder = window.localStorage.getItem(narrativeOrderListKey);
      if (storedOrder) {
        const parsed = JSON.parse(storedOrder);
        if (Array.isArray(parsed)) {
          setNarrativeOrder(parsed.map((value) => String(value)));
        }
      }
    } catch (_error) {
      // Keep default mode when local persistence is unavailable.
    }
  }, [narrativeOrderListKey, narrativeOrderStorageKey]);

  const persistNarrativeOrder = (nextOrder: string[]) => {
    setNarrativeOrder(nextOrder);
    try {
      window.localStorage.setItem(narrativeOrderListKey, JSON.stringify(nextOrder));
    } catch (_error) {
      // no-op; in-memory order still applies
    }
  };

  const setOrderingModeAndPersist = (mode: 'chronological' | 'narrative') => {
    setOrderingMode(mode);
    try {
      window.localStorage.setItem(narrativeOrderStorageKey, mode);
    } catch (_error) {
      // no-op
    }
  };

  const allEvents = useMemo(() => [...events, ...autoMilestones], [events, autoMilestones]);

  const orderedEvents = useMemo(() => {
    const base =
      filterTypes.length > 0
        ? allEvents.filter((event) => filterTypes.includes(event.type))
        : allEvents;
    if (orderingMode === 'chronological') {
      return [...base].sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    }
    const position = new Map(narrativeOrder.map((id, index) => [id, index]));
    return [...base].sort((a, b) => {
      const ai = position.get(String(a.id));
      const bi = position.get(String(b.id));
      if (typeof ai === 'number' && typeof bi === 'number') return ai - bi;
      if (typeof ai === 'number') return -1;
      if (typeof bi === 'number') return 1;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [allEvents, filterTypes, narrativeOrder, orderingMode]);

  const timelineGroups = useMemo(() => {
    if (orderingMode === 'narrative') {
      return [{ startDate: 'narrative-order', events: orderedEvents }];
    }
    return groupEventsByDate(orderedEvents);
  }, [groupEventsByDate, orderedEvents, orderingMode]);

  // Auto-generate milestones when evidence or hypotheses change
  useEffect(() => {
    generateAutoMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generateAutoMilestones is stable and defined elsewhere
  }, [evidence.length, hypotheses.length]);

  // Auto-add milestones when evidence items are added
  useEffect(() => {
    if (evidence.length > 0) {
      const latestEvidence = evidence[evidence.length - 1];
      const evidenceMilestoneExists = events.some(
        (event) => event.type === 'document' && event.title.includes('New Evidence Added'),
      );

      if (!evidenceMilestoneExists) {
        const evidenceMilestone: TimelineEvent = {
          id: `milestone-evidence-added-${latestEvidence.id}`,
          title: `New Evidence Added: ${latestEvidence.title}`,
          description:
            latestEvidence.description || 'A new piece of evidence was added to the investigation',
          startDate: new Date(latestEvidence.extractedAt || Date.now()),
          type: 'document',
          confidence: latestEvidence.credibility === 'verified' ? 100 : 80,
          documents: [latestEvidence.id],
          hypothesisIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          layerId: 'auto-milestone',
          entities: [],
          evidence: [],
          importance: 'medium',
          tags: ['auto-generated', 'evidence-milestone'],
          sources: [],
          createdBy: 'system',
        };

        onEventsUpdate([...events, evidenceMilestone]);
      }
    }
  }, [events, evidence, evidence.length, onEventsUpdate]);

  // Auto-add milestones when hypotheses are created or updated
  useEffect(() => {
    if (hypotheses.length > 0) {
      const latestHypothesis = hypotheses[hypotheses.length - 1];
      const hypothesisMilestoneExists = events.some(
        (event) => event.type === 'hypothesis' && event.title.includes(latestHypothesis.title),
      );

      if (!hypothesisMilestoneExists) {
        const hypothesisMilestone: TimelineEvent = {
          id: `milestone-hypothesis-${latestHypothesis.id}`,
          title: `Hypothesis Created: ${latestHypothesis.title}`,
          description: latestHypothesis.description || 'A new hypothesis was formulated',
          startDate: new Date(latestHypothesis.createdAt || Date.now()),
          type: 'hypothesis',
          confidence: latestHypothesis.confidence || 50,
          documents: [],
          hypothesisIds: [latestHypothesis.id],
          createdAt: new Date(),
          updatedAt: new Date(),
          layerId: 'auto-milestone',
          entities: [],
          evidence: [],
          importance: 'high',
          tags: ['auto-generated', 'hypothesis-milestone'],
          sources: [],
          createdBy: 'system',
        };

        onEventsUpdate([...events, hypothesisMilestone]);
      }
    }
  }, [events, hypotheses, hypotheses.length, onEventsUpdate]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDateString) return;

    if (onSaveEvent) {
      await onSaveEvent({
        title: newEvent.title,
        description: newEvent.description || '',
        startDate: new Date(newEvent.startDateString),
        type: newEvent.type || 'document',
        confidence: newEvent.confidence || 80,
        documents: newEvent.documents || [],
        hypothesisIds: newEvent.hypothesisIds || [],
        importance: 'medium',
        tags: [],
        entities: [],
      });
    } else {
      const event: TimelineEvent = {
        id: `event-${Date.now()}`,
        title: newEvent.title,
        description: newEvent.description || '',
        startDate: new Date(newEvent.startDateString),
        type: newEvent.type || 'document',
        confidence: newEvent.confidence || 80,
        documents: newEvent.documents || [],
        hypothesisIds: newEvent.hypothesisIds || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        layerId: 'default',
        entities: [],
        evidence: [],
        importance: 'medium',
        tags: [],
        sources: [],
        createdBy: 'current-user',
      };
      onEventsUpdate([...events, event]);
    }

    setNewEvent({
      title: '',
      description: '',
      startDateString: new Date().toISOString(),
      type: 'document',
      confidence: 80,
      documents: [],
      hypothesisIds: [],
    });
    setIsAddingEvent(false);
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      description: event.description,
      startDateString: event.startDate.toISOString(),
      type: event.type,
      confidence: event.confidence,
      documents: event.documents,
      hypothesisIds: event.hypothesisIds,
    });
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent || !newEvent.title || !newEvent.startDateString) return;

    if (onSaveEvent) {
      await onSaveEvent({
        id: editingEvent.id,
        title: newEvent.title,
        description: newEvent.description || '',
        startDate: new Date(newEvent.startDateString),
        type: newEvent.type || 'document',
        confidence: newEvent.confidence || 80,
        documents: newEvent.documents || [],
        hypothesisIds: newEvent.hypothesisIds || [],
      });
    } else {
      const updatedEvent: TimelineEvent = {
        ...editingEvent,
        title: newEvent.title,
        description: newEvent.description || '',
        startDate: new Date(newEvent.startDateString),
        type: newEvent.type || 'document',
        confidence: newEvent.confidence || 80,
        documents: newEvent.documents || [],
        hypothesisIds: newEvent.hypothesisIds || [],
        updatedAt: new Date(),
      };

      const updatedEvents = events.map((e) => (e.id === editingEvent.id ? updatedEvent : e));
      onEventsUpdate(updatedEvents);
    }
    setEditingEvent(null);
    setNewEvent({
      title: '',
      description: '',
      startDateString: new Date().toISOString(),
      type: 'document',
      confidence: 80,
      documents: [],
      hypothesisIds: [],
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this timeline event?')) {
      if (onDeleteEvent) {
        await onDeleteEvent(eventId);
      } else {
        onEventsUpdate(events.filter((e) => e.id !== eventId));
        // Also remove from auto-milestones if it exists there
        setAutoMilestones(autoMilestones.filter((m) => m.id !== eventId));
      }
    }
  };

  const generateAutoMilestones = () => {
    const milestones: TimelineEvent[] = [];

    // Auto-generate investigation milestones based on evidence and patterns
    if (evidence.length > 0) {
      // Evidence discovery milestone
      const earliestEvidence = evidence.reduce((earliest, current) => {
        const currentDate = new Date(current.extractedAt || Date.now());
        const earliestDate = new Date(earliest.extractedAt || Date.now());
        return currentDate < earliestDate ? current : earliest;
      });

      milestones.push({
        id: `milestone-evidence-${investigation.id}`,
        title: 'Evidence Collection Started',
        description: `Initial evidence discovered: ${earliestEvidence.title}`,
        startDate: new Date(earliestEvidence.extractedAt || Date.now()),
        type: 'document',
        confidence: 100,
        documents: [earliestEvidence.id],
        hypothesisIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        layerId: 'auto-milestone',
        entities: [],
        evidence: [],
        importance: 'high',
        tags: ['auto-generated', 'milestone'],
        sources: [],
        createdBy: 'system',
      });
    }

    // Hypothesis formation milestone
    if (hypotheses.length > 0) {
      const primaryHypothesis = hypotheses[0];
      milestones.push({
        id: `milestone-hypothesis-${investigation.id}`,
        title: 'Primary Hypothesis Formed',
        description:
          primaryHypothesis.description || 'Initial investigation hypothesis established',
        startDate: new Date(primaryHypothesis.createdAt || Date.now()),
        type: 'hypothesis',
        confidence: primaryHypothesis.confidence || 80,
        documents: [],
        hypothesisIds: [primaryHypothesis.id],
        createdAt: new Date(),
        updatedAt: new Date(),
        layerId: 'auto-milestone',
        entities: [],
        evidence: [],
        importance: 'high',
        tags: ['auto-generated', 'milestone', 'hypothesis'],
        sources: [],
        createdBy: 'system',
      });
    }

    // Investigation creation milestone
    milestones.push({
      id: `milestone-investigation-${investigation.id}`,
      title: 'Investigation Initiated',
      description: `Investigation "${investigation.title}" created`,
      startDate: investigation.createdAt,
      type: 'document',
      confidence: 100,
      documents: [],
      hypothesisIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      layerId: 'auto-milestone',
      entities: [],
      evidence: [],
      importance: 'critical',
      tags: ['auto-generated', 'milestone', 'investigation-start'],
      sources: [],
      createdBy: 'system',
    });

    // Evidence threshold milestones
    const evidenceThresholds = [5, 10, 25, 50, 100];
    evidenceThresholds.forEach((threshold) => {
      if (evidence.length >= threshold) {
        const thresholdEvidence = evidence[threshold - 1];
        milestones.push({
          id: `milestone-evidence-${threshold}-${investigation.id}`,
          title: `Evidence Milestone: ${threshold} Items`,
          description: `Investigation reached ${threshold} evidence items`,
          startDate: new Date(thresholdEvidence.extractedAt || Date.now()),
          type: 'document',
          confidence: 90,
          documents: evidence.slice(0, threshold).map((e) => e.id),
          hypothesisIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          layerId: 'auto-milestone',
          entities: [],
          evidence: [],
          importance: threshold >= 25 ? 'high' : 'medium',
          tags: ['auto-generated', 'milestone', 'evidence-threshold'],
          sources: [],
          createdBy: 'system',
        });
      }
    });

    setAutoMilestones(milestones);
  };

  const handleDragStart = (eventId: string) => {
    if (orderingMode !== 'narrative') return;
    setDraggedEventId(eventId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetEventId: string) => {
    e.preventDefault();
    if (orderingMode !== 'narrative' || !draggedEventId || draggedEventId === targetEventId) return;
    const currentIds = orderedEvents.map((ev) => String(ev.id));
    const fromIndex = currentIds.indexOf(draggedEventId);
    const toIndex = currentIds.indexOf(targetEventId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...currentIds];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistNarrativeOrder(next);
    addToast({ text: 'Narrative order saved locally', type: 'success' });
    setDraggedEventId(null);
  };

  const moveEvent = async (eventId: string, direction: 'up' | 'down') => {
    if (orderingMode !== 'narrative') {
      addToast({
        text: 'Chronological mode enforces source date order. Switch to Narrative for manual ordering.',
        type: 'info',
      });
      return;
    }
    const ordered = orderedEvents.map((ev) => String(ev.id));
    const fromIdx = ordered.findIndex((id) => id === eventId);
    if (fromIdx < 0) return;
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= ordered.length) return;
    const next = [...ordered];
    const [row] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, row);
    persistNarrativeOrder(next);
    addToast({ text: 'Narrative order saved locally', type: 'success' });
  };

  const getEventTypeIcon = (type: string) => {
    const eventType = eventTypes.find((et) => et.value === type);
    return eventType ? eventType.icon : FileText;
  };

  const getEventTypeColor = (type: string) => {
    const eventType = eventTypes.find((et) => et.value === type);
    return eventType ? eventType.color : 'bg-[var(--text-muted)]';
  };

  const getEventTypeBorderColor = (type: string) => {
    const colorMap: Record<string, string> = {
      document: '#3b82f6',
      meeting: '#22c55e',
      location: '#a855f7',
      communication: '#f97316',
      hypothesis: '#ef4444',
      other: '#6b7280',
    };
    return colorMap[type] || colorMap.other;
  };

  const formatGroupDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;

    switch (timelineScale) {
      case 'day':
        return format(date, 'EEEE, MMMM d, yyyy');
      case 'week':
        return `Week of ${format(date, 'MMMM d, yyyy')}`;
      case 'month':
        return format(date, 'MMMM yyyy');
      case 'year':
        return format(date, 'yyyy');
      default:
        if (dateStr === 'narrative-order') return 'Narrative sequence';
        return dateStr;
    }
  };

  return (
    <div className="bg-[var(--app-bg)] text-[var(--text-primary)] min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Investigation Timeline
          </h1>
          <p className="text-[var(--text-secondary)]">
            Build and visualize the chronological sequence of events and evidence
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-2">
            {orderingMode === 'chronological'
              ? 'Chronological mode is enforced by source date. Drag handles are disabled.'
              : 'Narrative order is manual and local to this device; exports include this mode.'}
            <span
              className="inline-flex items-center gap-1 text-[var(--accent)]"
              title="Chronological exports are deterministic by source date. Narrative exports preserve your local manual sequence."
            >
              <Info className="w-3.5 h-3.5" />
              Semantics
            </span>
          </p>
        </div>

        {/* Controls */}
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
              <select
                value={timelineScale}
                onChange={(e) => {
                  if (isTimelineScale(e.target.value)) setTimelineScale(e.target.value);
                }}
                className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div className="flex items-center gap-2 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-1">
              <button
                onClick={() => setOrderingModeAndPersist('chronological')}
                className={`px-3 py-1.5 text-xs rounded-[var(--radius-md)] ${
                  orderingMode === 'chronological'
                    ? 'bg-[var(--accent)] text-[var(--app-bg)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
                }`}
              >
                Chronological
              </button>
              <button
                onClick={() => setOrderingModeAndPersist('narrative')}
                className={`px-3 py-1.5 text-xs rounded-[var(--radius-md)] ${
                  orderingMode === 'narrative'
                    ? 'bg-[var(--accent)] text-[var(--app-bg)] font-medium'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-highlight)]'
                }`}
              >
                Narrative order
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-md)] transition-colors text-[var(--text-primary)]"
            >
              <Eye className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={() => setIsAddingEvent(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-[var(--text-primary)] rounded-[var(--radius-md)] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Filter by Event Type
              </h3>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 cursor-pointer bg-[var(--glass-bg)] border border-[var(--glass-border)] px-3 py-1.5 rounded-[var(--radius-md)] hover:border-[var(--accent)]/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filterTypes.includes(type.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilterTypes([...filterTypes, type.value]);
                        } else {
                          setFilterTypes(filterTypes.filter((t) => t !== type.value));
                        }
                      }}
                      className="rounded accent-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6" ref={timelineRef}>
          {timelineGroups.map((group, _groupIndex) => (
            <div key={group.startDate} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="bg-[var(--glass-bg-strong)] text-[var(--text-primary)] border border-[var(--glass-border)] shadow-sm px-4 py-2 rounded-[var(--radius-md)] font-semibold">
                  {formatGroupDate(group.startDate)}
                </div>
                <div className="flex-1 h-px bg-[var(--glass-border)] ml-4"></div>
              </div>

              {/* Events */}
              <div className="ml-8 space-y-4">
                {group.events.map((event, _eventIndex) => (
                  <div
                    key={event.id}
                    draggable={orderingMode === 'narrative'}
                    onDragStart={() => handleDragStart(String(event.id))}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, String(event.id))}
                    onClick={() => onOpenSource?.(event)}
                    className={`relative bg-[var(--glass-bg)] rounded-[var(--radius-lg)] p-4 border-l-4 border-t border-r border-b border-r-[var(--glass-border)] border-t-[var(--glass-border)] border-b-[var(--glass-border)] hover:bg-[var(--glass-bg-highlight)] transition-colors shadow-sm ${
                      orderingMode === 'narrative' ? 'cursor-move' : 'cursor-pointer'
                    }`}
                    style={{ borderLeftColor: getEventTypeBorderColor(event.type) }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className={`w-8 h-8 rounded-full ${getEventTypeColor(event.type)} flex items-center justify-center shadow-sm`}
                          >
                            {React.createElement(getEventTypeIcon(event.type), {
                              className: 'w-4 h-4 text-[var(--text-primary)]',
                            })}
                          </div>
                          <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                            {event.title}
                          </h3>
                          <span className="text-xs bg-[var(--app-bg)]/50 border border-[var(--glass-border)] text-[var(--text-secondary)] px-2 py-1 rounded-[var(--radius-sm)]">
                            {Math.round(event.confidence)}% confidence
                          </span>
                          {orderingMode === 'narrative' && (
                            <span className="text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] px-2 py-1 rounded-[var(--radius-sm)]">
                              Narrative order
                            </span>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-[var(--text-secondary)] mb-3 ml-11 break-words">
                            {event.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] ml-11">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(event.startDate, 'HH:mm')}
                          </div>

                          {event.documents.length > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {event.documents.length} evidence items
                            </div>
                          )}

                          {event.hypothesisIds && event.hypothesisIds.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Link2 className="w-4 h-4" />
                              {event.hypothesisIds.length} hypotheses
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveEvent(String(event.id), 'up');
                          }}
                          disabled={orderingMode !== 'narrative'}
                          title={
                            orderingMode !== 'narrative'
                              ? 'Switch to Narrative order to move events'
                              : 'Move event up'
                          }
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-sm)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Move event up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveEvent(String(event.id), 'down');
                          }}
                          disabled={orderingMode !== 'narrative'}
                          title={
                            orderingMode !== 'narrative'
                              ? 'Switch to Narrative order to move events'
                              : 'Move event down'
                          }
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-sm)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Move event down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        {onOpenSource && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenSource(event);
                            }}
                            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-sm)] transition-colors"
                            aria-label="Open linked source"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-sm)] transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event.id);
                          }}
                          className="p-2 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/20 rounded-[var(--radius-sm)] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Event Modal */}
        {(isAddingEvent || editingEvent) && (
          <div className="fixed inset-0 bg-[var(--app-bg)]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
                {editingEvent ? 'Edit Timeline Event' : 'Add Timeline Event'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    placeholder="Enter event title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Description
                  </label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none h-20"
                    placeholder="Enter event description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={
                        newEvent.startDateString
                          ? format(parseISO(newEvent.startDateString), "yyyy-MM-dd'T'HH:mm")
                          : ''
                      }
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          startDateString: new Date(e.target.value).toISOString(),
                        })
                      }
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                      Event Type
                    </label>
                    <select
                      value={newEvent.type || 'document'}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value as TimelineEvent['type'] })
                      }
                      className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-md)] px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none"
                    >
                      {eventTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Confidence Level
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newEvent.confidence || 80}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, confidence: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-[var(--accent)]"
                    />
                    <span className="text-[var(--text-primary)] font-medium w-12 text-right">
                      {newEvent.confidence || 80}%
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Linked Evidence
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {evidence.map((ev) => (
                      <label
                        key={ev.id}
                        className="flex items-center gap-2 cursor-pointer bg-[var(--glass-bg)] border border-[var(--glass-border)] px-3 py-2 rounded-[var(--radius-sm)] hover:border-[var(--accent)]/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={newEvent.documents?.includes(ev.id) || false}
                          onChange={(e) => {
                            const documents = newEvent.documents || [];
                            if (e.target.checked) {
                              setNewEvent({ ...newEvent, documents: [...documents, ev.id] });
                            } else {
                              setNewEvent({
                                ...newEvent,
                                documents: documents.filter((id) => id !== ev.id),
                              });
                            }
                          }}
                          className="rounded accent-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--text-secondary)] truncate flex-1">
                          {ev.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Linked Hypotheses
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {hypotheses.map((hyp) => (
                      <label
                        key={hyp.id}
                        className="flex items-center gap-2 cursor-pointer bg-[var(--glass-bg)] border border-[var(--glass-border)] px-3 py-2 rounded-[var(--radius-sm)] hover:border-[var(--accent)]/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={newEvent.hypothesisIds?.includes(hyp.id) || false}
                          onChange={(e) => {
                            const hypothesisIds = newEvent.hypothesisIds || [];
                            if (e.target.checked) {
                              setNewEvent({
                                ...newEvent,
                                hypothesisIds: [...hypothesisIds, hyp.id],
                              });
                            } else {
                              setNewEvent({
                                ...newEvent,
                                hypothesisIds: hypothesisIds.filter((id: string) => id !== hyp.id),
                              });
                            }
                          }}
                          className="rounded accent-[var(--accent)]"
                        />
                        <span className="text-sm text-[var(--text-secondary)] truncate flex-1">
                          {hyp.title}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => {
                    setIsAddingEvent(false);
                    setEditingEvent(null);
                    setNewEvent({
                      title: '',
                      description: '',
                      startDateString: new Date().toISOString(),
                      type: 'document',
                      confidence: 80,
                      documents: [],
                      hypothesisIds: [],
                    });
                  }}
                  className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg)] rounded-[var(--radius-md)] border border-transparent hover:border-[var(--glass-border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
                  className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-[var(--text-primary)] rounded-[var(--radius-md)] transition-colors shadow-sm"
                >
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
