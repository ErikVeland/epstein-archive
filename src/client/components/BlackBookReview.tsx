import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, SkipForward, AlertCircle } from 'lucide-react';
import { useToasts } from './common/useToasts';

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

export const BlackBookReview: React.FC = () => {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedName, setEditedName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, remaining: 0 });
  const { addToast } = useToasts();

  useEffect(() => {
    fetchReviewEntries();
  }, []);

  useEffect(() => {
    if (entries.length > 0 && currentIndex < entries.length) {
      setEditedName(entries[currentIndex].cleaned_name);
    }
  }, [currentIndex, entries]);

  const fetchReviewEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/black-book/review');
      const data = await response.json();

      // Parse JSON fields
      const parsed = data.entries.map((entry: any) => ({
        ...entry,
        phone_numbers: entry.phone_numbers ? JSON.parse(entry.phone_numbers) : [],
        addresses: entry.addresses ? JSON.parse(entry.addresses) : [],
        email_addresses: entry.email_addresses ? JSON.parse(entry.email_addresses) : [],
      }));

      setEntries(parsed);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching review entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'skip' | 'delete') => {
    if (currentIndex >= entries.length) return;

    const entry = entries[currentIndex];
    setSaving(true);

    try {
      await fetch(`/api/black-book/review/${entry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedName: editedName,
          action,
        }),
      });

      // Move to next entry
      if (currentIndex < entries.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Refresh to get updated stats
        await fetchReviewEntries();
        setCurrentIndex(0);
      }

      // Update stats
      setStats((prev) => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        remaining: prev.remaining - 1,
      }));
    } catch (error) {
      console.error('Error saving review:', error);
      addToast({ text: 'Failed to save. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">All Done!</h3>
        <p className="text-[var(--text-muted)]">All Black Book entries have been reviewed.</p>
      </div>
    );
  }

  const current = entries[currentIndex];
  const progress = ((stats.reviewed / stats.total) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Black Book Review</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Manually correct flagged entries with poor OCR quality
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[var(--accent)]">{stats.remaining}</div>
            <div className="text-sm text-[var(--text-muted)]">remaining</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-[var(--text-muted)]">
            <span>Progress</span>
            <span>
              {stats.reviewed} of {stats.total} ({progress}%)
            </span>
          </div>
          <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-2">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Review Card */}
      <div className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Needs Review</span>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            Entry {currentIndex + 1} of {entries.length}
          </div>
        </div>

        {/* Original OCR Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Original OCR Text
          </label>
          <div className="bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded p-3 font-mono text-sm text-[var(--text-muted)] whitespace-pre-wrap">
            {current.entry_text}
          </div>
        </div>

        {/* Current Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Current Name (AI Cleaned)
          </label>
          <div className="bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded p-3 text-[var(--text-secondary)]">
            {current.cleaned_name}
          </div>
        </div>

        {/* Editable Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Corrected Name
          </label>
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="w-full px-4 py-3 bg-[var(--glass-bg-strong)]/50 border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="Enter corrected name..."
            disabled={saving}
          />
        </div>

        {/* Contact Info */}
        {(current.phone_numbers.length > 0 ||
          current.email_addresses.length > 0 ||
          current.addresses.length > 0) && (
          <div className="mb-6 p-4 bg-[var(--glass-bg-strong)]/30 border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
              Contact Information
            </h4>
            <div className="space-y-2 text-sm">
              {current.phone_numbers.length > 0 && (
                <div>
                  <span className="text-[var(--text-muted)]">Phones:</span>
                  <span className="text-[var(--text-secondary)] ml-2">
                    {current.phone_numbers.join(', ')}
                  </span>
                </div>
              )}
              {current.email_addresses.length > 0 && (
                <div>
                  <span className="text-[var(--text-muted)]">Emails:</span>
                  <span className="text-[var(--text-secondary)] ml-2">
                    {current.email_addresses.join(', ')}
                  </span>
                </div>
              )}
              {current.addresses.length > 0 && (
                <div>
                  <span className="text-[var(--text-muted)]">Addresses:</span>
                  <span className="text-[var(--text-secondary)] ml-2">
                    {current.addresses.slice(0, 2).join('; ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => handleAction('approve')}
            disabled={saving || !editedName.trim()}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Approve & Save</span>
          </button>

          <button
            onClick={() => handleAction('skip')}
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-[var(--glass-bg-highlight)] text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium hover:bg-[var(--glass-bg-highlight)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <SkipForward className="w-5 h-5" />
            <span>Skip</span>
          </button>

          <button
            onClick={() => handleAction('delete')}
            disabled={saving}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-[var(--text-primary)] rounded-[var(--radius-lg)] font-medium hover:from-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <XCircle className="w-5 h-5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
          <p className="text-xs text-[var(--text-muted)] text-center">
            Tip: Use Tab to focus name field, Enter to approve, or click buttons
          </p>
        </div>
      </div>
    </div>
  );
};
