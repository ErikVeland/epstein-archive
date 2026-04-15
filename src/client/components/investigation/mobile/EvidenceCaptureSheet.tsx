import { useState, useRef, useCallback, useEffect } from 'react';
import { FileText, Paperclip, Link } from 'lucide-react';
import { investigationsApi } from '../../../domains/investigations';
import { useSubjectsQuery } from '../../../hooks/useSubjectsQuery';
import { useToasts } from '../../common/useToasts';
import { SheetDialog } from '../../common/SheetDialog';
import {
  Button,
  Input,
  SearchField,
  Select,
  TextInput,
  Textarea,
} from '../../../design-system/lib';
import styles from './EvidenceCaptureSheet.module.css';

type CaptureMode = 'note' | 'file' | 'url';

const EVIDENCE_TYPES = [
  'Auto',
  'Document',
  'Testimony',
  'Photo',
  'URL',
  'Note',
  'Financial',
  'Other',
];
const MAX_NOTE_CHARS = 2000;

interface EvidenceCaptureSheetProps {
  investigationId: string;
  onClose: () => void;
  onSaved: (evidenceId: string) => void;
}

interface PersonAutocompleteProps {
  onSelect: (id: string, name: string) => void;
}

function PersonAutocomplete({ onSelect }: PersonAutocompleteProps) {
  const [personSearch, setPersonSearch] = useState('');
  const [debouncedPersonSearch, setDebouncedPersonSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPersonSearch(personSearch), 300);
    return () => clearTimeout(timer);
  }, [personSearch]);

  const { data: subjectsData } = useSubjectsQuery({
    page: 1,
    pageSize: 5,
    searchTerm: debouncedPersonSearch,
    entityType: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    selectedRiskLevel: null,
  });

  const subjects = subjectsData?.subjects ?? [];
  const showSuggestions = personSearch.length > 0 && subjects.length > 0;

  return (
    <>
      <SearchField
        label="Tag Person (Optional)"
        placeholder="Search subjects…"
        value={personSearch}
        onChange={(e) => setPersonSearch(e.target.value)}
      />
      {showSuggestions && (
        <div className={styles.suggestions}>
          {subjects.map((s) => (
            <Button
              key={s.id}
              className={styles.suggestionRow}
              variant="ghost"
              onClick={() => {
                onSelect(String(s.id), s.name);
                setPersonSearch('');
              }}
            >
              {s.name}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}

export function EvidenceCaptureSheet({
  investigationId,
  onClose,
  onSaved,
}: EvidenceCaptureSheetProps) {
  const [mode, setMode] = useState<CaptureMode>('note');
  const [noteText, setNoteText] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [urlNote, setUrlNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('Auto');
  const [taggedPersonId, setTaggedPersonId] = useState<string | null>(null);
  const [taggedPersonName, setTaggedPersonName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { addToast } = useToasts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isContentReady =
    (mode === 'note' && noteText.trim().length > 0) ||
    (mode === 'url' && urlValue.trim().length > 0) ||
    (mode === 'file' && selectedFile !== null);

  const handleSave = useCallback(async () => {
    if (!isContentReady || saving) return;
    setSaveError(null);
    setSaving(true);
    try {
      let payload: Record<string, unknown>;
      if (mode === 'note') {
        payload = {
          title: noteText.slice(0, 80),
          description: noteText,
          type: 'note',
          status: 'unsorted',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
        };
      } else if (mode === 'url') {
        payload = {
          title: urlValue.slice(0, 80),
          url: urlValue,
          notes: urlNote || undefined,
          type: 'url',
          status: 'unsorted',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
        };
      } else {
        payload = {
          title: selectedFile?.name ?? 'Untitled file',
          type: 'file',
          status: 'unsorted',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
          source_path: selectedFile?.name ?? undefined,
        };
      }

      const raw = await investigationsApi.addEvidence(investigationId, payload);
      const evidenceId =
        typeof raw === 'object' && raw !== null && 'id' in raw
          ? String((raw as { id: unknown }).id)
          : '';

      if (evidenceId) {
        addToast({ text: 'Evidence saved — added to unsorted queue', type: 'success' });
        onSaved(evidenceId);
        onClose();
      } else {
        setSaveError('Save succeeded but evidence ID was missing.');
      }
    } catch (err) {
      console.error('Evidence capture failed:', err);
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    isContentReady,
    saving,
    mode,
    noteText,
    urlValue,
    urlNote,
    selectedFile,
    evidenceType,
    taggedPersonId,
    investigationId,
    addToast,
    onSaved,
    onClose,
  ]);

  return (
    <SheetDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Capture Evidence"
      description="Capture notes, files, and source URLs with the same mobile sheet behavior used across the archive."
      bodyClassName={styles.body}
      footer={
        <Button
          className={styles.saveBtn}
          disabled={!isContentReady || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save Evidence'}
        </Button>
      }
    >
      <div className={styles.modeTabs}>
        {(['note', 'file', 'url'] as CaptureMode[]).map((m) => (
          <Button
            key={m}
            className={styles.modeTab}
            variant={mode === m ? 'primary' : 'glass'}
            size="sm"
            onClick={() => {
              setMode(m);
              setSaveError(null);
            }}
          >
            {m === 'note' && <FileText size={16} aria-hidden="true" />}
            {m === 'file' && <Paperclip size={16} aria-hidden="true" />}
            {m === 'url' && <Link size={16} aria-hidden="true" />}
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </Button>
        ))}
      </div>

      {mode === 'note' && (
        <div className={styles.fieldGroup}>
          <Textarea
            autoFocus
            className={styles.textarea}
            label="Observation"
            placeholder="Type your observation…"
            value={noteText}
            maxLength={MAX_NOTE_CHARS}
            onChange={(e) => {
              setNoteText(e.target.value);
              setSaveError(null);
            }}
            rows={7}
          />
          <span className={styles.charCount}>
            {noteText.length}/{MAX_NOTE_CHARS}
          </span>
        </div>
      )}

      {mode === 'file' && (
        <>
          <Input
            ref={fileInputRef}
            type="file"
            className={styles.fileInput}
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] ?? null);
              setSaveError(null);
            }}
          />
          <Button
            className={`${styles.fileZone} ${selectedFile ? styles.fileZoneSelected : ''}`}
            variant="glass"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={20} aria-hidden="true" />
            {selectedFile ? selectedFile.name : 'Tap to select a file or photo'}
          </Button>
        </>
      )}

      {mode === 'url' && (
        <>
          <TextInput
            autoFocus
            type="url"
            label="URL"
            className={styles.urlInput}
            placeholder="https://…"
            value={urlValue}
            onChange={(e) => {
              setUrlValue(e.target.value);
              setSaveError(null);
            }}
          />
          <Textarea
            className={`${styles.textarea} ${styles.urlNoteTextarea}`}
            label="Note (Optional)"
            placeholder="Add context…"
            value={urlNote}
            onChange={(e) => setUrlNote(e.target.value)}
            rows={4}
          />
        </>
      )}

      <Select
        className={styles.select}
        label="Type"
        value={evidenceType}
        onChange={(e) => setEvidenceType(e.target.value)}
        options={EVIDENCE_TYPES.map((type) => ({ value: type, label: type }))}
      />

      <div className={styles.fieldGroup}>
        {taggedPersonName ? (
          <>
            <div className={styles.label}>Tagged Person</div>
            <Button
              className={styles.selectedPersonButton}
              variant="glass-highlight"
              onClick={() => {
                setTaggedPersonId(null);
                setTaggedPersonName('');
              }}
            >
              {taggedPersonName} ×
            </Button>
          </>
        ) : (
          <PersonAutocomplete
            onSelect={(id, name) => {
              setTaggedPersonId(id);
              setTaggedPersonName(name);
            }}
          />
        )}
      </div>

      {saveError && <p className={styles.errorMsg}>{saveError}</p>}
    </SheetDialog>
  );
}
