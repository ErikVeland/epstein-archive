/**
 * Email Viewer Component
 *
 * Displays correspondence evidence in email client style
 */

import Icon from '@client/components/common/Icon';
import styles from './EmailViewer.module.css';

import { Button } from '@client/design-system/lib';

interface EmailViewerProps {
  evidence: {
    extractedText: string;
    metadata: {
      from?: string;
      to?: string;
      cc?: string;
      subject?: string;
      sentDate?: string;
      attachmentCount?: number;
      source_original_url?: string;
    };
  };
}

export function EmailViewer({ evidence }: EmailViewerProps) {
  const { metadata, extractedText } = evidence;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Extract email body (everything after headers)
  const getEmailBody = () => {
    const lines = extractedText.split('\n');
    let bodyStartIndex = 0;

    // Find where headers end (first empty line or specific patterns)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 5) {
        bodyStartIndex = i + 1;
        break;
      }
    }

    return lines.slice(bodyStartIndex).join('\n').trim();
  };

  const emailBody = getEmailBody();

  return (
    <div className={styles.container}>
      {/* Email Header */}
      <div className={styles.emailHeader}>
        <div className={styles.subjectRow}>
          <h2 className={styles.subject}>{metadata.subject || 'No Subject'}</h2>
          {metadata.source_original_url && (
            <a
              href={metadata.source_original_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className={styles.downloadLink}
              title="Download original email"
            >
              <Icon name="Download" size="sm" />
              Original
            </a>
          )}
        </div>

        <div className={styles.metaStack}>
          {metadata.from && (
            <div className={styles.metaRow}>
              <Icon name="User" size="md" className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <div className={styles.metaLabel}>From</div>
                <div className={styles.metaValueRow}>
                  <div className={styles.metaValue}>{metadata.from}</div>
                  <Button
                    unstyled
                    onClick={() => copyToClipboard(metadata.from!)}
                    className={styles.copyButton}
                    title="Copy email"
                  >
                    <Icon name="Copy" size="sm" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {metadata.to && (
            <div className={styles.metaRow}>
              <Icon name="Mail" size="md" className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <div className={styles.metaLabel}>To</div>
                <div className={styles.metaValueRow}>
                  <div className={styles.metaValue}>{metadata.to}</div>
                  <Button
                    unstyled
                    onClick={() => copyToClipboard(metadata.to!)}
                    className={styles.copyButton}
                    title="Copy email"
                  >
                    <Icon name="Copy" size="sm" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {metadata.cc && (
            <div className={styles.metaRow}>
              <Icon name="Mail" size="md" className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <div className={styles.metaLabel}>CC</div>
                <div className={styles.metaValue}>{metadata.cc}</div>
              </div>
            </div>
          )}

          {metadata.sentDate && (
            <div className={styles.metaRow}>
              <Icon name="Calendar" size="md" className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <div className={styles.metaLabel}>Date</div>
                <div className={styles.metaValue}>{metadata.sentDate}</div>
              </div>
            </div>
          )}

          {metadata.attachmentCount && metadata.attachmentCount > 0 && (
            <div className={styles.metaRow}>
              <Icon name="Paperclip" size="md" className={styles.metaIcon} />
              <div className={styles.metaContent}>
                <div className={styles.metaLabel}>Attachments</div>
                <div className={styles.metaValue}>{metadata.attachmentCount} file(s)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Body */}
      <div className={styles.emailBody}>
        <div className={styles.bodyText}>{emailBody || extractedText}</div>
      </div>
    </div>
  );
}
