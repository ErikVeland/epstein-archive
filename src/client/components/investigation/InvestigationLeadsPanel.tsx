import React, { useCallback, useEffect, useState } from 'react';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '../../hooks/useScrollLock';
import { apiClient } from '../../services/apiClient';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Flag,
  Loader2,
  PlusCircle,
  Trash2,
  XCircle,
  Zap,
  Target,
  ArrowRight,
  Filter,
} from 'lucide-react';

// UI Library
import {
  Surface,
  Button,
  Flex,
  Box,
  Stack,
  LqText,
  cn,
  Badge,
  Skeleton,
} from '../../design-system/lib';

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

const STATUS_MAP: Record<
  LeadStatus,
  {
    label: string;
    Icon: React.ComponentType<{ size?: string | number; className?: string }>;
    variant: 'glass' | 'accent' | 'success';
    next: LeadStatus;
  }
> = {
  open: { label: 'Open Signal', Icon: Circle, variant: 'glass', next: 'pursued' },
  pursued: { label: 'Active Pursuit', Icon: AlertCircle, variant: 'accent', next: 'resolved' },
  dead_end: { label: 'Inert / Terminated', Icon: XCircle, variant: 'glass', next: 'open' },
  resolved: { label: 'Resolved / Logged', Icon: CheckCircle2, variant: 'success', next: 'open' },
};

const PRIORITY_VARIANT: Record<LeadPriority, 'danger' | 'warning' | 'accent' | 'neutral'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'accent',
  low: 'neutral',
};

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
      addToast({ text: 'Failed to synchronize leads', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [investigationId, statusFilter, addToast]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleStatusCycle = async (lead: InvestigationLead) => {
    const next = STATUS_MAP[lead.status].next;
    try {
      await fetch(`/api/investigations/${investigationId}/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: next }),
      });
      await loadLeads();
    } catch {
      addToast({ text: 'Status propagation failed', type: 'error' });
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
      addToast({ text: 'Operational lead established', type: 'success' });
    } catch {
      addToast({ text: 'Signal creation failed', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const totals = {
    open: leads.filter((l) => l.status === 'open').length,
    active: leads.filter((l) => l.status === 'pursued').length,
  };

  return (
    <Box
      className="fixed inset-0 z-[var(--lq-z-modal)] flex justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Surface
        variant="glass"
        style={{ width: 480, height: '100%' }}
        className="border-l border-l-[var(--lq-surface-3)] shadow-2xl"
      >
        <Stack gap="xl" style={{ height: '100%' }}>
          {/* Header */}
          <Surface variant="glass" p="lg" className="border-b border-b-[var(--lq-surface-3)]">
            <Flex justify="between" align="center">
              <Stack gap="none">
                <Flex align="center" gap="sm">
                  <Flag size={20} className="text-[var(--lq-warning)]" />
                  <LqText variant="h3" weight="bold">
                    Investigation Leads
                  </LqText>
                </Flex>
                <LqText
                  variant="xs"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                  weight="bold"
                >
                  Operational Tracking • Signal Analysis
                </LqText>
              </Stack>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <XCircle size={18} />
              </Button>
            </Flex>
          </Surface>

          {/* Metrics HUD */}
          <Box px="lg">
            <Surface variant="glass-highlight" p="sm">
              <Flex justify="around" align="center">
                <Stack align="center" gap="none">
                  <LqText variant="small" weight="bold" color="success">
                    {totals.open}
                  </LqText>
                  <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                    Available
                  </LqText>
                </Stack>
                <Box className="w-px h-6 bg-[var(--lq-surface-3)]" />
                <Stack align="center" gap="none">
                  <LqText variant="small" weight="bold" color="accent">
                    {totals.active}
                  </LqText>
                  <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                    Active
                  </LqText>
                </Stack>
                <Box className="w-px h-6 bg-[var(--lq-surface-3)]" />
                <Stack align="center" gap="none">
                  <LqText variant="small" weight="bold">
                    {leads.length}
                  </LqText>
                  <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                    Total Signal
                  </LqText>
                </Stack>
              </Flex>
            </Surface>
          </Box>

          {/* Controls */}
          <Flex px="lg" gap="md" align="center">
            <Box grow className="relative">
              <Filter
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--lq-text-dim)]"
                size={12}
              />
              <select
                style={{
                  width: '100%',
                  background: 'var(--lq-surface-3)',
                  border: '1px solid var(--lq-surface-4)',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  fontSize: '0.875rem',
                  color: 'var(--lq-text-primary)',
                  outline: 'none',
                  appearance: 'none',
                }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open Leads</option>
                <option value="pursued">Active Pursuit</option>
                <option value="resolved">Resolved</option>
              </select>
            </Box>
            <Button variant="primary" size="sm" onClick={() => setShowNewForm(!showNewForm)}>
              <PlusCircle size={14} /> New Lead
            </Button>
          </Flex>

          {/* New Lead Entry */}
          {showNewForm && (
            <Box px="lg">
              <Surface
                variant="glass-highlight"
                p="lg"
                className="border-dashed border-[var(--lq-surface-3)]"
              >
                <Stack gap="md">
                  <input
                    autoFocus
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
                    placeholder="Lead Designation *"
                    value={newLead.title}
                    onChange={(e) => setNewLead((p) => ({ ...p, title: e.target.value }))}
                  />
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
                    placeholder="Qualitative description..."
                    rows={2}
                    value={newLead.description}
                    onChange={(e) => setNewLead((p) => ({ ...p, description: e.target.value }))}
                  />
                  <Flex gap="md">
                    <select
                      style={{
                        flex: 1,
                        background: 'var(--lq-surface-3)',
                        border: '1px solid var(--lq-surface-4)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--lq-text-primary)',
                        outline: 'none',
                      }}
                      value={newLead.priority}
                      onChange={(e) =>
                        setNewLead((p) => ({ ...p, priority: e.target.value as LeadPriority }))
                      }
                    >
                      {['critical', 'high', 'medium', 'low'].map((p) => (
                        <option key={p} value={p}>
                          {p.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      style={{
                        flex: 2,
                        background: 'var(--lq-surface-3)',
                        border: '1px solid var(--lq-surface-4)',
                        borderRadius: '0.375rem',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        color: 'var(--lq-text-primary)',
                        outline: 'none',
                      }}
                      placeholder="EFTA Reference..."
                      value={newLead.source_efta_ref}
                      onChange={(e) =>
                        setNewLead((p) => ({ ...p, source_efta_ref: e.target.value }))
                      }
                    />
                  </Flex>
                  <Flex gap="sm" justify="end">
                    <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
                      Abort
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleCreate}
                      disabled={!newLead.title.trim() || creating}
                    >
                      {creating ? <Loader2 className="animate-spin" size={14} /> : 'Establish Lead'}
                    </Button>
                  </Flex>
                </Stack>
              </Surface>
            </Box>
          )}

          {/* Leads Stream */}
          <Box grow px="lg" className="overflow-y-auto">
            {loading ? (
              <Stack gap="md">
                <Skeleton height={100} />
                <Skeleton height={100} />
                <Skeleton height={100} />
              </Stack>
            ) : leads.length === 0 ? (
              <Stack align="center" justify="center" gap="lg" py="xxxl" textAlign="center">
                <Target size={48} className="text-[var(--lq-text-dim)]" />
                <LqText
                  variant="xs"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                  weight="bold"
                >
                  No Leads Identified
                </LqText>
              </Stack>
            ) : (
              <Stack gap="md">
                {leads.map((lead) => {
                  const cfg = STATUS_MAP[lead.status];
                  return (
                    <Surface
                      key={lead.id}
                      variant="glass-highlight"
                      p="lg"
                      className="border-l-4 border-l-[var(--lq-surface-3)]"
                    >
                      <Stack gap="md">
                        <Flex justify="between" align="start">
                          <Flex gap="md" align="start">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-0 h-auto"
                              onClick={() => handleStatusCycle(lead)}
                            >
                              <cfg.Icon
                                size={18}
                                className={cn(`text-[var(--lq-${cfg.variant})]`)}
                              />
                            </Button>
                            <Stack gap="none">
                              <LqText variant="small" weight="bold">
                                {lead.title}
                              </LqText>
                              {lead.description && (
                                <LqText variant="xs" color="muted" mt="xs">
                                  {lead.description}
                                </LqText>
                              )}
                            </Stack>
                          </Flex>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--lq-error)] opacity-30 hover:opacity-100"
                            onClick={() => {
                              if (window.confirm('Delete signal?'))
                                fetch(`/api/investigations/${investigationId}/leads/${lead.id}`, {
                                  method: 'DELETE',
                                  credentials: 'include',
                                }).then(() => loadLeads());
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </Flex>

                        <Flex
                          justify="between"
                          align="center"
                          pt="sm"
                          className="border-t border-t-[var(--lq-surface-3)]"
                        >
                          <Flex gap="xs">
                            <Badge
                              variant={cfg.variant}
                              label={cfg.label.toUpperCase()}
                              size="sm"
                            />
                            <Badge
                              variant={PRIORITY_VARIANT[lead.priority]}
                              label={lead.priority.toUpperCase()}
                              size="sm"
                            />
                          </Flex>
                          <Flex gap="xs">
                            {onConvertToTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onConvertToTask(lead)}
                              >
                                <ArrowRight size={10} /> Task
                              </Button>
                            )}
                            {onConvertToHypothesis && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onConvertToHypothesis(lead)}
                              >
                                <Zap size={10} /> Hypo
                              </Button>
                            )}
                          </Flex>
                        </Flex>
                      </Stack>
                    </Surface>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </Surface>
    </Box>
  );
};
