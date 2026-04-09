import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Shield,
  FileText,
  Download,
  Printer,
  Plus,
  History,
  ShieldCheck,
  Terminal,
  CheckCircle,
} from 'lucide-react';

// UI Library
import { Surface, Button, Flex, Box, Stack, Grid, LqText } from '../../design-system/lib';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import styles from './ChainOfCustodyModal.module.css';

interface CustodyEvent {
  id: string | number;
  action: string;
  date: string;
  actor: string;
  notes?: string;
}

interface Props {
  evidenceId: string;
  onClose: () => void;
}

export const ChainOfCustodyModal: React.FC<Props> = ({ evidenceId, onClose }) => {
  useScrollLock(true);
  const queryClient = useQueryClient();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('analyzed');
  const [notes, setNotes] = useState('');

  const exportReport = async () => {
    const res = await fetch(`/api/evidence/${evidenceId}/custody/report`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custody-${evidenceId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = async () => {
    const res = await fetch(`/api/evidence/${evidenceId}/custody/report.csv`);
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custody-${evidenceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrintable = () => {
    window.open(`/api/evidence/${evidenceId}/custody/report.html`, '_blank');
  };

  const custodyQueryKey = ['evidence-custody', evidenceId] as const;

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: custodyQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/evidence/${evidenceId}/custody`);
      return res.json() as Promise<CustodyEvent[]>;
    },
  });

  const addEvent = async () => {
    if (!actor || !action) return;
    await fetch(`/api/evidence/${evidenceId}/custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, action, notes }),
    });
    await queryClient.invalidateQueries({ queryKey: custodyQueryKey });
    setActor('');
    setAction('analyzed');
    setNotes('');
  };

  return createPortal(
    <Box className={styles.autoGen10} onClick={onClose}>
      <Surface
        variant="panel"
        style={{ width: 600, padding: 0 }}
        className={styles.autoGen11}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack gap="none" className={styles.autoGen12}>
          {/* Header HUD */}
          <Surface variant="glass" p="xl" className={styles.autoGen13}>
            <Flex justify="between" align="start">
              <Stack gap="none">
                <Flex align="center" gap="md">
                  <ShieldCheck size={24} className={styles.autoGen14} />
                  <LqText variant="h3" weight="bold">
                    Chain of Custody Protocol
                  </LqText>
                </Flex>
                <LqText
                  variant="small"
                  color="muted"
                  weight="bold"
                  style={{ textTransform: 'uppercase', marginTop: 'var(--spacing-xs)' }}
                >
                  Forensic Audit Trail • Signal Integrity Preservation
                </LqText>
              </Stack>
              <CloseButton onClick={onClose} size="md" />
            </Flex>

            <Flex gap="md" style={{ marginTop: 'var(--spacing-xl)' }}>
              <Button variant="ghost" size="sm" onClick={exportReport} className={styles.autoGen15}>
                <FileText size={12} className="mr-1" /> EXPORT REPORT
              </Button>
              <Button variant="ghost" size="sm" onClick={exportCsv} className={styles.autoGen16}>
                <Download size={12} className="mr-1" /> EXPORT CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openPrintable}
                className={styles.autoGen17}
              >
                <Printer size={12} className="mr-1" /> PRINTABLE PDF
              </Button>
            </Flex>
          </Surface>

          {/* Audit Log Stream */}
          <Box className={styles.autoGen18}>
            <Stack gap="md">
              <Flex align="center" gap="md">
                <History size={16} className={styles.autoGen19} />
                <LqText
                  variant="small"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Forensic History Stream
                </LqText>
                <Box className={styles.autoGen20} />
              </Flex>

              {loading ? (
                <Stack gap="md">
                  {[1, 2, 3, 4].map((i) => (
                    <Surface key={i} variant="glass" p="lg" className={styles.autoGen21} />
                  ))}
                </Stack>
              ) : events.length === 0 ? (
                <Surface variant="glass" p="xxxl" className={styles.autoGen22}>
                  <Terminal size={32} className={styles.autoGen23} />
                  <LqText variant="small" color="muted">
                    Custody stream clear. Record the first handling event below.
                  </LqText>
                </Surface>
              ) : (
                <Stack gap="sm">
                  {events.map((ev) => (
                    <Surface
                      key={ev.id}
                      variant="glass-highlight"
                      p="lg"
                      className={styles.autoGen24}
                    >
                      <Stack gap="md">
                        <Flex justify="between" align="start">
                          <Stack gap="xs">
                            <Flex align="center" gap="md">
                              <LqText variant="small" weight="bold" className={styles.autoGen25}>
                                {ev.action.toUpperCase()}
                              </LqText>
                              <LqText variant="small" weight="bold">
                                {ev.actor}
                              </LqText>
                            </Flex>
                            <LqText variant="xs" color="muted">
                              {ev.date}
                            </LqText>
                          </Stack>
                          <Shield size={14} className={styles.autoGen26} />
                        </Flex>
                        {ev.notes && (
                          <Box p="md" className={styles.autoGen27}>
                            <LqText variant="small" color="muted" style={{ fontStyle: 'italic' }}>
                              "{ev.notes}"
                            </LqText>
                          </Box>
                        )}
                      </Stack>
                    </Surface>
                  ))}
                </Stack>
              )}
            </Stack>
          </Box>

          {/* Add Event Suite */}
          <Surface variant="glass" p="xl" className={styles.autoGen28}>
            <Stack gap="lg">
              <Flex align="center" gap="md">
                <Plus size={16} className={styles.autoGen29} />
                <LqText
                  variant="small"
                  weight="bold"
                  color="muted"
                  style={{ textTransform: 'uppercase' }}
                >
                  Register Custody Event
                </LqText>
              </Flex>

              <Grid cols={3} gap="md">
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    HANDLER NAME
                  </LqText>
                  <input
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
                    value={actor}
                    onChange={(e) => setActor(e.target.value)}
                    placeholder="Investigator Code..."
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    ACTION MODALITY
                  </LqText>
                  <input
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
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="Analyzed / Transfer..."
                  />
                </Stack>
                <Stack gap="xs">
                  <LqText variant="xs" weight="bold" color="muted">
                    ANNOTATIONS
                  </LqText>
                  <input
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional context..."
                  />
                </Stack>
              </Grid>

              <Button variant="secondary" size="sm" onClick={addEvent} disabled={!actor || !action}>
                <CheckCircle size={14} className="mr-2" /> Commit Forensic Signature
              </Button>
            </Stack>
          </Surface>
        </Stack>
      </Surface>
    </Box>,
    document.body,
  );
};

export default ChainOfCustodyModal;
