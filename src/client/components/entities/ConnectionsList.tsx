import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Input } from '@client/design-system/lib';
import Icon from '@client/components/common/Icon';
import { apiClient } from '@client/services/apiClient';
import { ConnectionCard } from './ConnectionCard';
import { PathFinderModal } from './PathFinderModal';
import styles from './ConnectionsList.module.css';

interface ConnectionsListProps {
  entityId: string;
  entityName: string;
}

export const ConnectionsList: React.FC<ConnectionsListProps> = ({ entityId, entityName }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [pathTargetId, setPathTargetId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['entityConnections', entityId],
    queryFn: () => apiClient.getEntityConnections(entityId, { limit: 200 }),
    staleTime: 60_000,
  });

  const connections = data?.connections ?? [];
  const maxScore = connections[0]?.totalScore ?? 1;

  const filtered = search.trim()
    ? connections.filter((c) => c.entityName.toLowerCase().includes(search.toLowerCase()))
    : connections;

  const pathTarget = connections.find((c) => c.entityId === pathTargetId);

  const handleOpenProfile = (id: string) => {
    navigate(`/people/${encodeURIComponent(id)}`);
  };

  return (
    <div className={styles.root}>
      {/* Sticky toolbar */}
      <div className={styles.toolbar}>
        <Input
          type="search"
          placeholder="Filter connections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          aria-label="Filter connections by name"
        />
        {!isLoading && (
          <span className={styles.countLabel}>
            {filtered.length} / {connections.length}
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <ul className={styles.list} aria-busy="true" aria-label="Loading connections">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className={styles.skeletonCard} aria-hidden="true" />
          ))}
        </ul>
      )}

      {/* Empty state */}
      {!isLoading && connections.length === 0 && (
        <div className={styles.emptyState}>
          <Icon name="Network" size="lg" color="muted" ariaHidden />
          <p className={styles.emptyText}>
            No connections found. Run the significance compute script to populate signals.
          </p>
        </div>
      )}

      {/* No search results */}
      {!isLoading && connections.length > 0 && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <Icon name="SearchX" size="lg" color="muted" ariaHidden />
          <p className={styles.emptyText}>No connections match &ldquo;{search}&rdquo;.</p>
        </div>
      )}

      {/* Connection cards */}
      {!isLoading && filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((connection) => (
            <li key={connection.entityId}>
              <ConnectionCard
                connection={connection}
                maxScore={maxScore}
                onOpenProfile={handleOpenProfile}
                onViewPath={(id) => setPathTargetId(id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* PathFinder modal */}
      {pathTargetId !== null && pathTarget != null && (
        <PathFinderModal
          sourceEntityId={entityId}
          sourceEntityName={entityName}
          targetEntityId={pathTargetId}
          targetEntityName={pathTarget.entityName}
          onClose={() => setPathTargetId(null)}
        />
      )}
    </div>
  );
};

export default ConnectionsList;
