import { simpleParser, AddressObject } from 'mailparser';
import { htmlToText } from 'html-to-text';
import DOMPurify from 'isomorphic-dompurify';
import { decode } from 'html-entities';
import { logger } from './Logger.js';

export interface CleanedEmailParts {
  body_clean_text: string;
  body_clean_html: string;
  subject: string;
  from: string; // Normalized string representation
  to: string[];
  cc: string[];
  bcc: string[];
  date: Date | null;
  message_id: string;
  references: string[];
  attachments_count: number;
  mime_parse_status: 'success' | 'failed' | 'partial';
  mime_parse_reason?: string;
  headers: Record<string, any>;
}

export async function cleanMime(raw: string): Promise<CleanedEmailParts> {
  try {
    const parsed = await simpleParser(raw);

    // 1. Clean Body
    let bodyHtml = parsed.html || '';
    let bodyText = parsed.text || '';

    // If we have HTML but no text, derive text from HTML
    if (bodyHtml && !bodyText) {
      bodyText = htmlToText(bodyHtml, {
        wordwrap: 130,
        selectors: [
          { selector: 'img', format: 'skip' },
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
        ],
      });
    }

    // If we have text but no HTML, wrap text in basic HTML
    if (bodyText && !bodyHtml) {
      // Basic sanitization for text-to-html
      bodyHtml = `<div>${bodyText.replace(/\n/g, '<br/>')}</div>`;
    }

    // Sanitize HTML (remove scripts, etc) using DOMPurify
    if (bodyHtml) {
      bodyHtml = DOMPurify.sanitize(bodyHtml, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'meta'],
        ADD_ATTR: ['target'], // Allow target for links if needed
      });
    }

    // 2. Normalize Headers
    const from = formatAddress(parsed.from);
    const to = formatAddressList(parsed.to);
    const cc = formatAddressList(parsed.cc);
    const bcc = formatAddressList(parsed.bcc);

    return {
      body_clean_text: decode(bodyText.trim()),
      body_clean_html: bodyHtml.trim(),
      subject: decode(parsed.subject || ''),
      from,
      to,
      cc,
      bcc,
      date: parsed.date || null,
      message_id: parsed.messageId || '',
      references:
        typeof parsed.references === 'string'
          ? [parsed.references]
          : Array.isArray(parsed.references)
            ? parsed.references
            : [],
      attachments_count: parsed.attachments ? parsed.attachments.length : 0,
      mime_parse_status: 'success',
      headers: Object.fromEntries(parsed.headers),
    };
  } catch (error: any) {
    logger.warn({ detail: error }, 'MIME Parse Failure');

    // Fallback: Try to extract at least some text if possible, or return raw as text
    return {
      body_clean_text: raw, // Fallback to raw
      body_clean_html: `<pre>${DOMPurify.sanitize(raw)}</pre>`,
      subject: '',
      from: '',
      to: [],
      cc: [],
      bcc: [],
      date: null,
      message_id: '',
      references: [],
      attachments_count: 0,
      mime_parse_status: 'failed',
      mime_parse_reason: error.message || String(error),
      headers: {},
    };
  }
}

function formatAddress(addr: AddressObject | AddressObject[] | undefined): string {
  if (!addr) return '';
  if (Array.isArray(addr)) {
    return addr.map((a) => a.text).join(', ');
  }
  return addr.text;
}

function formatAddressList(addr: AddressObject | AddressObject[] | undefined): string[] {
  if (!addr) return [];
  if (Array.isArray(addr)) {
    return addr.map((a) => a.text);
  }
  return [addr.text];
}
