import React from 'react';
import { createPortal } from 'react-dom';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { CloseButton } from './common/CloseButton';
import styles from './KeyboardShortcutsModal.module.css';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { modalRef } = useModalFocusTrap({ isActive: isOpen, onEscape: onClose });
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const cmdSymbol = isMac ? '⌘' : 'Ctrl';
  const cmdKey = isMac ? 'Cmd' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: [cmdSymbol, 'K'], description: 'Focus search bar' },
        { keys: [cmdSymbol, '1'], description: 'Go to Subjects' },
        { keys: [cmdSymbol, '2'], description: 'Go to Search' },
        { keys: [cmdSymbol, '3'], description: 'Go to Documents' },
        { keys: [cmdSymbol, '4'], description: 'Go to Media' },
        { keys: [cmdSymbol, '5'], description: 'Go to Timeline' },
        { keys: [cmdSymbol, '6'], description: 'Go to Investigations' },
        { keys: [cmdSymbol, '7'], description: 'Go to Analytics' },
        { keys: [cmdSymbol, '8'], description: 'Go to Black Book' },
        { keys: [cmdSymbol, '9'], description: 'Go to About' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: ['Escape'], description: 'Close modals' },
        { keys: [cmdSymbol, 'Shift', 'R'], description: 'Refresh application' },
      ],
    },
    {
      category: 'Document Viewer',
      items: [
        { keys: ['←', '→'], description: 'Navigate between pages' },
        { keys: ['+', '='], description: 'Zoom in' },
        { keys: ['-'], description: 'Zoom out' },
        { keys: ['R'], description: 'Rotate document' },
      ],
    },
    {
      category: 'Investigations',
      items: [
        { keys: [cmdSymbol, 'S'], description: 'Save investigation' },
        { keys: [cmdSymbol, 'N'], description: 'New investigation' },
      ],
    },
  ];

  return createPortal(
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.dismissLayer}
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className={styles.dialog}
        role="dialog"
        aria-labelledby="keyboard-shortcuts-title"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 id="keyboard-shortcuts-title" className={styles.title}>
            Keyboard Shortcuts
          </h2>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close keyboard shortcuts"
            className={styles.closeButton}
          />
        </div>

        <div className={styles.body}>
          <div className={styles.sectionStack}>
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className={styles.sectionTitle}>{section.category}</h3>
                <div className={styles.shortcutGrid}>
                  {section.items.map((item) => (
                    <div key={item.description} className={styles.shortcutCard}>
                      <span className={styles.shortcutDescription}>{item.description}</span>
                      <div className={styles.keyRow}>
                        {item.keys.map((key) => (
                          <kbd
                            key={`${section.category}-${item.description}-${key}`}
                            className={styles.keycap}
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.noteBlock}>
            <p className={styles.noteText}>
              <strong>Note:</strong> Shortcuts use{' '}
              <kbd className={styles.inlineKeycap}>{cmdKey}</kbd> key on your system.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onClose} className={styles.footerButton}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default KeyboardShortcutsModal;
