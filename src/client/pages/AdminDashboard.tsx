import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useAuth } from '../contexts/AuthContext';
import { ReviewQueuePanel } from '@client/components/admin/ReviewQueuePanel';
import { CloseButton } from '@client/components/common/CloseButton';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { apiClient } from '@client/services/apiClient';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { LqText } from '@client/design-system/components/typography/Text';
import { Grid } from '@client/design-system/components/layout/Grid';
import styles from './AdminDashboard.module.css';

import { Button, Input, NativeSelect } from '@client/design-system/lib';

interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'investigator' | 'viewer';
  created_at: string;
  last_active: string | null;
}

interface AuditLogEntry {
  id: number;
  user_id: string;
  performed_by?: string;
  action: string;
  object_type: string;
  object_id: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
  data: {
    entities: number;
    documents: number;
  };
  environment: string;
}

interface IngestRun {
  id: string;
  status: 'success' | 'running' | 'failed' | string;
  startedAt: string;
  gitCommit?: string | null;
  agenticModelId?: string | null;
  agenticEnabled?: boolean;
}

interface BackupSnapshot {
  filename: string;
  size: number;
  createdAt: string;
}

type UserRole = User['role'];

const isUserRole = (value: string): value is UserRole =>
  value === 'admin' || value === 'investigator' || value === 'viewer';

const getTabClassName = (isActive: boolean) =>
  isActive ? `${styles.tabButton} ${styles.tabButtonActive}` : styles.tabButton;

const getRoleBadgeClassName = (role: UserRole) => {
  if (role === 'admin') {
    return `${styles.roleBadge} ${styles.roleBadgeAdmin}`;
  }

  if (role === 'investigator') {
    return `${styles.roleBadge} ${styles.roleBadgeInvestigator}`;
  }

  return styles.roleBadge;
};

const getIngestionStatusClassName = (status: string) => {
  if (status === 'success') {
    return `${styles.statusBadge} ${styles.statusSuccess}`;
  }

  if (status === 'running') {
    return `${styles.statusBadge} ${styles.statusRunning}`;
  }

  return styles.statusBadge;
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'users' | 'audit' | 'review' | 'system' | 'ingestion' | 'backups'
  >('users');
  // users is kept in local state because it is mutated by create/update/delete actions
  const [users, setUsers] = useState<User[]>([]);
  const [usersSeeded, setUsersSeeded] = useState(false);

  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  useScrollLock(isModalOpen);

  // Form states
  const [formData, setFormData] = useState<{
    username: string;
    email: string;
    password: string;
    role: 'admin' | 'investigator' | 'viewer';
  }>({
    username: '',
    email: '',
    password: '',
    role: 'investigator',
  });

  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unexpected error');

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      navigate('/login');
    }
  };

  // --- useQuery: users (seeded into mutable local state) ---
  const { data: fetchedUsers, isLoading: loading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.get<User[]>('/users'),
  });

  useEffect(() => {
    if (!usersSeeded && fetchedUsers !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Seed mutable admin table state from the completed query once.
      setUsers(fetchedUsers);
      setUsersSeeded(true);
    }
  }, [fetchedUsers, usersSeeded]);

  // --- useQuery: audit logs (read-only, no external mutations) ---
  const {
    data: logs = [],
    isLoading: auditLoading,
    refetch: refetchAuditLogs,
  } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => apiClient.get<AuditLogEntry[]>('/admin/audit-logs?limit=200'),
    enabled: activeTab === 'audit',
  });

  // --- useQuery: system health (read-only) ---
  const { data: health = null } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => apiClient.get<SystemHealth>('/health'),
  });

  // --- useQuery: ingest runs (read-only, loaded on-demand) ---
  const { data: ingestRuns = [] } = useQuery<IngestRun[]>({
    queryKey: ['admin-ingest-runs'],
    queryFn: async () => {
      const data = await apiClient.get<Array<Record<string, unknown>>>('/stats/ingest-runs');
      return data.map((run) => ({
        id: String(run.id || ''),
        status: String(run.status || 'failed'),
        startedAt: String(run.startedAt || run.started_at || new Date().toISOString()),
        gitCommit: run.gitCommit ? String(run.gitCommit) : null,
        agenticModelId: run.agenticModelId ? String(run.agenticModelId) : null,
        agenticEnabled: Boolean(run.agenticEnabled),
      }));
    },
    enabled: activeTab === 'ingestion',
  });

  // --- useQuery: backups (read-only, loaded on-demand) ---
  const { data: backups = [] } = useQuery<BackupSnapshot[]>({
    queryKey: ['admin-backups'],
    queryFn: async () => {
      const data = await apiClient.get<Array<Record<string, unknown>>>('/stats/backups');
      return data.map((backup) => ({
        filename: String(backup.filename || ''),
        size: Number(backup.size || 0),
        createdAt: String(backup.createdAt || backup.created_at || new Date().toISOString()),
      }));
    },
    enabled: activeTab === 'backups',
  });

  const triggerBackup = async () => {
    if (!confirm('Create a new database snapshot? This is a zero-downtime operation.')) return;
    try {
      await apiClient.post('/stats/backups/trigger');
      alert('Backup created successfully.');
      void queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await apiClient.post<User>('/users', formData);

      setUsers([...users, data]);
      closeModal();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: { role: UserRole; email: string; password?: string } = {
        role: formData.role,
        email: formData.email,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      await apiClient.put(`/users/${editingUser.id}`, updateData);

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...updateData } : u)));
      closeModal();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    try {
      await apiClient.delete(`/users/${id}`);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'investigator',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      password: '', // Don't show existing hash
      role: user.role,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Box className={`app-backdrop ${styles.pageRoot}`}>
      <Box className={styles.pageContent}>
        {/* Header */}
        {error && (
          <Flex align="start" gap={2} className={styles.errorBanner}>
            <Icon name="AlertTriangle" className={styles.errorIcon} />
            <Box className={styles.errorContent}>
              <p className={styles.errorTitle}>An error occurred while loading admin data.</p>
              <p className={styles.errorMessage}>{error}</p>
            </Box>
            <CloseButton
              type="button"
              onClick={() => setError('')}
              size="sm"
              label="Dismiss error"
              className={styles.errorClose}
            />
          </Flex>
        )}
        <Flex direction="column" align="start" className={styles.header}>
          <Box>
            <LqText as="h1" variant="h1" color="accent" className={styles.heading}>
              <Icon name="Shield" className={styles.headingIcon} />
              Admin Dashboard
            </LqText>
            <LqText as="p" variant="body" color="muted" className={styles.subtitle}>
              Manage users, permissions, and system access
            </LqText>
          </Box>

          <Flex align="center" gap={3}>
            <Button unstyled onClick={handleLogout} className={styles.logoutButton}>
              <Icon name="LogOut" size="md" />
              <span>Log Out</span>
            </Button>
          </Flex>
        </Flex>

        {/* Tab Navigation */}
        <Flex gap={1} className={styles.tabNav}>
          <Button
            unstyled
            onClick={() => setActiveTab('users')}
            className={getTabClassName(activeTab === 'users')}
          >
            <Icon name="Users" size="md" />
            User Management
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('audit')}
            className={getTabClassName(activeTab === 'audit')}
          >
            <Icon name="Activity" size="md" />
            Audit Logs
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('system')}
            className={getTabClassName(activeTab === 'system')}
          >
            <Icon name="Server" size="md" />
            System Health
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('review')}
            className={getTabClassName(activeTab === 'review')}
          >
            <Icon name="ShieldCheck" size="md" />
            Agentic Review
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('ingestion')}
            className={getTabClassName(activeTab === 'ingestion')}
          >
            <Icon name="RefreshCw" size="md" />
            Ingestion History
          </Button>
          <Button
            unstyled
            onClick={() => setActiveTab('backups')}
            className={getTabClassName(activeTab === 'backups')}
          >
            <Icon name="Database" size="md" />
            Backups
          </Button>
        </Flex>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <Box className={`${styles.tabSection} ${styles.fadeIn}`}>
            {/* Stats Cards */}
            <Grid cols={{ base: 1, md: 3 }} gap="lg">
              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" justify="between" className={styles.statHeader}>
                  <h3 className={styles.statLabel}>Total Users</h3>
                  <Icon name="Users" className={`${styles.statIcon} ${styles.accentIcon}`} />
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueLarge}`}
                >
                  {users.length}
                </LqText>
              </Surface>
              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" justify="between" className={styles.statHeader}>
                  <h3 className={styles.statLabel}>Admins</h3>
                  <Icon name="Shield" className={`${styles.statIcon} ${styles.purpleIcon}`} />
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueLarge}`}
                >
                  {users.filter((u) => u.role === 'admin').length}
                </LqText>
              </Surface>
              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" justify="between" className={styles.statHeader}>
                  <h3 className={styles.statLabel}>Active (24h)</h3>
                  <Icon name="Check" className={`${styles.statIcon} ${styles.greenIcon}`} />
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueLarge}`}
                >
                  {
                    users.filter((u) => {
                      if (!u.last_active) return false;
                      const date = new Date(u.last_active);
                      return new Date().getTime() - date.getTime() < 24 * 60 * 60 * 1000;
                    }).length
                  }
                </LqText>
              </Surface>
            </Grid>

            <Surface variant="panel" className={styles.panelShell}>
              <Flex align="center" justify="between" gap={4} className={styles.panelHeader}>
                <LqText as="h2" variant="h3" color="primary" className={styles.panelHeading}>
                  Users
                </LqText>
                <Flex align="center" gap={3} className={styles.panelActions}>
                  <Box className={styles.searchField}>
                    <Icon name="Search" className={styles.leadingIcon} />
                    <Input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`${styles.textInput} ${styles.searchInput}`}
                    />
                  </Box>
                  <Button unstyled onClick={openCreateModal} className={styles.primaryButton}>
                    <Icon name="UserPlus" size="md" />
                    <span>Add User</span>
                  </Button>
                </Flex>
              </Flex>

              <Box className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeaderRow}>
                      <th className={styles.headerCell}>User</th>
                      <th className={styles.headerCell}>Role</th>
                      <th className={styles.headerCell}>Email</th>
                      <th className={styles.headerCell}>Last Active</th>
                      <th className={`${styles.headerCell} ${styles.rightAlign}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={styles.tableBody}>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className={styles.centerMuted}>
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={styles.centerMuted}>
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className={styles.rowHover}>
                          <td className={styles.cell}>
                            <Flex align="center" gap={3}>
                              <Flex align="center" justify="center" className={styles.avatar}>
                                {user.username.charAt(0).toUpperCase()}
                              </Flex>
                              <Box className={styles.userName}>{user.username}</Box>
                            </Flex>
                          </td>
                          <td className={styles.cell}>
                            <span className={getRoleBadgeClassName(user.role)}>
                              {user.role === 'admin' && <Icon name="Shield" size="xs" />}
                              {user.role}
                            </span>
                          </td>
                          <td className={`${styles.cell} ${styles.mutedCell}`}>
                            {user.email || '-'}
                          </td>
                          <td className={`${styles.cell} ${styles.mutedCell}`}>
                            {user.last_active
                              ? new Date(user.last_active).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className={`${styles.cell} ${styles.rightAlign}`}>
                            <Flex
                              align="center"
                              justify="end"
                              gap={2}
                              className={styles.actionCell}
                            >
                              <Button
                                unstyled
                                onClick={() => openEditModal(user)}
                                className={`${styles.iconButton} ${styles.editButton}`}
                                title="Edit User"
                              >
                                <Icon name="Edit2" size="sm" />
                              </Button>
                              {user.id !== currentUser?.id && (
                                <Button
                                  unstyled
                                  onClick={() => handleDelete(user.id)}
                                  className={`${styles.iconButton} ${styles.deleteButton}`}
                                  title="Delete User"
                                >
                                  <Icon name="Trash2" size="sm" />
                                </Button>
                              )}
                            </Flex>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Box>
            </Surface>
          </Box>
        )}

        {/* --- AUDIT TAB --- */}
        {activeTab === 'audit' && (
          <Surface variant="panel" className={`${styles.panelShell} ${styles.fadeIn}`}>
            <Flex align="center" justify="between" className={styles.panelHeader}>
              <LqText as="h2" variant="h3" color="primary" className={styles.panelHeading}>
                <Icon name="Activity" className={`${styles.statIcon} ${styles.blueIcon}`} />
                Audit Logs
              </LqText>
              <Button
                unstyled
                onClick={() => void refetchAuditLogs()}
                className={styles.refreshButton}
                title="Refresh"
              >
                <Icon
                  name="RefreshCw"
                  size="md"
                  className={auditLoading ? styles.spin : undefined}
                />
              </Button>
            </Flex>
            <Box className={`${styles.tableScroll} ${styles.tableScrollTall}`}>
              <table className={styles.table}>
                <thead className={styles.stickyHead}>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.headerCell}>Timestamp</th>
                    <th className={styles.headerCell}>User</th>
                    <th className={styles.headerCell}>Action</th>
                    <th className={styles.headerCell}>Target</th>
                    <th className={styles.headerCell}>Details</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {auditLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.centerMuted}>
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.centerMuted}>
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr key={log.id || idx} className={styles.rowHover}>
                        <td className={`${styles.cell} ${styles.xsMonoCell}`}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className={`${styles.cell} ${styles.userName}`}>
                          {log.performed_by || log.user_id}
                        </td>
                        <td className={styles.cell}>
                          <span className={styles.auditBadge}>{log.action}</span>
                        </td>
                        <td className={`${styles.cell} ${styles.mutedCell}`}>
                          {log.object_type}{' '}
                          {log.object_id && (
                            <span className={styles.xsMonoCell}>
                              #{log.object_id.substring(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className={`${styles.cell} ${styles.detailsCell}`}>
                          {JSON.stringify(log.payload)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Box>
          </Surface>
        )}

        {/* --- SYSTEM TAB --- */}
        {activeTab === 'system' && (
          <Box className={`${styles.tabSection} ${styles.fadeIn}`}>
            <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="lg">
              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" gap={3} className={styles.statHeader}>
                  <Icon name="Activity" className={`${styles.statIcon} ${styles.greenIcon}`} />
                  <h3 className={styles.statLabel}>Status</h3>
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueMedium}`}
                >
                  {health?.status || 'Unknown'}
                </LqText>
                <LqText as="p" variant="small" color="muted" className={styles.monoMeta}>
                  Uptime: {health ? (health.uptime / 3600).toFixed(1) : 0} hrs
                </LqText>
              </Surface>

              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" gap={3} className={styles.statHeader}>
                  <Icon name="Database" className={`${styles.statIcon} ${styles.blueIcon}`} />
                  <h3 className={styles.statLabel}>Database</h3>
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueMedium}`}
                >
                  {health?.database || 'Unknown'}
                </LqText>
                <LqText as="p" variant="small" color="muted" className={styles.monoMeta}>
                  Entities: {health?.data?.entities?.toLocaleString()}
                </LqText>
              </Surface>

              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" gap={3} className={styles.statHeader}>
                  <Icon name="FileText" className={`${styles.statIcon} ${styles.orangeIcon}`} />
                  <h3 className={styles.statLabel}>Documents</h3>
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className={`${styles.statValue} ${styles.statValueMedium}`}
                >
                  {health?.data?.documents?.toLocaleString() || 0}
                </LqText>
              </Surface>

              <Surface variant="glass" className={styles.statCard}>
                <Flex align="center" gap={3} className={styles.statHeader}>
                  <Icon name="Cpu" className={`${styles.statIcon} ${styles.purpleIcon}`} />
                  <h3 className={styles.statLabel}>Environment</h3>
                </Flex>
                <Box className={styles.systemEnvironment}>{health?.environment || 'unknown'}</Box>
              </Surface>
            </Grid>

            {/* Add more system controls here later */}
            <Flex align="start" gap={3} className={styles.warningBox}>
              <Icon name="AlertTriangle" className={styles.warningIcon} />
              <Box>
                <h4 className={styles.warningTitle}>System Maintenance</h4>
                <p className={styles.warningText}>
                  Advanced system operations (re-indexing, cache clearing) are currently handled via
                  CLI scripts. Do not attempt to modify production database directly while server is
                  running.
                </p>
              </Box>
            </Flex>
          </Box>
        )}

        {/* --- INGESTION TAB --- */}
        {activeTab === 'ingestion' && (
          <Surface variant="panel" className={`${styles.panelShell} ${styles.fadeIn}`}>
            <Flex
              align="center"
              justify="between"
              className={`${styles.panelHeader} ${styles.panelHeaderStrong}`}
            >
              <LqText as="h2" variant="h3" color="primary" className={styles.panelHeading}>
                <Icon name="RefreshCw" className={`${styles.statIcon} ${styles.orangeIcon}`} />
                Ingestion History
              </LqText>
            </Flex>
            <Box className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.headerCell}>Run ID</th>
                    <th className={styles.headerCell}>Status</th>
                    <th className={styles.headerCell}>Date</th>
                    <th className={styles.headerCell}>Commit</th>
                    <th className={styles.headerCell}>Model / Agentic</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {ingestRuns.map((run) => (
                    <tr key={run.id} className={styles.rowHover}>
                      <td className={`${styles.cell} ${styles.xsPrimaryMonoCell}`}>{run.id}</td>
                      <td className={styles.cell}>
                        <span className={getIngestionStatusClassName(run.status)}>
                          {run.status}
                        </span>
                      </td>
                      <td className={`${styles.cell} ${styles.mutedCell}`}>
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className={`${styles.cell} ${styles.xsMonoCell}`}>
                        {run.gitCommit?.substring(0, 7) || 'N/A'}
                      </td>
                      <td className={styles.cell}>
                        <Flex direction="column" gap={1} className={styles.agenticCell}>
                          <span className={styles.agenticModel}>
                            {run.agenticModelId || 'Legacy'}
                          </span>
                          {run.agenticEnabled && (
                            <span className={styles.agenticBadge}>AGENTIC</span>
                          )}
                        </Flex>
                      </td>
                    </tr>
                  ))}
                  {ingestRuns.length === 0 && (
                    <tr>
                      <td colSpan={5} className={styles.centerMutedLarge}>
                        No ingestion runs found in history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Box>
          </Surface>
        )}

        {/* --- BACKUPS TAB --- */}
        {activeTab === 'backups' && (
          <Box className={`${styles.tabSection} ${styles.fadeIn}`}>
            <Flex align="center" justify="between" className={styles.backupHeader}>
              <Box>
                <LqText as="h2" variant="h3" color="primary" className={styles.backupTitle}>
                  Database Backups
                </LqText>
                <LqText as="p" variant="small" color="secondary">
                  Compressed database snapshots (Last 7 days retained)
                </LqText>
              </Box>
              <Button unstyled onClick={triggerBackup} className={styles.primaryButton}>
                <Icon name="RefreshCw" size="md" />
                Snapshot Now
              </Button>
            </Flex>

            <Surface variant="panel" className={styles.panelShell}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.headerCell}>Filename</th>
                    <th className={`${styles.headerCell} ${styles.rightAlign}`}>Size</th>
                    <th className={`${styles.headerCell} ${styles.rightAlign}`}>Created</th>
                  </tr>
                </thead>
                <tbody className={styles.tableBody}>
                  {backups.map((backup) => (
                    <tr key={backup.filename} className={styles.rowHover}>
                      <td className={`${styles.cell} ${styles.backupFilename}`}>
                        <Icon name="FileText" size="sm" className={styles.mutedIcon} />
                        {backup.filename}
                      </td>
                      <td className={`${styles.cell} ${styles.xsMonoCell} ${styles.rightAlign}`}>
                        {(backup.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className={`${styles.cell} ${styles.xsMonoCell} ${styles.rightAlign}`}>
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td colSpan={3} className={styles.centerMutedLarge}>
                        No snapshots available. Trigger a manual backup to start.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Surface>
          </Box>
        )}

        {/* --- REVIEW TAB --- */}
        {activeTab === 'review' && (
          <Box className={styles.reviewShell}>
            <ReviewQueuePanel />
          </Box>
        )}
      </Box>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <Flex align="center" justify="center" className={styles.modalOverlay}>
          <Surface variant="panel" className={styles.modalPanel}>
            <Flex align="center" justify="between" className={styles.modalHeader}>
              <LqText as="h3" variant="h3" color="primary" className={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Add New User'}
              </LqText>
              <CloseButton onClick={closeModal} size="sm" label="Close user modal" />
            </Flex>

            <form onSubmit={editingUser ? handleUpdate : handleCreate} className={styles.modalForm}>
              <div>
                <label className={styles.formLabel}>Username</label>
                <Input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className={`${styles.textInput} ${styles.formInput}`}
                  required
                />
              </div>

              <div>
                <label className={styles.formLabel}>Email (Optional)</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`${styles.textInput} ${styles.formInput}`}
                />
              </div>

              <div>
                <label className={styles.formLabel}>
                  {editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <div className={styles.searchField}>
                  <Icon name="Lock" className={styles.leadingIcon} />
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`${styles.textInput} ${styles.passwordInput}`}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className={styles.formLabel}>Role</label>
                <NativeSelect
                  value={formData.role}
                  onChange={(e) => {
                    const roleValue = e.target.value;
                    if (isUserRole(roleValue)) {
                      setFormData({ ...formData, role: roleValue });
                    }
                  }}
                  className={`${styles.textInput} ${styles.formInput}`}
                >
                  <option value="viewer">Viewer (Read Only)</option>
                  <option value="investigator">Investigator (Can Edit)</option>
                  <option value="admin">Admin (Full Access)</option>
                </NativeSelect>
              </div>

              <div className={styles.buttonRow}>
                <Flex align="center" gap={3}>
                  <Button
                    unstyled
                    type="button"
                    onClick={closeModal}
                    className={styles.secondaryButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    unstyled
                    type="submit"
                    className={`${styles.primaryButton} ${styles.fullWidthButton}`}
                  >
                    {editingUser ? 'Save Changes' : 'Create User'}
                  </Button>
                </Flex>
              </div>
            </form>
          </Surface>
        </Flex>
      )}
    </Box>
  );
};

export default AdminDashboard;
