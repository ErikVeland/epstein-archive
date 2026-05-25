import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileStackHeader } from '@client/components/layout/MobileStackHeader';
import styles from './EmailClient.module.css';
import Icon from '@client/components/common/Icon';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { ViewerShell } from '@client/components/viewer/ViewerShell';
import { formatEmailTime } from './emailFormatting';
import { Button } from '@client/design-system/lib';
import type { BodyState } from '@client/hooks/useEmailWorkspaceData';
import type { EmailThreadDetailsDTO, EmailMailboxDTO } from '@client/services/apiClient';

const ladderTone = (ladder: string | null): string => {
  const value = (ladder || '').toLowerCase();
  if (value.includes('direct')) return styles.ladderDirect;
  if (value.includes('infer')) return styles.ladderInfer;
  if (value.includes('agentic')) return styles.ladderAgentic;
  return styles.ladderDefault;
};

const copyText = async (value: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Ignore clipboard failures.
  }
};

interface EmailContentPaneProps {
  mobilePane: 'mailboxes' | 'threads' | 'messages';
  isMobile: boolean;
  selectedThreadId: string | null;
  threadLoading: boolean;
  threadError: string | null;
  selectedThread: EmailThreadDetailsDTO | null;
  selectedMailbox: EmailMailboxDTO | null;
  expandedMessages: Record<string, boolean>;
  bodyState: Record<string, BodyState>;
  backLinkState: ReturnType<
    typeof import('@client/hooks/useReliableBackNavigation').useBackLinkState
  >;
  onToggleMessage: (messageId: string, expanded: boolean) => void;
  onToggleRaw: (messageId: string) => void;
  onToggleQuoted: (messageId: string) => void;
  onBack: () => void;
  onClose: () => void;
  onSelectEntity: (entityId: string) => void;
}

export const EmailContentPane: React.FC<EmailContentPaneProps> = ({
  mobilePane,
  isMobile,
  selectedThreadId,
  threadLoading,
  threadError,
  selectedThread,
  selectedMailbox,
  expandedMessages,
  bodyState,
  backLinkState,
  onToggleMessage,
  onToggleRaw,
  onToggleQuoted,
  onBack,
  onClose,
  onSelectEntity,
}) => {
  const navigate = useNavigate();

  return (
    <section
      className={`${styles.contentPane} ${styles.contentPaneShell} ${
        mobilePane === 'messages' ? styles.threadPaneVisible : styles.threadPaneHidden
      } ${!isMobile && !selectedThreadId ? styles.hiddenPane : ''}`}
    >
      {selectedThreadId ? (
        threadLoading && !selectedThread ? (
          <div className={styles.stateLoading}>
            <Icon name="Loader2" className={styles.loaderInline} /> Opening thread
          </div>
        ) : threadError ? (
          <div className={styles.stateError}>{threadError}</div>
        ) : selectedThread ? (
          isMobile ? (
            <div className={styles.fullScreenMobile}>
              <MobileStackHeader
                title={selectedThread.subject}
                subtitle={`${selectedThread.messages.length} messages · ${selectedMailbox?.displayName || 'Archive'}`}
                onBack={onBack}
              />
              <div className={styles.fullScreenContent}>
                <div className={styles.messageThread}>
                  {selectedThread.messages.map((message) => {
                    const expanded = Boolean(expandedMessages[message.messageId]);
                    const body = bodyState[message.messageId];
                    return (
                      <article
                        key={message.messageId}
                        className={`${styles.messageCard} ${expanded ? styles.expanded : ''}`}
                      >
                        <Button
                          onClick={() => onToggleMessage(message.messageId, !expanded)}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={styles.messageToggle}
                        >
                          <div className={styles.messageHeader}>
                            <div className={styles.messageMetaMain}>
                              <div className={styles.messageFromRow}>
                                <div className={styles.messageFrom}>{message.from}</div>
                                <div className={styles.messageTime}>
                                  {formatEmailTime(message.date)}
                                </div>
                              </div>
                            </div>
                            <Icon
                              name="ChevronRight"
                              className={`${styles.chevronIcon} ${expanded ? styles.rotate90 : ''}`}
                            />
                          </div>
                        </Button>
                        {expanded && (
                          <div className={styles.messageBody}>
                            <div className={styles.messageActionRow}>
                              <Button
                                onClick={() => void copyText(`message_id=${message.messageId}`)}
                                variant="secondary"
                                size="sm"
                              >
                                Citation
                              </Button>
                              <Button
                                onClick={() => onToggleQuoted(message.messageId)}
                                variant="secondary"
                                size="sm"
                              >
                                History
                              </Button>
                              <Button
                                onClick={() =>
                                  navigate(`/documents/${message.messageId}`, {
                                    state: backLinkState,
                                  })
                                }
                                variant="primary"
                                size="sm"
                              >
                                Evidence
                              </Button>
                            </div>
                            <div className={styles.mimeContent}>
                              {body?.loading
                                ? 'Loading...'
                                : body?.data?.cleanedText || 'No body content.'}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <ViewerShell
              header={
                <div className={styles.viewerHeaderMeta}>
                  <div className={styles.subjectLine}>{selectedThread.subject}</div>
                  <div className={styles.viewerHeaderSub}>
                    {selectedThread.messages.length.toLocaleString()} messages · mailbox{' '}
                    {selectedMailbox?.displayName || 'All'}
                  </div>
                </div>
              }
              actions={
                <div data-testid="email-thread-actions" className={styles.viewerActions}>
                  <Button
                    onClick={onClose}
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className={styles.backToThreadsButton}
                  >
                    <Icon name="ArrowLeft" className={styles.backIcon} />
                  </Button>
                  <AddToInvestigationButton
                    item={{
                      id: selectedThread.threadId,
                      type: 'evidence',
                      title: selectedThread.subject,
                      description: `Email thread with ${selectedThread.messages.length} messages`,
                      sourceId: selectedThread.threadId,
                      metadata: {
                        sourceType: 'email_thread',
                        threadId: selectedThread.threadId,
                        messageCount: selectedThread.messages.length,
                      },
                    }}
                    variant="quick"
                    className={styles.backToThreadsButton}
                  />
                </div>
              }
              className={styles.viewerShellRoot}
              headerClassName={styles.viewerShellHeader}
              bodyClassName={styles.viewerShellBody}
            >
              <div className={styles.messageThread}>
                {selectedThread.messages.map((message) => {
                  const expanded = Boolean(expandedMessages[message.messageId]);
                  const body = bodyState[message.messageId];
                  const citation = `message_id=${message.messageId}; date=${message.date}; mailbox=${selectedMailbox?.displayName || 'All'}; ingest_run_id=${message.ingestRunId ?? 'unknown'}`;

                  return (
                    <article
                      key={message.messageId}
                      className={`${styles.messageCard} ${expanded ? styles.expanded : ''}`}
                      data-message-id={message.messageId}
                    >
                      <Button
                        onClick={() => onToggleMessage(message.messageId, !expanded)}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={styles.messageToggle}
                      >
                        <div className={styles.messageHeader}>
                          <div className={styles.messageAvatar}>
                            <Icon name="User" className={styles.messageAvatarIcon} />
                          </div>
                          <div className={styles.messageMetaMain}>
                            <div className={styles.messageFromRow}>
                              <div className={styles.messageFrom}>
                                {message.from || 'Unknown Sender'}
                              </div>
                              <div className={styles.messageTime}>
                                {formatEmailTime(message.date)}
                              </div>
                            </div>
                            <div className={styles.messageTo}>
                              To: {message.to.join(' · ') || 'Unknown recipient'}
                            </div>
                          </div>
                          <Icon
                            name="ChevronRight"
                            className={`${styles.chevronIcon} ${expanded ? styles.rotate90 : ''}`}
                          />
                        </div>
                      </Button>

                      {expanded && (
                        <div className={`${styles.messageBody} ${styles.messageBodyExpanded}`}>
                          <div className={styles.messageTagRow}>
                            <div
                              className={`${styles.messageTagPill} ${ladderTone(message.ladder)}`}
                            >
                              LADDER: {message.ladder || 'N/A'}
                            </div>
                            <div className={`${styles.messageTagPill} ${styles.messagePillMuted}`}>
                              CONFIDENCE:{' '}
                              {typeof message.confidence === 'number'
                                ? (message.confidence * 100).toFixed(0)
                                : '0'}
                              %
                            </div>
                            <div
                              className={`${styles.messageTagPill} ${styles.messagePillSecondary}`}
                            >
                              ID: {message.ingestRunId || 'RAW_INGEST'}
                            </div>
                            {message.wasAgentic && (
                              <div className={styles.agenticBadge}>
                                <Icon name="Sparkles" className={styles.agenticIcon} />
                                Agentic Highlighting
                              </div>
                            )}
                          </div>

                          <div className={styles.messageActionRow}>
                            <Button
                              onClick={() => void copyText(citation)}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={styles.messageActionButton}
                            >
                              Copy Citation
                            </Button>
                            <Button
                              onClick={() => onToggleRaw(message.messageId)}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={styles.messageActionButton}
                            >
                              {body?.showRaw ? 'Show Cleaned' : 'View MIME'}
                            </Button>
                            <Button
                              onClick={() => onToggleQuoted(message.messageId)}
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={styles.messageActionButton}
                            >
                              {body?.showQuoted ? 'Hide History' : 'Show History'}
                            </Button>
                            <AddToInvestigationButton
                              item={{
                                id: message.messageId,
                                type: 'evidence',
                                title: message.subject || selectedThread.subject,
                                description: `Email message from ${message.from}`,
                                sourceId: message.messageId,
                                metadata: {
                                  sourceType: 'email_message',
                                  threadId: selectedThread.threadId,
                                  messageId: message.messageId,
                                  ingestRunId: message.ingestRunId,
                                },
                              }}
                              variant="quick"
                              className={styles.messageActionButton}
                            />
                          </div>

                          <div data-testid="email-message-body" className={styles.mimeContent}>
                            {body?.loading ? (
                              <div className={styles.bodyLoading}>
                                <Icon name="Loader2" className={styles.bodyLoaderIcon} />
                                <span className={styles.bodyLoadingLabel}>
                                  Decompressing MIME Stream
                                </span>
                              </div>
                            ) : body?.error ? (
                              <div className={styles.bodyError}>{body.error}</div>
                            ) : body?.showRaw ? (
                              <pre className={styles.rawPre}>
                                {body.raw || 'No raw content available.'}
                              </pre>
                            ) : (
                              <div className={styles.cleanBody}>
                                {body?.data?.cleanedText || 'No readable body available.'}
                              </div>
                            )}
                          </div>

                          {(message.linkedEntities || []).length > 0 && (
                            <div className={styles.entityPills}>
                              {(message.linkedEntities || []).map((entity) => (
                                <Button
                                  key={`${message.messageId}-${entity.entityId}`}
                                  onClick={() => onSelectEntity(String(entity.entityId))}
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={styles.entityChip}
                                  title={`Open entity ${entity.name}`}
                                >
                                  <Icon name="User" className={styles.entityChipIcon} />
                                  {entity.name}
                                </Button>
                              ))}
                            </div>
                          )}

                          {(message.attachmentsMeta || []).length > 0 && (
                            <div className={styles.attachmentSection}>
                              <div className={styles.attachmentTitle}>
                                <Icon name="Paperclip" className={styles.entityChipIcon} />
                                Forensic Attachments ({(message.attachmentsMeta || []).length})
                              </div>
                              <div className={styles.attachmentGrid}>
                                {(message.attachmentsMeta || []).map((attachment, index) => {
                                  const linkedDocumentId = attachment.linkedDocumentId;
                                  const canOpen = Boolean(linkedDocumentId);
                                  return (
                                    <div
                                      key={`${message.messageId}-attachment-${index}`}
                                      className={styles.attachmentCard}
                                    >
                                      <div className={styles.attachmentInfo}>
                                        <div className={styles.attachmentName}>
                                          {attachment.filename || `Attachment ${index + 1}`}
                                        </div>
                                        <div className={styles.attachmentMeta}>
                                          {attachment.mimeType || 'UNKNOWN_MIME'} ·{' '}
                                          {attachment.size
                                            ? `${(attachment.size / 1024).toFixed(1)}KB`
                                            : 'SIZE_UNKNOWN'}
                                        </div>
                                      </div>
                                      {canOpen ? (
                                        <Button
                                          onClick={() =>
                                            navigate(
                                              `/documents/${encodeURIComponent(
                                                String(linkedDocumentId),
                                              )}`,
                                              { state: backLinkState },
                                            )
                                          }
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className={styles.attachmentOpenButton}
                                        >
                                          Open
                                        </Button>
                                      ) : (
                                        <span className={styles.attachmentMissingWrap}>
                                          <span className={styles.attachmentMissing}>
                                            Not Ingested
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </ViewerShell>
          )
        ) : (
          <div className={styles.stateNotFound}>Thread not found.</div>
        )
      ) : threadError ? (
        <div className={styles.stateError}>{threadError}</div>
      ) : (
        <div className={styles.placeholderState}>
          <div className={styles.placeholderInner}>
            <Icon name="Mail" className={styles.placeholderIcon} />
            <div className={styles.placeholderTitle}>Investigation-grade Email Workspace</div>
            <p className={styles.placeholderBody}>
              Select a thread to load message headers first, then lazy-load bodies. Use linked
              entities and Add to Investigation for evidence chaining.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
