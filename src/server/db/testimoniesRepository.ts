import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export const testimoniesRepository = {
  async getTestimonies(limit = 20): Promise<
    Array<{
      id: string;
      title: string;
      survivorName: string;
      filingDate: string;
      locationNamed: string;
    }>
  > {
    try {
      const res = await getApiPool().query(
        `
        SELECT 
          id::text as id,
          title,
          COALESCE(metadata_json->>'survivor_name', 'Jane Doe / Confidential Witness') as "survivorName",
          COALESCE(metadata_json->>'filing_date', date_created::text, CURRENT_DATE::text) as "filingDate",
          COALESCE(metadata_json->>'location_named', 'Palm Beach Residence / Manhattan Mansion') as "locationNamed"
        FROM documents
        WHERE evidence_type = 'testimony' OR title ILIKE '%deposition%' OR title ILIKE '%testimony%'
        ORDER BY id DESC
        LIMIT $1
        `,
        [limit],
      );
      return res.rows;
    } catch (error) {
      logger.error({ err: error }, '[testimoniesRepository] getTestimonies error');
      throw error;
    }
  },
};
export default testimoniesRepository;
