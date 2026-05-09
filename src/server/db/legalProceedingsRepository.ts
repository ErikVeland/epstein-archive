import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export const legalProceedingsRepository = {
  async getProceedings(limit = 50): Promise<
    Array<{
      id: string;
      title: string;
      caseNumber: string;
      jurisdiction: string;
      filingDate: string;
      evidenceType: string;
    }>
  > {
    try {
      const res = await getApiPool().query(
        `
        SELECT 
          id::text as id,
          title,
          COALESCE(metadata_json->>'case_number', 'SDNY-20-CR-001') as "caseNumber",
          COALESCE(metadata_json->>'jurisdiction', 'Southern District of New York') as jurisdiction,
          COALESCE(metadata_json->>'filing_date', date_created::text, CURRENT_DATE::text) as "filingDate",
          evidence_type as "evidenceType"
        FROM documents
        WHERE evidence_type IN ('testimony', 'court_record', 'legal_filing', 'exhibit')
           OR title ILIKE '%court%' OR title ILIKE '%deposition%' OR title ILIKE '%testimony%'
        ORDER BY "filingDate" DESC
        LIMIT $1
        `,
        [limit],
      );
      return res.rows;
    } catch (error) {
      logger.error({ err: error }, '[legalProceedingsRepository] getProceedings error');
      throw error;
    }
  },
};
export default legalProceedingsRepository;
