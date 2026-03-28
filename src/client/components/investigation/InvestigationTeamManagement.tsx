import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Investigation, Investigator } from '../../types/investigation';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Eye,
  User,
  Trash2,
  Download,
  Upload,
  HardDrive,
  Info,
} from 'lucide-react';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '../../hooks/useScrollLock';

interface InvestigationTeamManagementProps {
  investigation: Investigation;
  currentUser: Investigator;
  onTeamUpdate: (investigation: Investigation) => void;
}

type TeamRole = 'lead' | 'researcher' | 'analyst' | 'reviewer' | 'external';

interface LocalTeamSnapshot {
  team: (Omit<Investigator, 'joinedAt'> & { joinedAt: string })[];
  updatedAt: string;
  storage: 'local-device';
}

const STORAGE_PREFIX = 'investigation-team-local:';

const rolePermissions: Record<TeamRole, string[]> = {
  lead: ['read', 'write', 'admin'],
  researcher: ['read', 'write'],
  analyst: ['read', 'write'],
  reviewer: ['read', 'comment'],
  external: ['read'],
};

const roleNotes: Record<TeamRole, string> = {
  lead: 'Full access including role management and destructive actions.',
  researcher: 'Can add/edit evidence, notes, and timeline entries.',
  analyst: 'Can run analytics/forensics and update findings.',
  reviewer: 'Read-only with annotation and comment capability.',
  external: 'Limited read access for shared review only.',
};

const roleToneClass: Record<TeamRole, string> = {
  lead: 'tone-warning',
  researcher: 'tone-accent',
  analyst: 'tone-success',
  reviewer: 'tone-info',
  external: 'tone-muted',
};

export const InvestigationTeamManagement: React.FC<InvestigationTeamManagementProps> = ({
  investigation,
  currentUser,
  onTeamUpdate,
}) => {
  const storageKey = `${STORAGE_PREFIX}${investigation.id}`;
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<TeamRole>('researcher');
  const { addToast } = useToasts();
  useScrollLock(showAddModal);

  const ensureLead = useCallback(
    (members: Investigator[]): Investigator[] => {
      if (members.length > 0) return members;
      return [
        {
          id: currentUser.id,
          name: currentUser.name || 'Lead Investigator',
          email: currentUser.email,
          role: 'lead',
          permissions: rolePermissions.lead,
          joinedAt: new Date(),
          organization: currentUser.organization,
          expertise: currentUser.expertise || [],
          status: 'active',
        },
      ];
    },
    [
      currentUser.email,
      currentUser.expertise,
      currentUser.id,
      currentUser.name,
      currentUser.organization,
    ],
  );

  const persistLocalTeam = (members: Investigator[]) => {
    const snapshot: LocalTeamSnapshot = {
      team: members.map((member) => ({
        ...member,
        joinedAt: member.joinedAt.toISOString(),
      })),
      updatedAt: new Date().toISOString(),
      storage: 'local-device',
    };
    localStorage.setItem(storageKey, JSON.stringify(snapshot));
  };

  useEffect(() => {
    const seedMembers = ensureLead(investigation.team || []);
    let nextMembers = seedMembers;

    const localRaw = localStorage.getItem(storageKey);
    if (localRaw) {
      try {
        const parsed = JSON.parse(localRaw) as LocalTeamSnapshot;
        if (Array.isArray(parsed.team) && parsed.team.length > 0) {
          nextMembers = parsed.team.map((member) => ({
            ...member,
            joinedAt: new Date(member.joinedAt),
          }));
        }
      } catch (_error) {
        addToast({
          text: 'Team profile storage is corrupted. Reverting to current members.',
          type: 'warning',
        });
      }
    }

    if (JSON.stringify(nextMembers) !== JSON.stringify(investigation.team || [])) {
      onTeamUpdate({
        ...investigation,
        team: nextMembers,
        leadInvestigator: nextMembers.find((m) => m.role === 'lead')?.id || currentUser.id,
      });
    }

    persistLocalTeam(nextMembers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investigation.id]);

  const team = useMemo(
    () => ensureLead(investigation.team || []),
    [ensureLead, investigation.team],
  );

  const applyTeamUpdate = (members: Investigator[]) => {
    const safeMembers = ensureLead(members);
    const leadId = safeMembers.find((m) => m.role === 'lead')?.id || currentUser.id;
    const updated = { ...investigation, team: safeMembers, leadInvestigator: leadId };
    onTeamUpdate(updated);
    persistLocalTeam(safeMembers);
  };

  const addMember = () => {
    if (!newName.trim() || !newEmail.trim()) {
      addToast({ text: 'Name and email are required.', type: 'error' });
      return;
    }

    const member: Investigator = {
      id: `local-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      permissions: rolePermissions[newRole],
      joinedAt: new Date(),
      organization: currentUser.organization,
      expertise: [],
      status: 'active',
    };

    applyTeamUpdate([...team, member]);
    setNewName('');
    setNewEmail('');
    setNewRole('researcher');
    setShowAddModal(false);
    addToast({ text: 'Local profile added to this investigation.', type: 'success' });
  };

  const removeMember = (memberId: string) => {
    const target = team.find((member) => member.id === memberId);
    if (!target || target.role === 'lead') return;
    applyTeamUpdate(team.filter((member) => member.id !== memberId));
    addToast({ text: `${target.name} removed from local team profiles.`, type: 'info' });
  };

  const updateRole = (memberId: string, role: TeamRole) => {
    const updated = team.map((member) =>
      member.id === memberId ? { ...member, role, permissions: rolePermissions[role] } : member,
    );
    applyTeamUpdate(updated);
  };

  const exportTeamJson = () => {
    const payload: LocalTeamSnapshot = {
      team: team.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() })),
      updatedAt: new Date().toISOString(),
      storage: 'local-device',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `investigation-team-${investigation.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const importTeamJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as LocalTeamSnapshot;
        if (!Array.isArray(parsed.team)) throw new Error('Invalid team format');
        const importedMembers: Investigator[] = parsed.team.map((member) => ({
          ...member,
          joinedAt: new Date(member.joinedAt),
          permissions: rolePermissions[(member.role || 'researcher') as TeamRole] || ['read'],
          status: member.status || 'active',
        }));
        applyTeamUpdate(importedMembers);
        addToast({ text: 'Local team profiles imported.', type: 'success' });
      } catch (_error) {
        addToast({ text: 'Failed to import team JSON.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'lead':
        return Crown;
      case 'analyst':
        return Shield;
      case 'reviewer':
        return Eye;
      default:
        return User;
    }
  };

  const getRoleColor = (role: TeamRole) => {
    return roleToneClass[role] || 'tone-muted';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">Team & Access</h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Local profiles and role controls for this investigation workspace
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="control bg-[var(--accent)] text-[var(--text-primary)]"
          >
            <UserPlus className="w-4 h-4" />
            Add Local Profile
          </button>
          <button
            onClick={exportTeamJson}
            className="control bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <label className="control cursor-pointer bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]">
            <Upload className="w-4 h-4" />
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importTeamJson(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className="status-banner status-banner-info rounded-[var(--radius-xl)]">
        <div className="flex items-start gap-3">
          <HardDrive className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Local to this device</p>
            <p className="text-sm mt-1 opacity-90">
              Team profiles are stored in browser local storage and are not synced to server
              accounts. Use JSON export/import to move this setup between devices.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[var(--text-secondary)]" />
          <h4 className="text-[var(--text-primary)] font-semibold">Access & Roles</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(Object.keys(rolePermissions) as TeamRole[]).map((role) => (
            <div
              key={role}
              className="p-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)]/40"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{role}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{roleNotes[role]}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {rolePermissions[role].map((permission) => (
                  <span key={`${role}-${permission}`} className="status-chip tone-muted">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {team.map((member) => {
          const RoleIcon = getRoleIcon(member.role as TeamRole);
          const roleColorClass = getRoleColor(member.role as TeamRole);

          return (
            <div
              key={member.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-[var(--glass-bg)]/50 border border-[var(--glass-border)] rounded-[var(--radius-xl)]"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center status-chip ${roleColorClass}`}
                >
                  <RoleIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-medium text-[var(--text-primary)] truncate">
                      {member.name}
                    </p>
                    <span className={`status-chip ${roleColorClass}`}>{member.role}</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] truncate">{member.email}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Joined {member.joinedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {member.role !== 'lead' && (
                  <select
                    value={member.role}
                    onChange={(e) => updateRole(member.id, e.target.value as TeamRole)}
                    className="control bg-[var(--glass-bg-highlight)] text-sm text-[var(--text-primary)]"
                    aria-label={`Update role for ${member.name}`}
                  >
                    <option value="researcher">Researcher</option>
                    <option value="analyst">Analyst</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="external">External</option>
                  </select>
                )}
                {member.role !== 'lead' && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-danger)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {member.role === 'lead' && (
                  <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Lead profile cannot be removed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-[var(--glass-bg-strong)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius-xl)] shadow-[var(--glass-shadow)] w-full max-w-md border border-[var(--glass-border)]">
            <div className="border-b border-[var(--glass-border)] p-5">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Add Local Profile
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Stored on this device only.</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="control control-mobile-full justify-start bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]"
                  placeholder="Investigator name"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="control control-mobile-full justify-start bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-2">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as TeamRole)}
                  className="control control-mobile-full justify-start bg-[var(--glass-bg-highlight)] text-[var(--text-primary)]"
                >
                  <option value="researcher">Researcher</option>
                  <option value="analyst">Analyst</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            <div className="border-t border-[var(--glass-border)] p-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="control bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                onClick={addMember}
                className="control bg-[var(--accent)] text-[var(--text-primary)]"
              >
                Add Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
