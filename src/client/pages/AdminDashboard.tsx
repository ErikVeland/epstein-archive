import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  Search,
  Check,
  AlertTriangle,
  Lock,
  LogOut,
  Activity,
  Server,
  Database,
  FileText,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ReviewQueuePanel } from '../components/admin/ReviewQueuePanel';
import { ShieldCheck } from 'lucide-react';
import { CloseButton } from '../components/common/CloseButton';
import { useScrollLock } from '../hooks/useScrollLock';
import { Surface } from '../design-system/components/surfaces/Surface';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { LqText } from '../design-system/components/typography/Text';
import { Grid } from '../design-system/components/layout/Grid';

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
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json() as Promise<User[]>;
    },
  });

  useEffect(() => {
    if (!usersSeeded && fetchedUsers !== undefined) {
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
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs?limit=200');
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json() as Promise<AuditLogEntry[]>;
    },
    enabled: activeTab === 'audit',
  });

  // --- useQuery: system health (read-only) ---
  const { data: health = null } = useQuery({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Failed to fetch health');
      return res.json() as Promise<SystemHealth>;
    },
  });

  // --- useQuery: ingest runs (read-only, loaded on-demand) ---
  const { data: ingestRuns = [] } = useQuery<IngestRun[]>({
    queryKey: ['admin-ingest-runs'],
    queryFn: async () => {
      const res = await fetch('/api/stats/ingest-runs');
      if (!res.ok) throw new Error('Failed to fetch ingest runs');
      const data = (await res.json()) as Array<Record<string, unknown>>;
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
      const res = await fetch('/api/stats/backups');
      if (!res.ok) throw new Error('Failed to fetch backups');
      const data = (await res.json()) as Array<Record<string, unknown>>;
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
      const res = await fetch('/api/stats/backups/trigger', { method: 'POST' });
      if (res.ok) {
        alert('Backup created successfully.');
        void queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      }
    } catch (_e) {
      alert('Backup failed');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

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

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update user');

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...updateData } : u)));
      closeModal();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
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
    <Box className="min-h-screen app-backdrop text-[var(--text-primary)]">
      <Box className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        {error && (
          <Flex
            align="start"
            gap={2}
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <Box className="flex-1">
              <p className="font-medium">An error occurred while loading admin data.</p>
              <p className="mt-1 text-red-200/80 break-all">{error}</p>
            </Box>
            <CloseButton
              type="button"
              onClick={() => setError('')}
              size="sm"
              label="Dismiss error"
              className="ml-2 border-red-700/60 bg-red-950/60 text-red-200 hover:bg-red-900/70 hover:text-[var(--text-primary)]"
            />
          </Flex>
        )}
        <Flex direction="column" className="md:flex-row md:items-center justify-between gap-4">
          <Box>
            <LqText
              as="h1"
              variant="h1"
              color="accent"
              className="leading-none font-display font-light tracking-tight flex items-center gap-4 mb-3"
            >
              <Shield className="w-8 h-8 text-[var(--accent)] opacity-80" strokeWidth={1} />
              Admin Dashboard
            </LqText>
            <LqText
              as="p"
              variant="body"
              color="muted"
              className="text-lg font-light tracking-wide"
            >
              Manage users, permissions, and system access
            </LqText>
          </Box>

          <Flex align="center" gap={3}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg transition-colors border border-[var(--glass-border)]"
            >
              <LogOut size={18} />
              <span>Log Out</span>
            </button>
          </Flex>
        </Flex>

        {/* Tab Navigation */}
        <Flex
          gap={1}
          className="bg-[var(--glass-bg)]/40 p-1.5 rounded-2xl shadow-[var(--glass-shadow-soft)] w-fit backdrop-blur-md"
        >
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <Users size={18} />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <Activity size={18} />
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'system'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <Server size={18} />
            System Health
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'review'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <ShieldCheck size={18} />
            Agentic Review
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'ingestion'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <RefreshCw size={18} />
            Ingestion History
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'backups'
                ? 'bg-[var(--accent)] text-[var(--text-primary)] shadow-lg shadow-[var(--accent)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)]'
            }`}
          >
            <Database size={18} />
            Backups
          </button>
        </Flex>

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
          <Box className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <Grid cols={{ base: 1, md: 3 }} gap="lg">
              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" justify="between" className="mb-4">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Total Users
                  </h3>
                  <Users className="text-[var(--accent)] w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                </Flex>
                <LqText as="div" variant="h1" className="text-5xl font-mono tracking-tighter">
                  {users.length}
                </LqText>
              </Surface>
              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" justify="between" className="mb-4">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Admins
                  </h3>
                  <Shield className="text-purple-400 w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                </Flex>
                <LqText as="div" variant="h1" className="text-5xl font-mono tracking-tighter">
                  {users.filter((u) => u.role === 'admin').length}
                </LqText>
              </Surface>
              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" justify="between" className="mb-4">
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Active (24h)
                  </h3>
                  <Check className="text-green-400 w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                </Flex>
                <LqText as="div" variant="h1" className="text-5xl font-mono tracking-tighter">
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

            <Surface variant="panel" className="overflow-hidden">
              <Flex
                align="center"
                justify="between"
                gap={4}
                className="p-4 border-b border-[var(--glass-border)]"
              >
                <LqText as="h2" variant="h3" color="primary" className="font-semibold">
                  Users
                </LqText>
                <Flex align="center" gap={3} className="w-full max-w-xl justify-end">
                  <Box className="relative max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                    />
                  </Box>
                  <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--text-primary)] rounded-lg transition-colors shadow-lg shadow-[var(--accent)]/20 whitespace-nowrap"
                  >
                    <UserPlus size={18} />
                    <span>Add User</span>
                  </button>
                </Flex>
              </Flex>

              <Box className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] text-sm border-b border-[var(--glass-border)]">
                      <th className="px-6 py-3 font-medium">User</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Last Active</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--glass-border)]">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          Loading users...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-[var(--glass-bg-strong)] transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <Flex align="center" gap={3}>
                              <Flex
                                align="center"
                                justify="center"
                                className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-medium text-sm"
                              >
                                {user.username.charAt(0).toUpperCase()}
                              </Flex>
                              <Box className="font-medium text-[var(--text-primary)]">
                                {user.username}
                              </Box>
                            </Flex>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                user.role === 'admin'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : user.role === 'investigator'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] border-[var(--glass-border)]'
                              }`}
                            >
                              {user.role === 'admin' && <Shield size={12} />}
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
                            {user.email || '-'}
                          </td>
                          <td className="px-6 py-4 text-[var(--text-secondary)] text-sm">
                            {user.last_active
                              ? new Date(user.last_active).toLocaleString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Flex
                              align="center"
                              justify="end"
                              gap={2}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              {user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
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
          <Surface variant="panel" className="overflow-hidden animate-in fade-in duration-300">
            <Flex
              align="center"
              justify="between"
              className="p-4 border-b border-[var(--glass-border)]"
            >
              <LqText
                as="h2"
                variant="h3"
                color="primary"
                className="font-semibold flex items-center gap-2"
              >
                <Activity className="text-blue-400 w-5 h-5" />
                Audit Logs
              </LqText>
              <button
                onClick={() => void refetchAuditLogs()}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-strong)] rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} className={auditLoading ? 'animate-spin' : ''} />
              </button>
            </Flex>
            <Box className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] text-sm border-b border-[var(--glass-border)]">
                    <th className="px-6 py-3 font-medium">Timestamp</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Target</th>
                    <th className="px-6 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {auditLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                        Loading logs...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, idx) => (
                      <tr
                        key={log.id || idx}
                        className="hover:bg-[var(--glass-bg-strong)] transition-colors"
                      >
                        <td className="px-6 py-4 text-xs font-mono text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                          {log.performed_by || log.user_id}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[var(--glass-bg-strong)] text-[var(--text-primary)] border border-[var(--glass-border)]">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {log.object_type}{' '}
                          {log.object_id && (
                            <span className="text-[var(--text-muted)]">
                              #{log.object_id.substring(0, 8)}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-muted)] font-mono text-xs max-w-md truncate">
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
          <Box className="space-y-6 animate-in fade-in duration-300">
            <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="lg">
              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" gap={3} className="mb-4">
                  <Activity className="text-green-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Status
                  </h3>
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className="text-4xl font-mono uppercase tracking-tighter"
                >
                  {health?.status || 'Unknown'}
                </LqText>
                <LqText
                  as="p"
                  variant="small"
                  color="muted"
                  className="mt-2 font-mono uppercase tracking-wider"
                >
                  Uptime: {health ? (health.uptime / 3600).toFixed(1) : 0} hrs
                </LqText>
              </Surface>

              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" gap={3} className="mb-4">
                  <Database className="text-blue-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Database
                  </h3>
                </Flex>
                <LqText
                  as="div"
                  variant="h1"
                  className="text-4xl font-mono uppercase tracking-tighter"
                >
                  {health?.database || 'Unknown'}
                </LqText>
                <LqText
                  as="p"
                  variant="small"
                  color="muted"
                  className="mt-2 font-mono uppercase tracking-wider"
                >
                  Entities: {health?.data?.entities?.toLocaleString()}
                </LqText>
              </Surface>

              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" gap={3} className="mb-4">
                  <FileText className="text-orange-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Documents
                  </h3>
                </Flex>
                <LqText as="div" variant="h1" className="text-4xl font-mono tracking-tighter">
                  {health?.data?.documents?.toLocaleString() || 0}
                </LqText>
              </Surface>

              <Surface
                variant="glass"
                className="p-6 hover:-translate-y-1 transition-all duration-300 group"
              >
                <Flex align="center" gap={3} className="mb-4">
                  <Cpu className="text-purple-400 opacity-70 group-hover:opacity-100 transition-opacity" />
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                    Environment
                  </h3>
                </Flex>
                <Box className="text-sm font-mono tracking-wider text-[var(--text-primary)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] p-2 rounded-lg">
                  {health?.environment || 'unknown'}
                </Box>
              </Surface>
            </Grid>

            {/* Add more system controls here later */}
            <Flex
              align="start"
              gap={3}
              className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl"
            >
              <AlertTriangle className="text-amber-500 mt-0.5" />
              <Box>
                <h4 className="text-amber-400 font-medium">System Maintenance</h4>
                <p className="text-amber-400/80 text-sm mt-1">
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
          <Surface variant="panel" className="overflow-hidden animate-in fade-in duration-300">
            <Flex
              align="center"
              justify="between"
              className="p-4 border-b border-[var(--glass-border)] font-bold"
            >
              <LqText
                as="h2"
                variant="h3"
                color="primary"
                className="font-semibold flex items-center gap-2"
              >
                <RefreshCw className="text-orange-400 w-5 h-5" />
                Ingestion History
              </LqText>
            </Flex>
            <Box className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] text-sm border-b border-[var(--glass-border)]">
                    <th className="px-6 py-3 font-medium">Run ID</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Commit</th>
                    <th className="px-6 py-3 font-medium">Model / Agentic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {ingestRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-[var(--glass-bg-strong)] transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-mono text-[var(--text-primary)] truncate max-w-[120px]">
                        {run.id}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            run.status === 'success'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : run.status === 'running'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-mono text-[var(--text-muted)]">
                        {run.gitCommit?.substring(0, 7) || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <Flex direction="column" gap={1}>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {run.agenticModelId || 'Legacy'}
                          </span>
                          {run.agenticEnabled && (
                            <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1 rounded w-fit font-bold uppercase">
                              AGENTIC
                            </span>
                          )}
                        </Flex>
                      </td>
                    </tr>
                  ))}
                  {ingestRuns.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-[var(--text-muted)] italic"
                      >
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
          <Box className="space-y-6 animate-in fade-in duration-300">
            <Flex align="center" justify="between">
              <Box>
                <LqText as="h2" variant="h3" color="primary" className="font-bold cursor-text">
                  Database Backups
                </LqText>
                <LqText as="p" variant="small" color="secondary">
                  Compressed database snapshots (Last 7 days retained)
                </LqText>
              </Box>
              <button
                onClick={triggerBackup}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--text-primary)] rounded-lg transition-colors shadow-lg shadow-[var(--accent)]/20"
              >
                <RefreshCw size={18} />
                Snapshot Now
              </button>
            </Flex>

            <Surface variant="panel" className="overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--glass-bg-strong)] text-[var(--text-secondary)] text-sm border-b border-[var(--glass-border)]">
                    <th className="px-6 py-3 font-medium">Filename</th>
                    <th className="px-6 py-3 font-medium text-right">Size</th>
                    <th className="px-6 py-3 font-medium text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--glass-border)]">
                  {backups.map((backup) => (
                    <tr
                      key={backup.filename}
                      className="hover:bg-[var(--glass-bg-strong)] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)] flex items-center gap-2">
                        <FileText size={14} className="text-[var(--text-muted)]" />
                        {backup.filename}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[var(--text-secondary)] text-right">
                        {(backup.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-muted)] text-right">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {backups.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-12 text-center text-[var(--text-muted)] italic"
                      >
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
          <Box className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ReviewQueuePanel />
          </Box>
        )}
      </Box>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <Flex
          align="center"
          justify="center"
          className="fixed inset-0 z-50 p-4 bg-[var(--glass-bg-strong)] backdrop-blur-sm"
        >
          <Surface
            variant="panel"
            className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200"
          >
            <Flex
              align="center"
              justify="between"
              className="p-6 border-b border-[var(--glass-border)]"
            >
              <LqText as="h3" variant="h3" color="primary" className="font-semibold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </LqText>
              <CloseButton onClick={closeModal} size="sm" label="Close user modal" />
            </Flex>

            <form onSubmit={editingUser ? handleUpdate : handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none disabled:opacity-50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {editingUser ? 'New Password (leave blank to keep)' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg pl-9 pr-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const roleValue = e.target.value;
                    if (isUserRole(roleValue)) {
                      setFormData({ ...formData, role: roleValue });
                    }
                  }}
                  className="w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
                >
                  <option value="viewer" className="bg-[var(--glass-bg)]">
                    Viewer (Read Only)
                  </option>
                  <option value="investigator" className="bg-[var(--glass-bg)]">
                    Investigator (Can Edit)
                  </option>
                  <option value="admin" className="bg-[var(--glass-bg)]">
                    Admin (Full Access)
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--accent)] hover:brightness-110 text-[var(--text-primary)] rounded-lg transition-colors font-medium shadow-lg shadow-[var(--accent)]/20"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </Surface>
        </Flex>
      )}
    </Box>
  );
};

export default AdminDashboard;
