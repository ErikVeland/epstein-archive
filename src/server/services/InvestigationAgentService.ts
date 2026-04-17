import { getApiPool } from '../db/connection.js';
import { logger } from './Logger.js';
import { InvestigativeTaskService } from './InvestigativeTaskService.js';

export class InvestigationAgentService {
  private static DEFAULT_INVESTIGATION_ID = 2; // Global Financial Network & Logistics (Placeholder)

  /**
   * Scans for high-risk unresolved signals and promotes them to Leads.
   */
  static async proposeLeadsFromSignals(minRisk = 0.7): Promise<number> {
    const pool = getApiPool();
    logger.info(`[Agent] Proposing leads from signals with risk > ${minRisk}...`);

    const query = `
      WITH candidates AS (
        SELECT 
          fs.id as signal_id,
          fs.signal_type,
          fs.risk_score,
          (SELECT STRING_AGG(full_name, ' & ') FROM entities WHERE id = ANY(fs.entity_ids)) as entities_desc,
          fs.metadata_json,
          fs.entity_ids
        FROM forensic_signals fs
        WHERE fs.status = 'promoted' AND fs.risk_score >= $1
          AND NOT EXISTS (
            SELECT 1 FROM investigation_leads il 
            WHERE il.title ILIKE '%' || (SELECT full_name FROM entities WHERE id = fs.entity_ids[1]) || '%'
              AND il.title ILIKE '%' || (SELECT full_name FROM entities WHERE id = fs.entity_ids[2]) || '%'
          )
      )
      INSERT INTO investigation_leads (
        investigation_id, title, description, status, priority, 
        source_efta_ref, forensic_signal_id, created_by
      )
      SELECT 
        $2,
        'Agentic Lead: ' || signal_type || ' between ' || entities_desc,
        'Automated detection of high-risk connection via ' || signal_type || '. Metadata: ' || metadata_json::text,
        'open',
        CASE WHEN risk_score > 0.9 THEN 'critical' ELSE 'high' END,
        signal_id::text,
        signal_id,
        'ForensicAgent-v1'
      FROM candidates
      RETURNING id;
    `;

    const result = await pool.query(query, [minRisk, this.DEFAULT_INVESTIGATION_ID]);
    const count = result.rowCount ?? 0;
    logger.info(`[Agent] Successfully promoted ${count} high-risk signals to Investigation Leads.`);
    return count;
  }

  /**
   * Generates formal tasks for the highest priority leads.
   */
  static async generateTasksForCriticalLeads(): Promise<number> {
    const pool = getApiPool();
    const taskService = new InvestigativeTaskService();
    logger.info('[Agent] Generating tasks for critical agentic leads...');

    const { rows: leads } = await pool.query(`
      SELECT id, title, description, investigation_id
      FROM investigation_leads
      WHERE created_by = 'ForensicAgent-v1' AND priority = 'critical' AND status = 'open'
      LIMIT 10;
    `);

    let taskCount = 0;
    for (const lead of leads) {
      await taskService.createTask({
        investigationId: lead.investigation_id,
        title: `Forensic Review: ${lead.title}`,
        description: `Agent-generated task to verify the following discovery: ${lead.description}`,
        priority: 'critical',
        createdById: 'ForensicAgent-v1',
      });

      // Update lead status to 'in_progress'
      await pool.query("UPDATE investigation_leads SET status = 'in_progress' WHERE id = $1", [
        lead.id,
      ]);
      taskCount++;
    }

    logger.info(`[Agent] Dispatched ${taskCount} critical investigative tasks.`);
    return taskCount;
  }
}
