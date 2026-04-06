import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
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
    <div id="ChainOfCustodyModal" className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>Chain of Custody</h3>
          <CloseButton
            onClick={onClose}
            size="sm"
            label="Close chain of custody"
            className="bg-transparent border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
          />
        </div>
        <div className={styles.body}>
          <div className={styles.evidenceIdHidden}>Evidence ID: {evidenceId}</div>
          <div className={styles.exportButtons}>
            <button onClick={exportReport} className={styles.exportButton}>
              Export Report
            </button>
            <button onClick={exportCsv} className={styles.exportButton}>
              Export CSV
            </button>
            <button onClick={openPrintable} className={styles.exportButton}>
              Printable PDF
            </button>
          </div>
          {loading ? (
            <div className={styles.loadingText}>Loading...</div>
          ) : (
            <div className={styles.eventsList}>
              {events.map((ev) => (
                <div key={ev.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventAction}>{ev.action}</span>
                    <span className={styles.eventDate}>{ev.date}</span>
                  </div>
                  <div className={styles.eventActor}>
                    Actor: <span className={styles.actorName}>{ev.actor}</span>
                  </div>
                  {ev.notes && <div className={styles.eventNotes}>{ev.notes}</div>}
                </div>
              ))}
              {events.length === 0 && (
                <div className={styles.emptyText}>No custody events yet.</div>
              )}
            </div>
          )}
          <div className={styles.addEventSection}>
            <h4 className={styles.addEventTitle}>Add Event</h4>
            <div className={styles.addEventGrid}>
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Actor"
                className={styles.input}
              />
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Action"
                className={styles.input}
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className={styles.input}
              />
            </div>
            <button onClick={addEvent} className={styles.addButton}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ChainOfCustodyModal;
