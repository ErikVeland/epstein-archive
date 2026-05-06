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
export const isVisualMediaItem = (
  photo:
    | {
        sourceType?: string;
        type?: string;
        fileType?: string;
        url?: string;
        fullUrl?: string;
        imageUrl?: string;
        filePath?: string;
        filename?: string;
      }
    | null
    | undefined,
): boolean => {
  if (!photo) return false;
  const type = String(photo.sourceType || photo.type || photo.fileType || '').toLowerCase();
  if (
    type.includes('image') ||
    type.includes('photo') ||
    type.includes('jpg') ||
    type.includes('png') ||
    type.includes('jpeg')
  ) {
    return true;
  }
  const url = String(
    photo.url || photo.fullUrl || photo.imageUrl || photo.filePath || photo.filename || '',
  ).toLowerCase();
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
export const resolveEntityPhotoUrl = (
  photo:
    | {
        id?: string | number;
        url?: string;
        fullUrl?: string;
        imageUrl?: string;
        image_url?: string;
        src?: string;
        filePath?: string;
        thumbnailUrl?: string;
        thumbnail_url?: string;
        thumbUrl?: string;
        thumb_url?: string;
        thumbnailPath?: string;
      }
    | null
    | undefined,
  preferThumbnail = false,
): string | null => {
  if (!photo) return null;
  const mediaId =
    photo && typeof photo === 'object' && 'id' in photo && photo.id != null
      ? String(photo.id)
      : null;
  const normalizeAssetUrl = (value: unknown, kind: 'thumbnail' | 'file'): string | null => {
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    const trimmed = value.trim();
    if (
      trimmed.startsWith('/api/') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:')
    ) {
      return trimmed;
    }
    if (mediaId) {
      return kind === 'thumbnail'
        ? `/api/media/images/${encodeURIComponent(mediaId)}/thumbnail`
        : `/api/media/images/${encodeURIComponent(mediaId)}/file`;
    }
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  if (preferThumbnail) {
    const thumb =
      photo.thumbnailUrl ||
      photo.thumbnail_url ||
      photo.thumbUrl ||
      photo.thumb_url ||
      photo.thumbnailPath;
    const normalizedThumb = normalizeAssetUrl(thumb, 'thumbnail');
    if (normalizedThumb) return normalizedThumb;
  }
  const url =
    photo.url || photo.fullUrl || photo.imageUrl || photo.image_url || photo.src || photo.filePath;
  return normalizeAssetUrl(url, 'file');
};

/**
 * Normalize evidence document from various backend shapes.
 */
export const normalizeEvidenceDocument = (
  item: Record<string, unknown>,
): Record<string, unknown> => {
  // Prefer canonical document identifiers from evidence payloads.
  // Some endpoints include an evidence-row `id` plus a separate `document_id`.
  const documentId =
    item.documentId ||
    item.document_id ||
    item.sourceDocumentId ||
    item.source_document_id ||
    item.id;

  return {
    id: documentId,
    evidenceId: item.id,
    title:
      item.title ||
      item.fileName ||
      item.file_name ||
      item.filename ||
      item.sourcePath ||
      item.source_path,
    fileName:
      item.fileName || item.file_name || item.filename || item.sourcePath || item.source_path,
    contentPreview: item.contentPreview || item.context_snippet || item.description,
    evidenceType: item.evidenceType || item.evidence_type || 'Document',
    redFlagRating: item.redFlagRating ?? item.red_flag_rating ?? item.risk_score ?? 0,
    source_collection: item.source_collection || item.collection,
    dateCreated: item.dateCreated || item.created_at,
  };
};

/**
 * Normalize media item from various backend shapes.
 */
export const normalizeEntityMediaItem = (
  item: Record<string, unknown>,
  index: number,
): Record<string, unknown> => {
  const rawId = item.id || `media-${index}`;
  const normalizedId = String(rawId);
  const fileType = String(item.fileType || item.file_type || item.sourceType || item.type || '');
  const filePath = String(item.filePath || item.file_path || item.filename || '');
  const lowerSignature = `${fileType} ${filePath}`.toLowerCase();
  const isImageLike =
    lowerSignature.includes('image') || /\.(png|jpe?g|webp|gif|bmp|tiff?)($|\?)/i.test(filePath);
  const isVideoLike =
    lowerSignature.includes('video') || /\.(mp4|webm|mov|m4v|mkv|avi)($|\?)/i.test(filePath);
  const isAudioLike =
    lowerSignature.includes('audio') ||
    lowerSignature.includes('recording') ||
    /\.(mp3|wav|m4a|aac|ogg|flac)($|\?)/i.test(filePath);
  const thumbnailUrl = isImageLike
    ? `/api/media/images/${encodeURIComponent(normalizedId)}/thumbnail`
    : isVideoLike
      ? `/api/media/video/${encodeURIComponent(normalizedId)}/thumbnail`
      : undefined;
  const fileUrl = isImageLike
    ? `/api/media/images/${encodeURIComponent(normalizedId)}/file`
    : isVideoLike
      ? `/api/media/video/${encodeURIComponent(normalizedId)}/stream`
      : isAudioLike
        ? `/api/media/audio/${encodeURIComponent(normalizedId)}/stream`
        : undefined;

  return {
    ...item,
    id: rawId,
    title: item.title || item.caption || item.filename,
    filePath: item.filePath || item.file_path,
    fileType: item.fileType || item.file_type,
    url: item.url || item.fullUrl || item.image_url || thumbnailUrl || fileUrl,
    fullUrl: item.fullUrl || item.url || item.image_url || fileUrl,
    thumbnailUrl:
      item.thumbnailUrl || item.thumbnail_url || item.thumbUrl || item.thumb_url || thumbnailUrl,
    sourceType: item.sourceType || item.type || item.fileType || item.file_type || 'Media',
  };
};

/**
 * Sorts media items naturally by title (e.g., Part 1, Part 2, Part 10).
 */
export function naturalSortMedia<T extends { title?: string; fileName?: string }>(items: T[]): T[] {
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });

  return [...items].sort((a, b) => {
    const titleA = a.title || a.fileName || '';
    const titleB = b.title || b.fileName || '';
    return collator.compare(titleA, titleB);
  });
}
