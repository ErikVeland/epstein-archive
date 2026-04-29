/**
 * Evidence Detail Page
 *
 * Displays evidence with type-specific viewers and linked entities
 */

import { useEffect, useRef, useState } from 'react';
import { useIsTouch } from '@client/hooks/useIsTouch';
import { useParams, Link } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { EmailViewer } from '@client/components/evidence/EmailViewer';
import { DepositionViewer } from '@client/components/evidence/DepositionViewer';
import { TableViewer } from '@client/components/evidence/TableViewer';
import { ImageViewer } from '@client/components/evidence/ImageViewer';
import { DocumentViewer } from '@client/components/evidence/DocumentViewer';
import { ContactListViewer } from '@client/components/evidence/ContactListViewer';
import { getEntityCategoryIcon } from '@client/config/entityIcons';
import { ClaimsList } from '@client/components/evidence/ClaimsList';
import { SEO } from '@client/components/common/SEO';
import { apiClient } from '@client/services/apiClient';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { Grid } from '@client/design-system/components/layout/Grid';
import { LqText } from '@client/design-system/components/typography/Text';
import styles from './EvidenceDetail.module.css';

import { Button } from '@client/design-system/lib';

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
  const isTouch = useIsTouch();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'document' | 'info'>('document');
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
    if (rating >= 4) return styles.pillRedFlagHigh;
    if (rating >= 2) return styles.pillRedFlagMedium;
    return styles.pillRedFlagLow;
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
    window.open(
      `/api/documents/${encodeURIComponent(String(evidence.id))}/file?variant=original`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" className={styles.centerScreen}>
        <Box className={styles.centerContent}>
          <Box className={styles.spinner}></Box>
          <LqText as="p" variant="body" color="primary" className={styles.statusText}>
            Loading evidence...
          </LqText>
        </Box>
      </Flex>
    );
  }

  if (error || !evidence) {
    return (
      <Flex align="center" justify="center" className={styles.centerScreen}>
        <Box className={styles.centerContent}>
          <Icon name="AlertTriangle" className={styles.errorIcon} />
          <LqText as="p" variant="body" color="primary" className={styles.statusText}>
            {error || 'Evidence not found'}
          </LqText>
          <Link to="/evidence" className={styles.backLink}>
            ← Back to Evidence List
          </Link>
        </Box>
      </Flex>
    );
  }

  return (
    <Box className={styles.page}>
      <SEO
        title={evidence.title}
        description={
          evidence.description || `View ${evidence.evidenceType.replace(/_/g, ' ')} details`
        }
        type="article"
      />
      {/* Header */}
      <Box className={styles.headerBar}>
        <Box className={styles.shell}>
          <Flex align="center" justify="between">
            <Flex align="center" gap={4}>
              <Link to="/evidence" className={styles.backButton}>
                <Icon name="ChevronLeft" className={styles.backIcon} />
                <span className={styles.backLabel}>Back</span>
              </Link>
              <Box>
                <LqText as="h1" variant="h3" color="primary" className={styles.headerTitle}>
                  {evidence.title}
                </LqText>
                <LqText as="p" variant="body" color="muted" className={styles.headerMeta}>
                  {evidence.originalFilename}
                </LqText>
              </Box>
            </Flex>

            <Flex align="center" gap={2} className={styles.headerActions}>
              <Button
                unstyled
                onClick={handleShare}
                className={styles.iconButton}
                aria-label="Share evidence"
              >
                <Icon name="Share2" className={styles.actionIcon} />
              </Button>
              <Button
                unstyled
                onClick={handleBookmark}
                className={styles.iconButton}
                aria-label="Bookmark evidence"
              >
                <Icon name="Bookmark" className={styles.actionIcon} />
              </Button>
              <Button
                unstyled
                onClick={handleDownload}
                className={styles.iconButton}
                aria-label="Download evidence file"
              >
                <Icon name="Download" className={styles.actionIcon} />
              </Button>
            </Flex>
          </Flex>
          {actionNotice && (
            <LqText as="p" variant="small" color="muted" className={styles.notice}>
              {actionNotice}
            </LqText>
          )}
        </Box>
      </Box>

      {/* Metadata Bar */}
      <Surface variant="glass" className={styles.metaSurface}>
        <Box className={`${styles.shell} ${styles.metaBar}`}>
          <Flex align="center" justify="between" className={styles.metaPrimaryRow}>
            <Flex align="center" gap={4} className={styles.metaPrimaryRow}>
              <span className={`${styles.pill} ${styles.pillEvidenceType}`}>
                <Icon name="FileText" className={styles.pillIcon} />
                {getEvidenceTypeLabel(evidence.evidenceType)}
              </span>

              <span className={`${styles.pill} ${getRedFlagColor(evidence.redFlagRating)}`}>
                <Icon name="AlertTriangle" className={styles.pillIcon} />
                Red Flag: {evidence.redFlagRating}/5
              </span>

              {evidence.signalScore !== undefined && (
                <span className={`${styles.pill} ${styles.pillSignal}`} title="Signal Strength">
                  <Icon name="Zap" className={styles.pillIcon} />
                  Signal: {(evidence.signalScore * 100).toFixed(0)}%
                </span>
              )}

              {evidence.ocrQualityScore !== undefined && evidence.ocrQualityScore < 0.7 && (
                <span className={`${styles.pill} ${styles.pillWarning}`} title="Low OCR Quality">
                  <Icon name="Activity" className={styles.pillIcon} />
                  OCR Quality: Low
                </span>
              )}

              {evidence.unredaction_metrics?.succeeded && (
                <span
                  className={`${styles.pill} ${styles.pillSuccess}`}
                  title={`Gained ${evidence.unredaction_metrics.unredactedTextGain?.toFixed(0) || 0} characters`}
                >
                  <Icon name="ShieldCheck" className={styles.pillIcon} />
                  Unredacted
                </span>
              )}

              {evidence.createdAt && (
                <span className={styles.dateMeta}>
                  <Icon name="Calendar" className={styles.pillIcon} />
                  {formatDate(evidence.createdAt)}
                </span>
              )}
            </Flex>

            <Flex align="center" gap={4} className={styles.metaStats}>
              <span>{evidence.wordCount?.toLocaleString()} words</span>
              <span>
                {evidence.fileSize != null
                  ? formatFileSize(evidence.fileSize as number)
                  : 'Unknown Size'}
              </span>
            </Flex>
          </Flex>

          {evidence.tags && evidence.tags.length > 0 && (
            <Flex align="center" gap={2} className={styles.tagRow}>
              <Icon name="Tag" className={styles.tagIcon} />
              <Flex gap={2} className={styles.tagsWrap}>
                {evidence.tags.map((tag, index) => (
                  <span key={index} className={styles.tagPill}>
                    {tag}
                  </span>
                ))}
              </Flex>
            </Flex>
          )}
        </Box>
      </Surface>

      {/* Mobile viewer/info tab strip */}
      {isTouch && (
        <div className={styles.mobileTabStrip}>
          <button
            type="button"
            className={[styles.mobileTab, mobileTab === 'document' ? styles.mobileTabActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMobileTab('document')}
          >
            Document
          </button>
          <button
            type="button"
            className={[styles.mobileTab, mobileTab === 'info' ? styles.mobileTabActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setMobileTab('info')}
          >
            Info &amp; Entities
          </button>
        </div>
      )}

      <Box className={styles.contentShell}>
        <Grid cols={{ base: 1, lg: 4 }} gap="lg">
          {/* Main Content */}
          <Box
            className={[
              styles.layoutMain,
              isTouch && mobileTab !== 'document' ? styles.hiddenOnMobile : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Surface variant="glass" className={styles.mainSurface}>
              {renderViewer()}
            </Surface>
          </Box>

          {/* Sidebar */}
          <Flex
            direction="column"
            gap={6}
            className={[
              styles.layoutSide,
              isTouch && mobileTab !== 'info' ? styles.hiddenOnMobile : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Claims & Facts */}
            {evidence.claims && evidence.claims.length > 0 && (
              <ClaimsList
                claims={evidence.claims as unknown as Parameters<typeof ClaimsList>[0]['claims']}
              />
            )}

            {/* Linked Entities */}
            {evidence.entities && evidence.entities.length > 0 && (
              <Surface variant="glass" className={styles.linkedSurface}>
                <LqText as="h3" variant="h3" color="primary" className={styles.linkedHeader}>
                  <Icon name="Users" className={styles.linkedHeaderIcon} />
                  Linked Entities ({evidence.entities.length})
                </LqText>
                <Flex direction="column" gap={3}>
                  {evidence.entities.map((entity) => {
                    const iconConfig = getEntityCategoryIcon(entity.category || 'person_associate');
                    return (
                      <Link
                        key={entity.id}
                        to={`/entities/${entity.id}`}
                        className={styles.entityLink}
                      >
                        <Flex align="start" justify="between">
                          <Box className={styles.entityContent}>
                            <LqText
                              as="p"
                              variant="body"
                              color="primary"
                              className={styles.entityName}
                            >
                              {entity.name}
                            </LqText>
                            <LqText
                              as="p"
                              variant="small"
                              color="muted"
                              className={styles.entityMeta}
                            >
                              Role: {entity.role}
                            </LqText>
                            {entity.confidence < 1 && (
                              <LqText
                                as="p"
                                variant="small"
                                color="muted"
                                className={styles.entityMeta}
                              >
                                Confidence: {(entity.confidence * 100).toFixed(0)}%
                              </LqText>
                            )}
                          </Box>
                          <span className={`${styles.entityIcon} ${iconConfig.color}`}>
                            {iconConfig.icon}
                          </span>
                        </Flex>
                      </Link>
                    );
                  })}
                </Flex>
              </Surface>
            )}

            {/* Metadata */}
            {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
              <Surface variant="solid" className={`${styles.metadataSurface} ${styles.metaSolid}`}>
                <LqText as="h3" variant="h3" className={styles.metaSolidTitle}>
                  Metadata
                </LqText>
                <dl className={styles.metaList}>
                  {Object.entries(evidence.metadata).map(([key, value]) => (
                    <Box key={key}>
                      <dt className={styles.metaTerm}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                      </dt>
                      <dd className={styles.metaDesc}>
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </dd>
                    </Box>
                  ))}
                </dl>
              </Surface>
            )}
          </Flex>
        </Grid>
      </Box>
    </Box>
  );
}
