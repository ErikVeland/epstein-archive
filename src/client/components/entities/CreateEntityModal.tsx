import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Save } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import FormField from '../common/FormField';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useToasts } from '../common/useToasts';
import { useScrollLock } from '../../hooks/useScrollLock';
import { CloseButton } from '../common/CloseButton';

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
    <div
      id="CreateEntityModal"
      className="fixed inset-0 bg-[var(--app-bg)]/80 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-xl)] w-full max-w-2xl border border-[var(--glass-border)] shadow-[var(--glass-shadow)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent)]/10 rounded-[var(--radius-lg)]">
              <User className="w-6 h-6 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Create New Subject</h2>
          </div>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close create entity modal"
            className="bg-transparent hover:bg-[var(--glass-bg-highlight)] border-[var(--glass-border)]"
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" id="full_name" required>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
              className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
              className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Brief description of the subject..."
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Risk Level" id="likelihood_level" required>
              <select
                id="likelihood_level"
                name="likelihood_level"
                value={formData.likelihood_level}
                onChange={handleChange}
                className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
                className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
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
              className="w-full bg-[var(--app-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Why is this person flagged?"
            />
          </FormField>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--glass-border)] mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-[var(--text-primary)] rounded-[var(--radius-lg)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--glass-border)] border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
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
