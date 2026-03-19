/**
 * Deposition Viewer Component
 *
 * Displays court depositions with legal formatting
 */

import { useState } from 'react';
import { Scale, Search } from 'lucide-react';

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
          <mark key={index} className="bg-yellow-200">
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
    <div className="p-6">
      {/* Deposition Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-6 mb-6">
        <div className="flex items-start space-x-4">
          <Scale className="h-8 w-8 text-[var(--text-primary)] mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">
              Deposition of {metadata.deponent || 'Unknown'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.caseIdentifier && (
                <div>
                  <div className="text-sm text-[var(--text-primary)]">Case</div>
                  <div className="text-[var(--text-primary)] font-medium">
                    {metadata.caseIdentifier}
                  </div>
                </div>
              )}

              {metadata.depositionDate && (
                <div>
                  <div className="text-sm text-[var(--text-primary)]">Date</div>
                  <div className="text-[var(--text-primary)] font-medium">
                    {metadata.depositionDate}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search deposition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      {/* Deposition Text */}
      <div className="bg-white border border-[var(--glass-border)] rounded-[var(--radius-lg)]">
        <div className="p-6">
          {lines.map((line, index) => (
            <div key={index} className="flex text-sm leading-relaxed mb-2">
              <div className="w-12 text-right text-[var(--text-muted)] mr-4 flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 text-[var(--text-primary)] font-mono">
                {searchTerm ? highlightText(line, searchTerm) : line}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
