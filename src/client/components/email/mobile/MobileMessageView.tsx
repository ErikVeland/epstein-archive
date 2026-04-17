import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, Paperclip, Sparkles, User } from 'lucide-react';
import { EmailMailboxDTO, EmailThreadDetailsDTO } from '../../../services/apiClient';
import { AddToInvestigationButton } from '../../common/AddToInvestigationButton';
import { riskToneFromRating } from '../../../utils/riskSemantics';
import styles from './MobileMessageView.module.css';

import { Button } from '../../../design-system/lib';

const formatTime = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const age = now.getTime() - date.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  if (age < oneDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (age < oneDay * 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const ladderTone = (ladder: string | null): string => {
  const value = (ladder ?? '').toLowerCase();
  if (value.includes('direct')) return styles.ladderDirect;
  if (value.includes('infer')) return styles.ladderInfer;
  if (value.includes('agentic')) return styles.ladderAgentic;
  return styles.ladderDefault;
};

const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Ignore clipboard failures.
  }
};

type BodyState = {
  loading: boolean;
  error: string | null;
  data: { cleanedText: string } | null;
  showRaw: boolean;
  raw: string | null;
  showQuoted: boolean;
};

interface MobileMessageViewProps {
  thread: EmailThreadDetailsDTO;
  selectedMailbox: EmailMailboxDTO | null;
  expandedMessages: Record<string, boolean>;
  bodyState: Record<string, BodyState>;
  threadLoading: boolean;
  onBack: () => void;
  onToggleMessage: (messageId: string, expanded: boolean) => void;
  onToggleRaw: (messageId: string) => void;
  onToggleQuoted: (messageId: string) => void;
  onEntityClick: (entityId: string) => void;
}

export function MobileMessageView({
  thread,
  selectedMailbox,
  expandedMessages,
  bodyState,
  threadLoading,
  onBack,
  onToggleMessage,
  onToggleRaw,
  onToggleQuoted,
  onEntityClick,
}: MobileMessageViewProps) {
  const navigate = useNavigate();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button unstyled className={styles.backBtn} onClick={onBack} type="button">
          <ChevronLeft size={20} />
          Threads
        </Button>
        <AddToInvestigationButton
          item={{
            id: thread.threadId,
            type: 'evidence',
            title: thread.subject,
            description: `Email thread with ${thread.messages.length} messages`,
            sourceId: thread.threadId,
            metadata: {
              sourceType: 'email_thread',
              threadId: thread.threadId,
              messageCount: thread.messages.length,
            },
          }}
          variant="quick"
          className={styles.addBtn}
        />
      </div>

      <div className={styles.subjectBar}>
        <div className={styles.subject}>{thread.subject}</div>
        <div className={styles.subjectMeta}>
          {thread.messages.length} messages
          {selectedMailbox && ` · ${selectedMailbox.displayName}`}
        </div>
      </div>

      {threadLoading && thread.messages.length === 0 ? (
        <div className={styles.loading}>
          <Loader2 size={20} className={styles.spinner} />
          Opening thread
        </div>
      ) : (
        <div className={styles.messageList}>
          {thread.messages.map((message) => {
            const expanded = Boolean(expandedMessages[message.messageId]);
            const body = bodyState[message.messageId];
            const riskTone = riskToneFromRating(message.redFlagRating);
            const citation = `message_id=${message.messageId}; date=${message.date}; mailbox=${selectedMailbox?.displayName ?? 'All'}; ingest_run_id=${message.ingestRunId ?? 'unknown'}`;

            return (
              <article
                key={message.messageId}
                className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}
              >
                <Button
                  unstyled
                  className={styles.cardToggle}
                  onClick={() => onToggleMessage(message.messageId, !expanded)}
                  type="button"
                >
                  <div className={styles.avatar}>
                    <User size={16} />
                  </div>
                  <div className={styles.cardMeta}>
                    <div className={styles.fromRow}>
                      <span className={styles.from}>{message.from || 'Unknown Sender'}</span>
                      <span className={styles.time}>{formatTime(message.date)}</span>
                    </div>
                    <div className={styles.to}>
                      To: {message.to.join(' · ') || 'Unknown recipient'}
                    </div>
                    {!expanded && message.snippet && (
                      <div className={styles.snippet}>{message.snippet}</div>
                    )}
                  </div>
                  {message.redFlagRating !== null && (
                    <span className={`${styles.riskBadge} ${riskTone.className}`}>
                      R{message.redFlagRating}
                    </span>
                  )}
                  <ChevronRight
                    size={16}
                    className={`${styles.chevron} ${expanded ? styles.chevronDown : ''}`}
                  />
                </Button>

                {expanded && (
                  <div className={styles.cardBody}>
                    <div className={styles.tagRow}>
                      {message.ladder && (
                        <span className={`${styles.tag} ${ladderTone(message.ladder)}`}>
                          LADDER: {message.ladder}
                        </span>
                      )}
                      {typeof message.confidence === 'number' && (
                        <span className={`${styles.tag} ${styles.tagMuted}`}>
                          CONFIDENCE: {(message.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {message.wasAgentic && (
                        <span className={styles.agenticBadge}>
                          <Sparkles size={11} />
                          Agentic
                        </span>
                      )}
                    </div>

                    <div className={styles.actions}>
                      <Button
                        unstyled
                        className={styles.actionBtn}
                        onClick={() => void copyText(citation)}
                        type="button"
                      >
                        Copy Citation
                      </Button>
                      <Button
                        unstyled
                        className={styles.actionBtn}
                        onClick={() => onToggleRaw(message.messageId)}
                        type="button"
                      >
                        {body?.showRaw ? 'Show Cleaned' : 'View MIME'}
                      </Button>
                      <Button
                        unstyled
                        className={styles.actionBtn}
                        onClick={() => onToggleQuoted(message.messageId)}
                        type="button"
                      >
                        {body?.showQuoted ? 'Hide History' : 'Show History'}
                      </Button>
                      <AddToInvestigationButton
                        item={{
                          id: message.messageId,
                          type: 'evidence',
                          title: message.subject || thread.subject,
                          description: `Email message from ${message.from}`,
                          sourceId: message.messageId,
                          metadata: {
                            sourceType: 'email_message',
                            threadId: thread.threadId,
                            messageId: message.messageId,
                            ingestRunId: message.ingestRunId,
                          },
                        }}
                        variant="quick"
                        className={styles.actionBtn}
                      />
                    </div>

                    <div className={styles.bodyContent}>
                      {!body || body.loading ? (
                        <div className={styles.bodyLoading}>
                          <Loader2 size={16} className={styles.spinner} />
                          Decompressing MIME stream
                        </div>
                      ) : body.error ? (
                        <div className={styles.bodyError}>{body.error}</div>
                      ) : body.showRaw ? (
                        <pre className={styles.rawPre}>
                          {body.raw ?? 'No raw content available.'}
                        </pre>
                      ) : (
                        <div className={styles.cleanBody}>
                          {body.data?.cleanedText ?? 'No readable body available.'}
                        </div>
                      )}
                    </div>

                    {(message.linkedEntities ?? []).length > 0 && (
                      <div className={styles.entityPills}>
                        {(message.linkedEntities ?? []).map((entity) => (
                          <Button
                            unstyled
                            key={`${message.messageId}-${entity.entityId}`}
                            className={styles.entityChip}
                            onClick={() => onEntityClick(String(entity.entityId))}
                            type="button"
                          >
                            <User size={11} />
                            {entity.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {(message.attachmentsMeta ?? []).length > 0 && (
                      <div className={styles.attachments}>
                        <div className={styles.attachmentsTitle}>
                          <Paperclip size={13} />
                          Attachments ({(message.attachmentsMeta ?? []).length})
                        </div>
                        {(message.attachmentsMeta ?? []).map((att, idx) => {
                          const canOpen = Boolean(att.linkedDocumentId);
                          return (
                            <div key={idx} className={styles.attachment}>
                              <div className={styles.attachmentInfo}>
                                <div className={styles.attachmentName}>
                                  {att.filename ?? `Attachment ${idx + 1}`}
                                </div>
                                <div className={styles.attachmentMeta}>
                                  {att.mimeType ?? 'UNKNOWN'} ·{' '}
                                  {att.size ? `${(att.size / 1024).toFixed(1)}KB` : 'SIZE_UNKNOWN'}
                                </div>
                              </div>
                              {canOpen ? (
                                <Button
                                  unstyled
                                  className={styles.openBtn}
                                  onClick={() =>
                                    navigate(
                                      `/documents/${encodeURIComponent(String(att.linkedDocumentId))}`,
                                    )
                                  }
                                  type="button"
                                >
                                  Open
                                </Button>
                              ) : (
                                <span className={styles.notIngested}>Not ingested</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
