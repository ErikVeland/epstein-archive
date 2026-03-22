import React from 'react';
import { createPortal } from 'react-dom';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { CloseButton } from './common/CloseButton';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { modalRef } = useModalFocusTrap({ isActive: isOpen, onEscape: onClose });
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
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
    <div className="fixed inset-0 bg-[var(--app-bg)]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close keyboard shortcuts"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-xl)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[var(--glass-border)]"
        role="dialog"
        aria-labelledby="keyboard-shortcuts-title"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <h2
            id="keyboard-shortcuts-title"
            className="text-lg font-semibold text-[var(--text-primary)]"
          >
            Keyboard Shortcuts
          </h2>
          <CloseButton
            onClick={onClose}
            size="md"
            label="Close keyboard shortcuts"
            className="border-[var(--glass-border)] bg-transparent hover:bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {shortcuts.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="text-md font-semibold text-[var(--accent)] mb-4 border-b border-[var(--glass-border)] pb-2">
                  {section.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between p-3 bg-[var(--glass-bg)] rounded-[var(--radius-lg)] border border-[var(--glass-border)]"
                    >
                      <span className="text-[var(--text-secondary)] font-medium text-sm">
                        {item.description}
                      </span>
                      <div className="flex gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 text-xs font-mono font-bold bg-[var(--glass-bg-strong)] text-[var(--text-primary)] rounded-[var(--radius-sm)] border border-[var(--glass-border)] min-w-[24px] text-center"
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

          <div className="mt-8 pt-6 border-t border-[var(--glass-border)]">
            <p className="text-[var(--text-muted)] text-sm">
              <strong>Note:</strong> Shortcuts use{' '}
              <kbd className="px-1 py-0.5 text-xs font-mono font-bold bg-[var(--glass-bg-strong)] text-[var(--text-primary)] rounded-[var(--radius-sm)] border border-[var(--glass-border)]">
                {cmdKey}
              </kbd>{' '}
              key on your system.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[var(--glass-bg-strong)] hover:bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded-[var(--radius-lg)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default KeyboardShortcutsModal;
