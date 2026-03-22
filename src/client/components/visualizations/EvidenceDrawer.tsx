import React from 'react';
import { X, FileText, ArrowRight, ShieldAlert } from 'lucide-react';

export interface Evidence {
  id: string;
  documentId: number;
  snippet: string;
  date: string | null;
  sourceType: 'document' | 'email' | 'flight_log';
  title: string; // From join
  risk: number; // From doc
  confidence: number;
  extractionMethod?: string;
  model?: string;
}

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sourceLabel: string;
  targetLabel: string;
  relationshipType?: string;
  loading: boolean;
  documents: Evidence[];
  onDocumentClick?: (docId: number) => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  sourceLabel,
  targetLabel,
  relationshipType,
  loading,
  documents,
  onDocumentClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] shadow-[var(--glass-shadow)] transform transition-transform duration-300 ease-in-out z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-start bg-[var(--glass-bg)]/50">
        <div>
          <h3 className="text-sm text-[var(--text-muted)] font-medium mb-1">Connection Evidence</h3>
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
            <span className="truncate max-w-[120px]">{sourceLabel}</span>
            <ArrowRight className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="truncate max-w-[120px]">{targetLabel}</span>
          </div>
          {relationshipType && (
            <div className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] bg-cyan-900/50 text-[var(--accent)] border border-cyan-800 capitalize">
              {relationshipType.replace(/_/g, ' ')}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--glass-bg-highlight)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--text-muted)]">Locating intersection documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No direct co-occurrence documents found.</p>
            <p className="text-xs mt-1">
              Link may be inferred from metadata or secondary connections.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">
              Found {documents.length} Shared Documents
            </p>
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => onDocumentClick?.(doc.documentId)}
                className="w-full bg-[var(--glass-bg)]/40 hover:bg-[var(--glass-bg-highlight)]/60 border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3 text-left transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                aria-label={`Open shared document ${doc.title}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 p-1.5 rounded bg-[var(--glass-bg)] ${
                      (doc.risk || 0) >= 4
                        ? 'text-red-400'
                        : (doc.risk || 0) >= 2
                          ? 'text-amber-400'
                          : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {doc.title}
                    </h4>

                    {/* Snippet Context */}
                    {doc.snippet && doc.snippet !== 'No snippet available' && (
                      <div className="mt-2 text-xs text-[var(--text-muted)] bg-[var(--glass-bg-strong)]/50 p-2 rounded border-l-2 border-[var(--glass-border)] italic">
                        "{doc.snippet.substring(0, 150)}
                        {doc.snippet.length > 150 ? '...' : ''}"
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text-muted)]">
                      <span className="capitalize bg-[var(--glass-bg)] px-1.5 py-0.5 rounded">
                        {doc.sourceType.replace('_', ' ')}
                      </span>
                      {doc.date && <span>• {new Date(doc.date).toLocaleDateString()}</span>}
                      {doc.risk > 0 && (
                        <span
                          className={`flex items-center gap-1 ${doc.risk >= 4 ? 'text-red-400' : 'text-amber-500/80'}`}
                        >
                          • Risk {doc.risk}
                        </span>
                      )}

                      {/* Provenance Lineage */}
                      {doc.extractionMethod && (
                        <div className="flex items-center gap-1 ml-auto text-[var(--accent)]/60 font-mono scale-90">
                          <span>Trace: {doc.extractionMethod}</span>
                          {doc.model && (
                            <span className="text-[8px] bg-[var(--glass-bg)] px-1 rounded">
                              ({doc.model})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-3 bg-[var(--glass-bg-strong)] border-t border-[var(--glass-border)] text-[10px] text-center text-[var(--text-muted)]">
        Press <span className="font-mono bg-[var(--glass-bg)] px-1 rounded">ESC</span> to close
      </div>
    </div>
  );
};
