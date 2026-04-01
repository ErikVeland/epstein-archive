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
  { label: string; Icon: React.FC<{ className?: string }>; color: string; next: LeadStatus }
> = {
  open: {
    label: 'Open',
    Icon: Circle,
    color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    next: 'pursued',
  },
  pursued: {
    label: 'Pursued',
    Icon: AlertCircle,
    color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    next: 'resolved',
  },
  dead_end: {
    label: 'Dead End',
    Icon: XCircle,
    color: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
    next: 'open',
  },
  resolved: {
    label: 'Resolved',
    Icon: CheckCircle2,
    color: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
    next: 'open',
  },
};

const PRIORITY_COLOR: Record<LeadPriority, string> = {
  critical: 'text-rose-400 border-rose-500/40 bg-rose-500/10',
  high: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  medium: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  low: 'text-[var(--text-muted)] border-[var(--glass-border)] bg-transparent',
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
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-[var(--glass-bg)] backdrop-blur-sm">
      <div className="w-full max-w-md bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] shadow-[var(--glass-shadow)] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--glass-border)] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-400" />
              Investigation Leads
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Track, pursue, and resolve investigative leads
            </p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close leads panel" />
        </div>

        {/* Stats bar */}
        <div className="px-5 py-2.5 border-b border-[var(--glass-border)] flex gap-4 text-xs">
          <div>
            <span className="text-emerald-400 font-semibold">{openCount}</span>
            <span className="text-[var(--text-muted)] ml-1">open</span>
          </div>
          <div>
            <span className="text-blue-400 font-semibold">{pursuedCount}</span>
            <span className="text-[var(--text-muted)] ml-1">active</span>
          </div>
          <div className="ml-auto">
            <span className="text-[var(--text-muted)]">{leads.length} total</span>
          </div>
        </div>

        {/* Filters + Add */}
        <div className="px-5 py-2.5 border-b border-[var(--glass-border)] flex gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
            className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="pursued">Pursued</option>
            <option value="dead_end">Dead End</option>
            <option value="resolved">Resolved</option>
          </select>
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--accent)]/10 border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-medium hover:bg-[var(--accent)]/20 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>

        {/* New lead form */}
        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="px-5 py-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] space-y-3"
          >
            <input
              autoFocus
              type="text"
              placeholder="Lead title *"
              value={newLead.title}
              onChange={(e) => setNewLead((p) => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              value={newLead.description}
              onChange={(e) => setNewLead((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] resize-none"
            />
            <div className="flex gap-2">
              <select
                value={newLead.priority}
                onChange={(e) =>
                  setNewLead((p) => ({ ...p, priority: e.target.value as LeadPriority }))
                }
                className="flex-1 bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
                className="flex-1 px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-3 py-1.5 rounded-[var(--radius-lg)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newLead.title.trim() || creating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-lg)] bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Add Lead
              </button>
            </div>
          </form>
        )}

        {/* Leads list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && (
            <div className="flex justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className="border border-dashed border-[var(--glass-border)] rounded-[var(--radius-lg)] p-8 text-center">
              <Flag className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">No leads yet.</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Import a report or add leads manually.
              </p>
            </div>
          )}

          {leads.map((lead) => {
            const { label, Icon, color } = STATUS_CONFIG[lead.status];
            return (
              <div
                key={lead.id}
                className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)]/60 p-4 space-y-3"
              >
                {/* Title row */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleStatusCycle(lead)}
                    title={`Status: ${label} — click to advance`}
                    className="mt-0.5 flex-shrink-0"
                  >
                    <Icon className={`w-4 h-4 ${color.split(' ')[0]}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">
                      {lead.title}
                    </p>
                    {lead.description && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-3">
                        {lead.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5 items-center text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full border font-medium ${color}`}>
                    {label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[lead.priority]}`}
                  >
                    {lead.priority}
                  </span>
                  {lead.sourceEftaRef && (
                    <a
                      href={`/documents?q=${lead.sourceEftaRef}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-[var(--glass-border)] text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                    >
                      {lead.sourceEftaRef}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {lead.status !== 'dead_end' && (
                    <button
                      onClick={() => handleMarkDeadEnd(lead)}
                      className="text-[10px] text-rose-400/70 hover:text-rose-400 transition-colors"
                    >
                      Mark dead end
                    </button>
                  )}
                  {onConvertToTask && (
                    <button
                      onClick={() => onConvertToTask(lead)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      → Task
                    </button>
                  )}
                  {onConvertToHypothesis && (
                    <button
                      onClick={() => onConvertToHypothesis(lead)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      → Hypothesis
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(lead)}
                    className="ml-auto text-[var(--text-muted)] hover:text-rose-400 transition-colors"
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
