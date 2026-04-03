import React, { useCallback, useEffect, useState } from 'react';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import { apiClient } from '../../services/apiClient';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  ExternalLink,
  Flag,
  Loader2,
  PlusCircle,
  Trash2,
  XCircle,
} from 'lucide-react';

import styles from './InvestigationLeadsPanel.module.css';

type LeadStatus = 'open' | 'pursued' | 'dead_end' | 'resolved';
type LeadPriority = 'low' | 'medium' | 'high' | 'critical';

interface InvestigationLead {
  id: number;
  investigationId: number;
  title: string;
  description: string | null;
  status: LeadStatus;
  priority: LeadPriority;
  sourceDocumentId: number | null;
  sourceEftaRef: string | null;
  assignedTo: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvestigationLeadsPanelProps {
  investigationId: string;
  onClose: () => void;
  onConvertToTask?: (lead: InvestigationLead) => void;
  onConvertToHypothesis?: (lead: InvestigationLead) => void;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; Icon: React.FC<{ className?: string }>; style: string; next: LeadStatus }
> = {
  open: {
    label: 'Open',
    Icon: Circle,
    style: styles.statusOpen,
    next: 'pursued',
  },
  pursued: {
    label: 'Pursued',
    Icon: AlertCircle,
    style: styles.statusPursued,
    next: 'resolved',
  },
  dead_end: {
    label: 'Dead End',
    Icon: XCircle,
    style: styles.statusDeadEnd,
    next: 'open',
  },
  resolved: {
    label: 'Resolved',
    Icon: CheckCircle2,
    style: styles.statusResolved,
    next: 'open',
  },
};

const PRIORITY_STYLE: Record<LeadPriority, string> = {
  critical: styles.priorityCritical,
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const InvestigationLeadsPanel: React.FC<InvestigationLeadsPanelProps> = ({
  investigationId,
  onClose,
  onConvertToTask,
  onConvertToHypothesis,
}) => {
  const [leads, setLeads] = useState<InvestigationLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLead, setNewLead] = useState({
    title: '',
    description: '',
    priority: 'high' as LeadPriority,
    source_efta_ref: '',
  });
  const [creating, setCreating] = useState(false);
  const { addToast } = useToasts();
  useScrollLock(true);

  const loadLeads = useCallback(async () => {
    if (!investigationId) return;
    setLoading(true);
    try {
      const data = await apiClient.get<InvestigationLead[]>(
        `/investigations/${investigationId}/leads${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`,
      );
      setLeads(data);
    } catch {
      addToast({ text: 'Failed to load leads', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [investigationId, statusFilter, addToast]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleStatusCycle = async (lead: InvestigationLead) => {
    const next = STATUS_CONFIG[lead.status].next;
    try {
      await fetch(`/api/investigations/${investigationId}/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      });
      await loadLeads();
    } catch {
      addToast({ text: 'Failed to update lead status', type: 'error' });
    }
  };

  const handleMarkDeadEnd = async (lead: InvestigationLead) => {
    try {
      await fetch(`/api/investigations/${investigationId}/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'dead_end' }),
      });
      await loadLeads();
    } catch {
      addToast({ text: 'Failed to mark dead end', type: 'error' });
    }
  };

  const handleDelete = async (lead: InvestigationLead) => {
    if (!window.confirm(`Delete lead "${lead.title}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/investigations/${investigationId}/leads/${lead.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await loadLeads();
      addToast({ text: 'Lead deleted', type: 'success' });
    } catch {
      addToast({ text: 'Failed to delete lead', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.title.trim()) return;
    setCreating(true);
    try {
      await apiClient.post(`/investigations/${investigationId}/leads`, {
        title: newLead.title.trim(),
        description: newLead.description.trim() || null,
        priority: newLead.priority,
        source_efta_ref: newLead.source_efta_ref.trim() || null,
      });
      setNewLead({ title: '', description: '', priority: 'high', source_efta_ref: '' });
      setShowNewForm(false);
      await loadLeads();
      addToast({ text: 'Lead created', type: 'success' });
    } catch {
      addToast({ text: 'Failed to create lead', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const openCount = leads.filter((l) => l.status === 'open').length;
  const pursuedCount = leads.filter((l) => l.status === 'pursued').length;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              <Flag className={`w-4 h-4 ${styles.iconAmber}`} />
              Investigation Leads
            </h2>
            <p className={styles.headerSubtitle}>Track, pursue, and resolve investigative leads</p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close leads panel" />
        </div>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <div>
            <span className={styles.statValueEmerald}>{openCount}</span>
            <span className={styles.statLabel}>open</span>
          </div>
          <div>
            <span className={styles.statValueBlue}>{pursuedCount}</span>
            <span className={styles.statLabel}>active</span>
          </div>
          <div className="ml-auto">
            <span className={styles.statLabel}>{leads.length} total</span>
          </div>
        </div>

        {/* Filters + Add */}
        <div className={styles.controlsBar}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
            className={styles.select}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="pursued">Pursued</option>
            <option value="dead_end">Dead End</option>
            <option value="resolved">Resolved</option>
          </select>
          <button onClick={() => setShowNewForm((v) => !v)} className={styles.addButton}>
            <PlusCircle className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>

        {/* New lead form */}
        {showNewForm && (
          <form onSubmit={handleCreate} className={styles.form}>
            <input
              autoFocus
              type="text"
              placeholder="Lead title *"
              value={newLead.title}
              onChange={(e) => setNewLead((p) => ({ ...p, title: e.target.value }))}
              className={styles.input}
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              value={newLead.description}
              onChange={(e) => setNewLead((p) => ({ ...p, description: e.target.value }))}
              className={styles.textarea}
            />
            <div className="flex gap-2">
              <select
                value={newLead.priority}
                onChange={(e) =>
                  setNewLead((p) => ({ ...p, priority: e.target.value as LeadPriority }))
                }
                className={styles.select}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                type="text"
                placeholder="EFTA ID (optional)"
                value={newLead.source_efta_ref}
                onChange={(e) => setNewLead((p) => ({ ...p, source_efta_ref: e.target.value }))}
                className={styles.input}
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newLead.title.trim() || creating}
                className={styles.submitButton}
              >
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Add Lead
              </button>
            </div>
          </form>
        )}

        {/* Leads list */}
        <div className={styles.leadsList}>
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className={styles.emptyState}>
              <Flag className={styles.emptyIcon} />
              <p className="text-sm text-[var(--text-muted)]">No leads yet.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Import a report or add leads manually.
              </p>
            </div>
          )}

          {leads.map((lead) => {
            const { label, Icon, style } = STATUS_CONFIG[lead.status];
            return (
              <div key={lead.id} className={styles.leadCard}>
                {/* Title row */}
                <div className={styles.leadTitleRow}>
                  <button
                    onClick={() => handleStatusCycle(lead)}
                    title={`Status: ${label} — click to advance`}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <Icon className={`w-4 h-4 ${style.split(' ')[0]}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={styles.leadTitle}>{lead.title}</p>
                    {lead.description && (
                      <p className={styles.leadDescription}>{lead.description}</p>
                    )}
                  </div>
                </div>

                {/* Badges row */}
                <div className={styles.badgeRow}>
                  <span className={`${styles.badge} ${style}`}>{label}</span>
                  <span className={`${styles.badge} ${PRIORITY_STYLE[lead.priority]}`}>
                    {lead.priority}
                  </span>
                  {lead.sourceEftaRef && (
                    <a
                      href={`/documents?q=${lead.sourceEftaRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.eftaLink}
                    >
                      {lead.sourceEftaRef}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Actions row */}
                <div className={styles.actionsRow}>
                  {lead.status !== 'dead_end' && (
                    <button
                      onClick={() => handleMarkDeadEnd(lead)}
                      className={`${styles.actionButton} text-rose-400/70 hover:text-rose-400`}
                    >
                      Mark dead end
                    </button>
                  )}
                  {onConvertToTask && (
                    <button
                      onClick={() => onConvertToTask(lead)}
                      className={`${styles.actionButton} hover:text-[var(--accent)]`}
                    >
                      → Task
                    </button>
                  )}
                  {onConvertToHypothesis && (
                    <button
                      onClick={() => onConvertToHypothesis(lead)}
                      className={`${styles.actionButton} hover:text-[var(--accent)]`}
                    >
                      → Hypothesis
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(lead)}
                    className={styles.deleteButton}
                    title="Delete lead"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
