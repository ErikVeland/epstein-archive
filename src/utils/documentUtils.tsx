import React from 'react';
import {
  Mail,
  Scale,
  ScrollText,
  Image as ImageIcon,
  Landmark,
  Newspaper,
  FileText,
} from 'lucide-react';
import { Document } from '../types/documents';

export const highlightSearchTerm = (text: string, term?: string): React.ReactNode => {
  if (!term || !text || typeof text !== 'string') return text;
  try {
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = term.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return text;
    const pattern = `(${terms.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const highlighted = text.replace(
      regex,
      '<mark class="bg-yellow-500/40 text-white px-1 rounded ring-1 ring-yellow-500/50">$1</mark>',
    );
    if (highlighted === text) return text;
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  } catch {
    return text;
  }
};

export const renderHighlightedText = (text: string, term?: string): React.ReactNode => {
  if (!term || !text || typeof text !== 'string') return text;
  try {
    // Re-use logic for consistency
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = term.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return text;
    const pattern = `(${terms.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const highlighted = text.replace(
      regex,
      '<mark class="bg-yellow-500/40 text-white px-1 rounded ring-1 ring-yellow-500/50">$1</mark>',
    );
    if (highlighted === text) return text;
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  } catch {
    return text;
  }
};

export const looksLikePreviewJunk = (text: string): boolean => {
  if (!text) return true;
  const sample = text.trim().slice(0, 900);
  if (sample.length < 24) return true;
  const digits = (sample.match(/\d/g) || []).length;
  const letters = (sample.match(/[a-z]/gi) || []).length;
  const underscores = (sample.match(/_/g) || []).length;
  const longRuns = (sample.match(/[A-Za-z0-9]{30,}/g) || []).length;
  const words = sample.split(/\s+/).filter(Boolean);
  const alphaWords = words.filter((w) => /[a-z]{3,}/i.test(w)).length;
  const wordRatio = words.length > 0 ? alphaWords / words.length : 0;
  return (
    underscores / sample.length > 0.03 || digits > letters * 1.1 || longRuns > 0 || wordRatio < 0.45
  );
};

export const getSafePreviewText = (doc: Document): string => {
  if (doc.previewKind === 'ai_summary') {
    const aiPreview = (doc.previewText || doc.contentPreview || '').trim();
    if (aiPreview) return aiPreview;
  }

  const fromPreview = (doc.previewText || doc.contentPreview || '').trim();
  if (fromPreview && !looksLikePreviewJunk(fromPreview)) return fromPreview;

  const type = (doc.evidenceType || doc.fileType || '').toLowerCase();
  const isPhoto =
    type.includes('photo') ||
    type.includes('image') ||
    type.includes('jpg') ||
    type.includes('png');

  if (isPhoto) {
    return 'Evidence photo asset; open to view original image.';
  }

  if (doc.previewKind === 'ai_summary') {
    return 'AI Summary available; open document for full contextual evidence.';
  }
  return 'OCR-heavy document; open to view extracted text.';
};

export const getRiskLabel = (score: number): string => {
  if (score >= 5) return 'Critical';
  if (score >= 4) return 'High';
  if (score >= 3) return 'Medium';
  if (score >= 2) return 'Low';
  return 'Minimal';
};

export const getRiskClass = (score: number): string => {
  if (score >= 5) return 'risk-critical';
  if (score >= 4) return 'risk-high';
  if (score >= 3) return 'risk-medium';
  if (score >= 2) return 'risk-low';
  return 'risk-minimal';
};

export const getRenderTypeIcon = (doc: Document, props: React.SVGProps<SVGSVGElement>) => {
  const t = (doc.evidenceType || doc.fileType || '').toLowerCase();
  if (t.includes('email')) return <Mail {...props} />;
  if (t.includes('legal')) return <Scale {...props} />;
  if (t.includes('deposition')) return <ScrollText {...props} />;
  if (t.includes('photo') || t.includes('image')) return <ImageIcon {...props} />;
  if (t.includes('financial')) return <Landmark {...props} />;
  if (t.includes('article')) return <Newspaper {...props} />;
  return <FileText {...props} />;
};

export const getSourceLabel = (doc: Document): string =>
  doc.sourceType || doc.metadata?.source_collection || doc.metadata?.source || 'Archive';

export const formatDate = (dateString?: string) => {
  if (!dateString) return 'Unknown Date';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (_e) {
    return dateString;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
