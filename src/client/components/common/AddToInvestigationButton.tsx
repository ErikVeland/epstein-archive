import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  Surface,
  TextInput,
  Textarea,
} from '@client/design-system/lib';
import { Investigation } from '@client/types/investigation';
import Icon from './Icon';
import { useInvestigations } from '@client/contexts/InvestigationsContext';
import { useAuth } from '@client/contexts/AuthContext';
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
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  defaultInvestigationId?: string;
  stopPropagation?: boolean;
}

export const AddToInvestigationButton: React.FC<AddToInvestigationButtonProps> = ({
  item,
  investigations: propInvestigations,
  onAddToInvestigation,
  variant = 'button',
  size = 'md',
  className = '',
  defaultInvestigationId,
  stopPropagation = false,
}) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const canEditInvestigations =
    isAuthenticated && (user?.role === 'admin' || user?.role === 'investigator');

  const openPicker = (event: React.SyntheticEvent) => {
    maybeStopPropagation(event);
    if (!canEditInvestigations) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (!hasInvestigations) setIsCreatingNew(true);
    setShowModal(true);
  };

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
    if (!canEditInvestigations) return;
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
    if (!canEditInvestigations) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
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
        <Button
          type="button"
          onClick={openPicker}
          variant="primary"
          size={size}
          className={`${s.triggerButton} ${className}`}
          title={canEditInvestigations ? 'Add to investigation' : 'Sign in to add to a case'}
        >
          <Icon name="Plus" size="sm" />
          {canEditInvestigations
            ? hasInvestigations
              ? 'Add to case'
              : 'Create case and add'
            : 'Sign in to add'}
        </Button>
      )}

      {variant === 'icon' && (
        <Button
          type="button"
          onClick={openPicker}
          iconOnly
          variant="ghost"
          size="sm"
          className={`${s.triggerIcon} ${className}`}
          title={canEditInvestigations ? 'Add to investigation' : 'Sign in to add to a case'}
          aria-label={canEditInvestigations ? 'Add to investigation' : 'Sign in to add to a case'}
        >
          <Icon name="Plus" size="sm" />
        </Button>
      )}

      {variant === 'dropdown' && (
        <div className={s.dropdownWrapper}>
          <Button
            type="button"
            onClick={openPicker}
            variant="ghost"
            size={size}
            className={`${s.triggerDropdown} ${className}`}
          >
            <Icon name="Plus" size="sm" />
            <span>{canEditInvestigations ? 'Add to case' : 'Sign in to add'}</span>
          </Button>
        </div>
      )}

      {variant === 'quick' && (
        <Button
          type="button"
          onClick={(event) => {
            maybeStopPropagation(event);
            void handleQuickAdd();
          }}
          disabled={isLoading}
          variant="glass"
          size="sm"
          className={`${s.triggerQuick} ${className}`}
          title={canEditInvestigations ? 'Add to investigation' : 'Sign in to add to a case'}
          aria-label={canEditInvestigations ? 'Add to investigation' : 'Sign in to add to a case'}
        >
          {isLoading ? <div className={s.quickSpinner} /> : <Icon name="Plus" />}
        </Button>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          role={toast.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`${s.toast} ${toast.kind === 'success' ? s.toastSuccess : s.toastError}`}
        >
          {toast.message}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className={s.panel}>
          <DialogHeader>
            <DialogTitle>Add to a case</DialogTitle>
            <DialogDescription>
              Choose where to save this {item.type} and how relevant it is.
            </DialogDescription>
          </DialogHeader>

          <div className={s.modalBody}>
            {/* Item Preview */}
            <Surface variant="panel" className={s.itemPreview}>
              <div className={s.itemPreviewHeader}>
                <Icon name={ItemIcon} color="gray" />
                <h4 className={s.itemTitle}>{item.title}</h4>
              </div>
              <p className={s.itemDescription}>{item.description}</p>
              <div className={s.itemTypeBadge}>
                <span className={s.itemTypeLabel}>{item.type}</span>
              </div>
            </Surface>

            {/* Investigation Selection or Creation */}
            <div>
              <div className={s.sectionLabel}>
                <span className={s.labelText}>
                  {isCreatingNew ? 'New case details' : 'Select a case'}
                </span>
                <Button
                  type="button"
                  onClick={() => setIsCreatingNew(!isCreatingNew || !hasInvestigations)}
                  disabled={!hasInvestigations}
                  variant="ghost"
                  size="sm"
                  className={s.toggleModeBtn}
                >
                  {!hasInvestigations
                    ? 'No cases yet'
                    : isCreatingNew
                      ? 'Select existing...'
                      : '+ Create new'}
                </Button>
              </div>

              {isCreatingNew || !hasInvestigations ? (
                <div className={s.createFields}>
                  <TextInput
                    id="new-case-title"
                    label="Case title"
                    type="text"
                    placeholder="Enter a clear title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    density="compact"
                    autoFocus
                  />
                  <Textarea
                    id="new-case-description"
                    label="Context (optional)"
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    density="compact"
                  />
                </div>
              ) : (
                <Select
                  id="investigation-select"
                  aria-label="Select a case"
                  value={selectedInvestigationId}
                  onChange={(e) => setSelectedInvestigationId(e.target.value)}
                  size="sm"
                  options={[
                    { value: '', label: 'Choose an investigation...' },
                    ...investigations.map((inv) => ({ value: inv.id, label: inv.title })),
                  ]}
                />
              )}
            </div>

            {/* Relevance Selection */}
            <fieldset className={s.relevanceFieldset}>
              <legend className={s.relevanceLabel}>Evidence relevance</legend>
              <div className={s.relevanceGrid}>
                {(['high', 'medium', 'low'] as const).map((rel) => (
                  <Button
                    key={rel}
                    type="button"
                    onClick={() => setRelevance(rel)}
                    variant="ghost"
                    size="sm"
                    className={`${s.relevanceBtn} ${
                      relevance === rel ? getRelevanceClass(rel) : s.relevanceBtnOff
                    }`}
                  >
                    {rel.charAt(0).toUpperCase() + rel.slice(1)}
                  </Button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className={s.modalFooter}>
            <Button
              type="button"
              onClick={() => setShowModal(false)}
              variant="ghost"
              size="sm"
              className={s.footerCancelBtn}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddToInvestigation}
              disabled={
                (!selectedInvestigationId && !isCreatingNew) ||
                (isCreatingNew && !newTitle.trim()) ||
                isLoading
              }
              variant="primary"
              size="sm"
              className={s.footerSubmitBtn}
            >
              {isLoading && <div className={s.submitSpinner} />}
              {isLoading ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add to Investigation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
