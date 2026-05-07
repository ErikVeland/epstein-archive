import React, { useState } from 'react';
import { apiClient } from '@client/services/apiClient';
import { Button, NativeSelect, Textarea } from '@client/design-system/lib';
import Icon from './Icon';
import styles from './FlagButton.module.css';

interface FlagButtonProps {
  targetType: 'mention' | 'claim' | 'evidence' | 'entity' | 'document';
  targetId: number | string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
  className?: string;
}

export const FlagButton: React.FC<FlagButtonProps> = ({
  targetType,
  targetId,
  size = 'sm',
  variant = 'ghost',
  className = '',
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [flagType, setFlagType] = useState<'inaccurate' | 'needs_review'>('needs_review');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFlag = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/review/flag', {
        targetType,
        targetId: String(targetId),
        reason,
        flagType,
        note: note || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setShowDialog(false);
        setSuccess(false);
        setReason('');
        setNote('');
      }, 2000);
    } catch (error) {
      console.error('Flag submission failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        className={`${styles.trigger} ${className}`}
        title="Flag as inaccurate or needing review"
      >
        <Icon name="Flag" size={size} />
        <span className={styles.triggerLabel}>Flag</span>
      </Button>

      {showDialog && (
        <div className={styles.overlay} onClick={() => !submitting && setShowDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.dialogHeader}>
              <Icon name="Flag" size="md" className={styles.dialogIcon} />
              <h3 className={styles.dialogTitle}>Flag Item for Review</h3>
            </div>

            {success ? (
              <div className={styles.successState}>
                <Icon name="CheckCircle" size="lg" className={styles.successIcon} />
                <p>Flag submitted successfully</p>
              </div>
            ) : (
              <>
                <div className={styles.field}>
                  <label className={styles.label}>Flag Type</label>
                  <div className={styles.flagTypeButtons}>
                    {(
                      [
                        { value: 'needs_review', label: 'Needs Review' },
                        { value: 'inaccurate', label: 'Inaccurate' },
                      ] as const
                    ).map((type) => (
                      <Button
                        key={type.value}
                        type="button"
                        variant={flagType === type.value ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`${styles.flagTypeButton} ${flagType === type.value ? styles.flagTypeActive : ''}`}
                        onClick={() => setFlagType(type.value)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="flag-reason">
                    Reason *
                  </label>
                  <NativeSelect
                    id="flag-reason"
                    className={styles.select}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    {flagType === 'inaccurate'
                      ? [
                          'Incorrect entity identification',
                          'Wrong date or timeline',
                          'Misidentified relationship',
                          'Extraction error',
                          'Duplicate or near-duplicate',
                        ].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))
                      : [
                          'Low confidence extraction',
                          'Conflicting sources',
                          'Missing provenance',
                          'Needs human verification',
                          'Ambiguous alias or name',
                        ].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                  </NativeSelect>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="flag-note">
                    Additional Notes (optional)
                  </label>
                  <Textarea
                    id="flag-note"
                    className={styles.textarea}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add any additional context..."
                    rows={3}
                  />
                </div>

                <div className={styles.dialogActions}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.cancelButton}
                    onClick={() => setShowDialog(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={styles.submitButton}
                    onClick={handleFlag}
                    disabled={!reason.trim() || submitting}
                  >
                    {submitting ? (
                      <>
                        <Icon name="Loader2" className="animate-spin" size="sm" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Icon name="Flag" size="sm" /> Submit Flag
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
