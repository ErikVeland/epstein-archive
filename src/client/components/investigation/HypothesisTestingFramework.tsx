import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const parseDate = (value: unknown): Date =>
  typeof value === 'string' || typeof value === 'number' || value instanceof Date
    ? new Date(value)
    : new Date();

import styles from './HypothesisTestingFramework.module.css';

/** Shape of a raw hypothesis returned by the investigations API. */
interface RawHypothesis {
  id: number | string;
  title: string;
  description?: string;
  status?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
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
  const [hypothesesSeeded, setHypothesesSeeded] = useState(false);

  const { data: fetchedHypotheses } = useQuery({
    queryKey: ['investigation-hypotheses', investigationId],
    queryFn: async () => {
      const response = await fetch(`/api/investigations/${investigationId}/hypotheses`);
      if (!response.ok) return null;
      const data = await response.json();
      return (data || []) as RawHypothesis[];
    },
    enabled: Boolean(investigationId),
  });

  // Seed local mutable state from query data once
  React.useEffect(() => {
    if (hypothesesSeeded) return;
    if (fetchedHypotheses === undefined) return; // still loading

    if (fetchedHypotheses && fetchedHypotheses.length > 0) {
      const loadedHypotheses: Hypothesis[] = fetchedHypotheses.map((h) => ({
        id: `hyp-${h.id}`,
        investigationId,
        title: h.title,
        description: h.description || '',
        status: (h.status || 'proposed') as Hypothesis['status'],
        confidence: h.confidence || 50,
        createdAt: parseDate(h.created_at),
        updatedAt: parseDate(h.updated_at),
        createdBy: 'System',
        evidenceLinks: [],
        revisions: [],
        evidence: [],
        relatedHypotheses: [],
      }));
      setHypotheses(loadedHypotheses);
      setActiveHypothesis(loadedHypotheses[0]);
      onHypothesesUpdate(loadedHypotheses);
      setHypothesesSeeded(true);
      return;
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
    setHypothesesSeeded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeded once on first data arrival
  }, [fetchedHypotheses, hypothesesSeeded]);

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
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.titleGroup}>
            <Target className="w-6 h-6 text-[var(--accent)]" />
            <h2 className={styles.title}>Hypothesis Testing Framework</h2>
          </div>
          <button onClick={() => setShowNewForm(true)} className={styles.actionButton}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Hypothesis</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
        <p className={styles.subtitle}>
          Systematic hypothesis testing with evidence linking, confidence scoring, and revision
          tracking
        </p>
      </div>

      {/* New Hypothesis Form */}
      {showNewForm && (
        <div className={styles.formSection}>
          <h3 className={styles.formTitle}>Create New Hypothesis</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                value={newHypothesis.title}
                onChange={(e) => setNewHypothesis({ ...newHypothesis, title: e.target.value })}
                className={styles.input}
                placeholder="Enter hypothesis title"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea
                value={newHypothesis.description}
                onChange={(e) =>
                  setNewHypothesis({ ...newHypothesis, description: e.target.value })
                }
                className={styles.textarea}
                rows={3}
                placeholder="Describe your hypothesis"
              />
            </div>
            <div className={styles.formActions}>
              <button onClick={() => setShowNewForm(false)} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={createHypothesis} className={styles.actionButton}>
                Create Hypothesis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hypotheses List */}
      <div className={styles.content}>
        {hypotheses.length === 0 ? (
          <div className={styles.emptyState}>
            <Target className={styles.emptyIcon} />
            <h3 className={styles.formTitle}>No hypotheses yet</h3>
            <p className={styles.subtitle}>Create your first hypothesis to begin testing</p>
            <button onClick={() => setShowNewForm(true)} className={styles.actionButton}>
              Create Hypothesis
            </button>
          </div>
        ) : (
          <div className={styles.hypList}>
            {hypotheses.map((hypothesis) => (
              <div
                key={hypothesis.id}
                className={`${styles.hypCard} ${activeHypothesis?.id === hypothesis.id ? styles.hypCardActive : ''}`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setActiveHypothesis(activeHypothesis?.id === hypothesis.id ? null : hypothesis)
                  }
                >
                  <div className={styles.hypCardHeader}>
                    <div className={styles.hypHeaderInfo}>
                      <div className={styles.hypTitleRow}>
                        <h3 className={styles.hypTitle}>{hypothesis.title}</h3>
                        <span
                          className={`${styles.statusBadge} ${
                            hypothesis.status === 'draft'
                              ? styles.statusDraft
                              : hypothesis.status === 'testing'
                                ? styles.statusTesting
                                : hypothesis.status === 'supported'
                                  ? styles.statusSupported
                                  : hypothesis.status === 'refuted'
                                    ? styles.statusRefuted
                                    : styles.statusRevised
                          }`}
                        >
                          {hypothesis.status}
                        </span>
                      </div>
                      <p className={styles.hypDesc}>{hypothesis.description}</p>

                      {/* Confidence Meter */}
                      <div className={styles.confidenceRow}>
                        <div className={styles.confidenceLabelRow}>
                          <span>Confidence</span>
                          <span>{hypothesis.confidence}%</span>
                        </div>
                        <div className={styles.confidenceBarBg}>
                          <div
                            className={`${styles.confidenceBarFill} ${
                              hypothesis.confidence < 30
                                ? styles.confidenceLow
                                : hypothesis.confidence < 70
                                  ? styles.confidenceMed
                                  : styles.confidenceHigh
                            }`}
                            style={{ width: `${hypothesis.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.hypCardActions}>
                      <button className={styles.iconButton}>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className={styles.iconButton}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className={styles.hypMeta}>
                    <span>Created by {hypothesis.createdBy}</span>
                    <span>•</span>
                    <span>{hypothesis.createdAt.toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{hypothesis.evidenceLinks.length} evidence items</span>
                  </div>
                </div>

                {/* Expanded Details */}
                {activeHypothesis?.id === hypothesis.id && (
                  <div className={styles.details}>
                    {/* Evidence Links */}
                    <div className="mb-6">
                      <div className={styles.detailsHeader}>
                        <h4 className={styles.detailsTitle}>Linked Evidence</h4>
                        <button
                          onClick={() =>
                            setLinkingEvidence({
                              ...linkingEvidence,
                              [hypothesis.id]: !linkingEvidence[hypothesis.id],
                            })
                          }
                          className={styles.linkEvidenceButton}
                        >
                          <Link className="w-3 h-3" />
                          Link Evidence
                        </button>
                      </div>

                      {/* Link Evidence Form */}
                      {linkingEvidence[hypothesis.id] && (
                        <div className={styles.formSection}>
                          <h5 className={styles.formTitle}>Link Evidence to Hypothesis</h5>
                          <div className={styles.formGridTwoCol}>
                            <div className={styles.field}>
                              <label className={styles.label}>Evidence Item</label>
                              <select
                                value={linkData.evidenceId}
                                onChange={(e) =>
                                  setLinkData({ ...linkData, evidenceId: e.target.value })
                                }
                                className={styles.select}
                              >
                                <option value="">Select evidence</option>
                                {evidenceItems.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Relevance</label>
                              <select
                                value={linkData.relevance}
                                onChange={(e) =>
                                  setLinkData({
                                    ...linkData,
                                    relevance: e.target.value as
                                      | 'supporting'
                                      | 'contradicting'
                                      | 'neutral',
                                  })
                                }
                                className={styles.select}
                              >
                                <option value="supporting">Supporting</option>
                                <option value="contradicting">Contradicting</option>
                                <option value="neutral">Neutral</option>
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Weight: {linkData.weight}</label>
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
                            <div className={styles.field}>
                              <label className={styles.label}>Notes</label>
                              <input
                                type="text"
                                value={linkData.notes}
                                onChange={(e) =>
                                  setLinkData({ ...linkData, notes: e.target.value })
                                }
                                className={styles.input}
                                placeholder="Add notes about this link"
                              />
                            </div>
                          </div>
                          <div className={styles.formActions}>
                            <button
                              onClick={() =>
                                setLinkingEvidence({
                                  ...linkingEvidence,
                                  [hypothesis.id]: false,
                                })
                              }
                              className={styles.cancelButton}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => linkEvidenceToHypothesis(hypothesis.id)}
                              className={styles.actionButton}
                            >
                              Link Evidence
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Evidence List */}
                      {hypothesis.evidenceLinks.length > 0 ? (
                        <div className={styles.evidenceLinkList}>
                          {hypothesis.evidenceLinks.map((link) => {
                            const evidenceItem = getEvidenceItemById(link.evidenceId);
                            return (
                              <div key={link.id} className={styles.evidenceLinkCard}>
                                <div className={styles.evidenceLinkInfo}>
                                  <div
                                    className={`${styles.relevanceDot} ${
                                      link.relevance === 'supporting'
                                        ? styles.relevanceSupporting
                                        : link.relevance === 'contradicting'
                                          ? styles.relevanceContradicting
                                          : styles.relevanceNeutral
                                    }`}
                                  ></div>
                                  <div className={styles.evidenceLinkDetails}>
                                    <div className={styles.evidenceLinkHeader}>
                                      <FileText className={styles.evidenceIcon} />
                                      <span className={styles.evidenceTitle}>
                                        {evidenceItem?.title || 'Unknown Evidence'}
                                      </span>
                                      <span
                                        className={`${styles.statusBadge} ${
                                          link.relevance === 'supporting'
                                            ? styles.statusSupported
                                            : link.relevance === 'contradicting'
                                              ? styles.statusRefuted
                                              : styles.statusDraft
                                        }`}
                                      >
                                        {link.relevance}
                                      </span>
                                    </div>
                                    {link.notes && (
                                      <p className={styles.evidenceNotes}>{link.notes}</p>
                                    )}
                                  </div>
                                </div>
                                <div className={styles.hypMeta}>
                                  <span>Weight: {link.weight}</span>
                                  <button
                                    onClick={() => unlinkEvidence(hypothesis.id, link.id)}
                                    className={`${styles.iconButton} ${styles.evidenceUnlinkButton}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={styles.emptyState}>
                          <p className={styles.subtitle}>
                            No evidence linked to this hypothesis yet
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Revision History */}
                    {hypothesis.revisions.length > 0 && (
                      <div className={styles.revisions}>
                        <h4 className={styles.detailsTitle}>Revision History</h4>
                        <div className="space-y-3">
                          {hypothesis.revisions.map((revision) => (
                            <div key={revision.id} className={styles.revisionCard}>
                              <div className={styles.revisionHeader}>
                                <div className={styles.revisionUser}>
                                  <User className="w-4 h-4 text-[var(--text-muted)]" />
                                  <span>{revision.createdBy}</span>
                                </div>
                                <span className={styles.revisionDate}>
                                  {revision.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                              <p className={styles.revisionReason}>{revision.reason}</p>
                              <div className={styles.revisionContent}>
                                <p className={styles.revisionTitle}>{revision.title}</p>
                                <p className={styles.revisionDesc}>{revision.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.footerActions}>
                      <button
                        onClick={() =>
                          updateHypothesisStatus(
                            hypothesis.id,
                            hypothesis.status === 'testing' ? 'supported' : 'testing',
                          )
                        }
                        className={`${styles.statusButton} ${styles.supportButton} ${hypothesis.status === 'supported' ? styles.statusButtonActiveSupported : ''}`}
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
                        className={`${styles.statusButton} ${styles.refuteButton} ${hypothesis.status === 'refuted' ? styles.statusButtonActiveRefuted : ''}`}
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
                        className={`${styles.statusButton} ${styles.reviseButton}`}
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
