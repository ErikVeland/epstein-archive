import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TimelineEvent, EvidenceItem, Investigation, Hypothesis } from '../../types/investigation';
import { format, parseISO } from 'date-fns';
import {
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
  Zap,
  GripVertical,
  XCircle,
} from 'lucide-react';

import { useScrollLock } from '../../hooks/useScrollLock';

// UI Library
import { Surface, Button, Flex, Box, Stack, LqText, Grid, Badge } from '../../design-system/lib';
import styles from './InvestigationTimelineBuilder.module.css';

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

export const InvestigationTimelineBuilder: React.FC<TimelineBuilderProps> = ({
  investigation,
  events,
  evidence: _evidence,
  hypotheses: _hypotheses,
  onEventsUpdate,
  onSaveEvent,
  onDeleteEvent,
  onOpenSource: _onOpenSource,
}) => {
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [timelineScale, setTimelineScale] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [showFilters, setShowFilters] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  // const [_draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [_autoMilestones, _setAutoMilestones] = useState<TimelineEvent[]>([]);
  const [orderingMode, setOrderingMode] = useState<'chronological' | 'narrative'>('chronological');
  const [narrativeOrder, setNarrativeOrder] = useState<string[]>([]);
  // const _timelineRef = useRef<HTMLDivElement>(null);

  useScrollLock(isAddingEvent || !!editingEvent);

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
    { value: 'document', label: 'Document', icon: FileText, variant: 'accent' },
    { value: 'meeting', label: 'Meeting', icon: Users, variant: 'warning' },
    { value: 'location', label: 'Location', icon: MapPin, variant: 'purple' },
    { value: 'communication', label: 'Communication', icon: Link2, variant: 'success' },
    { value: 'hypothesis', label: 'Hypothesis', icon: Zap, variant: 'error' },
  ];

  const groupEventsByDate = useCallback(
    (eventsToGroup: TimelineEvent[]): TimelineGroup[] => {
      const groups: { [key: string]: TimelineEvent[] } = {};
      eventsToGroup.forEach((event) => {
        const date = new Date(event.startDate);
        let key = '';
        if (timelineScale === 'day') key = format(date, 'yyyy-MM-dd');
        else if (timelineScale === 'week') key = format(date, 'yyyy-ww');
        else if (timelineScale === 'month') key = format(date, 'yyyy-MM');
        else key = format(date, 'yyyy');

        if (!groups[key]) groups[key] = [];
        groups[key].push(event);
      });
      return Object.keys(groups)
        .sort()
        .map((k) => ({
          startDate: k,
          events: groups[k].sort(
            (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
          ),
        }));
    },
    [timelineScale],
  );

  useEffect(() => {
    // Legacy persistence logic
    try {
      const mode = window.localStorage.getItem(`iv_tm_mode_${investigation.id}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (mode === 'narrative' || mode === 'chronological') setOrderingMode(mode);
      const host = window.localStorage.getItem(`iv_tm_ord_${investigation.id}`);
      if (host) setNarrativeOrder(JSON.parse(host));
    } catch {
      /* ... */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [investigation.id]);

  const orderedEvents = useMemo(() => {
    const base =
      filterTypes.length > 0
        ? [...events, ..._autoMilestones].filter((e) => filterTypes.includes(e.type))
        : [...events, ..._autoMilestones];
    if (orderingMode === 'chronological')
      return base.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const pos = new Map(narrativeOrder.map((id, i) => [id, i]));
    return base.sort((a, b) => (pos.get(String(a.id)) ?? 999) - (pos.get(String(b.id)) ?? 999));
  }, [events, _autoMilestones, filterTypes, narrativeOrder, orderingMode]);

  const timelineGroups = useMemo(
    () =>
      orderingMode === 'narrative'
        ? [{ startDate: 'narrative', events: orderedEvents }]
        : groupEventsByDate(orderedEvents),
    [groupEventsByDate, orderedEvents, orderingMode],
  );

  const handleSave = async () => {
    if (!newEvent.title) return;
    const payload = { ...newEvent, startDate: new Date(newEvent.startDateString || Date.now()) };
    if (onSaveEvent) {
      await onSaveEvent(payload);
    } else {
      const ev = {
        ...payload,
        id: editingEvent?.id || `ev-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TimelineEvent;
      onEventsUpdate(editingEvent ? events.map((e) => (e.id === ev.id ? ev : e)) : [...events, ev]);
    }
    setIsAddingEvent(false);
    setEditingEvent(null);
  };

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEvent(event);
    setNewEvent({ ...event, startDateString: new Date(event.startDate).toISOString() });
    setIsAddingEvent(true);
  };

  const getTypeIcon = (t: string) => eventTypes.find((et) => et.value === t)?.icon || FileText;
  const getTypeVariant = (t: string) => eventTypes.find((et) => et.value === t)?.variant || 'glass';

  return (
    <Box className={styles.autoGen295} style={{ backgroundColor: 'var(--lq-surface-1)' }}>
      <Stack gap="xl">
        <Surface variant="glass" p="xl" className={styles.autoGen296}>
          <Flex justify="between" align="center">
            <Stack gap="none">
              <LqText variant="h2" weight="bold">
                Event Chronology
              </LqText>
              <LqText
                variant="xs"
                color="muted"
                style={{ textTransform: 'uppercase' }}
                weight="bold"
              >
                Forensic Timeline Reconstruction
              </LqText>
            </Stack>
            <Flex gap="sm">
              <Button variant="primary" onClick={() => setIsAddingEvent(true)}>
                <Plus size={16} /> New Event
              </Button>
            </Flex>
          </Flex>
        </Surface>

        <Surface variant="glass" p="md">
          <Flex gap="xl" wrap="wrap" align="center">
            <Flex align="center" gap="sm">
              <Calendar size={14} className={styles.autoGen297} />
              <select
                value={timelineScale}
                onChange={(e) =>
                  setTimelineScale(e.target.value as 'day' | 'week' | 'month' | 'year')
                }
                style={{
                  background: 'var(--lq-surface-3)',
                  border: '1px solid var(--lq-surface-4)',
                  borderRadius: '0.375rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  color: 'var(--lq-text-primary)',
                  outline: 'none',
                }}
              >
                <option value="day">Daily View</option>
                <option value="week">Weekly View</option>
                <option value="month">Monthly View</option>
              </select>
            </Flex>

            <Surface variant="glass-highlight" className={styles.autoGen298}>
              <Button
                variant={orderingMode === 'chronological' ? 'accent-solid' : 'ghost'}
                onClick={() => setOrderingMode('chronological')}
              >
                Chronological
              </Button>
              <Button
                variant={orderingMode === 'narrative' ? 'accent-solid' : 'ghost'}
                onClick={() => setOrderingMode('narrative')}
              >
                Narrative
              </Button>
            </Surface>

            <Button variant="glass" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Eye size={12} /> {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </Flex>
        </Surface>

        {showFilters && (
          <Surface variant="glass" p="lg" className={styles.autoGen299}>
            <Stack gap="md">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                Filter by Event Signal:
              </LqText>
              <Flex gap="sm" wrap="wrap">
                {eventTypes.map((t) => (
                  <Button
                    key={t.value}
                    variant={filterTypes.includes(t.value) ? 'accent-solid' : 'glass'}
                    onClick={() =>
                      setFilterTypes((prev) =>
                        prev.includes(t.value)
                          ? prev.filter((x) => x !== t.value)
                          : [...prev, t.value],
                      )
                    }
                  >
                    {t.label}
                  </Button>
                ))}
              </Flex>
            </Stack>
          </Surface>
        )}

        <Box p="xl" className={styles.autoGen300}>
          {timelineGroups.map((group) => (
            <Stack key={group.startDate} gap="lg" mb="xxl">
              <Flex align="center" gap="md">
                <Box p="xs" className={styles.autoGen301}>
                  <Calendar size={14} className={styles.autoGen302} />
                </Box>
                <LqText
                  variant="small"
                  weight="bold"
                  style={{ textTransform: 'uppercase' }}
                  color="muted"
                >
                  {group.startDate === 'narrative' ? 'Narrative Sequence' : group.startDate}
                </LqText>
                <Box grow className={styles.autoGen303} />
              </Flex>

              <Stack gap="sm">
                {group.events.map((event) => {
                  const Icon = getTypeIcon(event.type);
                  const variant = getTypeVariant(event.type);
                  return (
                    <Surface
                      key={event.id}
                      variant="glass-highlight"
                      p="lg"
                      style={{
                        borderLeft: `4px solid var(--lq-${variant})`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Flex gap="lg" align="start">
                        {orderingMode === 'narrative' && (
                          <Box style={{ cursor: 'grab', opacity: 0.3, marginTop: '0.25rem' }}>
                            <GripVertical size={16} />
                          </Box>
                        )}
                        <Stack grow gap="xs">
                          <Flex justify="between" align="start">
                            <Stack gap="none">
                              <Flex align="center" gap="sm">
                                <Box
                                  p="xxs"
                                  style={{
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: `var(--lq-${variant})`,
                                    color: 'white',
                                    display: 'inline-flex',
                                  }}
                                >
                                  <Icon size={12} />
                                </Box>
                                <LqText variant="body" weight="bold">
                                  {event.title}
                                </LqText>
                              </Flex>
                              <Flex gap="sm" align="center" mt="xs">
                                <Badge
                                  variant="glass"
                                  label={format(event.startDate, 'HH:mm')}
                                  icon={Clock}
                                  size="sm"
                                />
                                <Badge
                                  variant={event.confidence >= 90 ? 'success' : 'warning'}
                                  label={`${event.confidence}% CONF`}
                                  size="sm"
                                />
                              </Flex>
                            </Stack>
                            <Flex gap="xs">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditEvent(event)}
                              >
                                <Edit2 size={12} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={styles.autoGen304}
                                onClick={() => onDeleteEvent?.(event.id)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </Flex>
                          </Flex>
                          {event.description && (
                            <LqText variant="xs" color="muted">
                              {event.description}
                            </LqText>
                          )}
                          <Flex wrap="wrap" gap="sm" mt="sm">
                            {event.documents.map((dId: string) => (
                              <Badge
                                key={dId}
                                variant="glass"
                                label={`DOC ${dId}`}
                                icon={FileText}
                                size="sm"
                              />
                            ))}
                            {(event.hypothesisIds || []).map((hId: string) => (
                              <Badge
                                key={hId}
                                variant="accent"
                                label={`HYP ${hId}`}
                                icon={Zap}
                                size="sm"
                              />
                            ))}
                          </Flex>
                        </Stack>
                      </Flex>
                    </Surface>
                  );
                })}
              </Stack>
            </Stack>
          ))}
        </Box>
      </Stack>

      {/* Persistence Modal (Add/Edit) */}
      {(isAddingEvent || editingEvent) && (
        <Box className={styles.autoGen305}>
          <Surface variant="panel" width={600} p="xxl" className={styles.autoGen306}>
            <Stack gap="xl">
              <Flex justify="between" align="start">
                <LqText variant="h3" weight="bold">
                  {editingEvent ? 'Refine Event Chronology' : 'Document Temporal Signal'}
                </LqText>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingEvent(false);
                    setEditingEvent(null);
                  }}
                >
                  <XCircle size={18} />
                </Button>
              </Flex>

              <Stack gap="md">
                <Stack gap="xs">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Event Summary
                  </LqText>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    }}
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Transfer to primary escrow"
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText
                    variant="xs"
                    weight="bold"
                    color="muted"
                    style={{ textTransform: 'uppercase' }}
                  >
                    Forensic Detail
                  </LqText>
                  <textarea
                    style={{
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                      resize: 'none',
                    }}
                    rows={3}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Technical specifics..."
                  />
                </Stack>
                <Grid cols={2} gap="md">
                  <Stack gap="xs">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={{ textTransform: 'uppercase' }}
                    >
                      Temporal Reference
                    </LqText>
                    <input
                      type="datetime-local"
                      style={{
                        width: '100%',
                        background: 'var(--lq-surface-3)',
                        border: '1px solid var(--lq-surface-4)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--lq-text-primary)',
                        outline: 'none',
                      }}
                      value={format(
                        parseISO(newEvent.startDateString || new Date().toISOString()),
                        "yyyy-MM-dd'T'HH:mm",
                      )}
                      onChange={(e) =>
                        setNewEvent({
                          ...newEvent,
                          startDateString: new Date(e.target.value).toISOString(),
                        })
                      }
                    />
                  </Stack>
                  <Stack gap="xs">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={{ textTransform: 'uppercase' }}
                    >
                      Signal Type
                    </LqText>
                    <select
                      style={{
                        width: '100%',
                        background: 'var(--lq-surface-3)',
                        border: '1px solid var(--lq-surface-4)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--lq-text-primary)',
                        outline: 'none',
                      }}
                      value={newEvent.type}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, type: e.target.value as TimelineEvent['type'] })
                      }
                    >
                      {eventTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Stack>
                </Grid>
              </Stack>

              <Flex gap="md">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsAddingEvent(false);
                    setEditingEvent(null);
                  }}
                >
                  Abort
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  Confirm Chronology
                </Button>
              </Flex>
            </Stack>
          </Surface>
        </Box>
      )}
    </Box>
  );
};
