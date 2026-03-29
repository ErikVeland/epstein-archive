import React, { useState, useEffect } from 'react';
import { Investigation } from '../../types/investigation';
import Icon from './Icon';
import { useInvestigations } from '../../contexts/InvestigationsContext';
import { CloseButton } from './CloseButton';
import s from './AddToInvestigationButton.module.css';

interface AddToInvestigationItem {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'entity' | 'evidence' | 'flight' | 'property' | 'email' | 'media' | 'timeline';
  sourceId: string;
  metadata?: Record<string, unknown>;
}

interface AddToInvestigationButtonProps {
  item: AddToInvestigationItem;
  investigations?: Investigation[];
  onAddToInvestigation?: (
    investigationId: string,
    item: AddToInvestigationItem,
    relevance: 'high' | 'medium' | 'low',
  ) => void;
  variant?: 'button' | 'icon' | 'dropdown' | 'quick';
  className?: string;
  defaultInvestigationId?: string;
  stopPropagation?: boolean;
}

export const AddToInvestigationButton: React.FC<AddToInvestigationButtonProps> = ({
  item,
  investigations: propInvestigations,
  onAddToInvestigation,
  variant = 'button',
  className = '',
  defaultInvestigationId,
  stopPropagation = false,
}) => {
  const {
    investigations: contextInvestigations,
    addToInvestigation,
    createInvestigation,
    selectedInvestigation,
  } = useInvestigations();
  const [showModal, setShowModal] = useState(false);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('');
  const [relevance, setRelevance] = useState<'high' | 'medium' | 'low'>('medium');

  // Create New Mode State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);

  // Use investigations from context if not provided via props
  const investigations = propInvestigations || contextInvestigations;

  // Set default investigation
  useEffect(() => {
    if (defaultInvestigationId) {
      setSelectedInvestigationId(defaultInvestigationId);
    } else if (selectedInvestigation) {
      setSelectedInvestigationId(selectedInvestigation.id);
    } else if (investigations.length > 0) {
      setSelectedInvestigationId(investigations[0].id);
    }
  }, [defaultInvestigationId, selectedInvestigation, investigations]);

  const showToast = (message: string, kind: 'success' | 'error') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 2300);
  };

  const handleAddToInvestigation = async () => {
    if (!selectedInvestigationId && !isCreatingNew) return;
    if (isCreatingNew && !newTitle.trim()) return;

    setIsLoading(true);

    try {
      let targetInvestigationId = selectedInvestigationId;

      // Create new investigation if needed
      if (isCreatingNew && createInvestigation) {
        const newInv = await createInvestigation({
          title: newTitle,
          description: newDescription,
          hypothesis: '',
          status: 'active',
          leadInvestigator: '1',
          priority: 'medium',
        });
        if (newInv) {
          targetInvestigationId = newInv.id;
        } else {
          throw new Error('Failed to create new investigation');
        }
      }

      // Use context method if available, otherwise use prop method
      if (addToInvestigation) {
        await addToInvestigation(targetInvestigationId, item, relevance);
      } else if (onAddToInvestigation) {
        onAddToInvestigation(targetInvestigationId, item, relevance);
      }

      setShowModal(false);
      // Reset state
      setIsCreatingNew(false);
      setNewTitle('');
      setNewDescription('');
    } catch (error) {
      console.error('Error adding to investigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedInvestigationId) {
      if (!hasInvestigations) setIsCreatingNew(true);
      setShowModal(true);
      return;
    }

    setIsLoading(true);

    try {
      if (addToInvestigation) {
        await addToInvestigation(selectedInvestigationId, item, 'medium');
      } else if (onAddToInvestigation) {
        onAddToInvestigation(selectedInvestigationId, item, 'medium');
      }
      showToast('Added to investigation!', 'success');
    } catch (error) {
      console.error('Error adding to investigation:', error);
      showToast('Failed to add to investigation', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getItemIcon = () => {
    switch (item.type) {
      case 'document':
        return 'FileText';
      case 'entity':
        return 'User';
      case 'evidence':
        return 'Target';
      default:
        return 'Plus';
    }
  };

  const getRelevanceClass = (rel: 'high' | 'medium' | 'low') => {
    switch (rel) {
      case 'high':
        return s.relevanceHigh;
      case 'medium':
        return s.relevanceMedium;
      case 'low':
        return s.relevanceLow;
    }
  };

  const ItemIcon = getItemIcon();
  const hasInvestigations = investigations.length > 0;
  const maybeStopPropagation = (event: React.SyntheticEvent) => {
    if (stopPropagation) event.stopPropagation();
  };

  return (
    <>
      {variant === 'button' && (
        <button
          type="button"
          onClick={(event) => {
            maybeStopPropagation(event);
            if (!hasInvestigations) setIsCreatingNew(true);
            setShowModal(true);
          }}
          className={`${s.triggerButton} ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
          {hasInvestigations ? 'Add to Investigation' : 'Create Case + Add'}
        </button>
      )}

      {variant === 'icon' && (
        <button
          type="button"
          onClick={(event) => {
            maybeStopPropagation(event);
            if (!hasInvestigations) setIsCreatingNew(true);
            setShowModal(true);
          }}
          className={`${s.triggerIcon} ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
        </button>
      )}

      {variant === 'dropdown' && (
        <div className={s.dropdownWrapper}>
          <button
            type="button"
            onClick={(event) => {
              maybeStopPropagation(event);
              if (!hasInvestigations) setIsCreatingNew(true);
              setShowModal(true);
            }}
            className={`${s.triggerDropdown} ${className}`}
          >
            <Icon name="Plus" size="sm" />
            <span>Add to Investigation</span>
          </button>
        </div>
      )}

      {variant === 'quick' && (
        <button
          type="button"
          onClick={(event) => {
            maybeStopPropagation(event);
            void handleQuickAdd();
          }}
          disabled={isLoading}
          className={`${s.triggerQuick} ${className}`}
          title="Add to Investigation"
        >
          {isLoading ? <div className={s.quickSpinner} /> : <Icon name="Plus" size="xs" />}
        </button>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`${s.toast} ${toast.kind === 'success' ? s.toastSuccess : s.toastError}`}>
          {toast.message}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={`${s.overlay} app-backdrop`}>
          <div className={`${s.panel} glass-panel`}>
            <div className={s.modalHeader}>
              <div className={s.modalHeaderInner}>
                <div className={s.modalTitleRow}>
                  <Icon name={ItemIcon} size="sm" color="info" />
                  <h3 className={s.modalTitle}>Add to Investigation</h3>
                </div>
                <CloseButton
                  onClick={() => setShowModal(false)}
                  size="sm"
                  label="Close add to investigation"
                />
              </div>
            </div>

            <div className={s.modalBody}>
              {/* Item Preview */}
              <div className={`${s.itemPreview} surface-glass-card`}>
                <div className={s.itemPreviewHeader}>
                  <Icon name={ItemIcon} size="xs" color="gray" />
                  <h4 className={s.itemTitle}>{item.title}</h4>
                </div>
                <p className={s.itemDescription}>{item.description}</p>
                <div className={s.itemTypeBadge}>
                  <span className={s.itemTypeLabel}>{item.type}</span>
                </div>
              </div>

              {/* Investigation Selection or Creation */}
              <div>
                <div className={s.sectionLabel}>
                  <label className={s.labelText}>
                    {isCreatingNew ? 'New Investigation Details' : 'Select Investigation'}
                  </label>
                  <button
                    onClick={() => setIsCreatingNew(!isCreatingNew || !hasInvestigations)}
                    disabled={!hasInvestigations}
                    className={s.toggleModeBtn}
                  >
                    {!hasInvestigations
                      ? 'No cases yet'
                      : isCreatingNew
                        ? 'Select existing...'
                        : '+ Create new'}
                  </button>
                </div>

                {isCreatingNew || !hasInvestigations ? (
                  <div className={s.createFields}>
                    <input
                      type="text"
                      placeholder="Investigation Title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className={s.textInput}
                      autoFocus
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className={s.textarea}
                    />
                  </div>
                ) : (
                  <select
                    value={selectedInvestigationId}
                    onChange={(e) => setSelectedInvestigationId(e.target.value)}
                    className={s.invSelect}
                  >
                    <option value="">Choose an investigation...</option>
                    {investigations.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Relevance Selection */}
              <div>
                <label className={s.relevanceLabel}>Evidence Relevance</label>
                <div className={s.relevanceGrid}>
                  {(['high', 'medium', 'low'] as const).map((rel) => (
                    <button
                      key={rel}
                      onClick={() => setRelevance(rel)}
                      className={`${s.relevanceBtn} ${
                        relevance === rel ? getRelevanceClass(rel) : s.relevanceBtnOff
                      }`}
                    >
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={s.modalFooter}>
              <button onClick={() => setShowModal(false)} className={s.footerCancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleAddToInvestigation}
                disabled={
                  (!selectedInvestigationId && !isCreatingNew) ||
                  (isCreatingNew && !newTitle.trim()) ||
                  isLoading
                }
                className={s.footerSubmitBtn}
              >
                {isLoading && <div className={s.submitSpinner} />}
                {isLoading ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add to Investigation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
