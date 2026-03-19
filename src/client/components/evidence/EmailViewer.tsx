/**
 * Email Viewer Component
 *
 * Displays correspondence evidence in email client style
 */

import { Mail, Paperclip, Copy, Download, User, Calendar } from 'lucide-react';

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
    <div className="p-6">
      {/* Email Header */}
      <div className="border-b border-[var(--glass-border)] pb-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {metadata.subject || 'No Subject'}
          </h2>
          {metadata.source_original_url && (
            <a
              href={metadata.source_original_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-[var(--glass-border)] shadow-sm text-sm font-medium rounded-[var(--radius-md)] text-[var(--text-secondary)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-highlight)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] ml-4 shrink-0 transition-colors"
              title="Download original email"
            >
              <Download className="h-4 w-4 mr-2" />
              Original
            </a>
          )}
        </div>

        <div className="space-y-3">
          {metadata.from && (
            <div className="flex items-start">
              <User className="h-5 w-5 text-[var(--text-muted)] mr-3 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[var(--text-muted)]">From</div>
                <div className="flex items-center justify-between">
                  <div className="text-[var(--text-primary)]">{metadata.from}</div>
                  <button
                    onClick={() => copyToClipboard(metadata.from!)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    title="Copy email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {metadata.to && (
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-[var(--text-muted)] mr-3 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[var(--text-muted)]">To</div>
                <div className="flex items-center justify-between">
                  <div className="text-[var(--text-primary)]">{metadata.to}</div>
                  <button
                    onClick={() => copyToClipboard(metadata.to!)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    title="Copy email"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {metadata.cc && (
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-[var(--text-muted)] mr-3 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[var(--text-muted)]">CC</div>
                <div className="text-[var(--text-primary)]">{metadata.cc}</div>
              </div>
            </div>
          )}

          {metadata.sentDate && (
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-[var(--text-muted)] mr-3 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[var(--text-muted)]">Date</div>
                <div className="text-[var(--text-primary)]">{metadata.sentDate}</div>
              </div>
            </div>
          )}

          {metadata.attachmentCount && metadata.attachmentCount > 0 && (
            <div className="flex items-start">
              <Paperclip className="h-5 w-5 text-[var(--text-muted)] mr-3 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-[var(--text-muted)]">Attachments</div>
                <div className="text-[var(--text-primary)]">{metadata.attachmentCount} file(s)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Body */}
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-[var(--text-primary)] font-sans leading-relaxed">
          {emailBody || extractedText}
        </div>
      </div>
    </div>
  );
}
