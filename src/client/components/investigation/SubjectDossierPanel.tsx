import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../services/apiClient';
import { useToasts } from '../common/useToasts';
import { CloseButton } from '../common/CloseButton';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  ShieldAlert,
  User,
} from 'lucide-react';

interface EntitySummary {
  id: string | number;
  fullName: string;
  entityType: string;
  primaryRole?: string;
  redFlagRating?: number;
  mentions?: number;
  aliases?: string[];
  documentCount?: number;
}

interface SubjectDossierPanelProps {
  investigationId: string;
  initialEntityId?: string | null;
  onClose: () => void;
  onOpenDocument?: (documentId: string) => void;
}

export const SubjectDossierPanel: React.FC<SubjectDossierPanelProps> = ({
  investigationId,
  initialEntityId,
  onClose,
  onOpenDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EntitySummary[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntitySummary | null>(null);
  const [recentDocs, setRecentDocs] = useState<
    Array<{ id: string; title: string; file_path: string }>
  >([]);
  const [loadingEntity, setLoadingEntity] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searching, setSearching] = useState(false);
  const { addToast } = useToasts();
  const { modalRef } = useModalFocusTrap({ isActive: true, onEscape: onClose });

  const loadEntity = useCallback(
    async (entityId: string) => {
      setLoadingEntity(true);
      try {
        const entity = await apiClient.get<EntitySummary>(`/entities/${entityId}`);
        setSelectedEntity(entity);

        // Load recent documents for this entity
        setLoadingDocs(true);
        try {
          const docs = await apiClient.get<{
            data: Array<{ id: string; title: string; file_path: string }>;
          }>(`/documents?entityId=${entityId}&limit=8&sortBy=date&sortOrder=desc`);
          setRecentDocs(docs.data ?? []);
        } catch {
          setRecentDocs([]);
        } finally {
          setLoadingDocs(false);
        }
      } catch {
        addToast({ text: 'Failed to load entity', type: 'error' });
      } finally {
        setLoadingEntity(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    if (initialEntityId) {
      void loadEntity(initialEntityId);
    }
  }, [initialEntityId, loadEntity]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.get<{ results: EntitySummary[] }>(
        `/entities/search?q=${encodeURIComponent(searchQuery)}&limit=10`,
      );
      setSearchResults(res.results ?? []);
    } catch {
      addToast({ text: 'Search failed', type: 'error' });
    } finally {
      setSearching(false);
    }
  };

  const handlePin = async () => {
    if (!selectedEntity) return;
    try {
      // Add entity as evidence to the investigation
      await apiClient.post(`/investigations/${investigationId}/evidence`, {
        title: selectedEntity.fullName,
        type: 'entity',
        source_path: `entity:${selectedEntity.id}`,
        relevance: 'high',
        notes: 'Pinned as primary subject',
      });
      addToast({ text: `${selectedEntity.fullName} pinned as subject`, type: 'success' });
    } catch {
      addToast({ text: 'Failed to pin subject', type: 'error' });
    }
  };

  const rfi = selectedEntity?.redFlagRating ?? 0;
  const rfiColor = rfi >= 4 ? 'text-rose-400' : rfi >= 2 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-stretch justify-end bg-[var(--glass-bg)]/20 backdrop-blur-sm">
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-md bg-[var(--glass-bg-strong)] border-l border-[var(--glass-border)] shadow-[var(--glass-shadow)] flex flex-col focus:outline-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--glass-border)] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--accent)]" />
              Subject Dossier
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Entity profile and linked documents
            </p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close dossier panel" />
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="px-5 py-3 border-b border-[var(--glass-border)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search subject by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-lg)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-[var(--text-muted)]" />
            )}
          </div>
        </form>

        {/* Search results */}
        {searchResults.length > 0 && !selectedEntity && (
          <div className="px-5 py-2 border-b border-[var(--glass-border)] space-y-1 max-h-48 overflow-y-auto">
            {searchResults.map((entity) => (
              <button
                key={String(entity.id)}
                onClick={() => {
                  setSearchResults([]);
                  setSearchQuery('');
                  void loadEntity(String(entity.id));
                }}
                className="w-full text-left px-3 py-2 rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {entity.fullName}
                </span>
                {entity.primaryRole && (
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {entity.primaryRole}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Entity dossier */}
        <div className="flex-1 overflow-y-auto">
          {loadingEntity && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            </div>
          )}

          {!loadingEntity && !selectedEntity && (
            <div className="px-5 py-10 text-center">
              <User className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">Search for a subject above</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Or open directly from entity cards on the archive
              </p>
            </div>
          )}

          {selectedEntity && (
            <div className="px-5 py-4 space-y-5">
              {/* Name + type */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedEntity.fullName}
                    </h3>
                    {selectedEntity.primaryRole && (
                      <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {selectedEntity.primaryRole}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/subjects/${selectedEntity.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 p-1.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    title="Open full profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full border border-[var(--glass-border)] text-[var(--text-muted)]">
                    {selectedEntity.entityType}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border border-[var(--glass-border)] text-[var(--text-muted)]">
                    ID #{selectedEntity.id}
                  </span>
                </div>
              </div>

              {/* Risk + mentions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Red Flag Index</span>
                  </div>
                  <span className={`text-2xl font-bold ${rfiColor}`}>{rfi.toFixed(1)}</span>
                  <span className="text-xs text-[var(--text-muted)] ml-1">/ 5</span>
                </div>
                <div className="border border-[var(--glass-border)] rounded-[var(--radius-lg)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <span className="text-xs text-[var(--text-muted)]">Mentions</span>
                  </div>
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {(selectedEntity.mentions ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Aliases */}
              {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Known Aliases
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEntity.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="px-2 py-0.5 rounded border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] font-mono"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pin button */}
              <button
                onClick={handlePin}
                className="w-full py-2 rounded-[var(--radius-lg)] border border-[var(--accent)]/40 text-[var(--accent)] text-sm font-medium hover:bg-[var(--accent)]/10 transition-colors"
              >
                📌 Pin as Primary Subject
              </button>

              {/* All archive documents */}
              <a
                href={`/documents?entityId=${selectedEntity.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] text-[var(--text-secondary)] text-sm hover:border-[var(--accent)]/40 hover:text-[var(--accent)] transition-colors"
              >
                <FileText className="w-4 h-4" />
                View all documents mentioning {selectedEntity.fullName.split(' ')[0]}
              </a>

              {/* Recent documents */}
              <div>
                <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Recent Documents
                </h4>
                {loadingDocs && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                  </div>
                )}
                {!loadingDocs && recentDocs.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No documents indexed for this entity yet
                  </div>
                )}
                {!loadingDocs && recentDocs.length > 0 && (
                  <div className="space-y-1">
                    {recentDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onOpenDocument?.(doc.id)}
                        className="w-full text-left px-3 py-2 rounded-[var(--radius-lg)] border border-transparent hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-colors"
                      >
                        <span className="text-xs text-[var(--text-primary)] line-clamp-2 font-mono">
                          {doc.title || doc.file_path?.split('/').pop() || `Document ${doc.id}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
