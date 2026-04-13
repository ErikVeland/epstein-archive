import React, { useState } from 'react';
import { User, Save } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { CloseButton } from '../common/CloseButton';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Flex,
  Select,
  TextInput,
  Textarea,
} from '../../design-system/lib';
import styles from './CreateEntityModal.module.css';

interface CreateEntityModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const riskOptions = [
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
];

export const CreateEntityModal: React.FC<CreateEntityModalProps> = ({ onClose, onSuccess }) => {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'red_flag_rating' ? parseInt(value, 10) || 0 : value,
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={styles.dialogContent}>
        <div className={styles.headerRow}>
          <DialogHeader className={styles.headerMeta}>
            <Flex align="center" gap="sm" className={styles.titleWrap}>
              <div className={styles.headerIconWrap}>
                <User className={styles.headerIcon} />
              </div>
              <div>
                <DialogTitle>Create New Subject</DialogTitle>
                <DialogDescription>
                  Add a subject using the same shared form and modal language as the rest of the
                  archive.
                </DialogDescription>
              </div>
            </Flex>
          </DialogHeader>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close create entity modal"
            className={styles.closeButton}
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.twoColumnGrid}>
            <TextInput
              id="full_name"
              name="full_name"
              label="Full Name"
              placeholder="e.g. John Doe…"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
            <TextInput
              id="primary_role"
              name="primary_role"
              label="Primary Role"
              placeholder="e.g. Associate…"
              value={formData.primary_role}
              onChange={handleChange}
              required
            />
          </div>

          <TextInput
            id="secondary_roles"
            name="secondary_roles"
            label="Secondary Roles"
            hint="Comma-separated list"
            placeholder="e.g. Pilot, Driver…"
            value={formData.secondary_roles}
            onChange={handleChange}
          />

          <Textarea
            id="description"
            name="description"
            label="Description"
            placeholder="Brief description of the subject…"
            value={formData.description}
            onChange={handleChange}
            rows={4}
          />

          <div className={styles.twoColumnGrid}>
            <Select
              id="likelihood_level"
              name="likelihood_level"
              label="Risk Level"
              value={formData.likelihood_level}
              onChange={handleChange}
              options={riskOptions}
            />
            <TextInput
              id="red_flag_rating"
              name="red_flag_rating"
              type="number"
              min="0"
              max="5"
              inputMode="numeric"
              label="Red Flag Score (0-5)"
              value={String(formData.red_flag_rating)}
              onChange={handleChange}
            />
          </div>

          <TextInput
            id="red_flag_description"
            name="red_flag_description"
            label="Red Flag Description"
            placeholder="Why is this person flagged?…"
            value={formData.red_flag_description}
            onChange={handleChange}
          />

          <div className={styles.footer}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              <Save size={16} aria-hidden="true" />
              {loading ? 'Creating…' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
