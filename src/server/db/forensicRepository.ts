import { getApiPool } from './connection.js';

export const forensicRepository = {
  /**
   * Get forensic metrics for a document
   */
  getMetrics: async (documentId: number | string) => {
    const pool = getApiPool();
    const res = await pool.query(
      'SELECT document_id, metrics_json, authenticity_score, last_analyzed_at FROM document_forensic_metrics WHERE document_id = $1',
      [documentId],
    );
    return res.rows[0];
  },

  /**
   * Save or update forensic metrics
   */
  saveMetrics: async (
    documentId: number | string,
    metrics: Record<string, unknown>,
    authenticityScore?: number,
  ) => {
    const pool = getApiPool();
    const sql = `
      INSERT INTO document_forensic_metrics (document_id, metrics_json, authenticity_score, last_analyzed_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(document_id) DO UPDATE SET
        metrics_json = EXCLUDED.metrics_json,
        authenticity_score = EXCLUDED.authenticity_score,
        last_analyzed_at = CURRENT_TIMESTAMP
    `;

    await pool.query(sql, [documentId, JSON.stringify(metrics), authenticityScore || 0]);
  },

  /**
   * Get chain of custody for an evidence item (or document)
   */
  getChainOfCustody: async (evidenceId: number | string) => {
    const pool = getApiPool();
    const res = await pool.query(
      'SELECT id, evidence_id, actor, action, date, notes, signature FROM chain_of_custody WHERE evidence_id = $1 ORDER BY date DESC',
      [evidenceId],
    );
    return res.rows;
  },

  /**
   * Add an event to the chain of custody
   */
  addCustodyEvent: async (event: {
    evidenceId: number | string;
    actor: string;
    action: string;
    date?: string;
    notes?: string;
    signature?: string;
  }) => {
    const pool = getApiPool();
    const sql = `
      INSERT INTO chain_of_custody (evidence_id, actor, action, date, notes, signature)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(sql, [
      event.evidenceId,
      event.actor,
      event.action,
      event.date || new Date().toISOString(),
      event.notes || '',
      event.signature || '',
    ]);
  },

  /**
   * Get aggregated forensic metrics summary
   */
  getMetricsSummary: async () => {
    const pool = getApiPool();

    const [totalRes, avgRes, riskRes, topRiskRes, pendingRes] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM document_forensic_metrics'),
      pool.query(
        'SELECT AVG(authenticity_score) as avg FROM document_forensic_metrics WHERE authenticity_score IS NOT NULL AND authenticity_score > 0',
      ),
      pool.query(`
        SELECT 
          SUM(CASE WHEN red_flag_rating <= 1 THEN 1 ELSE 0 END) as low,
          SUM(CASE WHEN red_flag_rating = 2 THEN 1 ELSE 0 END) as medium,
          SUM(CASE WHEN red_flag_rating = 3 OR red_flag_rating = 4 THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN red_flag_rating >= 5 THEN 1 ELSE 0 END) as critical
        FROM documents
      `),
      pool.query(`
        SELECT 
          d.id, d.file_name as "fileName", d.red_flag_rating as "redFlagRating",
          d.evidence_type as "evidenceType", d.word_count as "wordCount",
          dfm.authenticity_score as "authenticityScore",
          dfm.last_analyzed_at as "lastAnalyzedAt"
        FROM documents d
        LEFT JOIN document_forensic_metrics dfm ON dfm.document_id = d.id
        WHERE d.red_flag_rating >= 3
        ORDER BY d.red_flag_rating DESC, dfm.authenticity_score ASC
        LIMIT 10
      `),
      pool.query(`
        SELECT COUNT(*) as count FROM documents d
        LEFT JOIN document_forensic_metrics dfm ON dfm.document_id = d.id
        WHERE dfm.id IS NULL
      `),
    ]);

    const riskDist = riskRes.rows[0];

    return {
      totalDocumentsAnalyzed: parseInt(totalRes.rows[0].count, 10),
      averageAuthenticityScore: avgRes.rows[0].avg
        ? Math.round(parseFloat(avgRes.rows[0].avg) * 100) / 100
        : null,
      riskDistribution: {
        low: parseInt(riskDist?.low || '0', 10),
        medium: parseInt(riskDist?.medium || '0', 10),
        high: parseInt(riskDist?.high || '0', 10),
        critical: parseInt(riskDist?.critical || '0', 10),
      },
      topRiskDocuments: topRiskRes.rows,
      pendingAnalysisCount: parseInt(pendingRes.rows[0].count, 10),
      lastUpdated: new Date().toISOString(),
    };
  },
};
