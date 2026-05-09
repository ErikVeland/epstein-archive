import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { Button, Input } from '@client/design-system/lib';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandGroup {
  label: string;
  commands: Command[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Define commands
  const commandGroups: CommandGroup[] = [
    {
      label: 'Navigation',
      commands: [
        {
          id: 'go-investigation',
          label: 'Go to Investigation',
          description: 'Jump to a named investigation workspace',
          icon: 'Search',
          action: () => navigate('/investigations'),
          keywords: ['investigation', 'case', 'workspace'],
        },
        {
          id: 'new-investigation',
          label: 'New Investigation',
          description: 'Open create-investigation dialog',
          icon: 'Plus',
          action: () => {
            // Trigger create investigation modal
            window.dispatchEvent(new CustomEvent('open-create-investigation'));
          },
          keywords: ['new', 'create', 'case'],
        },
        {
          id: 'open-review-queue',
          label: 'Open Review Queue',
          description: 'Navigate to Review Dashboard',
          icon: 'Shield',
          action: () => navigate('/review'),
          keywords: ['review', 'queue', 'ambiguity', 'verify'],
        },
        {
          id: 'search-archive',
          label: 'Search Archive',
          description: 'Focus global search field',
          icon: 'Search',
          action: () => {
            const searchInput = document.querySelector(
              '[data-testid="global-search"]',
            ) as HTMLInputElement;
            if (searchInput) searchInput.focus();
          },
          keywords: ['search', 'find', 'archive'],
        },
        {
          id: 'go-people',
          label: 'Go to People',
          description: 'Navigate to People page',
          icon: 'Users',
          action: () => navigate('/people'),
          keywords: ['people', 'entities', 'persons'],
        },
        {
          id: 'go-documents',
          label: 'Go to Documents',
          description: 'Navigate to Documents page',
          icon: 'FileText',
          action: () => navigate('/documents'),
          keywords: ['documents', 'docs', 'files'],
        },
        {
          id: 'go-redactions',
          label: 'Go to Redactions',
          description: 'Open redaction coverage and span review',
          icon: 'ScanText',
          action: () => navigate('/redactions'),
          keywords: ['redactions', 'unredaction', 'coverage', 'withheld'],
        },
        {
          id: 'go-flights',
          label: 'Go to Flights',
          description: 'Navigate to Flights page',
          icon: 'Plane',
          action: () => navigate('/flights'),
          keywords: ['flights', 'travel', 'aviation'],
        },
        {
          id: 'go-timeline',
          label: 'Go to Timeline',
          description: 'Navigate to Timeline page',
          icon: 'Clock',
          action: () => navigate('/timeline'),
          keywords: ['timeline', 'events', 'chronology'],
        },
        {
          id: 'go-emails',
          label: 'Go to Emails',
          description: 'Navigate to Email page',
          icon: 'Mail',
          action: () => navigate('/emails'),
          keywords: ['email', 'mail', 'communication'],
        },
        {
          id: 'go-financial',
          label: 'Go to Financial',
          description: 'Navigate to Financial page',
          icon: 'DollarSign',
          action: () => navigate('/financial'),
          keywords: ['financial', 'money', 'transactions'],
        },
      ],
    },
    {
      label: 'Actions',
      commands: [
        {
          id: 'export-packet',
          label: 'Export Evidence Packet',
          description: 'Open export dialog for active investigation',
          icon: 'Download',
          action: () => {
            window.dispatchEvent(new CustomEvent('open-export-dialog'));
          },
          keywords: ['export', 'packet', 'evidence', 'zip'],
        },
        {
          id: 'copy-investigation-link',
          label: 'Copy Investigation Link',
          description: 'Copy shareable deep link',
          icon: 'Link',
          action: () => {
            navigator.clipboard.writeText(window.location.href);
            // Show toast notification
            window.dispatchEvent(
              new CustomEvent('show-toast', { detail: { message: 'Link copied to clipboard!' } }),
            );
          },
          keywords: ['copy', 'link', 'share', 'clipboard'],
        },
        {
          id: 'toggle-sensitive',
          label: 'Toggle Sensitive Content',
          description: 'Toggle sensitive content visibility',
          icon: 'Eye',
          action: () => {
            window.dispatchEvent(new CustomEvent('toggle-sensitive-content'));
          },
          keywords: ['sensitive', 'toggle', 'hide', 'show'],
        },
      ],
    },
  ];

  // Filter commands based on query
  const filteredGroups = query.trim()
    ? commandGroups
        .map((group) => ({
          ...group,
          commands: group.commands.filter((cmd) => {
            const searchText =
              `${cmd.label} ${cmd.description || ''} ${(cmd.keywords || []).join(' ')}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
          }),
        }))
        .filter((group) => group.commands.length > 0)
    : commandGroups;

  const allFilteredCommands = filteredGroups.flatMap((g) => g.commands);
  const totalCommands = allFilteredCommands.length;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalCommands);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalCommands) % totalCommands);
          break;
        case 'Enter':
          e.preventDefault();
          if (allFilteredCommands[selectedIndex]) {
            allFilteredCommands[selectedIndex].action();
            onClose();
            setQuery('');
          }
          break;
      }
    },
    [onClose, selectedIndex, totalCommands, allFilteredCommands],
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset query when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  let commandIndex = 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.searchBox}>
          <Icon name="Search" className={styles.searchIcon} />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className={styles.searchInput}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div className={styles.results}>
          {totalCommands === 0 ? (
            <div className={styles.noResults}>
              <Icon name="Search" className={styles.noResultsIcon} />
              <p>No commands found</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label} className={styles.group}>
                <div className={styles.groupLabel}>{group.label}</div>
                {group.commands.map((cmd) => {
                  const currentIndex = commandIndex++;
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      key={cmd.id}
                      className={`${styles.commandItem} ${currentIndex === selectedIndex ? styles.commandItemSelected : ''}`}
                      onClick={() => {
                        cmd.action();
                        onClose();
                        setQuery('');
                      }}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                    >
                      {cmd.icon && <Icon name={cmd.icon} className={styles.commandIcon} />}
                      <div className={styles.commandContent}>
                        <span className={styles.commandLabel}>{cmd.label}</span>
                        {cmd.description && (
                          <span className={styles.commandDescription}>{cmd.description}</span>
                        )}
                      </div>
                      {currentIndex === selectedIndex && <kbd className={styles.kbd}>Enter</kbd>}
                    </Button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>↑</kbd>
            <kbd className={styles.kbd}>↓</kbd>
            to navigate
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>Enter</kbd>
            to select
          </span>
          <span className={styles.footerHint}>
            <kbd className={styles.kbd}>Esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
};
