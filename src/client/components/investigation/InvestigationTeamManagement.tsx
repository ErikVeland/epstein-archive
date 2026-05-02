import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Investigation, Investigator } from '@client/types/investigation';
import Icon, { IconName } from '@client/components/common/Icon';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
// UI Library
import styles from './InvestigationTeamManagement.module.css';
import {
  Badge,
  Box,
  Button,
  FileInput,
  Flex,
  Grid,
  Input,
  LqText,
  Select,
  Stack,
  Surface,
  cn,
} from '@client/design-system/lib';
const css = <T,>(style: T) => style;

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
  lead: 'Global authority. Managed role assignments and destructive case actions.',
  researcher: 'Signal ingestion. Capability to add/edit evidence and timeline stream.',
  analyst: 'Forensic computation. Authorization for analytics and status derivation.',
  reviewer: 'Quality assurance. Read-only access with deep annotation capabilities.',
  external: 'Observation buffer. Limited exposure for shared tactical review.',
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
    [currentUser],
  );

  const persistLocalTeam = (members: Investigator[]) => {
    const snapshot: LocalTeamSnapshot = {
      team: members.map((m) => ({ ...m, joinedAt: m.joinedAt.toISOString() })),
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
          nextMembers = parsed.team.map((m) => ({ ...m, joinedAt: new Date(m.joinedAt) }));
        }
      } catch {
        addToast({
          text: 'Storage corruption detected. Reverting to session state.',
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
    if (!newName.trim() || !newEmail.trim()) return;
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
    addToast({ text: 'Local profile synchronized.', type: 'success' });
  };

  const updateRole = (memberId: string, role: TeamRole) => {
    applyTeamUpdate(
      team.map((m) => (m.id === memberId ? { ...m, role, permissions: rolePermissions[role] } : m)),
    );
    addToast({ text: `Role updated for ${role.toUpperCase()}`, type: 'info' });
  };

  const removeMember = (memberId: string) => {
    const member = team.find((m) => m.id === memberId);
    applyTeamUpdate(team.filter((m) => m.id !== memberId));
    addToast({
      text: `${member?.name ?? 'Asset'} de-authorized`,
      type: 'warning',
    });
  };

  const getRoleIcon = (role: TeamRole): IconName => {
    if (role === 'lead') return 'Crown';
    if (role === 'analyst') return 'ShieldCheck';
    if (role === 'reviewer') return 'Eye';
    return 'Users';
  };

  return (
    <Box fullHeight flex direction="column" bgcolor="var(--lq-surface-1)">
      {/* Header HUD */}
      <Surface variant="glass" p="xl" className={styles.autoGen277}>
        <Flex justify="between" align="center">
          <Stack gap="none">
            <Flex align="center" gap="md">
              <Icon name="Users" size="lg" className={styles.autoGen278} />
              <LqText variant="h1" weight="bold">
                Operational Unit Controls
              </LqText>
            </Flex>
            <LqText
              variant="xs"
              color="muted"
              style={css({ textTransform: 'uppercase' })}
              weight="bold"
              mt="xs"
            >
              Asset Governance • Local Profile Orchestration
            </LqText>
          </Stack>
          <Flex gap="md">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
              <Icon name="UserPlus" size="sm" className={styles.mr2} /> Add Agent
            </Button>
            <Button variant="ghost" onClick={() => {}} className={styles.autoGen279}>
              <Icon name="Download" size="sm" className={styles.mr2} /> Export JSON
            </Button>
            <label className={styles.autoGen280}>
              <Button variant="ghost" className={styles.autoGen281}>
                <Icon name="Upload" size="sm" className={styles.mr2} /> Import JSON
              </Button>
              <FileInput className={styles.autoGen282} />
            </label>
          </Flex>
        </Flex>
      </Surface>

      <Box p="xl">
        <Stack gap="xl">
          {/* Storage Alert */}
          <Surface variant="glass-highlight" p="lg" className={styles.autoGen283}>
            <Flex gap="md" align="center">
              <Icon name="HardDrive" size="xl" className={styles.autoGen284} />
              <Stack gap="xxs">
                <LqText variant="small" weight="bold">
                  Local Persistence Cluster
                </LqText>
                <LqText variant="xs" color="muted">
                  Agent profiles are contained within the browser's local sandbox. Cross-device
                  synchronization requires manual JSON transfer.
                </LqText>
              </Stack>
            </Flex>
          </Surface>

          {/* Role Glossary */}
          <Grid cols={3} gap="md">
            {(Object.keys(rolePermissions) as TeamRole[]).map((role) => (
              <Surface key={role} variant="glass" p="lg" className={styles.autoGen285}>
                <Stack gap="sm">
                  <Flex justify="between" align="center">
                    <LqText
                      variant="xs"
                      weight="bold"
                      color="muted"
                      style={css({ textTransform: 'uppercase' })}
                    >
                      {role}
                    </LqText>
                    <Badge
                      variant={role === 'lead' ? 'error' : 'accent'}
                      label={role === 'lead' ? 'ROOT' : 'USER'}
                      size="sm"
                    />
                  </Flex>
                  <LqText variant="xs" color="muted" lineHeight="relaxed">
                    {roleNotes[role]}
                  </LqText>
                  <Flex gap="xs" wrap="wrap" mt="xs">
                    {rolePermissions[role].map((p) => (
                      <Badge key={p} variant="glass-highlight" label={p} size="sm" />
                    ))}
                  </Flex>
                </Stack>
              </Surface>
            ))}
          </Grid>

          {/* Agent Roster */}
          <Stack gap="md">
            <Flex align="center" gap="md">
              <Icon name="Briefcase" size="sm" className={styles.autoGen286} />
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={css({ textTransform: 'uppercase' })}
              >
                Active Agent Roster
              </LqText>
              <Box grow className={styles.autoGen287} />
            </Flex>

            {team.map((member) => {
              return (
                <Surface
                  key={member.id}
                  variant="glass-highlight"
                  p="lg"
                  className={styles.autoGen288}
                >
                  <Flex justify="between" align="center">
                    <Flex gap="lg" align="center">
                      <Box
                        className={cn(
                          styles.p4,
                          'rounded-full',
                          member.role === 'lead'
                            ? 'bg-[var(--lq-error)] text-white'
                            : 'bg-[var(--lq-surface-2)] text-[var(--lq-text-dim)]',
                        )}
                      >
                        <Icon name={getRoleIcon(member.role as TeamRole)} size="sm" />
                      </Box>
                      <Stack gap="xs">
                        <Flex align="center" gap="md">
                          <LqText variant="small" weight="bold">
                            {member.name}
                          </LqText>
                          <Badge
                            variant={member.role === 'lead' ? 'error' : 'glass'}
                            label={member.role.toUpperCase()}
                            size="sm"
                          />
                        </Flex>
                        <LqText variant="xs" color="muted">
                          {member.email}
                        </LqText>
                        <LqText variant="xs" color="muted">
                          Extraction Stream Joined: {member.joinedAt.toLocaleDateString()}
                        </LqText>
                      </Stack>
                    </Flex>

                    <Flex gap="md" align="center">
                      {member.role !== 'lead' ? (
                        <Flex gap="sm">
                          <Select
                            size="sm"
                            value={member.role}
                            onChange={(e) => updateRole(member.id, e.target.value as TeamRole)}
                            options={[
                              { value: 'researcher', label: 'Researcher' },
                              { value: 'analyst', label: 'Analyst' },
                              { value: 'reviewer', label: 'Reviewer' },
                              { value: 'external', label: 'External' },
                            ]}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className={styles.autoGen289}
                            onClick={() => removeMember(member.id)}
                          >
                            <Icon name="Trash2" size="sm" />
                          </Button>
                        </Flex>
                      ) : (
                        <Flex align="center" gap="sm" className={styles.autoGen290}>
                          <Icon name="Settings" size="xs" className={styles.autoGen291} />
                          <LqText variant="xs" color="muted" weight="bold">
                            ROOT PROFILE PROTECTED
                          </LqText>
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                </Surface>
              );
            })}
          </Stack>
        </Stack>
      </Box>

      {/* Add Agent Modal */}
      {showAddModal && (
        <Box className={styles.autoGen292} onClick={() => setShowAddModal(false)}>
          <Surface
            variant="panel"
            width={500}
            p="xl"
            className={styles.autoGen293}
            onClick={(e) => e.stopPropagation()}
          >
            <Stack gap="xl">
              <Flex justify="between" align="center">
                <Stack gap="none">
                  <LqText variant="h3" weight="bold">
                    Agent Initialization
                  </LqText>
                  <LqText variant="xs" color="muted">
                    Configure local operative profile.
                  </LqText>
                </Stack>
                <CloseButton onClick={() => setShowAddModal(false)} />
              </Flex>

              <Stack gap="lg">
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    CODENAME / DISPLAY NAME
                  </LqText>
                  <Input
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Agent Identification..."
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    COMMUNICATION VECTOR (EMAIL)
                  </LqText>
                  <Input
                    style={css({
                      width: '100%',
                      background: 'var(--lq-surface-3)',
                      border: '1px solid var(--lq-surface-4)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--lq-text-primary)',
                      outline: 'none',
                    })}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="agent@epstein-archive.live"
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    OPERATIONAL MODALITY (ROLE)
                  </LqText>
                  <Select
                    size="sm"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as TeamRole)}
                    options={[
                      { value: 'researcher', label: 'Researcher' },
                      { value: 'analyst', label: 'Analyst' },
                      { value: 'reviewer', label: 'Reviewer' },
                      { value: 'external', label: 'External' },
                    ]}
                  />
                </Stack>
              </Stack>

              <Flex justify="end" gap="md" pt="lg" className={styles.autoGen294}>
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Abort
                </Button>
                <Button
                  variant="secondary"
                  onClick={addMember}
                  disabled={!newName.trim() || !newEmail.trim()}
                >
                  Initialize Asset
                </Button>
              </Flex>
            </Stack>
          </Surface>
        </Box>
      )}
    </Box>
  );
};
