import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Paperclip, Link } from 'lucide-react';
import { investigationsApi } from '../../../domains/investigations';
import { useSubjectsQuery } from '../../../hooks/useSubjectsQuery';
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
const SWIPE_DISMISS_THRESHOLD = 80;

interface EvidenceCaptureSheetProps {
  investigationId: string;
  onClose: () => void;
  onSaved: (evidenceId: string) => void;
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
  const [personSearch, setPersonSearch] = useState('');
  const [taggedPersonId, setTaggedPersonId] = useState<string | null>(null);
  const [taggedPersonName, setTaggedPersonName] = useState('');
  const [saving, setSaving] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: subjectsData } = useSubjectsQuery({
    page: 1,
    pageSize: 10,
    searchTerm: personSearch,
    entityType: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    selectedRiskLevel: null,
  });

  const subjects = subjectsData?.subjects ?? [];

  const isContentReady =
    (mode === 'note' && noteText.trim().length > 0) ||
    (mode === 'url' && urlValue.trim().length > 0) ||
    (mode === 'file' && selectedFile !== null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current;
    if (touchDeltaY.current > 0 && sheetRef.current) {
      sheetRef.current.style.setProperty('--sheet-translate', `${touchDeltaY.current}px`);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY.current > SWIPE_DISMISS_THRESHOLD) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.setProperty('--sheet-translate', '0px');
    }
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!isContentReady || saving) return;
    setSaving(true);
    try {
      let payload: Record<string, unknown>;
      if (mode === 'note') {
        payload = {
          title: noteText.slice(0, 80),
          description: noteText,
          type: 'note',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
        };
      } else if (mode === 'url') {
        payload = {
          title: urlValue.slice(0, 80),
          url: urlValue,
          notes: urlNote || undefined,
          type: 'url',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
        };
      } else {
        // file mode — record metadata; actual file upload is a future enhancement
        payload = {
          title: selectedFile?.name ?? 'Untitled file',
          type: 'file',
          evidence_type: evidenceType === 'Auto' ? undefined : evidenceType,
          entity_id: taggedPersonId ?? undefined,
          source_path: selectedFile?.name ?? undefined,
        };
      }

      const result = (await investigationsApi.addEvidence(investigationId, payload)) as {
        id: string;
      };
      onSaved(String(result.id));
      onClose();
    } catch (err) {
      console.error('Evidence capture failed:', err);
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
    onSaved,
    onClose,
  ]);

  // Prevent body scroll while sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const showPersonSuggestions = personSearch.length > 0 && !taggedPersonName && subjects.length > 0;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.dragHandle} />

        <div className={styles.header}>
          <span className={styles.title}>Capture Evidence</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modeTabs}>
          {(['note', 'file', 'url'] as CaptureMode[]).map((m) => (
            <button
              key={m}
              className={`${styles.modeTab} ${mode === m ? styles.modeTabActive : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'note' && <FileText size={16} />}
              {m === 'file' && <Paperclip size={16} />}
              {m === 'url' && <Link size={16} />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {mode === 'note' && (
            <div className={styles.fieldGroup}>
              <textarea
                className={styles.textarea}
                placeholder="Type your observation…"
                value={noteText}
                maxLength={MAX_NOTE_CHARS}
                onChange={(e) => setNoteText(e.target.value)}
                autoFocus
              />
              <span className={styles.charCount}>
                {noteText.length}/{MAX_NOTE_CHARS}
              </span>
            </div>
          )}

          {mode === 'file' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <button
                className={`${styles.fileZone} ${selectedFile ? styles.fileZoneSelected : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={24} />
                {selectedFile ? selectedFile.name : 'Tap to select a file or photo'}
              </button>
            </>
          )}

          {mode === 'url' && (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>URL</label>
                <input
                  type="url"
                  className={styles.urlInput}
                  placeholder="https://…"
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Note (optional)</label>
                <textarea
                  className={`${styles.textarea} ${styles.urlNoteTextarea}`}
                  placeholder="Add context…"
                  value={urlNote}
                  onChange={(e) => setUrlNote(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Optional fields */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Type</label>
            <select
              className={styles.select}
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Tag person (optional)</label>
            {taggedPersonName ? (
              <button
                className={styles.suggestionRow}
                onClick={() => {
                  setTaggedPersonId(null);
                  setTaggedPersonName('');
                  setPersonSearch('');
                }}
              >
                {taggedPersonName} ✕
              </button>
            ) : (
              <>
                <input
                  type="text"
                  className={styles.autocompleteInput}
                  placeholder="Search subjects…"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                />
                {showPersonSuggestions && (
                  <div className={styles.suggestions}>
                    {subjects.slice(0, 5).map((s) => (
                      <button
                        key={s.id}
                        className={styles.suggestionRow}
                        onClick={() => {
                          setTaggedPersonId(String(s.id));
                          setTaggedPersonName(s.name);
                          setPersonSearch('');
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.saveBtn}
            disabled={!isContentReady || saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save Evidence'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
