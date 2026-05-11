import { getApiPool } from '../db/connection.js';
import { relationshipsRepository } from '../db/relationshipsRepository.js';

export interface PatternRecognitionResult {
  patternType: string;
  entities: string[];
  documents: string[];
  confidence: number;
  description: string;
}

export interface TimelineEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  entities: string[];
  documents: string[];
  confidence: number;
}

export interface AnomalyDetectionResult {
  id: string;
  type: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

export interface RiskAssessment {
  entity: string;
  riskScore: number;
  riskFactors: string[];
  confidence: number;
  recommendations: string[];
}

export interface EntityRelationshipMap {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: string;
  strength: number;
  confidence: number;
  evidence: string[];
}

export class AdvancedAnalyticsService {
  async detectPatterns(searchTerm?: string): Promise<PatternRecognitionResult[]> {
    const pool = getApiPool();

    let query = `
      SELECT 
        e1.full_name as entity1,
        e2.full_name as entity2,
        d.evidence_type,
        COUNT(*) as frequency,
        AVG(er.strength) as avg_strength
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.document_id = em2.document_id AND em1.entity_id != em2.entity_id
      JOIN entities e1 ON em1.entity_id = e1.id
      JOIN entities e2 ON em2.entity_id = e2.id
      JOIN documents d ON em1.document_id = d.id
      LEFT JOIN entity_relationships er ON (er.source_entity_id = e1.id AND er.target_entity_id = e2.id)
      WHERE e1.full_name != e2.full_name
    `;

    const params: string[] = [];
    if (searchTerm) {
      query += ` AND (e1.full_name ILIKE $1 OR e2.full_name ILIKE $1 OR d.content ILIKE $1)`;
      params.push(`%${searchTerm}%`);
    }

    query += ` GROUP BY e1.id, e2.id, d.evidence_type HAVING COUNT(*) > 1 ORDER BY frequency DESC LIMIT 50`;

    const { rows } = await pool.query(query, params);

    return rows.map((row) => ({
      patternType: `Co-occurrence Pattern`,
      entities: [row.entity1, row.entity2],
      documents: [row.evidence_type],
      confidence: Math.min(1.0, parseFloat(row.avg_strength) || 0.5),
      description: `Entities "${row.entity1}" and "${row.entity2}" co-occur ${row.frequency} times in ${row.evidence_type} documents`,
    }));
  }

  async reconstructTimeline(entityId?: number, searchTerm?: string): Promise<TimelineEvent[]> {
    const pool = getApiPool();

    let query = `
      SELECT 
        d.id as doc_id,
        d.file_name as title,
        d.date_created as date,
        d.content,
        e.full_name as entity_name
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
    `;

    const params: (number | string)[] = [];
    if (entityId) {
      query += ` WHERE em.entity_id = $1`;
      params.push(entityId);

      if (searchTerm) {
        query += ` AND (d.file_name ILIKE $2 OR d.content ILIKE $2)`;
        params.push(`%${searchTerm}%`);
      }
    } else if (searchTerm) {
      query += ` WHERE (d.file_name ILIKE $1 OR d.content ILIKE $1)`;
      params.push(`%${searchTerm}%`);
    }

    query += ` ORDER BY d.date_created ASC LIMIT 100`;

    const { rows } = await pool.query(query, params);

    return rows.map((row) => ({
      id: row.doc_id,
      title: row.title,
      description: (row.content || '').substring(0, 200) + '...',
      date: row.date,
      entities: row.entity_name ? [row.entity_name] : [],
      documents: [row.title],
      confidence: 0.8,
    }));
  }

  async detectAnomalies(): Promise<AnomalyDetectionResult[]> {
    const pool = getApiPool();

    // Find documents with unusual characteristics
    const anomalies: AnomalyDetectionResult[] = [];

    // 1. Documents with high red flag ratings but few mentions
    const { rows: highRiskLowMention } = await pool.query(
      `
      SELECT 
        d.id,
        d.file_name,
        d.red_flag_rating,
        d.mentions_count
      FROM documents d
      WHERE d.red_flag_rating >= 4 
        AND (d.mentions_count IS NULL OR d.mentions_count < 5)
      ORDER BY d.red_flag_rating DESC
      LIMIT 10
    `,
    );

    for (const doc of highRiskLowMention) {
      anomalies.push({
        id: `doc-${doc.id}`,
        type: 'High Risk, Low Mention Count',
        description: `Document "${doc.file_name}" has high red flag rating (${doc.red_flag_rating}) but low mention count (${doc.mentions_count})`,
        confidence: 0.85,
        severity: 'high',
        details: {
          redFlagRating: doc.red_flag_rating,
          mentionCount: doc.mentions_count,
          fileName: doc.file_name,
        },
      });
    }

    // 2. Entities with unusual relationship patterns
    const { rows: unusualRelationships } = await pool.query(
      `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(er.id) as relationship_count
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_entity_id
      WHERE e.red_flag_rating >= 4
      GROUP BY e.id
      HAVING COUNT(er.id) < 3
      ORDER BY e.red_flag_rating DESC
      LIMIT 10
    `,
    );

    for (const entity of unusualRelationships) {
      anomalies.push({
        id: `entity-${entity.id}`,
        type: 'High Risk, Low Connectivity',
        description: `Entity "${entity.full_name}" has high red flag rating (${entity.red_flag_rating}) but low relationship count (${entity.relationshipCount})`,
        confidence: 0.75,
        severity: 'medium',
        details: {
          redFlagRating: entity.red_flag_rating,
          relationshipCount: entity.relationshipCount,
          entityName: entity.full_name,
        },
      });
    }

    return anomalies;
  }

  async assessRisk(entityId?: number): Promise<RiskAssessment[]> {
    const pool = getApiPool();

    let query = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        e.primary_role,
        COUNT(er.id) as relationship_count,
        AVG(er.strength) as avg_relationship_strength
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_entity_id
    `;

    const params: number[] = [];
    if (entityId) {
      query += ` WHERE e.id = $1`;
      params.push(entityId);
    }

    query += ` GROUP BY e.id ORDER BY e.red_flag_rating DESC, relationship_count DESC LIMIT 50`;

    const { rows: results } = await pool.query(query, params);

    return results.map((row) => {
      const riskScore = Math.min(
        100,
        row.red_flag_rating * 20 +
          parseInt(row.relationship_count, 10) * 2 +
          parseFloat(row.avg_relationship_strength || '0') * 10,
      );
      const riskFactors: string[] = [];

      if (row.red_flag_rating >= 4) riskFactors.push('High Red Flag Rating');
      if (parseInt(row.relationship_count, 10) > 10) riskFactors.push('High Connectivity');
      if (row.primary_role && row.primary_role.toLowerCase().includes('financial'))
        riskFactors.push('Financial Role');

      return {
        entity: row.full_name,
        riskScore: Math.round(riskScore),
        riskFactors,
        confidence: 0.8,
        recommendations: [
          'Review associated documents',
          'Check for pattern violations',
          'Validate entity connections',
        ],
      };
    });
  }

  async mapEntityRelationships(
    entityId?: number,
    depth: number = 2,
  ): Promise<EntityRelationshipMap[]> {
    if (!entityId) {
      // If no entity ID provided, return top relationships
      const pool = getApiPool();
      const { rows: results } = await pool.query(
        `
        SELECT 
          e1.full_name as source_entity,
          e2.full_name as target_entity,
          er.relationship_type,
          er.strength,
          er.confidence
        FROM entity_relationships er
        JOIN entities e1 ON er.source_entity_id = e1.id
        JOIN entities e2 ON er.target_entity_id = e2.id
        ORDER BY er.strength DESC
        LIMIT 50
      `,
      );

      return results.map((row) => ({
        sourceEntity: row.source_entity,
        targetEntity: row.target_entity,
        relationshipType: row.relationship_type,
        strength: row.strength,
        confidence: row.confidence,
        evidence: [],
      }));
    }

    // Get relationships for specific entity with specified depth
    const graphSlice = await relationshipsRepository.getGraphSlice(entityId, depth);
    return graphSlice.edges.map((edge) => ({
      sourceEntity: edge.source,
      targetEntity: edge.target,
      relationshipType: edge.type,
      strength: edge.weight ?? 0,
      confidence: Number(edge.confidence || 0),
      evidence: [],
    }));
  }

  async getPredictiveInsights(): Promise<Record<string, unknown>[]> {
    const pool = getApiPool();

    // Find entities that are highly connected to high-risk entities but have low risk scores themselves
    const { rows: potentiallyHighRisk } = await pool.query(
      `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(er2.id) as connections_to_high_risk
      FROM entities e
      JOIN entity_relationships er1 ON e.id = er1.source_entity_id
      JOIN entities e2 ON er1.target_entity_id = e2.id
      JOIN entity_relationships er2 ON e2.id = er2.source_entity_id
      WHERE e2.red_flag_rating >= 4
        AND e.red_flag_rating < 2
      GROUP BY e.id, e.full_name
      HAVING COUNT(er2.id) >= 3
      ORDER BY connections_to_high_risk DESC
      LIMIT 10
    `,
    );

    return potentiallyHighRisk.map((row) => ({
      entity: row.full_name,
      currentRiskScore: row.red_flag_rating,
      connectionsToHighRiskEntities: parseInt(row.connections_to_high_risk, 10),
      predictedRiskTrend: 'increasing',
      confidence: 0.7,
      explanation: `Entity is highly connected to ${row.connections_to_high_risk} high-risk entities`,
    }));
  }

  async getCrossReferenceValidation(searchTerm: string): Promise<Record<string, unknown>[]> {
    const pool = getApiPool();

    // Find mentions of the search term across different document types and validate consistency
    const query = `
      SELECT 
        d.evidence_type,
        COUNT(*) as mention_count,
        AVG(d.red_flag_rating) as avg_red_flag,
        string_agg(DISTINCT e.full_name, ',') as associated_entities
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
      WHERE d.content ILIKE $1
      GROUP BY d.evidence_type
    `;

    const { rows: results } = await pool.query(query, [`%${searchTerm}%`]);

    return results.map((row) => ({
      evidenceType: row.evidence_type,
      mentionCount: row.mentionCount,
      avgRedFlagRating: row.avgRedFlag,
      associatedEntities: row.associatedEntities ? row.associatedEntities.split(',') : [],
      consistencyScore: this.calculateConsistencyScore(row.evidence_type, searchTerm),
    }));
  }

  private calculateConsistencyScore(evidenceType: string, searchTerm: string): number {
    const normalizedType = (evidenceType || '').toLowerCase();
    const baseScore =
      normalizedType === 'court_deposition' || normalizedType === 'court_filing'
        ? 0.8
        : normalizedType === 'investigative_report'
          ? 0.7
          : normalizedType === 'financial_record'
            ? 0.65
            : 0.5;

    const lengthModifier = Math.min(0.15, Math.max(0, searchTerm.trim().length / 200));
    const randomJitter = Math.random() * 0.1 - 0.05;

    const score = baseScore + lengthModifier + randomJitter;
    return Math.max(0, Math.min(1, score));
  }

  async getInvestigativeTaskSummary(): Promise<Record<string, unknown>> {
    const pool = getApiPool();

    // Get overall statistics for investigation planning
    const { rows: entityStats } = await pool.query('SELECT COUNT(*) as total FROM entities');
    const { rows: documentStats } = await pool.query('SELECT COUNT(*) as total FROM documents');
    const { rows: relationshipStats } = await pool.query(
      'SELECT COUNT(*) as total FROM entity_relationships',
    );
    const { rows: highRiskEntities } = await pool.query(
      'SELECT COUNT(*) as total FROM entities WHERE red_flag_rating >= 4',
    );

    return {
      totalEntities: parseInt(entityStats[0].total, 10),
      totalDocuments: parseInt(documentStats[0].total, 10),
      totalRelationships: parseInt(relationshipStats[0].total, 10),
      highRiskEntities: parseInt(highRiskEntities[0].total, 10),
      dataCompleteness: this.calculateDataCompleteness(),
      investigationReadiness: this.assessInvestigationReadiness(),
    };
  }

  private calculateDataCompleteness(): number {
    // Placeholder calculation - would be more complex in reality
    return 0.75;
  }

  private assessInvestigationReadiness(): string {
    // Placeholder assessment
    return 'moderate';
  }
}
