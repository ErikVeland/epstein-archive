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
import styles from './InvestigationTeamManagement.module.css';

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

  const getRoleTone = (role: TeamRole) => {
    switch (role) {
      case 'lead':
        return styles.leadTone;
      case 'researcher':
        return styles.researcherTone;
      case 'analyst':
        return styles.analystTone;
      case 'reviewer':
        return styles.reviewerTone;
      case 'external':
        return styles.externalTone;
      default:
        return styles.externalTone;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Team & Access</h3>
          <p className={styles.subtitle}>
            Local profiles and role controls for this investigation workspace
          </p>
        </div>
        <div className={styles.actionGroup}>
          <button
            onClick={() => setShowAddModal(true)}
            className={`${styles.actionButton} ${styles.primaryAction}`}
          >
            <UserPlus className={styles.iconSm} />
            Add Local Profile
          </button>
          <button
            onClick={exportTeamJson}
            className={`${styles.actionButton} ${styles.secondaryAction}`}
          >
            <Download className={styles.iconSm} />
            Export JSON
          </button>
          <label className={styles.importLabel}>
            <Upload className={styles.iconSm} />
            Import JSON
            <input
              type="file"
              accept="application/json"
              className={styles.hiddenInput}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importTeamJson(file);
              }}
            />
          </label>
        </div>
      </div>

      <div className={styles.noticeCard}>
        <div className={styles.noticeRow}>
          <HardDrive className={styles.noticeIcon} />
          <div>
            <p className={styles.noticeTitle}>Local to this device</p>
            <p className={styles.noticeText}>
              Team profiles are stored in browser local storage and are not synced to server
              accounts. Use JSON export/import to move this setup between devices.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.rolesCard}>
        <div className={styles.rolesHeader}>
          <Info className={styles.sectionIcon} />
          <h4 className={styles.sectionTitle}>Access & Roles</h4>
        </div>
        <div className={styles.rolesGrid}>
          {(Object.keys(rolePermissions) as TeamRole[]).map((role) => (
            <div key={role} className={styles.roleCard}>
              <p className={styles.roleName}>{role}</p>
              <p className={styles.roleNote}>{roleNotes[role]}</p>
              <div className={styles.permissionList}>
                {rolePermissions[role].map((permission) => (
                  <span key={`${role}-${permission}`} className={styles.permissionPill}>
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.teamList}>
        {team.map((member) => {
          const RoleIcon = getRoleIcon(member.role as TeamRole);
          const roleToneClass = getRoleTone(member.role as TeamRole);

          return (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <div className={`${styles.roleAvatar} ${roleToneClass}`}>
                  <RoleIcon className={styles.roleAvatarIcon} />
                </div>
                <div className={styles.memberCopy}>
                  <div className={styles.memberHeader}>
                    <p className={styles.memberName}>{member.name}</p>
                    <span className={`${styles.roleBadge} ${roleToneClass}`}>{member.role}</span>
                  </div>
                  <p className={styles.memberEmail}>{member.email}</p>
                  <p className={styles.memberJoined}>
                    Joined {member.joinedAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className={styles.memberActions}>
                {member.role !== 'lead' && (
                  <select
                    value={member.role}
                    onChange={(e) => updateRole(member.id, e.target.value as TeamRole)}
                    className={styles.roleSelect}
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
                    className={styles.deleteButton}
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className={styles.iconSm} />
                  </button>
                )}
                {member.role === 'lead' && (
                  <span className={styles.leadHint}>
                    <Users className={styles.hintIcon} />
                    Lead profile cannot be removed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Local Profile</h3>
              <p className={styles.modalSubtitle}>Stored on this device only.</p>
            </div>

            <div className={styles.modalBody}>
              <div>
                <label className={styles.fieldLabel}>Display name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="Investigator name"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={styles.fieldInput}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className={styles.fieldLabel}>Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as TeamRole)}
                  className={styles.fieldSelect}
                >
                  <option value="researcher">Researcher</option>
                  <option value="analyst">Analyst</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="external">External</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={() => setShowAddModal(false)} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={addMember} className={styles.submitButton}>
                Add Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
