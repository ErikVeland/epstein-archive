import React, { useState, useCallback } from 'react';
import type { TimelineEvent } from '../../../types/investigation';
import { apiClient } from '../../../services/apiClient';
import styles from './MobileTimelineView.module.css';

const EVENT_TYPE_COLORS: Record<string, string> = {
  document: 'var(--accent)',
  meeting: 'var(--accent-yellow)',
  location: 'var(--accent-green)',
  communication: '#8b5cf6',
  hypothesis: 'var(--accent-red)',
  other: 'var(--text-muted)',
};

const EVENT_TYPES = ['document', 'meeting', 'location', 'communication', 'hypothesis', 'other'];

interface MobileTimelineViewProps {
  investigationId: string;
  timelineEvents: TimelineEvent[];
  onEventsChanged?: () => void;
}

export function MobileTimelineView({
  investigationId,
  timelineEvents,
  onEventsChanged,
}: MobileTimelineViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('other');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Group events by year
  const byYear = timelineEvents.reduce<Record<string, TimelineEvent[]>>((acc, evt) => {
    const year = new Date(evt.startDate).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(evt);
    return acc;
  }, {});

  const sortedYears = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  const handleSaveEvent = useCallback(async () => {
    if (!newTitle.trim() || !newDate) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiClient.post(`/investigations/${investigationId}/timeline-events`, {
        title: newTitle,
        start_date: newDate,
        type: newType,
      });
      setAddOpen(false);
      setNewTitle('');
      setNewDate('');
      setNewType('other');
      onEventsChanged?.();
    } catch (err) {
      console.error('Timeline event save failed:', err);
      setSaveError('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [investigationId, newTitle, newDate, newType, onEventsChanged]);

  const handleCloseSheet = useCallback(() => {
    setAddOpen(false);
    setNewTitle('');
    setNewDate('');
    setSaveError(null);
  }, []);

  return (
    <>
      <div className={styles.root}>
        {sortedYears.map((year) => (
          <div key={year} className={styles.yearGroup}>
            <div className={styles.yearDivider}>{year}</div>
            {byYear[year].map((evt) => (
              <div key={evt.id}>
                <button
                  className={styles.eventRow}
                  onClick={() => setExpandedId(expandedId === evt.id ? null : evt.id)}
                  aria-expanded={expandedId === evt.id}
                >
                  <span
                    className={styles.dot}
                    style={
                      {
                        '--dot-color': EVENT_TYPE_COLORS[evt.type] ?? EVENT_TYPE_COLORS.other,
                      } as React.CSSProperties
                    }
                  />
                  <div className={styles.eventBody}>
                    <div className={styles.eventMeta}>
                      <span className={styles.date}>
                        {new Date(evt.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className={styles.typeBadge}>{evt.type}</span>
                    </div>
                    <div className={styles.eventTitle}>{evt.title}</div>
                  </div>
                </button>
                {expandedId === evt.id && evt.description && (
                  <div className={styles.eventDetail}>{evt.description}</div>
                )}
              </div>
            ))}
          </div>
        ))}
        {sortedYears.length === 0 && (
          <div className={styles.emptyState}>No timeline events yet</div>
        )}
      </div>

      {addOpen && (
        <div className={styles.addSheet} onClick={handleCloseSheet}>
          <div className={styles.addSheetInner} onClick={(e) => e.stopPropagation()}>
            <div className={styles.addSheetTitle}>Add Event</div>
            <input
              type="date"
              className={styles.sheetInput}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <input
              type="text"
              className={styles.sheetInput}
              placeholder="Event title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <select
              className={styles.sheetSelect}
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {saveError !== null && <p className={styles.sheetError}>{saveError}</p>}
            <button
              className={styles.sheetSaveBtn}
              disabled={!newTitle.trim() || !newDate || saving}
              onClick={handleSaveEvent}
            >
              {saving ? 'Saving\u2026' : 'Save Event'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
