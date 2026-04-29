export interface EmailDTO {
  email_id: string;
  thread_id: string;
  message_id: string;
  date: string; // ISO
  date_sort: number; // timestamp
  from: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  snippet: string;
  body_clean_text: string;
  body_clean_html: string;
  body_raw: string;
  mime_parse_status: 'success' | 'failed' | 'partial';
  mime_parse_reason?: string;
  attachments_count: number;
  entity_links: Array<{
    entity_id: string;
    role: 'sender' | 'recipient' | 'cc' | 'mentioned';
  }>;
  ingest_run_id: string;
}

export interface ThreadDTO {
  thread_id: string;
  subject_canonical: string;
  participants: string[];
  message_count: number;
  first_date: string; // ISO
  last_date: string; // ISO
  preview_snippet: string;
  messages?: EmailDTO[]; // Optional, for detailed view
  linkedEntities?: { entityId: number; name: string }[];
}

export interface EmailSearchFilters {
  query?: string;
  entity_id?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
}
