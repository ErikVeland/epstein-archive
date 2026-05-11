/**
 * Email Classification Service
 * Implements Gmail-style intelligent email filtering
 *
 * Categories:
 * - primary: Personal emails from real people, especially known entities
 * - updates: Notifications, confirmations, receipts
 * - promotions: Marketing emails, newsletters, sales
 * - social: Social network notifications
 * - forums: Mailing lists, group discussions
 */

import { getApiPool } from '../db/connection.js';

// Known real people senders (VIPs in the Epstein case)
const KNOWN_ENTITY_SENDERS: Record<string, string> = {
  'ehbarak1@gmail.com': 'Ehud Barak',
  'jeevacation@gmail.com': 'Jeffrey Epstein',
  // Add more known senders as discovered
};

// Newsletter/Marketing domain patterns
const NEWSLETTER_DOMAINS = [
  'response.cnbc.com',
  'houzz.com',
  'washingtonpost.com',
  'e.newyorktimesinfo.com',
  'fab.com',
  'conciergeauctions.com',
  'mymms.com',
  'firmoo.com',
  'treatsmagazine.com',
  'spotify.com',
  'spotifymail.com',
  'coursera.org',
  'goodreads.com',
  'mail.23andme.com',
  'ditto.com',
  'sailthru.com',
  'hubspot.com',
  'constantcontact.com',
  'mailchimp.com',
  'sendgrid.net',
  'amazonses.com',
  'bounce.cnbc.com',
  'section8-information.org',
];

// Transaction/Update senders
const TRANSACTION_PATTERNS = [
  'amazon.com',
  'shipment-tracking@',
  'ship-confirm@',
  'digital-no-reply@',
  'noreply@',
  'no-reply@',
  'donotreply@',
  'order@',
  'orders@',
  'confirmation@',
  'receipts@',
  'billing@',
  'invoice@',
  'support@',
  'alerts@',
  'notifications@',
  'updates@',
];

// Social notification patterns
const SOCIAL_PATTERNS = [
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'pinterest.com',
  'facebookmail.com',
  'twittermail.com',
];

// Subject patterns indicating newsletters
const NEWSLETTER_SUBJECT_PATTERNS = [
  /sale/i,
  /% off/i,
  /discount/i,
  /newsletter/i,
  /digest/i,
  /weekly/i,
  /daily news/i,
  /morning squawk/i,
  /headlines/i,
  /your copy of/i,
  /new issue/i,
  /special offer/i,
  /limited time/i,
  /exclusive/i,
  /don't miss/i,
  /last chance/i,
  /ending soon/i,
  /free shipping/i,
  /clearance/i,
];

// Body patterns indicating newsletters
const NEWSLETTER_BODY_PATTERNS = [
  /unsubscribe/i,
  /view in browser/i,
  /email preferences/i,
  /manage subscriptions/i,
  /opt.out/i,
  /privacy policy/i,
  /terms of service/i,
  /you are receiving this/i,
  /this email was sent to/i,
  /add us to your address book/i,
];

export type EmailCategory = 'primary' | 'updates' | 'promotions' | 'social' | 'forums';

export interface ClassifiedEmail {
  id: number;
  category: EmailCategory;
  isFromKnownEntity: boolean;
  knownEntityName?: string;
  confidence: number;
}

export interface EmailClassificationResult {
  category: EmailCategory;
  confidence: number;
  isFromKnownEntity: boolean;
  knownEntityName?: string;
  reasons: string[];
}

/**
 * /**
 * Classify an email based on sender, subject, and content
 */
export function classifyEmail(
  sender: string,
  subject: string,
  content: string | null,
): EmailClassificationResult {
  const reasons: string[] = [];
  let category: EmailCategory = 'primary';
  let confidence = 0.5;
  let isFromKnownEntity = false;
  let knownEntityName: string | undefined;

  const senderLower = (sender || '').toLowerCase();
  const subjectLower = (subject || '').toLowerCase();
  const contentLower = (content || '').toLowerCase();

  // Extract email address from sender
  const emailMatch = senderLower.match(/<([^>]+)>/) || [null, senderLower];
  let senderEmail = emailMatch[1] || senderLower;

  // OCR Error Correction: Handle case where @ was misidentified as ®
  if (!senderEmail.includes('@') && senderEmail.includes('®')) {
    senderEmail = senderEmail.replace(/([a-z0-9._%+-]+)®([a-z0-9.-]+\.[a-z]{2,})/i, '$1@$2');
  }

  const senderDomain = senderEmail.split('@')[1] || '';

  // 1. Check if from known entity (highest priority)
  if (KNOWN_ENTITY_SENDERS[senderEmail]) {
    isFromKnownEntity = true;
    knownEntityName = KNOWN_ENTITY_SENDERS[senderEmail];
    category = 'primary';
    confidence = 0.99;
    reasons.push(`Known entity: ${knownEntityName}`);
    return { category, confidence, isFromKnownEntity, knownEntityName, reasons };
  }

  // 2. Check for newsletter domains
  const isNewsletterDomain = NEWSLETTER_DOMAINS.some(
    (domain) => senderDomain.includes(domain) || senderEmail.includes(domain),
  );
  if (isNewsletterDomain) {
    category = 'promotions';
    confidence = 0.9;
    reasons.push('Newsletter domain detected');
  }

  // 3. Check for transaction patterns
  const isTransaction = TRANSACTION_PATTERNS.some(
    (pattern) => senderEmail.includes(pattern) || senderDomain.includes(pattern),
  );
  if (isTransaction) {
    category = 'updates';
    confidence = 0.85;
    reasons.push('Transaction/notification sender');
  }

  // 4. Check for social patterns
  const isSocial = SOCIAL_PATTERNS.some(
    (pattern) => senderEmail.includes(pattern) || senderDomain.includes(pattern),
  );
  if (isSocial) {
    category = 'social';
    confidence = 0.9;
    reasons.push('Social network notification');
  }

  // 5. Check subject patterns for newsletters
  const subjectIsNewsletter = NEWSLETTER_SUBJECT_PATTERNS.some((pattern) =>
    pattern.test(subjectLower),
  );
  if (subjectIsNewsletter) {
    if (category === 'primary') {
      category = 'promotions';
      confidence = 0.75;
    }
    reasons.push('Newsletter subject pattern');
  }

  // 6. Check body patterns for newsletters
  const bodyIsNewsletter = NEWSLETTER_BODY_PATTERNS.some((pattern) => pattern.test(contentLower));
  if (bodyIsNewsletter) {
    if (category === 'primary') {
      category = 'promotions';
      confidence = 0.8;
    } else if (category === 'promotions') {
      confidence = Math.min(0.95, confidence + 0.1);
    }
    reasons.push('Newsletter body pattern');
  }

  // 7. Refine "Primary" - Only if it looks like a real person
  const personalDomains = [
    'gmail.com',
    'me.com',
    'icloud.com',
    'mac.com',
    'aol.com',
    'hotmail.com',
    'yahoo.com',
    'outlook.com',
    'msn.com',
  ];
  const isPersonalDomain = personalDomains.some((d) => senderDomain === d);

  if (category === 'primary') {
    if (!isPersonalDomain && !isFromKnownEntity) {
      // Broaden the "catch-all" to something else if it doesn't look personal
      // we'll keep it as 'primary' for now but with low confidence if it doesn't look like a person
      confidence = 0.3;
      reasons.push('Unrecognized sender domain (non-personal)');
    }
  }

  // 8. Check for personal email indicators
  const hasPersonalGreeting = /^(hi|hello|dear|hey)\s+[a-z]/i.test(contentLower.slice(0, 100));
  const hasPersonalSign = /(regards|best|thanks|cheers|sincerely),?\s*\n/i.test(contentLower);
  const isShortEmail = (content || '').length < 4000;
  const noHtmlFlags = !/<html|<div|<table|<style/i.test(content || '');

  if ((hasPersonalGreeting || hasPersonalSign) && isShortEmail && noHtmlFlags) {
    category = 'primary';
    confidence = Math.max(confidence, 0.8);
    reasons.push('Personal email indicators');
  }

  return { category, confidence, isFromKnownEntity, knownEntityName, reasons };
}

export interface LinkedEntity {
  id: number;
  name: string;
  type: string;
  confidence: number;
}

/**
 * Get known entities mentioned in email content
 */
export async function getEntitiesInEmail(content: string): Promise<LinkedEntity[]> {
  const pool = getApiPool();

  // Get top entities with high mentions
  const { rows: entities } = await pool.query(
    `
    SELECT id, full_name as name, mentions, entity_type as type
    FROM entities
    WHERE mentions > 10
    AND entity_type = 'Person'
    AND length(full_name) > 3
    ORDER BY mentions DESC
    LIMIT 500
  `,
  );

  const contentLower = content.toLowerCase();
  const found: LinkedEntity[] = [];

  for (const entity of entities) {
    const nameLower = entity.name.toLowerCase();
    // Check for full name match or last name match
    if (contentLower.includes(nameLower)) {
      found.push({
        id: entity.id,
        name: entity.name,
        type: entity.type || 'Person',
        confidence: 0.9, // High confidence for full name match
      });
    } else {
      // Check last name only for multi-word names
      const parts = nameLower.split(' ');
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        if (lastName.length > 3 && contentLower.includes(lastName)) {
          found.push({
            id: entity.id,
            name: entity.name,
            type: entity.type || 'Person',
            confidence: 0.7, // Lower confidence for last name only match
          });
        }
      }
    }
  }

  // Sort by confidence then limit to top 10
  return found.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/**
 * Build SQL WHERE clause for email category filtering (PostgreSQL version)
 */
export function buildCategoryWhereClause(category: string): { clause: string; isComplex: boolean } {
  const meta = '(metadata_json::jsonb)';
  switch (category) {
    case 'primary':
      return {
        clause: `
          AND (
            ${meta} ->> 'from' ILIKE ANY (ARRAY[${Object.keys(KNOWN_ENTITY_SENDERS)
              .map((e) => `'${e}'`)
              .join(',')}])
            OR ${meta} ->> 'from' ILIKE ANY (ARRAY['%gmail.com%', '%me.com%', '%icloud.com%', '%mac.com%', '%aol.com%', '%hotmail.com%', '%yahoo.com%'])
            -- Exclude common junk
            AND ${meta} ->> 'from' NOT ILIKE '%noreply%'
            AND (COALESCE(content_refined, '')) NOT ILIKE '%unsubscribe%'
          )
        `,
        isComplex: true,
      };

    case 'updates':
      return {
        clause: `
          AND (
            ${meta} ->> 'from' ILIKE ANY (ARRAY['%amazon.com%', '%shipment%', '%order%', '%noreply%', '%confirmation%', '%alerts%'])
            OR file_name ILIKE ANY (ARRAY['%verification%', '%order%', '%shipping%'])
          )
        `,
        isComplex: true,
      };

    case 'promotions':
      return {
        clause: `
          AND (
            ${meta} ->> 'from' ILIKE ANY (ARRAY['%newsletter%', '%marketing%', '%mailchimp%', '%constantcontact%', '%.cnbc.com%', '%houzz.com%', '%newyorktimes%', '%spotify%'])
            OR (COALESCE(content_refined, '')) ILIKE '%unsubscribe%'
          )
        `,
        isComplex: true,
      };

    default:
      return { clause: '', isComplex: false };
  }
}

/**
 * Add known entity email addresses to the lookup
 */
export function addKnownEntitySender(email: string, name: string): void {
  KNOWN_ENTITY_SENDERS[email.toLowerCase()] = name;
}

/**
 * Get all known entity senders
 */
export function getKnownEntitySenders(): Record<string, string> {
  return { ...KNOWN_ENTITY_SENDERS };
}
