import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  AlertTriangle,
  FileSearch,
  User,
  Calendar,
  Tag,
  ExternalLink,
  Filter,
  BarChart3,
  MessageSquare,
  Trash2,
  Shield,
} from 'lucide-react';
import { ENTITY_CATEGORY_ICONS } from '../../../config/entityIcons';
import { EvidenceAnnotationPanel, EvidenceAnnotation } from '../documents/EvidenceAnnotation';
import { CloseButton } from '../common/CloseButton';
import Icon from '../common/Icon';
import { apiClient } from '../../services/apiClient';

type EntityRef = { entityId: string; fullName: string; entityCategory: string };

interface Evidence {
  id: number;
  evidenceType: string;
  title: string;
  description: string;
  sourcePath: string;
  redFlagRating: number;
  createdAt: string;
  notes?: string;
  relevance?: 'high' | 'medium' | 'low';
  addedAt?: string;
  annotationCount?: number;
}

interface Entity {
  id: number;
  fullName: string;
  entityCategory: string;
  evidenceCount: number;
}

interface InvestigationEvidencePanelProps {
  investigationId: string;
  onClose?: () => void;
  onChainOfCustody?: (evidenceId: string) => void;
}

export const InvestigationEvidencePanel: React.FC<InvestigationEvidencePanelProps> = ({
  investigationId,
  onClose,
  onChainOfCustody,
}) => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [entityCoverage, setEntityCoverage] = useState<Entity[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRelevance, setFilterRelevance] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedEvidence] = useState<Evidence | null>(null);
  const [annotatingEvidence, setAnnotatingEvidence] = useState<Evidence | null>(null);
  const [evidenceAnnotations, setEvidenceAnnotations] = useState<
    Record<number, EvidenceAnnotation[]>
  >({});

  // Entity connection state
  const [entityByEvidence, setEntityByEvidence] = useState<Record<string, EntityRef[]>>({});
  const [evidenceByEntity, setEvidenceByEntity] = useState<Record<string, string[]>>({});
  const [pivotEntityId, setPivotEntityId] = useState<string | null>(null);
  const [pivotEntityName, setPivotEntityName] = useState('');
  const [clusterMode, setClusterMode] = useState<'none' | 'entity' | 'date'>('none');

  useEffect(() => {
    loadEvidenceSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadEvidenceSummary is stable and only depends on investigationId
  }, [investigationId]);

  const loadEvidenceSummary = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getInvestigationEvidenceSummary(String(investigationId));
      setEvidence(data.evidence || []);
      setEntityCoverage(data.entityCoverage || []);
      setTypeBreakdown(data.typeBreakdown || {});
      setEntityByEvidence(data.entityByEvidence || {});
      setEvidenceByEntity(data.evidenceByEntity || {});
    } catch (error) {
      console.error('Error loading evidence summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvidence = async (id: number) => {
    if (!window.confirm('Remove this evidence item from the investigation?')) return;
    try {
      await apiClient.removeEvidenceFromInvestigation(String(id));
      setEvidence((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Error removing evidence:', error);
    }
  };

  const searchEvidence = async () => {
    if (!searchQuery.trim()) return;

    try {
      // Search across full dataset - documents, entities, and external sources
      const [evidenceResponse, documentsResponse, entitiesResponse] = await Promise.all([
        fetch(`/api/evidence/search?q=${encodeURIComponent(searchQuery)}&limit=20`),
        fetch(`/api/documents/search?q=${encodeURIComponent(searchQuery)}&limit=20`),
        fetch(`/api/entities/search?q=${encodeURIComponent(searchQuery)}&limit=20`),
      ]);

      const [evidenceData, documentsData, entitiesData] = await Promise.all([
        evidenceResponse.json(),
        documentsResponse.json(),
        entitiesResponse.json(),
      ]);

      // Combine all search results
      const combinedResults = [
        ...(evidenceData.results || []).map((item: any) => ({ ...item, source: 'evidence' })),
        ...(documentsData.results || []).map((item: any) => ({ ...item, source: 'document' })),
        ...(entitiesData.results || []).map((item: any) => ({ ...item, source: 'entity' })),
      ];

      setSearchResults(combinedResults);
    } catch (error) {
      console.error('Error searching evidence:', error);
    }
  };

  const addEvidence = async (evidenceId: number, relevance: 'high' | 'medium' | 'low') => {
    try {
      await fetch('/api/investigation/add-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId,
          evidenceId,
          relevance,
        }),
      });
      loadEvidenceSummary();
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding evidence:', error);
    }
  };

  const filteredEvidence = evidence.filter((e) => {
    const matchesSearch =
      !searchTerm ||
      e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.evidenceType === filterType;
    const matchesRelevance = filterRelevance === 'all' || e.relevance === filterRelevance;
    if (pivotEntityId) {
      const linked = evidenceByEntity[pivotEntityId] || [];
      if (!linked.includes(String(e.id))) return false;
    }
    return matchesSearch && matchesType && matchesRelevance;
  });

  const clusteredEvidence = useMemo((): Array<[string, Evidence[]]> | null => {
    if (clusterMode === 'none') return null;
    const groups: Record<string, Evidence[]> = {};
    filteredEvidence.forEach((e) => {
      let key: string;
      if (clusterMode === 'date') {
        key = new Date(e.createdAt).toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        });
      } else {
        const topEntity = (entityByEvidence[String(e.id)] || [])[0];
        key = topEntity?.fullName || 'No entity link';
      }
      (groups[key] ??= []).push(e);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [clusterMode, filteredEvidence, entityByEvidence]);

  const getEvidenceTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getRelevanceBadge = (relevance: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return colors[relevance as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const renderEvidenceRow = (item: Evidence) => (
    <div
      key={item.id}
      className="border border-slate-700 rounded-lg p-4 hover:bg-slate-700 transition cursor-pointer bg-slate-800"
      onClick={() => setSelectedEvidence(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-white truncate">{item.title || 'Untitled'}</h4>
          </div>
          <p className="text-sm text-slate-300 line-clamp-2">{item.description}</p>
          {(entityByEvidence[String(item.id)] || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {(entityByEvidence[String(item.id)] || []).slice(0, 4).map((ref) => (
                <button
                  key={ref.entityId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPivotEntityId(ref.entityId);
                    setPivotEntityName(ref.fullName);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-700 hover:bg-cyan-900/40 border border-slate-600 hover:border-cyan-700/50 text-slate-300 hover:text-cyan-300 transition-colors"
                  title={`Filter by ${ref.fullName}`}
                >
                  <Icon
                    name={
                      ((ENTITY_CATEGORY_ICONS as any)[ref.entityCategory]?.icon || 'User') as any
                    }
                    size="xs"
                    className="w-2.5 h-2.5 flex-shrink-0"
                  />
                  <span className="max-w-[120px] truncate">{ref.fullName}</span>
                </button>
              ))}
              {(entityByEvidence[String(item.id)] || []).length > 4 && (
                <span className="text-xs text-slate-500 self-center">
                  +{(entityByEvidence[String(item.id)] || []).length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1 ml-4">
          {item.relevance && (
            <span className={`text-xs px-2 py-1 rounded ${getRelevanceBadge(item.relevance)}`}>
              {item.relevance}
            </span>
          )}
          {item.redFlagRating > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-400">{item.redFlagRating}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <Tag className="w-3 h-3" />
            <span>{getEvidenceTypeLabel(item.evidenceType)}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAnnotatingEvidence(item);
            }}
            className="flex items-center space-x-1 text-purple-400 hover:text-purple-300"
            title="Annotate evidence"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Annotate</span>
            {(evidenceAnnotations[item.id]?.length || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-900/50 rounded-full">
                {evidenceAnnotations[item.id]?.length}
              </span>
            )}
          </button>
          <a
            href={`/evidence/${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
            onClick={(e) => e.stopPropagation()}
          >
            <span>View</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {onChainOfCustody && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChainOfCustody(String(item.id));
              }}
              className="flex items-center space-x-1 text-slate-400 hover:text-cyan-300"
              title="Chain of custody"
            >
              <Shield className="w-3 h-3" />
              <span>Custody</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteEvidence(item.id);
            }}
            className="flex items-center space-x-1 text-slate-400 hover:text-red-400"
            title="Remove from investigation"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading evidence...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700">
      {/* Header */}
      <div className="border-b border-slate-700 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center space-x-3">
              <FileSearch className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Evidence Collection</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 ml-9">
              Manage evidence linked to this investigation
            </p>
          </div>
          {onClose && (
            <CloseButton
              onClick={onClose}
              size="md"
              label="Close evidence collection panel"
              className="bg-transparent hover:bg-white/10 border-slate-700 text-slate-400 hover:text-white shrink-0"
            />
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-sm text-slate-300">Total Evidence</div>
            <div className="text-2xl font-bold text-blue-400">{evidence.length}</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-sm text-slate-300">Entities Covered</div>
            <div className="text-2xl font-bold text-green-400">{entityCoverage.length}</div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-sm text-slate-300">Evidence Types</div>
            <div className="text-2xl font-bold text-purple-400">
              {Object.keys(typeBreakdown).length}
            </div>
          </div>
        </div>
      </div>

      {/* Type Breakdown Chart */}
      <div className="border-b border-slate-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Evidence Type Breakdown</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(typeBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-300">{getEvidenceTypeLabel(type)}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-48 bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(count / evidence.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Entity Coverage */}
      <div className="border-b border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-white">Entity Coverage</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {entityCoverage.slice(0, 20).map((entity) => {
            const IconComponent = (ENTITY_CATEGORY_ICONS as any)[entity.entityCategory] || User;
            return (
              <div
                key={entity.id}
                className="flex items-center justify-between p-2 bg-slate-700 rounded"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <IconComponent className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-200 truncate">{entity.fullName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-blue-400 ml-2">
                    {entity.evidenceCount}
                  </span>
                  <button
                    title={`Filter evidence by ${entity.fullName}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPivotEntityId(String(entity.id));
                      setPivotEntityName(entity.fullName);
                    }}
                    className="ml-1 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <Filter className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-slate-700 p-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 h-10 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-700 text-white"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 px-4 h-10 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Add Evidence</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-3 md:space-y-0 md:space-x-3">
          <div className="hidden md:block">
            <Filter className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-center space-x-2 md:hidden mb-1">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400 font-medium">Filters</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-slate-600 rounded-lg px-3 h-10 text-sm bg-slate-700 text-white w-full md:w-auto"
          >
            <option value="all">All Types</option>
            {Object.keys(typeBreakdown).map((type) => (
              <option key={type} value={type}>
                {getEvidenceTypeLabel(type)}
              </option>
            ))}
          </select>
          <select
            value={filterRelevance}
            onChange={(e) => setFilterRelevance(e.target.value)}
            className="border border-slate-600 rounded-lg px-3 h-10 text-sm bg-slate-700 text-white w-full md:w-auto"
          >
            <option value="all">All Relevance</option>
            <option value="high">High Relevance</option>
            <option value="medium">Medium Relevance</option>
            <option value="low">Low Relevance</option>
          </select>
          <div className="flex items-center gap-0.5 border border-slate-600 rounded-lg overflow-hidden h-10">
            {(['none', 'entity', 'date'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setClusterMode(mode)}
                className={`px-2.5 h-full text-xs transition-colors whitespace-nowrap ${
                  clusterMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'none' ? 'List' : mode === 'entity' ? 'By Entity' : 'By Date'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pivot Banner */}
      {pivotEntityId && (
        <div className="mx-6 mt-4 px-3 py-2 bg-cyan-900/30 border border-cyan-700/50 rounded-lg flex items-center justify-between text-sm">
          <span className="text-cyan-300">
            Showing {filteredEvidence.length} items containing <strong>{pivotEntityName}</strong>
          </span>
          <button
            onClick={() => {
              setPivotEntityId(null);
              setPivotEntityName('');
            }}
            className="text-cyan-400 hover:text-white ml-3"
          >
            × Clear
          </button>
        </div>
      )}

      {/* Evidence List */}
      <div className="p-6 max-h-96 overflow-y-auto">
        {clusteredEvidence ? (
          clusteredEvidence.map(([groupName, items]) => (
            <div key={groupName} className="mb-4">
              <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm px-1 py-1.5 mb-2 border-b border-slate-700/50 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  {groupName}
                </span>
                <span className="text-xs text-slate-600">({items.length})</span>
              </div>
              <div className="space-y-3">{items.map(renderEvidenceRow)}</div>
            </div>
          ))
        ) : (
          <div className="space-y-3">{filteredEvidence.map(renderEvidenceRow)}</div>
        )}
      </div>

      {/* Add Evidence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-700">
            <div className="border-b border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add Evidence</h3>
                <CloseButton
                  onClick={() => setShowAddModal(false)}
                  size="md"
                  label="Close add evidence modal"
                  className="bg-transparent hover:bg-white/10 border-slate-700 text-slate-400 hover:text-white"
                />
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="text"
                  placeholder="Search evidence database..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchEvidence()}
                  className="flex-1 px-4 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white"
                />
                <button
                  onClick={searchEvidence}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Search
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={`${result.source}-${result.id}`}
                    className="border border-slate-700 rounded-lg p-4 bg-slate-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              result.source === 'evidence'
                                ? 'bg-blue-900 text-blue-200'
                                : result.source === 'document'
                                  ? 'bg-green-900 text-green-200'
                                  : 'bg-purple-900 text-purple-200'
                            }`}
                          >
                            {result.source}
                          </span>
                          <h4 className="font-semibold text-white truncate">
                            {result.title || result.fullName || 'Untitled'}
                          </h4>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2">{result.description}</p>
                        {result.source === 'entity' && (
                          <p className="text-xs text-slate-400 mt-1">
                            Category: {result.entityCategory}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {result.source === 'evidence'
                          ? getEvidenceTypeLabel(result.evidenceType)
                          : result.source === 'document'
                            ? 'Document'
                            : 'Entity'}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => addEvidence(result.id, 'high')}
                          className="text-xs px-3 py-1 bg-red-900 text-red-200 rounded hover:bg-red-800"
                        >
                          High
                        </button>
                        <button
                          onClick={() => addEvidence(result.id, 'medium')}
                          className="text-xs px-3 py-1 bg-yellow-900 text-yellow-200 rounded hover:bg-yellow-800"
                        >
                          Medium
                        </button>
                        <button
                          onClick={() => addEvidence(result.id, 'low')}
                          className="text-xs px-3 py-1 bg-slate-600 text-slate-200 rounded hover:bg-slate-500"
                        >
                          Low
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Annotation Modal */}
      {annotatingEvidence && (
        <EvidenceAnnotationPanel
          evidenceId={annotatingEvidence.id}
          evidenceTitle={annotatingEvidence.title || 'Evidence'}
          evidenceDescription={annotatingEvidence.description}
          investigationId={investigationId}
          onClose={() => setAnnotatingEvidence(null)}
          onAnnotationsChange={(annotations) => {
            setEvidenceAnnotations((prev) => ({
              ...prev,
              [annotatingEvidence.id]: annotations,
            }));
          }}
        />
      )}
    </div>
  );
};
