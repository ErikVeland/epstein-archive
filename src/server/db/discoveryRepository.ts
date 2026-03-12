import { getIngestPool } from './connection.js';
import { createHash } from 'crypto';

export interface DocumentPage {
  id?: number;
  document_id: number;
  page_number: number;
  extracted_text?: string;
  text_source: 'visible_layer' | 'hidden_layer' | 'ocr' | 'hybrid';
  ocr_confidence_avg?: number;
  ocr_quality_score?: number;
  phash?: string;
}

export interface DocumentSentence {
  id?: number;
  document_id: number;
  page_id?: number;
  sentence_index: number;
  sentence_text: string;
}

export const discoveryRepository = {
  /**
   * Add a page record.
   */
  addPage: async (page: DocumentPage): Promise<number> => {
    const pool = getIngestPool();
    const res = await pool.query(
      `
      INSERT INTO document_pages (
        document_id, page_number, extracted_text, text_source, ocr_confidence_avg, ocr_quality_score, phash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
      [
        page.document_id,
        page.page_number,
        page.extracted_text || null,
        page.text_source,
        page.ocr_confidence_avg || null,
        page.ocr_quality_score || null,
        page.phash || null,
      ],
    );
    return res.rows[0].id;
  },

  /**
   * Add a sentence record.
   */
  addSentence: async (sentence: DocumentSentence): Promise<void> => {
    const pool = getIngestPool();
    const client = await pool.connect();

    try {
      // 1. Normalize & Hash
      const norm = sentence.sentence_text.toLowerCase().replace(/\s+/g, ' ').trim();
      const hash = createHash('sha256').update(norm).digest('hex');
      const sample = sentence.sentence_text.slice(0, 500);

      await client.query('BEGIN');

      // 2. Upsert Phrase & Get Status
      const phraseRes = await client.query(
        `
        INSERT INTO boilerplate_phrases (sentence_hash, sentence_text_sample, frequency)
        VALUES ($1, $2, 1)
        ON CONFLICT(sentence_hash) DO UPDATE SET frequency = boilerplate_phrases.frequency + 1
        RETURNING status
      `,
        [hash, sample],
      );

      const phrase = phraseRes.rows[0];
      const isBoilerplate = phrase && phrase.status === 'confirmed' ? 1 : 0;

      // 3. Insert Sentence (same transaction — both succeed or both roll back)
      await client.query(
        `
        INSERT INTO document_sentences (
          document_id, page_id, sentence_index, sentence_text, is_boilerplate, signal_score
        ) VALUES ($1, $2, $3, $4, $5, 0.0)
      `,
        [
          sentence.document_id,
          sentence.page_id || null,
          sentence.sentence_index,
          sentence.sentence_text,
          isBoilerplate,
        ],
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};
