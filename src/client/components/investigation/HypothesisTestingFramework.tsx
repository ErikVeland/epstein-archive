import React, { useState, useEffect } from 'react';
import { Target, Plus, Edit3, Trash2, Link, User, FileText } from 'lucide-react';
import { EvidenceItem, Hypothesis as BaseHypothesis } from '../../types/investigation';

// Extended Hypothesis type with additional fields for testing
// Extended Hypothesis type with additional fields for testing
interface Hypothesis extends Omit<BaseHypothesis, 'status'> {
  status: 'draft' | 'testing' | 'supported' | 'refuted' | 'revised' | BaseHypothesis['status'];
  evidenceLinks: EvidenceLink[];
  revisions: HypothesisRevision[];
  updatedAt: Date;
}

interface EvidenceLink {
  id: string;
  evidenceId: string;
  hypothesisId: string;
  relevance: 'supporting' | 'contradicting' | 'neutral';
  weight: number; // 1-10
  notes: string;
  createdAt: Date;
}

interface HypothesisRevision {
  id: string;
  hypothesisId: string;
  title: string;
  description: string;
  confidence: number;
  reason: string;
  createdAt: Date;
  createdBy: string;
}

interface HypothesisTestingFrameworkProps {
  investigationId: string;
  initialHypothesis?: string;
  evidenceItems: EvidenceItem[];
  onHypothesesUpdate: (hypotheses: Hypothesis[]) => void;
}

export const HypothesisTestingFramework: React.FC<HypothesisTestingFrameworkProps> = ({
  investigationId,
  initialHypothesis = '',
  evidenceItems,
  onHypothesesUpdate,
}) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [activeHypothesis, setActiveHypothesis] = useState<Hypothesis | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newHypothesis, setNewHypothesis] = useState({
    title: '',
    description: '',
  });
  const [linkingEvidence, setLinkingEvidence] = useState<{ [key: string]: boolean }>({});
  const [linkData, setLinkData] = useState({
    evidenceId: '',
    relevance: 'supporting' as 'supporting' | 'contradicting' | 'neutral',
    weight: 5,
    notes: '',
  });

  // Fetch hypotheses from API on mount
  useEffect(() => {
    const fetchHypotheses = async () => {
      try {
        const response = await fetch(`/api/investigations/${investigationId}/hypotheses`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const loadedHypotheses: Hypothesis[] = data.map((h: any) => ({
              id: `hyp-${h.id}`,
              investigationId,
              title: h.title,
              description: h.description || '',
              status: (h.status || 'proposed') as Hypothesis['status'],
              confidence: h.confidence || 50,
              createdAt: new Date(h.created_at || Date.now()),
              updatedAt: new Date(h.updated_at || Date.now()),
              createdBy: 'System',
              evidenceLinks: [],
              revisions: [],
              evidence: [],
              relatedHypotheses: [],
            }));
            setHypotheses(loadedHypotheses);
            setActiveHypothesis(loadedHypotheses[0]);
            onHypothesesUpdate(loadedHypotheses);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching hypotheses:', error);
      }

      // Fallback: If no hypotheses from API and we have an initialHypothesis, create one
      if (initialHypothesis && hypotheses.length === 0) {
        const defaultHypothesis: Hypothesis = {
          id: 'hyp-1',
          investigationId,
          title: 'Initial Investigation Hypothesis',
          description: initialHypothesis,
          status: 'testing',
          confidence: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'CurrentUser',
          evidenceLinks: [],
          revisions: [],
          evidence: [],
          relatedHypotheses: [],
        };
        setHypotheses([defaultHypothesis]);
        setActiveHypothesis(defaultHypothesis);
        onHypothesesUpdate([defaultHypothesis]);
      }
    };

    if (investigationId) {
      fetchHypotheses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hypotheses.length, initialHypothesis, onHypothesesUpdate are stable or only needed on mount
  }, [investigationId]);

  const createHypothesis = () => {
    if (!newHypothesis.title.trim()) return;

    const hypothesis: Hypothesis = {
      id: `hyp-${Date.now()}`,
      investigationId,
      title: newHypothesis.title,
      description: newHypothesis.description,
      status: 'draft',
      confidence: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'CurrentUser',
      evidenceLinks: [],
      revisions: [],
      evidence: [],
      relatedHypotheses: [],
    };

    const updatedHypotheses = [...hypotheses, hypothesis];
    setHypotheses(updatedHypotheses);
    setActiveHypothesis(hypothesis);
    setShowNewForm(false);
    setNewHypothesis({ title: '', description: '' });
    onHypothesesUpdate(updatedHypotheses);
  };

  const updateHypothesisStatus = (hypothesisId: string, status: Hypothesis['status']) => {
    const updatedHypotheses = hypotheses.map((hyp) =>
      hyp.id === hypothesisId ? { ...hyp, status, updatedAt: new Date() } : hyp,
    );
    setHypotheses(updatedHypotheses);
    if (activeHypothesis?.id === hypothesisId) {
      setActiveHypothesis({ ...activeHypothesis, status, updatedAt: new Date() });
    }
    onHypothesesUpdate(updatedHypotheses);
  };

  const linkEvidenceToHypothesis = (hypothesisId: string) => {
    if (!linkData.evidenceId) return;

    const evidenceLink: EvidenceLink = {
      id: `link-${Date.now()}`,
      evidenceId: linkData.evidenceId,
      hypothesisId,
      relevance: linkData.relevance,
      weight: linkData.weight,
      notes: linkData.notes,
      createdAt: new Date(),
    };

    const updatedHypotheses = hypotheses.map((hyp) =>
      hyp.id === hypothesisId
        ? {
            ...hyp,
            evidenceLinks: [...hyp.evidenceLinks, evidenceLink],
            updatedAt: new Date(),
          }
        : hyp,
    );

    setHypotheses(updatedHypotheses);
    if (activeHypothesis?.id === hypothesisId) {
      setActiveHypothesis({
        ...activeHypothesis,
        evidenceLinks: [...activeHypothesis.evidenceLinks, evidenceLink],
        updatedAt: new Date(),
      });
    }
    setLinkingEvidence({ ...linkingEvidence, [hypothesisId]: false });
    setLinkData({
      evidenceId: '',
      relevance: 'supporting',
      weight: 5,
      notes: '',
    });
    onHypothesesUpdate(updatedHypotheses);
  };

  const unlinkEvidence = (hypothesisId: string, linkId: string) => {
    const updatedHypotheses = hypotheses.map((hyp) =>
      hyp.id === hypothesisId
        ? {
            ...hyp,
            evidenceLinks: hyp.evidenceLinks.filter((link) => link.id !== linkId),
            updatedAt: new Date(),
          }
        : hyp,
    );

    setHypotheses(updatedHypotheses);
    if (activeHypothesis?.id === hypothesisId) {
      setActiveHypothesis({
        ...activeHypothesis,
        evidenceLinks: activeHypothesis.evidenceLinks.filter((link) => link.id !== linkId),
        updatedAt: new Date(),
      });
    }
    onHypothesesUpdate(updatedHypotheses);
  };

  const reviseHypothesis = (
    hypothesisId: string,
    revisionData: { title: string; description: string; reason: string },
  ) => {
    const hypothesis = hypotheses.find((hyp) => hyp.id === hypothesisId);
    if (!hypothesis) return;

    const revision: HypothesisRevision = {
      id: `rev-${Date.now()}`,
      hypothesisId,
      title: revisionData.title,
      description: revisionData.description,
      confidence: hypothesis.confidence,
      reason: revisionData.reason,
      createdAt: new Date(),
      createdBy: 'CurrentUser',
    };

    const updatedHypotheses = hypotheses.map((hyp) =>
      hyp.id === hypothesisId
        ? {
            ...hyp,
            title: revisionData.title,
            description: revisionData.description,
            revisions: [...hyp.revisions, revision],
            updatedAt: new Date(),
            status: 'revised' as Hypothesis['status'],
          }
        : hyp,
    );

    setHypotheses(updatedHypotheses);
    if (activeHypothesis?.id === hypothesisId) {
      setActiveHypothesis({
        ...activeHypothesis,
        title: revisionData.title,
        description: revisionData.description,
        revisions: [...activeHypothesis.revisions, revision],
        updatedAt: new Date(),
        status: 'revised' as Hypothesis['status'],
      });
    }
    onHypothesesUpdate(updatedHypotheses);
  };

  const getEvidenceItemById = (id: string) => {
    return evidenceItems.find((item) => item.id === id);
  };

  return (
    <div className="bg-[var(--glass-bg-strong)] rounded-[var(--radius-xl)] border border-[var(--glass-border)]">
      {/* Header */}
      <div className="border-b border-[var(--glass-border)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-[var(--accent)]" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Hypothesis Testing Framework
            </h2>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Hypothesis</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
        <p className="text-[var(--text-muted)] mt-2">
          Systematic hypothesis testing with evidence linking, confidence scoring, and revision
          tracking
        </p>
      </div>

      {/* New Hypothesis Form */}
      {showNewForm && (
        <div className="border-b border-[var(--glass-border)] p-6 bg-[var(--glass-bg)]/50">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Create New Hypothesis
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Title
              </label>
              <input
                type="text"
                value={newHypothesis.title}
                onChange={(e) => setNewHypothesis({ ...newHypothesis, title: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                placeholder="Enter hypothesis title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <textarea
                value={newHypothesis.description}
                onChange={(e) =>
                  setNewHypothesis({ ...newHypothesis, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--text-primary)]"
                rows={3}
                placeholder="Describe your hypothesis"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createHypothesis}
                className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--accent)] rounded-[var(--radius-lg)] hover:bg-blue-700 transition-colors"
              >
                Create Hypothesis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hypotheses List */}
      <div className="p-6">
        {hypotheses.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              No hypotheses yet
            </h3>
            <p className="text-[var(--text-muted)] mb-4">
              Create your first hypothesis to begin testing
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="px-4 py-2 bg-[var(--accent)] text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-blue-700 transition-colors"
            >
              Create Hypothesis
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {hypotheses.map((hypothesis) => (
              <div
                key={hypothesis.id}
                className={`border rounded-[var(--radius-xl)] p-5 transition-all ${
                  activeHypothesis?.id === hypothesis.id
                    ? 'border-[var(--accent)] bg-blue-900/20'
                    : 'border-[var(--glass-border)] bg-[var(--glass-bg)]/50 hover:bg-[var(--glass-bg)]'
                }`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setActiveHypothesis(activeHypothesis?.id === hypothesis.id ? null : hypothesis)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                          {hypothesis.title}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            hypothesis.status === 'draft'
                              ? 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]'
                              : hypothesis.status === 'testing'
                                ? 'bg-blue-900 text-[var(--accent)]'
                                : hypothesis.status === 'supported'
                                  ? 'bg-green-900 text-green-300'
                                  : hypothesis.status === 'refuted'
                                    ? 'bg-red-900 text-red-300'
                                    : 'bg-yellow-900 text-yellow-300'
                          }`}
                        >
                          {hypothesis.status}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm mb-3 break-words">
                        {hypothesis.description}
                      </p>

                      {/* Confidence Meter */}
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                            <span>Confidence</span>
                            <span>{hypothesis.confidence}%</span>
                          </div>
                          <div className="w-full bg-[var(--glass-bg-highlight)] rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                hypothesis.confidence < 30
                                  ? 'bg-red-500'
                                  : hypothesis.confidence < 70
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                              }`}
                              style={{ width: `${hypothesis.confidence}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)]">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-[var(--glass-bg-highlight)]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-[var(--text-muted)] space-x-4">
                    <span>Created by {hypothesis.createdBy}</span>
                    <span>•</span>
                    <span>{hypothesis.createdAt.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{hypothesis.evidenceLinks.length} evidence items</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {activeHypothesis?.id === hypothesis.id && (
                  <div className="mt-5 pt-5 border-t border-[var(--glass-border)]">
                    {/* Evidence Links */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-[var(--text-secondary)]">
                          Linked Evidence
                        </h4>
                        <button
                          onClick={() =>
                            setLinkingEvidence({
                              ...linkingEvidence,
                              [hypothesis.id]: !linkingEvidence[hypothesis.id],
                            })
                          }
                          className="text-xs text-[var(--accent)] hover:text-[var(--accent)] flex items-center"
                        >
                          <Link className="w-3 h-3 mr-1" />
                          Link Evidence
                        </button>
                      </div>

                      {/* Link Evidence Form */}
                      {linkingEvidence[hypothesis.id] && (
                        <div className="mb-4 p-4 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]">
                          <h5 className="text-sm font-medium text-[var(--text-primary)] mb-3">
                            Link Evidence to Hypothesis
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">
                                Evidence Item
                              </label>
                              <select
                                value={linkData.evidenceId}
                                onChange={(e) =>
                                  setLinkData({ ...linkData, evidenceId: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm"
                              >
                                <option value="">Select evidence</option>
                                {evidenceItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">
                                Relevance
                              </label>
                              <select
                                value={linkData.relevance}
                                onChange={(e) =>
                                  setLinkData({
                                    ...linkData,
                                    relevance: e.target.value as any,
                                  })
                                }
                                className="w-full px-2 py-1 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm"
                              >
                                <option value="supporting">Supporting</option>
                                <option value="contradicting">Contradicting</option>
                                <option value="neutral">Neutral</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">
                                Weight: {linkData.weight}
                              </label>
                              <input
                                type="range"
                                min="1"
                                max="10"
                                value={linkData.weight}
                                onChange={(e) =>
                                  setLinkData({
                                    ...linkData,
                                    weight: parseInt(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">
                                Notes
                              </label>
                              <input
                                type="text"
                                value={linkData.notes}
                                onChange={(e) =>
                                  setLinkData({ ...linkData, notes: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-[var(--glass-bg-highlight)] border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm"
                                placeholder="Add notes about this link"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2 mt-3">
                            <button
                              onClick={() =>
                                setLinkingEvidence({
                                  ...linkingEvidence,
                                  [hypothesis.id]: false,
                                })
                              }
                              className="px-3 py-1 text-xs text-[var(--text-secondary)] bg-[var(--glass-bg-highlight)] rounded hover:bg-[var(--glass-bg-highlight)]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => linkEvidenceToHypothesis(hypothesis.id)}
                              className="px-3 py-1 text-xs text-[var(--text-primary)] bg-[var(--accent)] rounded hover:bg-blue-700"
                            >
                              Link Evidence
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Evidence List */}
                      {hypothesis.evidenceLinks.length > 0 ? (
                        <div className="space-y-2">
                          {hypothesis.evidenceLinks.map((link) => {
                            const evidenceItem = getEvidenceItemById(link.evidenceId);
                            return (
                              <div
                                key={link.id}
                                className="flex items-center justify-between p-3 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                              >
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      link.relevance === 'supporting'
                                        ? 'bg-green-500'
                                        : link.relevance === 'contradicting'
                                          ? 'bg-red-500'
                                          : 'bg-[var(--glass-bg-highlight)]'
                                    }`}
                                  ></div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                                        {evidenceItem?.title || 'Unknown Evidence'}
                                      </span>
                                      <span
                                        className={`text-xs px-2 py-0.5 rounded ${
                                          link.relevance === 'supporting'
                                            ? 'bg-green-900 text-green-300'
                                            : link.relevance === 'contradicting'
                                              ? 'bg-red-900 text-red-300'
                                              : 'bg-[var(--glass-bg-highlight)] text-[var(--text-secondary)]'
                                        }`}
                                      >
                                        {link.relevance}
                                      </span>
                                    </div>
                                    {link.notes && (
                                      <p className="text-xs text-[var(--text-muted)] mt-1">
                                        {link.notes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-[var(--text-muted)]">
                                    Weight: {link.weight}
                                  </span>
                                  <button
                                    onClick={() => unlinkEvidence(hypothesis.id, link.id)}
                                    className="text-[var(--text-muted)] hover:text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-[var(--text-muted)]">
                          <p>No evidence linked to this hypothesis yet</p>
                        </div>
                      )}
                    </div>

                    {/* Revision History */}
                    {hypothesis.revisions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                          Revision History
                        </h4>
                        <div className="space-y-3">
                          {hypothesis.revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="p-3 bg-[var(--glass-bg-highlight)] rounded-[var(--radius-lg)]"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-[var(--text-muted)]" />
                                  <span className="text-sm text-[var(--text-primary)]">
                                    {revision.createdBy}
                                  </span>
                                </div>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {revision.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] mb-2">
                                {revision.reason}
                              </p>
                              <div className="text-sm text-[var(--text-secondary)]">
                                <p className="font-medium truncate">{revision.title}</p>
                                <p className="mt-1 break-words">{revision.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          updateHypothesisStatus(
                            hypothesis.id,
                            hypothesis.status === 'testing' ? 'supported' : 'testing',
                          )
                        }
                        className={`px-3 py-1.5 text-xs rounded-[var(--radius-lg)] ${
                          hypothesis.status === 'supported'
                            ? 'bg-green-900 text-green-300 hover:bg-green-800'
                            : 'bg-green-700 text-[var(--text-primary)] hover:bg-green-600'
                        }`}
                      >
                        {hypothesis.status === 'supported' ? 'Mark as Tested' : 'Mark as Supported'}
                      </button>
                      <button
                        onClick={() =>
                          updateHypothesisStatus(
                            hypothesis.id,
                            hypothesis.status === 'testing' ? 'refuted' : 'testing',
                          )
                        }
                        className={`px-3 py-1.5 text-xs rounded-[var(--radius-lg)] ${
                          hypothesis.status === 'refuted'
                            ? 'bg-red-900 text-red-300 hover:bg-red-800'
                            : 'bg-red-700 text-[var(--text-primary)] hover:bg-red-600'
                        }`}
                      >
                        {hypothesis.status === 'refuted' ? 'Mark as Tested' : 'Mark as Refuted'}
                      </button>
                      <button
                        onClick={() => {
                          const newTitle = prompt('New hypothesis title:', hypothesis.title);
                          const newDescription = prompt(
                            'New hypothesis description:',
                            hypothesis.description,
                          );
                          const reason = prompt('Reason for revision:');

                          if (newTitle && newDescription && reason) {
                            reviseHypothesis(hypothesis.id, {
                              title: newTitle,
                              description: newDescription,
                              reason,
                            });
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-yellow-700 text-[var(--text-primary)] rounded-[var(--radius-lg)] hover:bg-yellow-600"
                      >
                        Revise Hypothesis
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
