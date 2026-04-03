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

import styles from './SubjectDossierPanel.module.css';

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
  const rfiClassName =
    rfi >= 4 ? styles.statValueRose : rfi >= 2 ? styles.statValueAmber : styles.statValueEmerald;

  return (
    <div className={styles.overlay}>
      <div ref={modalRef} tabIndex={-1} className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>
              <User className="w-4 h-4 text-[var(--accent)]" />
              Subject Dossier
            </h2>
            <p className={styles.headerSubtitle}>Entity profile and linked documents</p>
          </div>
          <CloseButton onClick={onClose} size="sm" label="Close dossier panel" />
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search subject by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searching && <Loader2 className={`${styles.searchLoader} animate-spin`} />}
          </div>
        </form>

        {/* Search results */}
        {searchResults.length > 0 && !selectedEntity && (
          <div className={styles.searchResults}>
            {searchResults.map((entity) => (
              <button
                key={String(entity.id)}
                onClick={() => {
                  setSearchResults([]);
                  setSearchQuery('');
                  void loadEntity(String(entity.id));
                }}
                className={styles.resultButton}
              >
                <span className={styles.resultName}>{entity.fullName}</span>
                {entity.primaryRole && (
                  <span className={styles.resultRole}>{entity.primaryRole}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Entity dossier */}
        <div className={styles.dossierContent}>
          {loadingEntity && (
            <div className={styles.loaderWrapper}>
              <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
            </div>
          )}

          {!loadingEntity && !selectedEntity && (
            <div className={styles.emptyState}>
              <User className={styles.emptyIcon} />
              <p className={styles.emptyTextPrimary}>Search for a subject above</p>
              <p className={styles.emptyTextSecondary}>
                Or open directly from entity cards on the archive
              </p>
            </div>
          )}

          {selectedEntity && (
            <div className={styles.dossierBody}>
              {/* Name + type */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={styles.profileTitle}>{selectedEntity.fullName}</h3>
                    {selectedEntity.primaryRole && (
                      <p className={styles.profileSubtitle}>{selectedEntity.primaryRole}</p>
                    )}
                  </div>
                  <a
                    href={`/subjects/${selectedEntity.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.externalLink}
                    title="Open full profile"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className={styles.badgeStack}>
                  <span className={styles.badge}>{selectedEntity.entityType}</span>
                  <span className={styles.badge}>ID #{selectedEntity.id}</span>
                </div>
              </div>

              {/* Risk + mentions */}
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <ShieldAlert className={styles.statIcon} />
                    <span className={styles.statLabel}>Red Flag Index</span>
                  </div>
                  <span className={`${styles.statValue} ${rfiClassName}`}>{rfi.toFixed(1)}</span>
                  <span className={styles.statUnit}>/ 5</span>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statHeader}>
                    <FileText className={styles.statIcon} />
                    <span className={styles.statLabel}>Mentions</span>
                  </div>
                  <span className={`${styles.statValue} ${styles.statValuePrimary}`}>
                    {(selectedEntity.mentions ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Aliases */}
              {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                <div>
                  <h4 className={styles.sectionHeader}>Known Aliases</h4>
                  <div className={styles.aliasStack}>
                    {selectedEntity.aliases.map((alias) => (
                      <span key={alias} className={styles.aliasBadge}>
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pin button */}
              <button onClick={handlePin} className={styles.pinButton}>
                📌 Pin as Primary Subject
              </button>

              {/* All archive documents */}
              <a
                href={`/documents?entityId=${selectedEntity.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionLink}
              >
                <FileText className="w-4 h-4" />
                View all documents mentioning {selectedEntity.fullName.split(' ')[0]}
              </a>

              {/* Recent documents */}
              <div>
                <h4 className={styles.sectionHeader}>Recent Documents</h4>
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
                  <div className={styles.documentList}>
                    {recentDocs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onOpenDocument?.(doc.id)}
                        className={styles.documentButton}
                      >
                        <span className={styles.documentTitle}>
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
