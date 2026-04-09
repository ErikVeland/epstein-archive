import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { X, Network, Save, Search } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import FormField from '../common/FormField';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useToasts } from '../common/useToasts';
import { Person } from '../../types';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import styles from './CreateRelationshipModal.module.css';

interface CreateRelationshipModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSourceId?: string;
  initialTargetId?: string;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  onClose,
  onSuccess,
  initialSourceId,
  initialTargetId,
}) => {
  const { modalRef } = useModalFocusTrap(true);
  useScrollLock(true);
  const { addToast } = useToasts();
  const [loading, setLoading] = useState(false);

  // Entity Search State
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceResults, setSourceResults] = useState<Person[]>([]);
  const [targetResults, setTargetResults] = useState<Person[]>([]);
  const [selectedSource, setSelectedSource] = useState<Person | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Person | null>(null);

  const [formData, setFormData] = useState({
    relationship_type: 'associated',
    strength: 5,
    confidence: 0.8,
    description: '',
  });

  // Load initial entities if IDs provided
  const { data: initialSourceEntity } = useQuery<Person | null>({
    queryKey: ['entity', initialSourceId],
    queryFn: () => apiClient.getEntity(initialSourceId!),
    enabled: Boolean(initialSourceId),
    staleTime: 30_000,
  });

  const { data: initialTargetEntity } = useQuery<Person | null>({
    queryKey: ['entity', initialTargetId],
    queryFn: () => apiClient.getEntity(initialTargetId!),
    enabled: Boolean(initialTargetId),
    staleTime: 30_000,
  });

  // Sync fetched initial entities into selection state (only once, when first resolved)
  React.useEffect(() => {
    if (initialSourceEntity && !selectedSource) {
      setSelectedSource(initialSourceEntity);
    }
  }, [initialSourceEntity, selectedSource]);

  React.useEffect(() => {
    if (initialTargetEntity && !selectedTarget) {
      setSelectedTarget(initialTargetEntity);
    }
  }, [initialTargetEntity, selectedTarget]);

  // Search Handlers
  const handleSearch = async (term: string, type: 'source' | 'target') => {
    if (type === 'source') setSourceSearch(term);
    else setTargetSearch(term);

    if (term.length < 2) {
      if (type === 'source') setSourceResults([]);
      else setTargetResults([]);
      return;
    }

    try {
      const results = await apiClient.searchEntities(term);
      if (type === 'source') setSourceResults(results);
      else setTargetResults(results);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !selectedTarget) {
      addToast({ text: 'Please select both entities', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await apiClient.createRelationship({
        source_id: selectedSource.id,
        target_id: selectedTarget.id,
        type: formData.relationship_type,
        strength: formData.strength,
        confidence: formData.confidence,
        metadata: {
          description: formData.description,
        },
      });
      addToast({ text: 'Relationship created successfully', type: 'success' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating relationship:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to create relationship',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div id="CreateRelationshipModal" className={styles.overlay} role="dialog" aria-modal="true">
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrap}>
              <Network className={styles.headerIcon} />
            </div>
            <h2 className={styles.headerTitle}>Create Connection</h2>
          </div>
          <CloseButton
            onClick={onClose}
            size="sm"
            label="Close create relationship modal"
            className={styles.closeButton}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.twoColumnGrid}>
            {/* Source Entity Selection */}
            <div className={styles.selectorField}>
              <label className={styles.label}>Source Entity *</label>
              {selectedSource ? (
                <div className={styles.selectedEntity}>
                  <span className={styles.selectedEntityName}>{selectedSource.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSource(null);
                      setSourceSearch('');
                    }}
                    className={styles.iconButton}
                  >
                    <X className={styles.smallIcon} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className={styles.searchWrap}>
                    <Search className={styles.searchIcon} />
                    <input
                      type="text"
                      value={sourceSearch}
                      onChange={(e) => handleSearch(e.target.value, 'source')}
                      className={`${styles.field} ${styles.searchInput}`}
                      placeholder="Search entity..."
                    />
                  </div>
                  {sourceResults.length > 0 && (
                    <div className={styles.resultsList}>
                      {sourceResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedSource(p);
                            setSourceResults([]);
                          }}
                          className={styles.resultButton}
                        >
                          <div className={styles.resultTitle}>{p.name}</div>
                          {p.primaryRole && (
                            <div className={styles.resultMeta}>{p.primaryRole}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target Entity Selection */}
            <div className={styles.selectorField}>
              <label className={styles.label}>Target Entity *</label>
              {selectedTarget ? (
                <div className={styles.selectedEntity}>
                  <span className={styles.selectedEntityName}>{selectedTarget.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTarget(null);
                      setTargetSearch('');
                    }}
                    className={styles.iconButton}
                  >
                    <X className={styles.smallIcon} />
                  </button>
                </div>
              ) : (
                <div>
                  <div className={styles.searchWrap}>
                    <Search className={styles.searchIcon} />
                    <input
                      type="text"
                      value={targetSearch}
                      onChange={(e) => handleSearch(e.target.value, 'target')}
                      className={`${styles.field} ${styles.searchInput}`}
                      placeholder="Search entity..."
                    />
                  </div>
                  {targetResults.length > 0 && (
                    <div className={styles.resultsList}>
                      {targetResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedTarget(p);
                            setTargetResults([]);
                          }}
                          className={styles.resultButton}
                        >
                          <div className={styles.resultTitle}>{p.name}</div>
                          {p.primaryRole && (
                            <div className={styles.resultMeta}>{p.primaryRole}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <FormField label="Relationship Type" id="relationship_type" required>
            <select
              id="relationship_type"
              value={formData.relationship_type}
              onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
              className={styles.field}
            >
              <option value="associated">Associated</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="social">Social</option>
              <option value="co-conspirator">Co-conspirator</option>
              <option value="victim">Victim</option>
              <option value="employee">Employee</option>
            </select>
          </FormField>

          <div className={styles.sliderGrid}>
            <FormField label={`Strength (${formData.strength}/10)`} id="strength">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) })}
                className={styles.slider}
              />
            </FormField>

            <FormField
              label={`Confidence (${Math.round(formData.confidence * 100)}%)`}
              id="confidence"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.confidence}
                onChange={(e) =>
                  setFormData({ ...formData, confidence: parseFloat(e.target.value) })
                }
                className={styles.slider}
              />
            </FormField>
          </div>

          <FormField label="Description / Context" id="description">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.field}
              rows={3}
              placeholder="Describe the nature of this connection..."
            />
          </FormField>

          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSource || !selectedTarget}
              className={styles.submitButton}
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Save className={styles.smallIcon} />
                  Create Connection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
