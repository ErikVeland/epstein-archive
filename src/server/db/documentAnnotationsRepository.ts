import { getApiPool } from './connection.js';
import { annotationEventsRepository } from './annotationEventsRepository.js';

export type PublicDocumentAnnotationRow = {
  id: string;
  document_id: string;
  annotation_type: 'highlight' | 'note' | 'evidence' | 'question' | 'contradiction' | 'tag';
  selected_text: string;
  note: string;
  start_offset: number;
  end_offset: number;
  context_before: string | null;
  context_after: string | null;
  author_label: string;
  scope?: 'public' | 'forensic';
  review_state?: 'draft' | 'approved' | 'rejected';
  pdf_page: number | null;
  pdf_x: number | null;
  pdf_y: number | null;
  pdf_width: number | null;
  pdf_height: number | null;
  created_at: string;
  updated_at: string;
};

type CreateAnnotationInput = {
  documentId: string;
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
  scope: 'public' | 'forensic';
  reviewState: 'draft' | 'approved' | 'rejected';
  createdByUserId: string | null;
  createdByRole: string | null;
  requestId: string | null;
};

export const documentAnnotationsRepository = {
  async getByDocumentId(
    documentId: string,
    opts: {
      limit?: number;
      includeForensic?: boolean;
      includeDrafts?: boolean;
    } = {},
  ): Promise<PublicDocumentAnnotationRow[]> {
    const limit = opts.limit ?? 500;
    const includeForensic = Boolean(opts.includeForensic);
    const includeDrafts = Boolean(opts.includeDrafts);
    const result = await getApiPool().query<PublicDocumentAnnotationRow>(
      `
        SELECT
          id::text,
          document_id::text,
          annotation_type,
          selected_text,
          note,
          start_offset,
          end_offset,
          context_before,
          context_after,
          author_label,
          scope,
          review_state,
          pdf_page,
          pdf_x::float,
          pdf_y::float,
          pdf_width::float,
          pdf_height::float,
          created_at::text,
          updated_at::text
        FROM document_annotations
        WHERE document_id = $1::bigint
          AND (
            (scope = 'public' AND (review_state = 'approved' OR $2::boolean))
            OR (scope = 'forensic' AND $3::boolean)
          )
        ORDER BY created_at ASC
        LIMIT $4
      `,
      [documentId, includeDrafts, includeForensic, limit],
    );
    return result.rows;
  },

  async create(input: CreateAnnotationInput): Promise<PublicDocumentAnnotationRow> {
    const pool = getApiPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<PublicDocumentAnnotationRow>(
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
            pdf_height,
            scope,
            review_state,
            created_by_user_id,
            created_by_role
          )
          VALUES ($1::bigint,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          RETURNING
            id::text,
            document_id::text,
            annotation_type,
            selected_text,
            note,
            start_offset,
            end_offset,
            context_before,
            context_after,
            author_label,
            scope,
            review_state,
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
          input.scope,
          input.reviewState,
          input.createdByUserId,
          input.createdByRole,
        ],
      );
      const row = result.rows[0];

      await annotationEventsRepository.append(
        {
          annotationId: row.id,
          documentId: row.document_id,
          eventType:
            input.scope === 'forensic'
              ? 'forensic_created'
              : input.reviewState === 'approved'
                ? 'approved'
                : 'draft_created',
          actorUserId: input.createdByUserId,
          actorRole: input.createdByRole,
          actorFingerprintHash: input.authorFingerprintHash,
          requestId: input.requestId,
          payload: {
            annotationType: input.annotationType,
            startOffset: input.startOffset,
            endOffset: input.endOffset,
          },
        },
        client,
      );

      await client.query('COMMIT');
      return row;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async setReviewState(
    documentId: string,
    annotationId: string,
    state: 'approved' | 'rejected',
    actor: { userId: string | null; role: string | null; fingerprint: string | null },
    requestId: string | null,
  ): Promise<boolean> {
    const pool = getApiPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id: string; document_id: string }>(
        `
          UPDATE document_annotations
          SET review_state = $2,
              updated_at = NOW()
          WHERE id = $1::bigint
            AND document_id = $3::bigint
          RETURNING id::text, document_id::text
        `,
        [annotationId, state, documentId],
      );
      const updated = rows[0];
      if (!updated) {
        await client.query('ROLLBACK');
        return false;
      }
      await annotationEventsRepository.append(
        {
          annotationId: updated.id,
          documentId: updated.document_id,
          eventType: state === 'approved' ? 'approved' : 'rejected',
          actorUserId: actor.userId,
          actorRole: actor.role,
          actorFingerprintHash: actor.fingerprint,
          requestId,
          payload: {},
        },
        client,
      );
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};
