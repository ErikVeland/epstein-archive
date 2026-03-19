import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';

interface Props {
  evidenceId: string;
  onClose: () => void;
}

export const ChainOfCustodyModal: React.FC<Props> = ({ evidenceId, onClose }) => {
  useScrollLock(true);
  const [events, setEvents] = useState<any[]>([]);
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('analyzed');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/evidence/${evidenceId}/custody`);
        const data = await res.json();
        setEvents(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evidenceId]);

  const addEvent = async () => {
    await fetch(`/api/evidence/${evidenceId}/custody`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, action, notes }),
    });
    const res = await fetch(`/api/evidence/${evidenceId}/custody`);
    const data = await res.json();
    setEvents(data);
    setActor('');
    setAction('analyzed');
    setNotes('');
  };

  return createPortal(
    <div
      id="ChainOfCustodyModal"
      className="fixed inset-0 bg-[var(--app-bg)]/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
    >
      <div className="bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
          <h3 className="text-[var(--text-primary)] font-bold text-xl">Chain of Custody</h3>
          <CloseButton
            onClick={onClose}
            size="sm"
            label="Close chain of custody"
            className="bg-transparent border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)]"
          />
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-[var(--text-muted)] font-mono uppercase tracking-widest hidden">
            Evidence ID: {evidenceId}
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportReport}
              className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[var(--radius-lg)] text-sm hover:bg-[var(--glass-bg-highlight)] transition-colors"
            >
              Export Report
            </button>
            <button
              onClick={exportCsv}
              className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[var(--radius-lg)] text-sm hover:bg-[var(--glass-bg-highlight)] transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={openPrintable}
              className="px-3 py-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[var(--radius-lg)] text-sm hover:bg-[var(--glass-bg-highlight)] transition-colors"
            >
              Printable PDF
            </button>
          </div>
          {loading ? (
            <div className="text-[var(--text-muted)] animate-pulse">Loading...</div>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)]"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[var(--text-primary)] font-bold">{ev.action}</span>
                    <span className="text-[var(--text-muted)] text-[10px] uppercase font-mono tracking-widest">
                      {ev.date}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-medium">
                    Actor: <span className="text-[var(--text-primary)]">{ev.actor}</span>
                  </div>
                  {ev.notes && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">{ev.notes}</div>
                  )}
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-[var(--text-muted)] text-sm italic">
                  No custody events yet.
                </div>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
            <h4 className="text-[var(--text-primary)] font-bold mb-3 text-sm">Add Event</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={actor}
                onChange={(e) => setActor(e.target.value)}
                placeholder="Actor"
                className="bg-[var(--app-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)]"
              />
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Action"
                className="bg-[var(--app-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)]"
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                className="bg-[var(--app-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] px-3 py-2 rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <button
              onClick={addEvent}
              className="mt-3 px-4 py-2 bg-[var(--accent)] text-[var(--app-bg)] font-medium rounded-[var(--radius-lg)] hover:bg-[var(--accent)]/90 transition-colors text-sm"
            >
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
