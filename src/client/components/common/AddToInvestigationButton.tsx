import React, { useState, useEffect } from 'react';
import { Investigation } from '../../types/investigation';
import Icon from './Icon';
import { useInvestigations } from '../../contexts/InvestigationsContext';
import { CloseButton } from './CloseButton';

interface AddToInvestigationItem {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'entity' | 'evidence' | 'flight' | 'property' | 'email' | 'media' | 'timeline';
  sourceId: string;
  metadata?: any;
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
}

export const AddToInvestigationButton: React.FC<AddToInvestigationButtonProps> = ({
  item,
  investigations: propInvestigations,
  onAddToInvestigation,
  variant = 'button',
  className = '',
  defaultInvestigationId,
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
          hypothesis: '', // Optional initial hypothesis
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
      // Show modal to select investigation if none selected
      if (!hasInvestigations) setIsCreatingNew(true);
      setShowModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // Use context method if available, otherwise use prop method
      if (addToInvestigation) {
        await addToInvestigation(selectedInvestigationId, item, 'medium');
      } else if (onAddToInvestigation) {
        onAddToInvestigation(selectedInvestigationId, item, 'medium');
      }

      // Show success feedback
      const button = document.createElement('div');
      button.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-[var(--text-primary)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] z-50 animate-fade-in';
      button.textContent = 'Added to investigation!';
      document.body.appendChild(button);

      // Remove after animation
      setTimeout(() => {
        button.classList.remove('animate-fade-in');
        button.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(button);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('Error adding to investigation:', error);
      // Show error feedback
      const button = document.createElement('div');
      button.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-[var(--text-primary)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] z-50 animate-fade-in';
      button.textContent = 'Failed to add to investigation';
      document.body.appendChild(button);

      // Remove after animation
      setTimeout(() => {
        button.classList.remove('animate-fade-in');
        button.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(button);
        }, 300);
      }, 2000);
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

  const getRelevanceColor = (rel: 'high' | 'medium' | 'low') => {
    switch (rel) {
      case 'high':
        return 'bg-red-600 hover:bg-red-700';
      case 'medium':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'low':
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  const ItemIcon = getItemIcon();
  const hasInvestigations = investigations.length > 0;

  return (
    <>
      {variant === 'button' && (
        <button
          onClick={() => {
            if (!hasInvestigations) setIsCreatingNew(true);
            setShowModal(true);
          }}
          className={`flex items-center gap-2 px-3 py-2 bg-[var(--accent)] hover:bg-blue-700 text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors text-sm ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
          {hasInvestigations ? 'Add to Investigation' : 'Create Case + Add'}
        </button>
      )}

      {variant === 'icon' && (
        <button
          onClick={() => {
            if (!hasInvestigations) setIsCreatingNew(true);
            setShowModal(true);
          }}
          className={`p-2 text-[var(--accent)] hover:text-[var(--accent)] hover:bg-blue-900/30 rounded-[var(--radius-lg)] transition-colors ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
        </button>
      )}

      {variant === 'dropdown' && (
        <div className="relative group">
          <button
            onClick={() => {
              if (!hasInvestigations) setIsCreatingNew(true);
              setShowModal(true);
            }}
            className={`flex items-center gap-2 px-3 py-2 text-[var(--accent)] hover:text-[var(--accent)] hover:bg-blue-900/30 rounded-[var(--radius-lg)] transition-colors text-sm ${className}`}
          >
            <Icon name="Plus" size="sm" />
            <span>Add to Investigation</span>
          </button>
        </div>
      )}

      {variant === 'quick' && (
        <button
          onClick={handleQuickAdd}
          disabled={isLoading}
          className={`flex items-center justify-center p-1.5 bg-[var(--accent)]/80 hover:bg-blue-700 text-[var(--text-primary)] rounded transition-colors disabled:opacity-50 ${className}`}
          title="Add to Investigation"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="Plus" size="xs" />
          )}
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 app-backdrop flex items-center justify-center z-50">
          <div className="glass-panel overflow-hidden w-full max-w-md">
            <div className="border-b border-[var(--glass-border)] p-6 bg-[var(--glass-bg)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name={ItemIcon} size="sm" color="info" />
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">
                    Add to Investigation
                  </h3>
                </div>
                <CloseButton
                  onClick={() => setShowModal(false)}
                  size="sm"
                  label="Close add to investigation"
                />
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Item Preview */}
              <div className="surface-glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name={ItemIcon} size="xs" color="gray" />
                  <h4 className="font-semibold text-[var(--text-primary)]">{item.title}</h4>
                </div>
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-[var(--glass-bg-strong)] rounded text-[var(--text-secondary)]">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Investigation Selection or Creation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)]">
                    {isCreatingNew ? 'New Investigation Details' : 'Select Investigation'}
                  </label>
                  <button
                    onClick={() => setIsCreatingNew(!isCreatingNew || !hasInvestigations)}
                    disabled={!hasInvestigations}
                    className="text-xs text-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {!hasInvestigations
                      ? 'No cases yet'
                      : isCreatingNew
                        ? 'Select existing...'
                        : '+ Create new'}
                  </button>
                </div>

                {isCreatingNew || !hasInvestigations ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      placeholder="Investigation Title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--text-muted)]"
                      autoFocus
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-4 py-2 h-20 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder-[var(--text-muted)] resize-none text-sm"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedInvestigationId}
                    onChange={(e) => setSelectedInvestigationId(e.target.value)}
                    className="w-full px-4 h-10 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
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
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Evidence Relevance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map((rel) => (
                    <button
                      key={rel}
                      onClick={() => setRelevance(rel)}
                      className={`px-3 h-10 flex items-center justify-center rounded-[var(--radius-lg)] text-sm font-medium transition-colors ${
                        relevance === rel
                          ? getRelevanceColor(rel)
                          : 'bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]'
                      }`}
                    >
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--glass-border)] p-6 flex justify-end gap-3 bg-[var(--glass-bg)]">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 h-10 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToInvestigation}
                disabled={
                  (!selectedInvestigationId && !isCreatingNew) ||
                  (isCreatingNew && !newTitle.trim()) ||
                  isLoading
                }
                className="px-4 h-10 flex items-center justify-center bg-[var(--accent)] hover:bg-blue-700 disabled:bg-[var(--glass-bg-strong)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors flex items-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {isLoading ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add to Investigation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
