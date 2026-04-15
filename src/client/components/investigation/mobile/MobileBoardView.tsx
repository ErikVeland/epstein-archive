import React, { useState, useRef, useCallback } from 'react';
import { useInvestigationBoard } from '../../../domains/investigations';
import { apiClient } from '../../../services/apiClient';
import type { Hypothesis, EvidenceItem } from '../../../../types/investigation';
import { Button, TextInput } from '../../../design-system/lib';
import { SheetDialog } from '../../common/SheetDialog';
import styles from './MobileBoardView.module.css';

type Column = 'hypotheses' | 'evidence' | 'narrative';
const COLUMNS: Column[] = ['hypotheses', 'evidence', 'narrative'];
const COLUMN_LABELS: Record<Column, string> = {
  hypotheses: 'Hypotheses',
  evidence: 'Evidence',
  narrative: 'Narrative',
};
const SWIPE_THRESHOLD = 60;

interface MobileBoardViewProps {
  investigationId: string;
}

type AddSheetState = { column: Column } | null;
type MoveSheetState = { cardTitle: string } | null;

interface CreateHypothesisResponse {
  id: string | number;
  title: string;
  status: string;
}

function HypothesisList({
  hypotheses,
  onMove,
}: {
  hypotheses: Hypothesis[];
  onMove: (title: string) => void;
}) {
  if (hypotheses.length === 0) return <div className={styles.emptyState}>No hypotheses yet</div>;
  return (
    <>
      {hypotheses.map((h) => (
        <div key={h.id} className={styles.card}>
          <div className={styles.cardTitle}>{h.title}</div>
          <div className={styles.cardMeta}>
            <span className={styles.badge}>{h.status}</span>
          </div>
          <div className={styles.cardActions}>
            <Button unstyled className={styles.cardBtn} onClick={() => onMove(h.title)}>
              Move
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

function EvidenceList({
  evidence,
  onMove,
}: {
  evidence: EvidenceItem[];
  onMove: (title: string) => void;
}) {
  if (evidence.length === 0) return <div className={styles.emptyState}>No evidence yet</div>;
  return (
    <>
      {evidence.map((ev) => (
        <div key={ev.id} className={styles.card}>
          <div className={styles.cardTitle}>{ev.title ?? 'Untitled'}</div>
          <div className={styles.cardMeta}>
            <span className={styles.badge}>{ev.type}</span>
            <span className={styles.badge}>{ev.relevance}</span>
          </div>
          <div className={styles.cardActions}>
            <Button
              unstyled
              className={styles.cardBtn}
              onClick={() => onMove(ev.title ?? 'Untitled')}
            >
              Move
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

function NarrativeList({
  items,
  onMove,
}: {
  items: EvidenceItem[];
  onMove: (title: string) => void;
}) {
  if (items.length === 0) return <div className={styles.emptyState}>No narrative items yet</div>;
  return (
    <>
      {items.map((ev) => (
        <div key={ev.id} className={styles.card}>
          <div className={styles.cardTitle}>{ev.title ?? 'Untitled'}</div>
          <div className={styles.cardMeta}>
            <span className={styles.badge}>{ev.type}</span>
          </div>
          <div className={styles.cardActions}>
            <Button
              unstyled
              className={styles.cardBtn}
              onClick={() => onMove(ev.title ?? 'Untitled')}
            >
              Move
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

export function MobileBoardView({ investigationId }: MobileBoardViewProps) {
  const [activeColumn, setActiveColumn] = useState<Column>('hypotheses');
  const [addSheet, setAddSheet] = useState<AddSheetState>(null);
  const [moveSheet, setMoveSheet] = useState<MoveSheetState>(null);
  const [addTitle, setAddTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const colIndex = COLUMNS.indexOf(activeColumn);

  const { hypotheses, evidence, notebook, loadingShell, setHypotheses } =
    useInvestigationBoard(investigationId);

  // Narrative column: evidence items ordered by notebook
  const narrativeItems = notebook
    .map((id) => evidence.find((e) => String(e.id) === String(id)))
    .filter((e): e is EvidenceItem => e !== undefined);

  const handleTouchStart = useCallback((ev: React.TouchEvent) => {
    touchStartX.current = ev.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (ev: React.TouchEvent) => {
      const delta = ev.changedTouches[0].clientX - touchStartX.current;
      if (delta < -SWIPE_THRESHOLD) {
        setActiveColumn(COLUMNS[Math.min(colIndex + 1, COLUMNS.length - 1)]);
      } else if (delta > SWIPE_THRESHOLD) {
        setActiveColumn(COLUMNS[Math.max(colIndex - 1, 0)]);
      }
    },
    [colIndex],
  );

  const handleAddSave = useCallback(async () => {
    if (!addTitle.trim() || !addSheet || saving) return;
    setSaving(true);
    try {
      if (addSheet.column === 'hypotheses') {
        const created = await apiClient.post<CreateHypothesisResponse>(
          `/investigations/${investigationId}/hypotheses`,
          { title: addTitle, description: '' },
        );
        setHypotheses((prev: Hypothesis[]) => [
          ...prev,
          {
            id: String(created.id),
            investigationId,
            title: created.title,
            description: '',
            status: (created.status as Hypothesis['status']) || 'proposed',
            evidence: [],
            confidence: 0,
            createdBy: 'system',
            createdAt: new Date(),
            relatedHypotheses: [],
          },
        ]);
      } else {
        // Evidence and Narrative: add to unsorted queue
        await apiClient.post(`/investigations/${investigationId}/evidence`, {
          title: addTitle,
          status: 'unsorted',
        });
      }
      setAddSheet(null);
      setAddTitle('');
    } catch (err) {
      console.error('Add card failed:', err);
      setAddError('Failed to add. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [addTitle, addSheet, saving, investigationId, setHypotheses]);

  const renderCards = () => {
    if (loadingShell) return <div className={styles.loadingState}>Loading...</div>;
    if (activeColumn === 'hypotheses')
      return (
        <HypothesisList
          hypotheses={hypotheses}
          onMove={(title) => setMoveSheet({ cardTitle: title })}
        />
      );
    if (activeColumn === 'evidence')
      return (
        <EvidenceList evidence={evidence} onMove={(title) => setMoveSheet({ cardTitle: title })} />
      );
    return (
      <NarrativeList
        items={narrativeItems}
        onMove={(title) => setMoveSheet({ cardTitle: title })}
      />
    );
  };

  return (
    <div className={styles.root} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className={styles.columnTabs}>
        {COLUMNS.map((col) => (
          <Button
            unstyled
            key={col}
            className={`${styles.columnTab} ${activeColumn === col ? styles.columnTabActive : ''}`}
            onClick={() => setActiveColumn(col)}
          >
            {COLUMN_LABELS[col]}
          </Button>
        ))}
      </div>

      <div className={styles.columnContent}>
        {renderCards()}
        <Button
          className={styles.addBtn}
          variant="glass"
          onClick={() => {
            setAddSheet({ column: activeColumn });
            setAddError(null);
          }}
        >
          + Add to {COLUMN_LABELS[activeColumn]}
        </Button>
      </div>

      {addSheet !== null && (
        <SheetDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setAddSheet(null);
              setAddTitle('');
              setAddError(null);
            }
          }}
          title={`Add to ${COLUMN_LABELS[addSheet.column]}`}
          description="Use the same shared mobile sheet pattern as the rest of the app."
          footer={
            <Button
              className={styles.sheetFooterButton}
              disabled={!addTitle.trim() || saving}
              onClick={handleAddSave}
            >
              {saving ? 'Saving…' : 'Add'}
            </Button>
          }
        >
          {addError !== null && <div className={styles.errorMsg}>{addError}</div>}
          <TextInput
            autoFocus
            label="Title"
            placeholder="Title…"
            value={addTitle}
            onChange={(ev) => setAddTitle(ev.target.value)}
          />
        </SheetDialog>
      )}

      {moveSheet !== null && (
        <SheetDialog
          open
          onOpenChange={(open) => {
            if (!open) setMoveSheet(null);
          }}
          title="Move Card"
          footer={
            <Button className={styles.sheetFooterButton} onClick={() => setMoveSheet(null)}>
              OK
            </Button>
          }
        >
          <p className={styles.sheetNote}>
            Full card editing and moving between columns is available on desktop.
          </p>
        </SheetDialog>
      )}
    </div>
  );
}
