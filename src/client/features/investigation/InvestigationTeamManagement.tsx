import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Investigation, Investigator } from '@client/types/investigation';
import Icon, { IconName } from '@client/components/common/Icon';
import { useToasts } from '@client/components/common/useToasts';
// UI Library
import styles from './InvestigationTeamManagement.module.css';
import {
  Badge,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FileInput,
  Flex,
  Grid,
  LqText,
  Select,
  Stack,
  Surface,
  TextInput,
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
const TEAM_ROLES = new Set<TeamRole>(['lead', 'researcher', 'analyst', 'reviewer', 'external']);

const rolePermissions: Record<TeamRole, string[]> = {
  lead: ['read', 'write', 'admin'],
  researcher: ['read', 'write'],
  analyst: ['read', 'write'],
  reviewer: ['read', 'comment'],
  external: ['read'],
};

const roleNotes: Record<TeamRole, string> = {
  lead: 'Person coordinating the case.',
  researcher: 'Person finding and organizing source records.',
  analyst: 'Person reviewing patterns and evidence.',
  reviewer: 'Person checking accuracy and conclusions.',
  external: 'Outside contact included for planning.',
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

  const exportLocalTeam = () => {
    const snapshot: LocalTeamSnapshot = {
      team: team.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() })),
      updatedAt: new Date().toISOString(),
      storage: 'local-device',
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `case-${investigation.id}-local-team.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast({ text: 'Local team list exported.', type: 'success' });
  };

  const importLocalTeam = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray((parsed as LocalTeamSnapshot).team)
      ) {
        throw new Error('The file does not contain a local team list.');
      }
      const imported = (parsed as LocalTeamSnapshot).team.map((member) => {
        if (
          !member ||
          typeof member.id !== 'string' ||
          typeof member.name !== 'string' ||
          typeof member.email !== 'string' ||
          !TEAM_ROLES.has(member.role as TeamRole)
        ) {
          throw new Error('The team list contains an invalid profile.');
        }
        return { ...member, joinedAt: new Date(member.joinedAt) } as Investigator;
      });
      applyTeamUpdate(imported);
      addToast({ text: 'Local team list imported.', type: 'success' });
    } catch (error) {
      addToast({
        text: error instanceof Error ? error.message : 'The team list could not be imported.',
        type: 'error',
      });
    }
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
                Local team list
              </LqText>
            </Flex>
            <LqText
              variant="xs"
              color="muted"
              style={css({ textTransform: 'uppercase' })}
              weight="bold"
              mt="xs"
            >
              Planning aid for this browser only
            </LqText>
          </Stack>
          <Flex gap="md">
            <Button variant="secondary" size="sm" onClick={() => setShowAddModal(true)}>
              <Icon name="UserPlus" size="sm" className={styles.mr2} /> Add profile
            </Button>
            <Button variant="ghost" onClick={exportLocalTeam} className={styles.autoGen279}>
              <Icon name="Download" size="sm" className={styles.mr2} /> Export JSON
            </Button>
            <label className={styles.autoGen280}>
              <Button variant="ghost" className={styles.autoGen281}>
                <Icon name="Upload" size="sm" className={styles.mr2} /> Import JSON
              </Button>
              <FileInput
                className={styles.autoGen282}
                accept="application/json,.json"
                onChange={(event) => void importLocalTeam(event)}
                aria-label="Import local team list"
              />
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
                  Stored on this device
                </LqText>
                <LqText variant="xs" color="muted">
                  These profiles do not invite users or grant access. They are saved only in this
                  browser. Use JSON export and import to move the list to another device.
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
                    <Badge variant={role === 'lead' ? 'error' : 'accent'} label="LOCAL" size="sm" />
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
                Local profiles
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
                          Added {member.joinedAt.toLocaleDateString()}
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
                            Lead profile
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

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a local profile</DialogTitle>
            <DialogDescription>
              This planning profile stays in this browser. It does not invite a user or grant
              access.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addMember();
            }}
          >
            <Stack gap="lg">
              <TextInput
                id="local-team-name"
                label="Display name"
                required
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Name"
              />
              <TextInput
                id="local-team-email"
                label="Email"
                type="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="name@example.com"
              />
              <Stack gap="xs">
                <label htmlFor="local-team-role">Role label</label>
                <Select
                  id="local-team-role"
                  size="sm"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value as TeamRole)}
                  options={[
                    { value: 'researcher', label: 'Researcher' },
                    { value: 'analyst', label: 'Analyst' },
                    { value: 'reviewer', label: 'Reviewer' },
                    { value: 'external', label: 'External' },
                  ]}
                />
              </Stack>
              <Flex justify="end" gap="sm" wrap="wrap">
                <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!newName.trim() || !newEmail.trim()}
                >
                  Add profile
                </Button>
              </Flex>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
