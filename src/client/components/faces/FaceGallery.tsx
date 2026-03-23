import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../common/Icon';
import { useToasts } from '../common/useToasts';

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

  return (
    <div className="relative" ref={ref}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-slate-500 focus:border-[var(--accent)] focus:outline-none"
      />
      {open && (results.length > 0 || searching) && (
        <div className="absolute z-50 mt-1 w-full bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] overflow-hidden">
          {searching ? (
            <div className="p-3 text-sm text-[var(--text-muted)] text-center">Searching…</div>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {results.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => {
                    onSelect(entity);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--glass-bg-highlight)]/60 text-left"
                >
                  <div>
                    <div className="text-sm text-[var(--text-primary)] font-medium">
                      {entity.name}
                    </div>
                    {entity.role && (
                      <div className="text-xs text-[var(--text-muted)]">{entity.role}</div>
                    )}
                  </div>
                  <Icon
                    name="Link"
                    size="xs"
                    className="text-[var(--text-muted)] flex-shrink-0 ml-2"
                  />
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
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [clusterDetail, setClusterDetail] = useState<ClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToasts();

  const fetchClusters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/faces/clusters');
      if (!res.ok) throw new Error('Failed to fetch clusters');
      setClusters(await res.json());
    } catch {
      addToast({ text: 'Failed to load face clusters', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    void fetchClusters();
  }, [fetchClusters]);

  useEffect(() => {
    if (!selectedClusterId) {
      setClusterDetail(null);
      return;
    }
    const load = async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/faces/clusters/${selectedClusterId}`);
        if (!res.ok) throw new Error('Failed');
        setClusterDetail(await res.json());
      } catch {
        addToast({ text: 'Failed to load cluster details', type: 'error' });
      } finally {
        setDetailLoading(false);
      }
    };
    void load();
  }, [selectedClusterId, addToast]);

  const patchCluster = async (payload: Record<string, unknown>) => {
    if (!selectedClusterId) return null;
    setSaving(true);
    try {
      const res = await fetch(`/api/faces/clusters/${selectedClusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed');
      return await res.json();
    } finally {
      setSaving(false);
    }
  };

  const handleLinkEntity = async (entity: EntityResult) => {
    try {
      const updated = await patchCluster({ entity_id: entity.id, name: entity.name });
      if (!updated) return;
      setClusterDetail((prev) =>
        prev ? { ...prev, cluster: { ...prev.cluster, ...updated } } : null,
      );
      setClusters((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      const count = updated.tagged_photos ?? 0;
      addToast({
        text: `Linked to ${entity.name} — ${count} photo${count !== 1 ? 's' : ''} tagged`,
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
      setClusterDetail((prev) =>
        prev ? { ...prev, cluster: { ...prev.cluster, ...updated } } : null,
      );
      setClusters((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)]" />
      </div>
    );
  }

  // ── Detail View ─────────────────────────────────────────────────────────────
  if (selectedClusterId) {
    const cluster = clusterDetail?.cluster;
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedClusterId(null)}
          className="flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <Icon name="ChevronLeft" size="sm" className="mr-2" />
          Back to Gallery
        </button>

        {detailLoading || !clusterDetail ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-start gap-6 mb-8 border-b border-[var(--glass-border)] pb-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--accent)]/50 bg-[var(--glass-bg)] flex-shrink-0">
                {cluster?.thumbnail_path ? (
                  <img
                    src={getImageUrl(cluster.thumbnail_path) ?? undefined}
                    alt={cluster.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <Icon name="User" size="lg" />
                  </div>
                )}
              </div>

              {/* Identity panel */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">
                    {cluster?.name}
                  </h1>
                  <span className="text-[var(--text-muted)] text-sm flex-shrink-0">
                    {cluster?.face_count} faces
                  </span>
                </div>

                {/* Entity link */}
                {cluster?.entity_id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-[var(--radius-lg)]">
                      <Icon name="Link" size="xs" className="text-[var(--accent)]" />
                      <span className="text-sm text-[var(--accent)] font-medium">
                        {cluster.entity_name ?? cluster.name}
                      </span>
                    </div>
                    <button
                      onClick={handleUnlink}
                      disabled={saving}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                      title="Remove entity link"
                    >
                      <Icon name="Unlink" size="xs" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 max-w-xs">
                    <div className="text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider font-medium">
                      Link to entity
                    </div>
                    <EntitySearch onSelect={handleLinkEntity} placeholder="Search for a person…" />
                    <p className="text-xs text-[var(--text-primary)] mt-1.5">
                      Linking tags all {cluster?.face_count} photos to this person in the media
                      browser.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Face grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {clusterDetail.faces.map((face) => (
                <div
                  key={face.id}
                  className="relative group aspect-square bg-[var(--glass-bg)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--glass-border)] hover:border-[var(--accent)]/50 transition-all"
                >
                  {face.crop_path ? (
                    <img
                      src={getImageUrl(face.crop_path) ?? undefined}
                      alt="Face crop"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)]">
                      <Icon name="User" size="md" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {(face.detection_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <a
                    href={`/media?id=${face.media_item_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-[var(--text-primary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--accent)] transition-all"
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <Icon name="Users" size="md" className="text-[var(--accent)]" />
          Face Gallery
        </h1>
        <div className="text-sm text-[var(--text-muted)]">{clusters.length} People Found</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {clusters.map((cluster) => (
          <button
            key={cluster.id}
            onClick={() => setSelectedClusterId(cluster.id)}
            className="group flex flex-col bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-xl)] overflow-hidden hover:border-[var(--accent)]/50 hover:shadow-[var(--glass-shadow)] hover:shadow-cyan-500/10 transition-all duration-300 text-left"
          >
            <div className="aspect-square w-full bg-[var(--glass-bg)] relative overflow-hidden">
              {cluster.thumbnail_path ? (
                <img
                  src={getImageUrl(cluster.thumbnail_path) ?? undefined}
                  alt={cluster.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-primary)] group-hover:text-[var(--text-muted)]">
                  <Icon name="User" size="xl" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-mono text-[var(--accent)] border border-cyan-900/50">
                {cluster.face_count}
              </div>
              {cluster.entity_id && (
                <div
                  className="absolute top-2 left-2 p-1 bg-[var(--accent)]/80 rounded-full"
                  title="Linked to entity"
                >
                  <Icon name="Link" size="xs" className="text-[var(--text-primary)]" />
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {cluster.entity_name ?? cluster.name}
              </div>
              {cluster.entity_id && cluster.entity_name && cluster.entity_name !== cluster.name && (
                <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                  {cluster.name}
                </div>
              )}
              <div className="text-xs text-[var(--text-primary)] mt-0.5">
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
