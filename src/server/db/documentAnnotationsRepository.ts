import { getApiPool } from './connection.js';

export type PublicDocumentAnnotationRow = {
  id: string;
  document_id: number;
  annotation_type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
  selected_text: string;
  note: string;
  start_offset: number;
  end_offset: number;
  context_before: string | null;
  context_after: string | null;
  author_label: string;
  pdf_page: number | null;
  pdf_x: number | null;
  pdf_y: number | null;
  pdf_width: number | null;
  pdf_height: number | null;
  created_at: string;
  updated_at: string;
};

type CreateAnnotationInput = {
  documentId: number;
  annotationType: PublicDocumentAnnotationRow['annotation_type'];
  selectedText: string;
  note: string;
  startOffset: number;
  endOffset: number;
  contextBefore?: string;
  contextAfter?: string;
  authorLabel: string;
  authorFingerprintHash: string | null;
  pdfPage?: number;
  pdfX?: number;
  pdfY?: number;
  pdfWidth?: number;
  pdfHeight?: number;
};

export const documentAnnotationsRepository = {
  async getByDocumentId(documentId: number, limit = 500): Promise<PublicDocumentAnnotationRow[]> {
    const result = await getApiPool().query<PublicDocumentAnnotationRow>(
      `
        SELECT
          id::text,
          document_id,
          annotation_type,
          selected_text,
          note,
          start_offset,
          end_offset,
          context_before,
          context_after,
          author_label,
          pdf_page,
          pdf_x::float,
          pdf_y::float,
          pdf_width::float,
          pdf_height::float,
          created_at::text,
          updated_at::text
        FROM document_annotations
        WHERE document_id = $1
        ORDER BY created_at ASC
        LIMIT $2
      `,
      [documentId, limit],
    );
    return result.rows;
  },

  async create(input: CreateAnnotationInput): Promise<PublicDocumentAnnotationRow> {
    const result = await getApiPool().query<PublicDocumentAnnotationRow>(
      `
        INSERT INTO document_annotations (
          document_id,
          annotation_type,
          selected_text,
          note,
          start_offset,
          end_offset,
          context_before,
          context_after,
          author_label,
          author_fingerprint_hash,
          pdf_page,
          pdf_x,
          pdf_y,
          pdf_width,
          pdf_height
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        RETURNING
          id::text,
          document_id,
          annotation_type,
          selected_text,
          note,
          start_offset,
          end_offset,
          context_before,
          context_after,
          author_label,
          pdf_page,
          pdf_x::float,
          pdf_y::float,
          pdf_width::float,
          pdf_height::float,
          created_at::text,
          updated_at::text
      `,
      [
        input.documentId,
        input.annotationType,
        input.selectedText,
        input.note,
        input.startOffset,
        input.endOffset,
        input.contextBefore || null,
        input.contextAfter || null,
        input.authorLabel,
        input.authorFingerprintHash,
        input.pdfPage || null,
        input.pdfX || null,
        input.pdfY || null,
        input.pdfWidth || null,
        input.pdfHeight || null,
      ],
    );

    return result.rows[0];
  },
};
