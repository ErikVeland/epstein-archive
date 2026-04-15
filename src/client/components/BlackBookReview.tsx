import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, SkipForward, AlertCircle } from 'lucide-react';
import { useToasts } from './common/useToasts';
import { apiClient } from '../services/apiClient';
import styles from './BlackBookReview.module.css';

import { Button, Input } from '../design-system/lib';

interface ReviewEntry {
  id: number;
  person_id: number;
  original_name: string;
  cleaned_name: string;
  entry_text: string;
  phone_numbers: string[];
  addresses: string[];
  email_addresses: string[];
  needs_review: boolean;
}

const parseStringList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    if (!value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
        : [value];
    } catch {
      return [value];
    }
  }
  return [];
};

interface ReviewQueueData {
  entries: ReviewEntry[];
  stats: { total: number; reviewed: number; remaining: number };
}

const EMPTY_REVIEW_ENTRIES: ReviewEntry[] = [];
const EMPTY_REVIEW_STATS = { total: 0, reviewed: 0, remaining: 0 };

export const BlackBookReview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const { addToast } = useToasts();

  const { data, isLoading, refetch } = useQuery<ReviewQueueData>({
    queryKey: ['black-book-review'],
    queryFn: async () => {
      const response = await fetch('/api/black-book/review');
      const data = await response.json();

      const entries = (Array.isArray(data.entries) ? data.entries : []).map(
        (entry: Record<string, unknown>) => ({
          ...entry,
          phone_numbers: parseStringList(entry.phone_numbers),
          addresses: parseStringList(entry.addresses),
          email_addresses: parseStringList(entry.email_addresses),
        }),
      ) as ReviewEntry[];

      const stats =
        typeof data.stats === 'object' && data.stats !== null
          ? {
              total: Number((data.stats as Record<string, unknown>).total || 0),
              reviewed: Number((data.stats as Record<string, unknown>).reviewed || 0),
              remaining: Number((data.stats as Record<string, unknown>).remaining || 0),
            }
          : { total: 0, reviewed: 0, remaining: 0 };

      return { entries, stats };
    },
  });

  const entries = data?.entries ?? EMPTY_REVIEW_ENTRIES;
  const stats = data?.stats ?? EMPTY_REVIEW_STATS;

  useEffect(() => {
    if (entries.length > 0 && currentIndex < entries.length) {
      setEditedName(entries[currentIndex].cleaned_name);
    }
  }, [currentIndex, entries]);

  const handleAction = async (action: 'approve' | 'skip' | 'delete') => {
    if (currentIndex >= entries.length) return;

    const entry = entries[currentIndex];
    setSaving(true);

    try {
      await apiClient.post(`/black-book/review/${entry.id}`, {
        correctedName: editedName,
        action,
      });

      // Move to next entry
      if (currentIndex < entries.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Refresh to get updated stats and entries
        await refetch();
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Error saving review:', error);
      addToast({ text: 'Failed to save. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CheckCircle className={styles.emptyIcon} />
        <h3 className={styles.emptyTitle}>All Done!</h3>
        <p className={styles.emptyBody}>All Black Book entries have been reviewed.</p>
      </div>
    );
  }

  const current = entries[currentIndex];
  const progress = ((stats.reviewed / stats.total) * 100).toFixed(1);

  return (
    <div className={styles.stack}>
      {/* Header & Progress */}
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div>
            <h2 className={styles.title}>Black Book Review</h2>
            <p className={styles.subtitle}>
              Manually correct flagged entries with poor OCR quality
            </p>
          </div>
          <div className={styles.remainingBlock}>
            <div className={styles.remainingValue}>{stats.remaining}</div>
            <div className={styles.remainingLabel}>remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressMeta}>
            <span>Progress</span>
            <span>
              {stats.reviewed} of {stats.total} ({progress}%)
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Review Card */}
      <div className={styles.card}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewBadge}>
            <AlertCircle className={styles.reviewBadgeIcon} />
            <span>Needs Review</span>
          </div>
          <div className={styles.entryMeta}>
            Entry {currentIndex + 1} of {entries.length}
          </div>
        </div>

        {/* Original OCR Text */}
        <div className={styles.fieldSection}>
          <label className={styles.label}>Original OCR Text</label>
          <div className={styles.monoBlock}>{current.entry_text}</div>
        </div>

        {/* Current Name */}
        <div className={styles.fieldSectionCompact}>
          <label className={styles.label}>Current Name (AI Cleaned)</label>
          <div className={styles.valueBlock}>{current.cleaned_name}</div>
        </div>

        {/* Editable Name */}
        <div className={styles.fieldSection}>
          <label className={styles.label}>Corrected Name</label>
          <Input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className={styles.textInput}
            placeholder="Enter corrected name..."
            disabled={saving}
          />
        </div>

        {/* Contact Info */}
        {(current.phone_numbers.length > 0 ||
          current.email_addresses.length > 0 ||
          current.addresses.length > 0) && (
          <div className={`${styles.fieldSection} ${styles.contactCard}`}>
            <h4 className={styles.contactTitle}>Contact Information</h4>
            <div className={styles.contactList}>
              {current.phone_numbers.length > 0 && (
                <div className={styles.contactRow}>
                  <span className={styles.contactLabel}>Phones:</span>
                  <span className={styles.contactValue}>{current.phone_numbers.join(', ')}</span>
                </div>
              )}
              {current.email_addresses.length > 0 && (
                <div className={styles.contactRow}>
                  <span className={styles.contactLabel}>Emails:</span>
                  <span className={styles.contactValue}>{current.email_addresses.join(', ')}</span>
                </div>
              )}
              {current.addresses.length > 0 && (
                <div className={styles.contactRow}>
                  <span className={styles.contactLabel}>Addresses:</span>
                  <span className={styles.contactValue}>
                    {current.addresses.slice(0, 2).join('; ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <Button
            unstyled
            onClick={() => handleAction('approve')}
            disabled={saving || !editedName.trim()}
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          >
            <CheckCircle className={styles.actionIcon} />
            <span>Approve & Save</span>
          </Button>

          <Button
            unstyled
            onClick={() => handleAction('skip')}
            disabled={saving}
            className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
          >
            <SkipForward className={styles.actionIcon} />
            <span>Skip</span>
          </Button>

          <Button
            unstyled
            onClick={() => handleAction('delete')}
            disabled={saving}
            className={`${styles.actionButton} ${styles.actionButtonDanger}`}
          >
            <XCircle className={styles.actionIcon} />
            <span>Delete</span>
          </Button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className={styles.shortcutHint}>
          <p className={styles.shortcutText}>
            Tip: Use Tab to focus name field, Enter to approve, or click buttons
          </p>
        </div>
      </div>
    </div>
  );
};
