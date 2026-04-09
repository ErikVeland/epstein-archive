import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '../common/Icon';
import { useToasts } from '../common/useToasts';
import { apiClient } from '../../services/apiClient';
import styles from './FaceGallery.module.css';

interface FaceCluster {
  id: string;
  name: string;
  is_hidden: boolean;
  entity_id: number | null;
  entity_name: string | null;
  face_count: number;
  thumbnail_path: string | null;
  created_at: string;
}

interface Face {
  id: string;
  media_item_id: string;
  crop_path: string | null;
  detection_confidence: number;
  original_image_path: string;
}

interface ClusterDetail {
  cluster: FaceCluster;
  faces: Face[];
}

interface EntityResult {
  id: number;
  name: string;
  role: string;
}

const EntitySearch: React.FC<{
  onSelect: (entity: EntityResult) => void;
  placeholder?: string;
}> = ({ onSelect, placeholder = 'Search entities…' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: clear results when query becomes empty, debounced search otherwise */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/entities?search=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        setResults(
          (data.data || data).map((e: Record<string, unknown>) => ({
            id: e.id,
            name: e.fullName || e.name,
            role: e.primaryRole || e.role || '',
          })),
        );
      } catch {
        /* ignore */
      }
      setSearching(false);
    }, 250);
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className={styles.entitySearch} ref={ref}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={styles.searchInput}
      />
      {open && (results.length > 0 || searching) && (
        <div className={styles.searchResults}>
          {searching ? (
            <div className={styles.searchingState}>Searching…</div>
          ) : (
            <div className={styles.searchResultsList}>
              {results.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => {
                    onSelect(entity);
                    setQuery('');
                    setOpen(false);
                  }}
                  className={styles.searchResultButton}
                >
                  <div>
                    <div className={styles.searchResultName}>{entity.name}</div>
                    {entity.role && <div className={styles.searchResultRole}>{entity.role}</div>}
                  </div>
                  <Icon name="Link" size="xs" className={styles.searchResultIcon} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const FaceGallery: React.FC = () => {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  const { data: clusters = [], isLoading: loading } = useQuery<FaceCluster[]>({
    queryKey: ['faceClusters'],
    queryFn: () => apiClient.get<FaceCluster[]>('/faces/clusters'),
    staleTime: 30_000,
  });

  const { data: clusterDetail = null, isLoading: detailLoading } = useQuery<ClusterDetail | null>({
    queryKey: ['faceClusterDetail', selectedClusterId],
    queryFn: () => apiClient.get<ClusterDetail>(`/faces/clusters/${selectedClusterId}`),
    enabled: Boolean(selectedClusterId),
    staleTime: 30_000,
  });

  const patchCluster = async (payload: Record<string, unknown>) => {
    if (!selectedClusterId) return null;
    setSaving(true);
    try {
      return await apiClient.patch<FaceCluster>(`/faces/clusters/${selectedClusterId}`, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkEntity = async (entity: EntityResult) => {
    try {
      const updated = await patchCluster({ entity_id: entity.id, name: entity.name });
      if (!updated) return;
      queryClient.setQueryData<ClusterDetail | null>(
        ['faceClusterDetail', selectedClusterId],
        (prev) => (prev ? { ...prev, cluster: { ...prev.cluster, ...updated } } : null),
      );
      queryClient.setQueryData<FaceCluster[]>(['faceClusters'], (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) : prev,
      );
      const count = (updated as unknown as Record<string, unknown>).tagged_photos ?? 0;
      addToast({
        text: `Linked to ${entity.name} — ${count as number} photo${(count as number) !== 1 ? 's' : ''} tagged`,
        type: 'success',
      });
    } catch {
      addToast({ text: 'Failed to link entity', type: 'error' });
    }
  };

  const handleUnlink = async () => {
    try {
      const updated = await patchCluster({ entity_id: null });
      if (!updated) return;
      queryClient.setQueryData<ClusterDetail | null>(
        ['faceClusterDetail', selectedClusterId],
        (prev) => (prev ? { ...prev, cluster: { ...prev.cluster, ...updated } } : null),
      );
      queryClient.setQueryData<FaceCluster[]>(['faceClusters'], (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)) : prev,
      );
      addToast({ text: 'Entity link removed', type: 'success' });
    } catch {
      addToast({ text: 'Failed to unlink', type: 'error' });
    }
  };

  const getImageUrl = (p: string | null) => {
    if (!p) return null;
    return p.startsWith('/') ? p : `/${p}`;
  };

  if (loading && !clusters.length) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinnerLg} />
      </div>
    );
  }

  // ── Detail View ─────────────────────────────────────────────────────────────
  if (selectedClusterId) {
    const cluster = clusterDetail?.cluster;
    return (
      <div className={styles.page}>
        <button onClick={() => setSelectedClusterId(null)} className={styles.backButton}>
          <Icon name="ChevronLeft" size="sm" className={styles.backIcon} />
          Back to Gallery
        </button>

        {detailLoading || !clusterDetail ? (
          <div className={styles.loadingCard}>
            <div className={styles.spinnerMd} />
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className={styles.detailHeader}>
              {/* Avatar */}
              <div className={styles.avatar}>
                {cluster?.thumbnail_path ? (
                  <img
                    src={getImageUrl(cluster.thumbnail_path) ?? undefined}
                    alt={cluster.name}
                    className={styles.avatarImage}
                  />
                ) : (
                  <div className={styles.emptyAvatar}>
                    <Icon name="User" size="lg" />
                  </div>
                )}
              </div>

              {/* Identity panel */}
              <div className={styles.detailIdentity}>
                <div className={styles.detailTitleRow}>
                  <h1 className={styles.detailTitle}>{cluster?.name}</h1>
                  <span className={styles.faceCount}>{cluster?.face_count} faces</span>
                </div>

                {/* Entity link */}
                {cluster?.entity_id ? (
                  <div className={styles.entityLinkedRow}>
                    <div className={styles.entityBadge}>
                      <Icon name="Link" size="xs" className={styles.entityBadgeIcon} />
                      <span className={styles.entityBadgeText}>
                        {cluster.entity_name ?? cluster.name}
                      </span>
                    </div>
                    <button
                      onClick={handleUnlink}
                      disabled={saving}
                      className={styles.unlinkButton}
                      title="Remove entity link"
                    >
                      <Icon name="Unlink" size="xs" />
                    </button>
                  </div>
                ) : (
                  <div className={styles.linkPanel}>
                    <div className={styles.linkLabel}>Link to entity</div>
                    <EntitySearch onSelect={handleLinkEntity} placeholder="Search for a person…" />
                    <p className={styles.linkHelp}>
                      Linking tags all {cluster?.face_count} photos to this person in the media
                      browser.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Face grid */}
            <div className={styles.facesGrid}>
              {clusterDetail.faces.map((face) => (
                <div key={face.id} className={styles.faceCard}>
                  {face.crop_path ? (
                    <img
                      src={getImageUrl(face.crop_path) ?? undefined}
                      alt="Face crop"
                      className={styles.faceImage}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.emptyFace}>
                      <Icon name="User" size="md" />
                    </div>
                  )}
                  <div className={styles.faceOverlay}>
                    <span className={styles.faceOverlayText}>
                      {(face.detection_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <a
                    href={`/media?id=${face.media_item_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.faceActionLink}
                    title="View original photo"
                  >
                    <Icon name="ExternalLink" size="xs" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Gallery Grid ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      <div className={styles.galleryHeader}>
        <h1 className={styles.galleryTitle}>
          <Icon name="Users" size="md" className={styles.galleryTitleIcon} />
          Face Gallery
        </h1>
        <div className={styles.galleryMeta}>{clusters.length} People Found</div>
      </div>

      <div className={styles.galleryGrid}>
        {clusters.map((cluster) => (
          <button
            key={cluster.id}
            onClick={() => setSelectedClusterId(cluster.id)}
            className={styles.galleryCard}
          >
            <div className={styles.thumb}>
              {cluster.thumbnail_path ? (
                <img
                  src={getImageUrl(cluster.thumbnail_path) ?? undefined}
                  alt={cluster.name}
                  className={styles.galleryImage}
                  loading="lazy"
                />
              ) : (
                <div className={styles.emptyThumb}>
                  <Icon name="User" size="xl" />
                </div>
              )}
              <div className={styles.thumbGradient} />
              <div className={styles.countBadge}>{cluster.face_count}</div>
              {cluster.entity_id && (
                <div className={styles.linkedBadge} title="Linked to entity">
                  <Icon name="Link" size="xs" className={styles.linkedBadgeIcon} />
                </div>
              )}
            </div>

            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>{cluster.entity_name ?? cluster.name}</div>
              {cluster.entity_id && cluster.entity_name && cluster.entity_name !== cluster.name && (
                <div className={styles.cardSubtitle}>{cluster.name}</div>
              )}
              <div className={styles.cardDate}>
                {new Date(cluster.created_at).toLocaleDateString()}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FaceGallery;
