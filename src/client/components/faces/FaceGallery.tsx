import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../common/Icon';
import { useToasts } from '../common/useToasts';

interface FaceCluster {
  id: string;
  name: string;
  is_hidden: boolean;
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

export const FaceGallery: React.FC = () => {
  const [clusters, setClusters] = useState<FaceCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [clusterDetail, setClusterDetail] = useState<ClusterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const { addToast } = useToasts();

  const fetchClusters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/faces/clusters');
      if (!res.ok) throw new Error('Failed to fetch clusters');
      const data = await res.json();
      setClusters(data);
    } catch (error) {
      console.error(error);
      addToast({ text: 'Failed to load face clusters', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Load Clusters
  useEffect(() => {
    void fetchClusters();
  }, [fetchClusters]);

  // Load Detail
  useEffect(() => {
    if (!selectedClusterId) {
      setClusterDetail(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setDetailLoading(true);
        const res = await fetch(`/api/faces/clusters/${selectedClusterId}`);
        if (!res.ok) throw new Error('Failed to fetch cluster details');
        const data = await res.json();
        setClusterDetail(data);
        setNewName(data.cluster.name);
      } catch (error) {
        console.error(error);
        addToast({ text: 'Failed to load cluster details', type: 'error' });
      } finally {
        setDetailLoading(false);
      }
    };

    void fetchDetail();
  }, [selectedClusterId, addToast]);

  const handleRename = async () => {
    if (!selectedClusterId || !newName.trim()) return;

    try {
      const res = await fetch(`/api/faces/clusters/${selectedClusterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) throw new Error('Failed to rename cluster');

      const updated = await res.json();

      // Update local state
      setClusterDetail((prev) => (prev ? { ...prev, cluster: updated } : null));
      setClusters((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name } : c)),
      );
      setEditingName(false);
      addToast({ text: 'Cluster renamed', type: 'success' });
    } catch (error) {
      console.error(error);
      addToast({ text: 'Failed to rename', type: 'error' });
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return '/images/placeholder-face.png'; // You might need a placeholder
    // Ensure path starts with /
    return path.startsWith('/') ? path : `/${path}`;
  };

  if (loading && !clusters.length) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  // Detail View
  if (selectedClusterId) {
    return (
      <div className="p-6">
        <button
          onClick={() => setSelectedClusterId(null)}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <Icon name="ChevronLeft" size="sm" className="mr-2" />
          Back to Gallery
        </button>

        {detailLoading || !clusterDetail ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8 border-b border-slate-700 pb-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-500/50 bg-slate-800">
                  {clusterDetail.cluster.thumbnail_path ? (
                    <img
                      src={getImageUrl(clusterDetail.cluster.thumbnail_path)}
                      alt={clusterDetail.cluster.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Icon name="User" size="lg" />
                    </div>
                  )}
                </div>

                <div>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-xl text-white focus:border-cyan-500 outline-none"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                      />
                      <button
                        onClick={handleRename}
                        className="p-2 bg-cyan-600 rounded hover:bg-cyan-500 text-white"
                      >
                        <Icon name="Check" size="sm" />
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="p-2 bg-slate-700 rounded hover:bg-slate-600 text-slate-300"
                      >
                        <Icon name="X" size="sm" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-white">
                        {clusterDetail.cluster.name}
                      </h1>
                      <button
                        onClick={() => {
                          setNewName(clusterDetail.cluster.name);
                          setEditingName(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Icon name="Edit2" size="sm" />
                      </button>
                    </div>
                  )}
                  <div className="text-slate-400 mt-1">
                    {clusterDetail.cluster.face_count} faces detected
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {clusterDetail.faces.map((face) => (
                <div
                  key={face.id}
                  className="relative group aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500/50 transition-all"
                >
                  <img
                    src={getImageUrl(face.crop_path)}
                    alt="Face crop"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="text-xs text-slate-300 truncate">
                      Confidence: {(face.detection_confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <a
                    href={`/documents?id=${face.media_item_id}`} // Assuming media_item_id links to documents/media
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-cyan-600 transition-all"
                    title="View original image"
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

  // Gallery Grid View
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icon name="Users" size="md" className="text-cyan-400" />
          Face Gallery
        </h1>
        <div className="text-sm text-slate-400">{clusters.length} People Found</div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {clusters.map((cluster) => (
          <button
            key={cluster.id}
            onClick={() => setSelectedClusterId(cluster.id)}
            className="group flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 text-left"
          >
            <div className="aspect-square w-full bg-slate-800 relative overflow-hidden">
              {cluster.thumbnail_path ? (
                <img
                  src={getImageUrl(cluster.thumbnail_path)}
                  alt={cluster.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600 group-hover:text-slate-500">
                  <Icon name="User" size="xl" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-mono text-cyan-300 border border-cyan-900/50">
                {cluster.face_count}
              </div>
            </div>

            <div className="p-3">
              <div className="font-medium text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                {cluster.name}
              </div>
              <div className="text-xs text-slate-500 mt-1">
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
