/**
 * PathFinderModal — stub placeholder.
 * Full implementation lives in Task 10.
 */
import React from 'react';

interface PathFinderModalProps {
  sourceEntityId: string;
  sourceEntityName: string;
  targetEntityId: string;
  targetEntityName: string;
  onClose: () => void;
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({ onClose }) => {
  // Stub: replaced by the full implementation in Task 10.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Path finder"
      style={{ display: 'none' }}
      onClick={onClose}
    />
  );
};

export default PathFinderModal;
