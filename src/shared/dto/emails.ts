export type EmailRiskSummary = 'minimal' | 'low' | 'medium' | 'high' | null;

export interface EmailMailboxDto {
  mailboxId: string;
  entityId: number | null;
  displayName: string;
  totalThreads: number;
  totalMessages: number;
  lastActivityAt: string | null;
  riskSummary: EmailRiskSummary;
  isJunkSuppressed: boolean;
  isVip: boolean;
  isVerified: boolean;
}

export interface EmailMailboxesResponseDto {
  revisionKey: string;
  data: EmailMailboxDto[];
}

export interface EmailThreadListItemDto {
  threadId: string;
  subject: string;
  participants: string[];
  participantCount: number;
  lastMessageAt: string;
  snippet: string;
  messageCount: number;
  hasAttachments: boolean;
  linkedEntityIds: number[];
  linkedEntities: { entityId: number; name: string }[];
  risk: number | null;
  ladder: string | null;
  confidence: number | null;
}

export interface EmailThreadsResponseDto {
  data: EmailThreadListItemDto[];
  meta: {
    total: number;
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface EmailLinkedEntityDto {
  entityId: number;
  name: string;
  role: string | null;
}

export interface EmailThreadMessageHeaderDto {
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  date: string;
  snippet: string;
  flags: { hasAttachments: boolean };
  attachmentsMeta: Array<{
    filename?: string;
    mimeType?: string;
    size?: number;
    linkedDocumentId?: string | number;
  }>;
  linkedEntities: EmailLinkedEntityDto[];
  ingestRunId: number | null;
  pipelineVersion: string | null;
  confidence: number | null;
  ladder: string | null;
  wasAgentic: boolean;
  redFlagRating: number | null;
}

export interface EmailThreadDetailsDto {
  threadId: string;
  subject: string;
  messages: EmailThreadMessageHeaderDto[];
}

export interface EmailMessageBodyDto {
  messageId: string;
  cleanedText: string;
  cleanedHtml: string;
  extractedLinks: string[];
  extractedEntities: string[];
  mimeWarnings: string[];
  parseStatus: 'success' | 'partial' | 'failed' | string;
  ingestRunId: number | null;
  pipelineVersion: string | null;
  sourceFile: { fileName: string | null; filePath: string | null };
  rawAvailable: boolean;
}

export interface EmailRawMessageDto {
  messageId: string;
  raw: string;
  warning: string;
  determinism: string;
}

export interface EmailThreadForMessageDto {
  messageId: string;
  threadId: string;
}

export interface EmailSearchResultItemDto {
  threadId: string;
  messageId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  highlights: Array<{ start: number; end: number }>;
}

export interface EmailSearchResponseDto {
  scope: 'global' | 'mailbox';
  q: string;
  data: EmailSearchResultItemDto[];
}
