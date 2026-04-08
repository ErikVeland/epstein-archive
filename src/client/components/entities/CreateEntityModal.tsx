import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Save } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import FormField from '../common/FormField';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';
import styles from './CreateEntityModal.module.css';

interface CreateEntityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateEntityModal: React.FC<CreateEntityModalProps> = ({ onClose, onSuccess }) => {
  const { modalRef } = useModalFocusTrap(true);
  useScrollLock(true);
  const { addToast } = useToasts();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    primary_role: '',
    secondary_roles: '',
    description: '',
    likelihood_level: 'LOW',
    red_flag_rating: 0,
    red_flag_description: '',
  });

  const fieldClassName = styles.field;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'red_flag_rating' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiClient.createEntity(formData);
      addToast({ text: 'Entity created successfully', type: 'success' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating entity:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to create entity',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div id="CreateEntityModal" className={styles.overlay} role="dialog" aria-modal="true">
      <div ref={modalRef} className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconWrap}>
              <User className={styles.headerIcon} />
            </div>
            <h2 className={styles.headerTitle}>Create New Subject</h2>
          </div>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close create entity modal"
            className={styles.closeButton}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.twoColumnGrid}>
            <FormField label="Full Name" id="full_name" required>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className={fieldClassName}
                placeholder="e.g. John Doe"
              />
            </FormField>

            <FormField label="Primary Role" id="primary_role" required>
              <input
                type="text"
                id="primary_role"
                name="primary_role"
                value={formData.primary_role}
                onChange={handleChange}
                required
                className={fieldClassName}
                placeholder="e.g. Associate"
              />
            </FormField>
          </div>

          <FormField
            label="Secondary Roles"
            id="secondary_roles"
            helpText="Comma separated list of other roles"
          >
            <input
              type="text"
              id="secondary_roles"
              name="secondary_roles"
              value={formData.secondary_roles}
              onChange={handleChange}
              className={fieldClassName}
              placeholder="e.g. Pilot, Driver"
            />
          </FormField>

          <FormField label="Description" id="description">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className={fieldClassName}
              placeholder="Brief description of the subject..."
            />
          </FormField>

          <div className={styles.twoColumnGrid}>
            <FormField label="Risk Level" id="likelihood_level" required>
              <select
                id="likelihood_level"
                name="likelihood_level"
                value={formData.likelihood_level}
                onChange={handleChange}
                className={fieldClassName}
              >
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
              </select>
            </FormField>

            <FormField label="Red Flag Score (0-5)" id="red_flag_rating">
              <input
                type="number"
                id="red_flag_rating"
                name="red_flag_rating"
                min="0"
                max="5"
                value={formData.red_flag_rating}
                onChange={handleChange}
                className={fieldClassName}
              />
            </FormField>
          </div>

          <FormField label="Red Flag Description" id="red_flag_description">
            <input
              type="text"
              id="red_flag_description"
              name="red_flag_description"
              value={formData.red_flag_description}
              onChange={handleChange}
              className={fieldClassName}
              placeholder="Why is this person flagged?"
            />
          </FormField>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? (
                <>
                  <div className={styles.spinner} />
                  Creating...
                </>
              ) : (
                <>
                  <Save className={styles.buttonIcon} />
                  Create Subject
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
