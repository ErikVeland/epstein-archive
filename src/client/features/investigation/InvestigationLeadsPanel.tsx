import React, { useCallback, useEffect, useState } from 'react';
import { useToasts } from '@client/components/common/useToasts';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { apiClient } from '@client/services/apiClient';
import Icon, { IconName } from '@client/components/common/Icon';

// UI Library
import {
  Box,
  Button,
  Flex,
  LqText,
  NativeSelect,
  Stack,
  Surface,
  TextInput,
  Textarea,
} from '@client/design-system/lib';
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

const STATUS_MAP: Record<
  LeadStatus,
  {
    label: string;
    icon: IconName;
    variant: 'glass' | 'accent' | 'success';
    next: LeadStatus;
  }
> = {
  open: { label: 'Open Signal', icon: 'Circle', variant: 'glass', next: 'pursued' },
  pursued: { label: 'Active Pursuit', icon: 'AlertCircle', variant: 'accent', next: 'resolved' },
  dead_end: { label: 'Inert / Terminated', icon: 'XCircle', variant: 'glass', next: 'open' },
  resolved: { label: 'Resolved / Logged', icon: 'CheckCircle2', variant: 'success', next: 'open' },
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
      await apiClient.patch(`/investigations/${investigationId}/leads/${lead.id}`, {
        status: next,
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
    <Box className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Surface variant="glass" className={styles.panel}>
        <Stack gap="xl" style={{ height: '100%' }}>
          <div className={styles.header}>
            <div className={styles.headerGroup}>
              <div className={styles.headerTitle}>
                <Icon name="Flag" size="md" className={styles.iconAmber} />
                Investigation Leads
              </div>
              <div className={styles.headerSubtitle}>Operational Tracking • Signal Analysis</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Icon name="XCircle" size="md" />
            </Button>
          </div>

          <div className={styles.statsBar}>
            <div className={styles.statItem}>
              <span className={styles.statValueEmerald}>{totals.open}</span>
              <span className={styles.statLabel}>Available</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValueBlue}>{totals.active}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={`${styles.statItem} ${styles.statItemRight}`}>
              <span>{leads.length}</span>
              <span className={styles.statLabel}>Total Signal</span>
            </div>
          </div>

          <div className={styles.controlsBar}>
            <Box grow className={styles.filterSelectWrap}>
              <Icon name="Filter" className={styles.filterIcon} size="xs" />
              <NativeSelect
                className={styles.select}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open Leads</option>
                <option value="pursued">Active Pursuit</option>
                <option value="resolved">Resolved</option>
              </NativeSelect>
            </Box>
            <Button
              variant="primary"
              size="sm"
              className={styles.addButton}
              onClick={() => setShowNewForm(!showNewForm)}
            >
              <Icon name="PlusCircle" size="sm" /> New Lead
            </Button>
          </div>

          {showNewForm && (
            <div className={styles.form}>
              <Stack gap="md">
                <TextInput
                  className={styles.input}
                  autoFocus
                  placeholder="Lead Designation *"
                  value={newLead.title}
                  onChange={(e) => setNewLead((p) => ({ ...p, title: e.target.value }))}
                />
                <Textarea
                  className={styles.textarea}
                  placeholder="Qualitative description…"
                  rows={2}
                  value={newLead.description}
                  onChange={(e) => setNewLead((p) => ({ ...p, description: e.target.value }))}
                />
                <Flex gap="md" className={styles.formRow}>
                  <NativeSelect
                    className={styles.select}
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
                  </NativeSelect>
                  <TextInput
                    className={styles.input}
                    placeholder="EFTA Reference…"
                    value={newLead.source_efta_ref}
                    onChange={(e) => setNewLead((p) => ({ ...p, source_efta_ref: e.target.value }))}
                  />
                </Flex>
                <Flex gap="sm" justify="end" className={styles.formActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={styles.cancelButton}
                    onClick={() => setShowNewForm(false)}
                  >
                    Abort
                  </Button>
                  <Button
                    variant="secondary"
                    className={styles.submitButton}
                    onClick={handleCreate}
                    disabled={!newLead.title.trim() || creating}
                  >
                    {creating ? (
                      <Icon name="Loader2" className={styles.spin} size="sm" />
                    ) : (
                      'Establish Lead'
                    )}
                  </Button>
                </Flex>
              </Stack>
            </div>
          )}

          <Box grow className={styles.leadsList}>
            {loading ? (
              <div className={styles.loaderCentered}>
                <Icon name="Loader2" className={styles.spin} />
              </div>
            ) : leads.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon name="Target" size="xl" className={styles.emptyIcon} />
                <LqText variant="xs" color="muted" weight="bold">
                  No Leads Identified
                </LqText>
                <div className={styles.emptySubtext}>
                  Create the first operational signal to begin tracking.
                </div>
              </div>
            ) : (
              <Stack gap="md">
                {leads.map((lead) => {
                  const cfg = STATUS_MAP[lead.status];
                  const statusClass =
                    lead.status === 'open'
                      ? styles.statusOpen
                      : lead.status === 'pursued'
                        ? styles.statusPursued
                        : lead.status === 'dead_end'
                          ? styles.statusDeadEnd
                          : styles.statusResolved;
                  const priorityClass =
                    lead.priority === 'critical'
                      ? styles.priorityCritical
                      : lead.priority === 'high'
                        ? styles.priorityHigh
                        : lead.priority === 'medium'
                          ? styles.priorityMedium
                          : styles.priorityLow;
                  return (
                    <Surface key={lead.id} variant="glass-highlight" className={styles.leadCard}>
                      <Stack gap="md">
                        <div className={styles.leadTitleRow}>
                          <div className={styles.statusIconWrapper}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={styles.actionButton}
                              onClick={() => handleStatusCycle(lead)}
                            >
                              <Icon name={cfg.icon} size="sm" className={styles.iconMd} />
                            </Button>
                          </div>
                          <div className={styles.leadBody}>
                            <div className={styles.leadTitle}>{lead.title}</div>
                            {lead.description && (
                              <div className={styles.leadDescription}>{lead.description}</div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${styles.deleteButton} ${styles.actionButtonDanger}`}
                            onClick={() => {
                              apiClient
                                .delete(`/investigations/${investigationId}/leads/${lead.id}`)
                                .then(() => {
                                  addToast({ text: 'Signal deleted', type: 'info' });
                                  return loadLeads();
                                })
                                .catch(() =>
                                  addToast({ text: 'Failed to delete signal', type: 'error' }),
                                );
                            }}
                          >
                            <Icon name="Trash2" size="xs" />
                          </Button>
                        </div>

                        <div className={styles.badgeRow}>
                          <span className={`${styles.badge} ${statusClass}`}>
                            {cfg.label.toUpperCase()}
                          </span>
                          <span className={`${styles.badge} ${priorityClass}`}>
                            {lead.priority.toUpperCase()}
                          </span>
                          {lead.sourceEftaRef && (
                            <span className={styles.eftaLink}>{lead.sourceEftaRef}</span>
                          )}
                        </div>

                        <div className={styles.actionsRow}>
                          {onConvertToTask && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${styles.actionButton} ${styles.actionButtonAccent}`}
                              onClick={() => onConvertToTask(lead)}
                            >
                              <Icon name="ArrowRight" size="xs" /> Task
                            </Button>
                          )}
                          {onConvertToHypothesis && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`${styles.actionButton} ${styles.actionButtonAccent}`}
                              onClick={() => onConvertToHypothesis(lead)}
                            >
                              <Icon name="Zap" size="xs" /> Hypo
                            </Button>
                          )}
                        </div>
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
