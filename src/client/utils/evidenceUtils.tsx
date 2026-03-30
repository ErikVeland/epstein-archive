import React from 'react';

/**
 * Normalizes text by removing excessive whitespace and symbol-heavy gibberish.
 */
export const normalizeEvidenceSnippet = (raw: string, fallbackTitle: string): string => {
  if (!raw) return fallbackTitle;
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/[_=]{3,}/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .trim();

  if (textLooksLikeGibberish(cleaned)) return fallbackTitle;
  return cleaned.slice(0, 460);
};

/**
 * Heuristic to detect OCR gibberish or non-text data.
 */
export const textLooksLikeGibberish = (text: string): boolean => {
  if (!text) return true;
  const t = text.trim();
  if (t.length < 18) return true;
  const symbolRatio = (t.match(/[^a-zA-Z0-9\s,.;:'"!?()-]/g)?.length || 0) / t.length;
  const runCaps = /[A-Z]{8,}/.test(t);
  return symbolRatio > 0.2 || runCaps;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Highlights specific terms in a text string using <mark> tags.
 */
export const highlightTerms = (
  text: string,
  terms: Array<string | undefined | null>,
  highlightClassName?: string,
) => {
  const needles = Array.from(
    new Set(terms.filter((t): t is string => Boolean(t && t.trim())).map((t) => t.trim())),
  );
  if (needles.length === 0) return text;

  const pattern = new RegExp(`(${needles.map((t) => escapeRegExp(t)).join('|')})`, 'ig');

  return text.split(pattern).map((segment, idx) =>
    needles.some((needle) => needle.toLowerCase() === segment.toLowerCase()) ? (
      <mark key={`${segment}-${idx}`} className={highlightClassName}>
        {segment}
      </mark>
    ) : (
      <React.Fragment key={`${segment}-${idx}`}>{segment}</React.Fragment>
    ),
  );
};

/**
 * Formats a metadata date string into a user-friendly locale string.
 */
export const formatMetaDate = (value?: string | null): string => {
  if (!value) return 'Date unknown';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unknown';
  return parsed.toLocaleDateString();
};

/**
 * Maps a numerical risk rating to a design system color class.
 */
export const getRiskClass = (rating: number): string => {
  if (rating >= 5) return 'risk-critical';
  if (rating >= 4) return 'risk-high';
  if (rating >= 3) return 'risk-medium';
  if (rating >= 2) return 'risk-low';
  return 'risk-minimal';
};

/**
 * Determines if a media item is a visual media type (image/video).
 */
export const isVisualMediaItem = (photo: any): boolean => {
  if (!photo) return false;
  const type = String(photo.sourceType || photo.type || '').toLowerCase();
  if (
    type.includes('image') ||
    type.includes('photo') ||
    type.includes('jpg') ||
    type.includes('png') ||
    type.includes('jpeg')
  ) {
    return true;
  }
  const url = String(photo.url || photo.fullUrl || photo.imageUrl || '').toLowerCase();
  return (
    url.includes('.jpg') ||
    url.includes('.jpeg') ||
    url.includes('.png') ||
    url.includes('.webp') ||
    url.includes('.gif')
  );
};

/**
 * Safely resolves a URL for an entity photo.
 */
export const resolveEntityPhotoUrl = (photo: any, preferThumbnail = false): string | null => {
  if (!photo) return null;
  if (preferThumbnail) {
    const thumb =
      photo.thumbnailUrl ||
      photo.thumbnail_url ||
      photo.thumbUrl ||
      photo.thumb_url ||
      photo.thumbnailPath;
    if (thumb) return thumb;
  }
  return (
    photo.url ||
    photo.fullUrl ||
    photo.imageUrl ||
    photo.image_url ||
    photo.src ||
    photo.filePath ||
    null
  );
};

/**
 * Normalize evidence document from various backend shapes.
 */
export const normalizeEvidenceDocument = (item: any): any => {
  return {
    id: item.id || item.document_id,
    title: item.title || item.fileName || item.filename,
    fileName: item.fileName || item.filename,
    contentPreview: item.contentPreview || item.context_snippet || item.description,
    evidenceType: item.evidenceType || item.evidence_type || 'Document',
    redFlagRating: item.redFlagRating || item.risk_score || 0,
    source_collection: item.source_collection || item.collection,
    dateCreated: item.dateCreated || item.created_at,
  };
};

/**
 * Normalize media item from various backend shapes.
 */
export const normalizeEntityMediaItem = (item: any, index: number): any => {
  return {
    ...item,
    id: item.id || `media-${index}`,
    title: item.title || item.caption || item.filename,
    url: item.url || item.fullUrl || item.image_url,
    sourceType: item.sourceType || item.type || 'Media',
  };
};
