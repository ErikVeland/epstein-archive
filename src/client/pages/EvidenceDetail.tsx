/**
 * Evidence Detail Page
 *
 * Displays evidence with type-specific viewers and linked entities
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Tag,
  AlertTriangle,
  Users,
  Download,
  Share2,
  Bookmark,
  ChevronLeft,
  Activity,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { EmailViewer } from '../components/evidence/EmailViewer';
import { DepositionViewer } from '../components/evidence/DepositionViewer';
import { TableViewer } from '../components/evidence/TableViewer';
import { ImageViewer } from '../components/evidence/ImageViewer';
import { DocumentViewer } from '../components/evidence/DocumentViewer';
import { ContactListViewer } from '../components/evidence/ContactListViewer';
import { getEntityCategoryIcon } from '../../config/entityIcons';
import { ClaimsList } from '../components/evidence/ClaimsList';
import { SEO } from '../components/common/SEO';
import { apiClient } from '../services/apiClient';

interface Evidence {
  id: number;
  evidenceType: string;
  title: string;
  description: string;
  originalFilename: string;
  sourcePath: string;
  content: string;
  contentRefined?: string;
  extractedText: string;
  createdAt: string;
  modifiedAt: string;
  redFlagRating: number;
  tags: string[];
  metadata: Record<string, unknown>;
  entities: Array<{
    id: number;
    name: string;
    category: string;
    role: string;
    confidence: number;
    contextSnippet: string;
  }>;
  wordCount: number;
  fileSize: number;
  signalScore?: number;
  ocrQualityScore?: number;
  claims?: Record<string, unknown>[];
  sentences?: Record<string, unknown>[];
  unredaction_metrics?: {
    succeeded?: boolean;
    unredactedTextGain?: number;
  };
}

export function EvidenceDetail() {
  const { id } = useParams<{ id: string }>();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    fetchEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchEvidence is stable and only depends on id
  }, [id]);

  const fetchEvidence = async () => {
    try {
      setLoading(true);
      if (!id) {
        throw new Error('Evidence not found');
      }
      const data = await apiClient.getEvidence(id);
      setEvidence(data as Evidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const renderViewer = () => {
    if (!evidence) return null;

    switch (evidence.evidenceType) {
      case 'correspondence':
        return <EmailViewer evidence={evidence} />;
      case 'court_deposition':
        return <DepositionViewer evidence={evidence} />;
      case 'financial_record':
        return <TableViewer evidence={evidence} />;
      case 'contact_directory':
        return <ContactListViewer evidence={evidence} />;
      case 'media_scan':
        return <ImageViewer evidence={evidence} />;
      default:
        return <DocumentViewer evidence={evidence} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRedFlagColor = (rating: number): string => {
    if (rating >= 4) return 'text-red-600 bg-red-50';
    if (rating >= 2) return 'text-orange-600 bg-orange-50';
    return 'text-[var(--text-primary)] bg-[var(--glass-bg)]';
  };

  const getEvidenceTypeLabel = (type: string): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const showNotice = (message: string) => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setActionNotice(message);
    noticeTimerRef.current = window.setTimeout(() => setActionNotice(null), 2500);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showNotice('Link copied to clipboard');
    } catch {
      showNotice('Unable to copy link');
    }
  };

  const handleBookmark = () => {
    if (!id) return;
    const key = 'evidence-bookmarks';
    const raw = window.localStorage.getItem(key);
    let parsed: string[] = [];
    try {
      parsed = raw ? JSON.parse(raw) : [];
    } catch {
      parsed = [];
    }
    const existing = new Set<string>(parsed);
    if (existing.has(id)) {
      existing.delete(id);
      showNotice('Bookmark removed');
    } else {
      existing.add(id);
      showNotice('Bookmarked evidence');
    }
    window.localStorage.setItem(key, JSON.stringify(Array.from(existing)));
  };

  const handleDownload = () => {
    if (!evidence) return;
    window.open(`/api/documents/${evidence.id}/file`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--glass-bg)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-[var(--text-primary)]">Loading evidence...</p>
        </div>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--glass-bg)]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-[var(--text-primary)]">{error || 'Evidence not found'}</p>
          <Link to="/evidence" className="mt-4 inline-block text-cyan-400 hover:underline">
            ← Back to Evidence List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--glass-bg)] text-[var(--text-primary)]">
      <SEO
        title={evidence.title}
        description={
          evidence.description || `View ${evidence.evidenceType.replace(/_/g, ' ')} details`
        }
        type="article"
      />
      {/* Header */}
      <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/evidence"
                className="text-[var(--text-primary)] hover:text-[var(--text-primary)] flex items-center"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-1">Back</span>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{evidence.title}</h1>
                <p className="text-xs font-light text-[var(--text-muted)] mt-1 truncate">
                  {evidence.originalFilename}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded"
                aria-label="Share evidence"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <button
                onClick={handleBookmark}
                className="p-2 text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded"
                aria-label="Bookmark evidence"
              >
                <Bookmark className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-[var(--text-primary)] hover:bg-[var(--glass-bg)] rounded"
                aria-label="Download evidence file"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
          {actionNotice && <p className="mt-2 text-xs text-[var(--text-muted)]">{actionNotice}</p>}
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="bg-[var(--glass-bg)] border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                <FileText className="h-4 w-4 mr-1" />
                {getEvidenceTypeLabel(evidence.evidenceType)}
              </span>

              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRedFlagColor(evidence.redFlagRating)}`}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Red Flag: {evidence.redFlagRating}/5
              </span>

              {evidence.signalScore !== undefined && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                  title="Signal Strength"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Signal: {(evidence.signalScore * 100).toFixed(0)}%
                </span>
              )}

              {evidence.ocrQualityScore !== undefined && evidence.ocrQualityScore < 0.7 && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                  title="Low OCR Quality"
                >
                  <Activity className="h-4 w-4 mr-1" />
                  OCR Quality: Low
                </span>
              )}

              {evidence.unredaction_metrics?.succeeded && (
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                  title={`Gained ${evidence.unredaction_metrics.unredactedTextGain?.toFixed(0) || 0} characters`}
                >
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Unredacted
                </span>
              )}

              {evidence.createdAt && (
                <span className="inline-flex items-center text-sm text-[var(--text-primary)]">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(evidence.createdAt)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm text-[var(--text-primary)]">
              <span>{evidence.wordCount?.toLocaleString()} words</span>
              <span>{formatFileSize(evidence.fileSize)}</span>
            </div>
          </div>

          {evidence.tags && evidence.tags.length > 0 && (
            <div className="mt-3 flex items-center space-x-2">
              <Tag className="h-4 w-4 text-[var(--text-muted)]" />
              <div className="flex flex-wrap gap-2">
                {evidence.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[var(--glass-bg)] text-[var(--text-primary)] text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-[var(--glass-bg)] rounded-lg shadow border border-[var(--glass-border)]">
              {renderViewer()}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Claims & Facts */}
            {evidence.claims && evidence.claims.length > 0 && (
              <ClaimsList
                claims={evidence.claims as unknown as Parameters<typeof ClaimsList>[0]['claims']}
              />
            )}

            {/* Linked Entities */}
            {evidence.entities && evidence.entities.length > 0 && (
              <div className="bg-[var(--glass-bg)] rounded-lg shadow border border-[var(--glass-border)] p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Linked Entities ({evidence.entities.length})
                </h3>
                <div className="space-y-3">
                  {evidence.entities.map((entity) => {
                    const iconConfig = getEntityCategoryIcon(entity.category || 'person_associate');
                    return (
                      <Link
                        key={entity.id}
                        to={`/entities/${entity.id}`}
                        className="block p-3 border border-[var(--glass-border)] rounded-lg hover:border-cyan-500 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {entity.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Role: {entity.role}
                            </p>
                            {entity.confidence < 1 && (
                              <p className="text-xs text-[var(--text-muted)] mt-1">
                                Confidence: {(entity.confidence * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                          <span className={`text-sm ${iconConfig.color}`}>{iconConfig.icon}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
              <div className="bg-[var(--text-primary)] rounded-lg shadow p-4">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4">Metadata</h3>
                <dl className="space-y-2 text-sm">
                  {Object.entries(evidence.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-[var(--text-primary)] font-medium">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </dt>
                      <dd className="text-[var(--text-primary)] mt-1">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
