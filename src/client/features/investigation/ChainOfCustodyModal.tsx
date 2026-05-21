import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import Icon from '@client/components/common/Icon';

// UI Library
import { Box, Button, Flex, LqText, Stack, Surface, TextInput } from '@client/design-system/lib';
import { useScrollLock } from '@client/hooks/useScrollLock';
import { useIsMobile } from '@client/hooks/useIsMobile';
import { CloseButton } from '@client/components/common/CloseButton';
import { LiquidSheet } from '@client/components/common/LiquidSheet';
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
  const isMobile = useIsMobile();
  useScrollLock(!isMobile);
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

  const modalContent = (
    <Box className={styles.body}>
      <Flex align="center" gap="sm">
        <Icon name="History" size="sm" />
        <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
          Custody Events
        </LqText>
      </Flex>

      {loading ? (
        <Stack gap="sm">
          {[1, 2, 3, 4].map((i) => (
            <Surface key={i} variant="glass" p="lg" />
          ))}
        </Stack>
      ) : events.length === 0 ? (
        <LqText className={styles.emptyText}>
          Custody stream clear. Record the first handling event below.
        </LqText>
      ) : (
        <div className={styles.eventsList}>
          {events.map((ev) => (
            <div key={ev.id} className={styles.eventCard}>
              <div className={styles.eventHeader}>
                <div className={styles.eventAction}>{ev.action.toUpperCase()}</div>
                <div className={styles.eventDate}>{ev.date}</div>
              </div>
              <div className={styles.eventActor}>
                Handler: <span className={styles.actorName}>{ev.actor}</span>
              </div>
              {ev.notes ? <div className={styles.eventNotes}>"{ev.notes}"</div> : null}
            </div>
          ))}
        </div>
      )}

      <div className={styles.addEventSection}>
        <LqText className={styles.addEventTitle}>Register Custody Event</LqText>

        <div className={styles.addEventGrid}>
          <Stack gap="xs">
            <LqText variant="xs" weight="bold" color="muted">
              Handler Name
            </LqText>
            <TextInput value={actor} onChange={(e) => setActor(e.target.value)} />
          </Stack>
          <Stack gap="xs">
            <LqText variant="xs" weight="bold" color="muted">
              Action
            </LqText>
            <TextInput value={action} onChange={(e) => setAction(e.target.value)} />
          </Stack>
          <Stack gap="xs">
            <LqText variant="xs" weight="bold" color="muted">
              Notes
            </LqText>
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Stack>
        </div>

        <Button variant="secondary" size="sm" onClick={addEvent} disabled={!actor || !action}>
          <Icon name="CheckCircle" size="sm" className={styles.mr2} /> Commit Signature
        </Button>
      </div>
    </Box>
  );

  const exportActions = (
    <div className={styles.exportButtons}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={exportReport}
        className={styles.exportButton}
      >
        Export Report
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={exportCsv}
        className={styles.exportButton}
      >
        Export CSV
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={openPrintable}
        className={styles.exportButton}
      >
        Printable PDF
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <LiquidSheet isOpen={true} onClose={onClose} title="Chain of Custody">
        <Stack gap="md">
          {exportActions}
          {modalContent}
        </Stack>
      </LiquidSheet>
    );
  }

  return createPortal(
    <Box
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Surface variant="panel" p="none" className={styles.modal}>
        <Box className={styles.header}>
          <Stack gap="xs">
            <Flex align="center" gap="sm">
              <Icon name="ShieldCheck" size="md" />
              <LqText className={styles.headerTitle}>Chain of Custody</LqText>
            </Flex>
            <LqText variant="xs" color="muted" weight="bold" style={{ textTransform: 'uppercase' }}>
              Forensic Audit Trail
            </LqText>
          </Stack>

          <Flex align="center" gap="sm">
            {exportActions}
            <CloseButton onClick={onClose} size="md" className={styles.closeButton} />
          </Flex>
        </Box>

        {modalContent}
      </Surface>
    </Box>,
    document.body,
  );
};

export default ChainOfCustodyModal;
