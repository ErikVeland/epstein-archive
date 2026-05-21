/**
 * Deposition Viewer Component
 *
 * Displays court depositions with legal formatting
 */

import { useState } from 'react';
import Icon from '@client/components/common/Icon';
import styles from './DepositionViewer.module.css';

import { Input } from '@client/design-system/lib';

interface DepositionViewerProps {
  evidence: {
    extractedText: string;
    metadata: {
      deponent?: string;
      caseIdentifier?: string;
      depositionDate?: string;
      attorneys?: string[];
    };
  };
}

export function DepositionViewer({ evidence }: DepositionViewerProps) {
  const { metadata, extractedText } = evidence;
  const [searchTerm, setSearchTerm] = useState('');

  const lines = extractedText.split('\n');

  const highlightText = (text: string, search: string) => {
    if (!search || !search.trim()) return text;
    try {
      // Escape special characters to prevent regex syntax errors
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'));
      return parts.map((part, index) =>
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={index} className={styles.highlight}>
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch (error) {
      console.warn('Regex error in DepositionViewer:', error);
      return text;
    }
  };

  return (
    <div className={styles.container}>
      {/* Deposition Header */}
      <div className={styles.depositionHeader}>
        <div className={styles.headerRow}>
          <Icon name="Scale" size="xl" className={styles.scaleIcon} />
          <div className={styles.headerContent}>
            <h2 className={styles.depositionTitle}>
              Deposition of {metadata.deponent || 'Unknown'}
            </h2>

            <div className={styles.metaGrid}>
              {metadata.caseIdentifier && (
                <div>
                  <div className={styles.metaLabel}>Case</div>
                  <div className={styles.metaValue}>{metadata.caseIdentifier}</div>
                </div>
              )}

              {metadata.depositionDate && (
                <div>
                  <div className={styles.metaLabel}>Date</div>
                  <div className={styles.metaValue}>{metadata.depositionDate}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <Icon name="Search" size="md" className={styles.searchIcon} />
          <Input
            type="text"
            placeholder="Search deposition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Deposition Text */}
      <div className={styles.textPanel}>
        <div className={styles.textPanelInner}>
          {lines.map((line, index) => (
            <div key={index} className={styles.textLine}>
              <div className={styles.lineNumber}>{index + 1}</div>
              <div className={styles.lineContent}>
                {searchTerm ? highlightText(line, searchTerm) : line}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
