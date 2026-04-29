import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import FormField from '../common/FormField';
import { useToasts } from '../common/useToasts';
import { Person } from '@client/types';
import { CloseButton } from '../common/CloseButton';
import styles from './CreateRelationshipModal.module.css';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Range,
  SearchField,
  Select,
  Textarea,
} from '@client/design-system/lib';

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
  const relationshipTypeOptions = [
    { value: 'associated', label: 'Associated' },
    { value: 'financial', label: 'Financial' },
    { value: 'legal', label: 'Legal' },
    { value: 'social', label: 'Social' },
    { value: 'co-conspirator', label: 'Co-conspirator' },
    { value: 'victim', label: 'Victim' },
    { value: 'employee', label: 'Employee' },
  ];

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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialogContent}>
        <div className={styles.headerRow}>
          <DialogHeader className={styles.header}>
            <div className={styles.headerTitleGroup}>
              <div className={styles.headerIconWrap}>
                <Icon name="Network" className={styles.headerIcon} />
              </div>
              <DialogTitle className={styles.headerTitle}>Create Connection</DialogTitle>
            </div>
          </DialogHeader>
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
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedSource(null);
                      setSourceSearch('');
                    }}
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className={styles.iconButton}
                  >
                    <Icon name="X" className={styles.smallIcon} />
                  </Button>
                </div>
              ) : (
                <div>
                  <SearchField
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => handleSearch(e.target.value, 'source')}
                    rootClassName={styles.searchFieldRoot}
                    className={styles.searchInput}
                    density="compact"
                    placeholder="Search entity..."
                    aria-label="Search source entity"
                  />
                  {sourceResults.length > 0 && (
                    <div className={styles.resultsList}>
                      {sourceResults.map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedSource(p);
                            setSourceResults([]);
                          }}
                          variant="ghost"
                          size="sm"
                          className={styles.resultButton}
                        >
                          <div className={styles.resultTitle}>{p.name}</div>
                          {p.primaryRole && (
                            <div className={styles.resultMeta}>{p.primaryRole}</div>
                          )}
                        </Button>
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
                  <Button
                    type="button"
                    onClick={() => {
                      setSelectedTarget(null);
                      setTargetSearch('');
                    }}
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className={styles.iconButton}
                  >
                    <Icon name="X" className={styles.smallIcon} />
                  </Button>
                </div>
              ) : (
                <div>
                  <SearchField
                    type="text"
                    value={targetSearch}
                    onChange={(e) => handleSearch(e.target.value, 'target')}
                    rootClassName={styles.searchFieldRoot}
                    className={styles.searchInput}
                    density="compact"
                    placeholder="Search entity..."
                    aria-label="Search target entity"
                  />
                  {targetResults.length > 0 && (
                    <div className={styles.resultsList}>
                      {targetResults.map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedTarget(p);
                            setTargetResults([]);
                          }}
                          variant="ghost"
                          size="sm"
                          className={styles.resultButton}
                        >
                          <div className={styles.resultTitle}>{p.name}</div>
                          {p.primaryRole && (
                            <div className={styles.resultMeta}>{p.primaryRole}</div>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <FormField label="Relationship Type" id="relationship_type" required>
            <Select
              id="relationship_type"
              value={formData.relationship_type}
              onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
              className={styles.field}
              size="sm"
              options={relationshipTypeOptions}
            />
          </FormField>

          <div className={styles.sliderGrid}>
            <FormField label={`Strength (${formData.strength}/10)`} id="strength">
              <Range
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
              <Range
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
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={styles.field}
              rows={3}
              placeholder="Describe the nature of this connection..."
            />
          </FormField>

          <div className={styles.footer}>
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              size="sm"
              className={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedSource || !selectedTarget}
              variant="primary"
              size="sm"
              className={styles.submitButton}
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Icon name="Save" className={styles.smallIcon} />
                  Create Connection
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
