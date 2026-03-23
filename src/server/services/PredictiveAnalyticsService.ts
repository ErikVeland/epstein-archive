import { getApiPool } from '../db/connection.js';
import { entitiesRepository } from '../db/entitiesRepository.js';

export interface PatternPrediction {
  id: string;
  type: 'connection' | 'event' | 'risk';
  prediction: string;
  confidence: number;
  supportingEvidence: string[];
  likelihood: 'high' | 'medium' | 'low';
  timeframe?: string;
}

export interface RiskAssessmentPrediction {
  entity: string;
  currentRisk: number;
  predictedRisk: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  contributingFactors: string[];
  confidence: number;
}

export interface ConnectionInference {
  sourceEntity: string;
  targetEntity: string;
  inferredRelationship: string;
  confidence: number;
  supportingEvidence: string[];
  reason: string;
}

export class PredictiveAnalyticsService {
  async getPatternPredictions(): Promise<PatternPrediction[]> {
    const pool = getApiPool();

    const predictions: PatternPrediction[] = [];

    // 1. Predict potential new connections based on existing patterns
    const potentialConnections = await this.getInferredConnections();

    for (const connection of potentialConnections) {
      predictions.push({
        id: `conn-${connection.sourceEntity}-${connection.targetEntity}`,
        type: 'connection',
        prediction: `Connection between ${connection.sourceEntity} and ${connection.targetEntity}`,
        confidence: connection.confidence,
        supportingEvidence: connection.supportingEvidence,
        likelihood:
          connection.confidence > 0.8 ? 'high' : connection.confidence > 0.5 ? 'medium' : 'low',
      });
    }

    // 2. Predict potential high-risk entities based on network patterns
    const { rows: highRiskPredictions } = await pool.query(
      `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(er.id) as relationship_count,
        AVG(er.strength) as avg_strength
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_id
      WHERE e.red_flag_rating < 3  -- Low to medium risk entities
        AND (
          SELECT COUNT(*) 
          FROM entity_relationships er2 
          JOIN entities e2 ON er2.target_id = e2.id 
          WHERE er2.source_id = e.id 
            AND e2.red_flag_rating >= 4  -- Connected to high-risk entities
        ) >= 2
      GROUP BY e.id, e.full_name, e.red_flag_rating
      ORDER BY relationship_count DESC
      LIMIT 10
    `,
    );

    for (const entity of highRiskPredictions) {
      predictions.push({
        id: `risk-${entity.id}`,
        type: 'risk',
        prediction: `${entity.full_name} may become high-risk due to connections with known high-risk entities`,
        confidence: Math.min(1.0, parseInt(entity.relationship_count, 10) * 0.15),
        supportingEvidence: [`Connected to ${entity.relationship_count} high-risk entities`],
        likelihood: entity.red_flag_rating < 2 ? 'high' : 'medium',
      });
    }

    return predictions;
  }

  async getRiskAssessmentPredictions(): Promise<RiskAssessmentPrediction[]> {
    const pool = getApiPool();

    // Find entities that might be at risk of having their risk rating increase
    const query = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating as current_risk,
        COUNT(er.id) as relationship_count,
        AVG(er.strength) as avg_strength,
        (SELECT COUNT(*) FROM entity_mentions em WHERE em.entity_id = e.id) as mention_count
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_id
      WHERE e.red_flag_rating < 4  -- Not already high risk
        AND (
          SELECT COUNT(*) 
          FROM entity_relationships er2 
          JOIN entities e2 ON er2.target_id = e2.id 
          WHERE er2.source_id = e.id 
            AND e2.red_flag_rating >= 4
        ) >= 1  -- Connected to at least one high-risk entity
      GROUP BY e.id, e.full_name, e.red_flag_rating
      HAVING COUNT(er.id) >= 3 AND (SELECT COUNT(*) FROM entity_mentions em WHERE em.entity_id = e.id) >= 5
      ORDER BY relationship_count DESC, avg_strength DESC
      LIMIT 20
    `;

    const { rows: results } = await pool.query(query);

    return results.map((row) => {
      const relationshipCount = parseInt(row.relationship_count, 10);
      const mentionCount = parseInt(row.mention_count, 10);
      const predictedRisk = Math.min(5, row.current_risk + relationshipCount * 0.2);
      const riskTrend = predictedRisk > row.current_risk ? 'increasing' : 'stable';

      return {
        entity: row.full_name,
        currentRisk: row.current_risk,
        predictedRisk: Math.round(predictedRisk * 10) / 10,
        riskTrend,
        contributingFactors: [
          `Connected to ${relationshipCount} entities`,
          `Mentioned in ${mentionCount} documents`,
          'Connected to high-risk entities',
        ],
        confidence: Math.min(1.0, relationshipCount * 0.1),
      };
    });
  }

  async getConnectionInferences(entityId?: number): Promise<ConnectionInference[]> {
    const pool = getApiPool();

    const query = `
      WITH entity_connections AS (
        -- Get all entities connected to our main entity
        SELECT target_id as connected_entity
        FROM entity_relationships
        WHERE source_id = $1
        UNION
        SELECT source_id as connected_entity
        FROM entity_relationships
        WHERE target_id = $2
      ),
      potential_connections AS (
        -- Find entities that share connections with the main entity's connections
        SELECT 
          er1.target_id as potential_target,
          COUNT(*) as shared_connections,
          AVG(er1.strength) as avg_strength
        FROM entity_relationships er1
        JOIN entity_connections ec ON er1.source_id = ec.connected_entity
        WHERE er1.target_id != $3
          AND er1.target_id NOT IN (SELECT connected_entity FROM entity_connections)
          AND NOT EXISTS (
            SELECT 1 FROM entity_relationships er2 
            WHERE (er2.source_id = $4 AND er2.target_id = er1.target_id)
               OR (er2.source_id = er1.target_id AND er2.target_id = $5)
          )
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      )
      SELECT 
        e.id,
        e.full_name,
        pc.shared_connections,
        pc.avg_strength
      FROM potential_connections pc
      JOIN entities e ON pc.potential_target = e.id
      ORDER BY pc.shared_connections DESC, pc.avg_strength DESC
      LIMIT 10
    `;

    const eId = entityId || 1; // Fallback for general search
    const { rows: results } = await pool.query(query, [eId, eId, eId, eId, eId]);

    const sourceEntity = entityId
      ? ((await entitiesRepository.getEntityById(entityId))?.fullName ?? 'Unknown')
      : 'Multiple';

    return results.map((row) => ({
      sourceEntity,
      targetEntity: row.full_name,
      inferredRelationship: 'potential connection',
      confidence: Math.min(1.0, parseInt(row.shared_connections, 10) * 0.2),
      supportingEvidence: [
        `Shares ${row.shared_connections} connections`,
        `Average strength: ${row.avg_strength}`,
      ],
      reason: `Shares multiple connections with entities connected to target`,
    }));
  }

  async getRiskAssessmentDashboard(): Promise<Record<string, unknown>> {
    const pool = getApiPool();

    // Calculate overall risk metrics
    const { rows: totalEntities } = await pool.query('SELECT COUNT(*) as count FROM entities');
    const { rows: highRiskEntities } = await pool.query(
      'SELECT COUNT(*) as count FROM entities WHERE red_flag_rating >= 4',
    );
    const { rows: mediumRiskEntities } = await pool.query(
      'SELECT COUNT(*) as count FROM entities WHERE red_flag_rating >= 2 AND red_flag_rating < 4',
    );
    const { rows: lowRiskEntities } = await pool.query(
      'SELECT COUNT(*) as count FROM entities WHERE red_flag_rating < 2',
    );

    // Risk trend analysis
    const { rows: riskTrend } = await pool.query(
      `
      SELECT 
        date_created,
        COUNT(*) as new_entities,
        AVG(red_flag_rating) as avg_risk
      FROM entities
      WHERE date_created IS NOT NULL
      GROUP BY date_created
      ORDER BY date_created DESC
      LIMIT 30
    `,
    );

    // High-risk entity connections
    const { rows: highRiskConnections } = await pool.query(
      `
      SELECT 
        e1.full_name as entity1,
        e2.full_name as entity2,
        er.strength,
        er.relationship_type
      FROM entity_relationships er
      JOIN entities e1 ON er.source_id = e1.id
      JOIN entities e2 ON er.target_id = e2.id
      WHERE e1.red_flag_rating >= 4 OR e2.red_flag_rating >= 4
      ORDER BY er.strength DESC
      LIMIT 20
    `,
    );

    // Predicted high-risk entities
    const predictedHighRisk = await this.getRiskAssessmentPredictions();

    const totalCount = parseInt(totalEntities[0].count, 10);
    const highCount = parseInt(highRiskEntities[0].count, 10);
    const mediumCount = parseInt(mediumRiskEntities[0].count, 10);
    const lowCount = parseInt(lowRiskEntities[0].count, 10);

    return {
      overallMetrics: {
        totalEntities: totalCount,
        highRiskCount: highCount,
        mediumRiskCount: mediumCount,
        lowRiskCount: lowCount,
        highRiskPercentage: totalCount > 0 ? (highCount / totalCount) * 100 : 0,
      },
      riskTrend,
      highRiskConnections,
      predictedHighRiskEntities: predictedHighRisk
        .filter((p) => p.riskTrend === 'increasing')
        .slice(0, 10),
      riskDistribution: {
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
    };
  }

  async getPredictiveInsights(searchTerm?: string): Promise<Record<string, unknown>> {
    const pool = getApiPool();

    // Find entities that appear in similar contexts to known high-risk entities
    const contextSimilarityQuery = `
      SELECT 
        e.id,
        e.full_name,
        e.red_flag_rating,
        COUNT(DISTINCT dm.document_id) as similarContextCount
      FROM entities e
      JOIN entity_mentions em ON e.id = em.entity_id
      JOIN entity_mentions dm ON em.document_id = dm.document_id
      JOIN entities de ON dm.entity_id = de.id
      WHERE de.red_flag_rating >= 4  -- Connected to high-risk entities
        AND e.red_flag_rating < 3  -- But not high-risk themselves
        AND e.id != de.id
    `;

    let queryWithParams = contextSimilarityQuery;
    const params: Record<string, string> = {};

    if (searchTerm) {
      queryWithParams += ` AND (e.full_name ILIKE $1 OR de.full_name ILIKE $1)`;
      params.searchTerm = `%${searchTerm}%`;
    }

    queryWithParams += ` GROUP BY e.id, e.full_name, e.red_flag_rating HAVING COUNT(DISTINCT dm.document_id) >= 2 ORDER BY similarContextCount DESC LIMIT 10`;

    const { rows: similarContextEntities } = await pool.query(
      queryWithParams,
      searchTerm ? [`%${searchTerm}%`] : [],
    );

    // Pattern-based predictions
    const patternPredictions = await this.getPatternPredictions();

    // Connection inferences
    const connectionInferences = await this.getConnectionInferences();

    return {
      contextSimilarity: similarContextEntities.map(
        (entity: { full_name: string; red_flag_rating: number; similarContextCount: string }) => ({
          entity: entity.full_name,
          currentRisk: entity.red_flag_rating,
          similarityScore: parseInt(entity.similarContextCount, 10),
          reason: 'Appears in similar contexts as high-risk entities',
        }),
      ),
      patternPredictions,
      connectionInferences,
      summary: {
        potentialRisks: similarContextEntities.length,
        predictedConnections: patternPredictions.length,
        inferredConnections: connectionInferences.length,
      },
    };
  }

  async getPatternPredictionsForEntity(entityId: number): Promise<PatternPrediction[]> {
    const pool = getApiPool();

    const predictions: PatternPrediction[] = [];

    // Find documents where this entity appears with other high-risk entities
    const query = `
      SELECT 
        d.id,
        d.file_name,
        d.date_created,
        e2.full_name as otherEntity,
        e2.red_flag_rating as otherRiskRating
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.document_id = em2.document_id
      JOIN documents d ON em1.document_id = d.id
      JOIN entities e2 ON em2.entity_id = e2.id
      WHERE em1.entity_id = ?
        AND em2.entity_id != ?
        AND e2.red_flag_rating >= 4
      ORDER BY d.date_created DESC
      LIMIT 10
    `;

    const { rows: results } = await pool.query(query, [entityId, entityId]);

    for (const result of results) {
      predictions.push({
        id: `doc-${result.id}-${entityId}`,
        type: 'event',
        prediction: `Document "${result.file_name}" connects ${result.otherEntity} (high-risk) with target entity`,
        confidence: Math.min(1.0, result.otherRiskRating * 0.2),
        supportingEvidence: [
          `Document: ${result.file_name}`,
          `Connected to high-risk entity: ${result.otherEntity}`,
        ],
        likelihood: result.otherRiskRating >= 4 ? 'high' : 'medium',
        timeframe: result.date_created,
      });
    }

    // Get inferred connections for this specific entity
    const inferredConnections = await this.getConnectionInferences(entityId);

    for (const conn of inferredConnections) {
      predictions.push({
        id: `inference-${entityId}-${conn.targetEntity}`,
        type: 'connection',
        prediction: `Connection likely exists between ${conn.sourceEntity} and ${conn.targetEntity}`,
        confidence: conn.confidence,
        supportingEvidence: conn.supportingEvidence,
        likelihood: conn.confidence > 0.7 ? 'high' : conn.confidence > 0.4 ? 'medium' : 'low',
      });
    }

    return predictions;
  }

  private async getInferredConnections(): Promise<ConnectionInference[]> {
    const pool = getApiPool();

    // Find entities that are highly connected to the same other entities
    const query = `
      SELECT 
        e1.full_name as sourceEntity,
        e2.full_name as targetEntity,
        COUNT(common_conn.entity_id) as commonConnectionCount,
        AVG(er1.strength) as avgStrength1,
        AVG(er2.strength) as avgStrength2
      FROM entities e1
      JOIN entity_relationships er1 ON e1.id = er1.source_id
      JOIN entity_relationships er2 ON e2.id = er2.source_id
      JOIN (
        SELECT er1.target_id as entity_id
        FROM entity_relationships er1
        JOIN entity_relationships er2 ON er1.target_id = er2.target_id
        WHERE er1.source_id != er2.source_id
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      ) as common_conn ON er1.target_id = common_conn.entity_id
      WHERE e1.id != e2.id
        AND er1.target_id = er2.target_id
      GROUP BY e1.id, e2.id
      HAVING commonConnectionCount >= 2
      ORDER BY commonConnectionCount DESC, avgStrength1 DESC, avgStrength2 DESC
      LIMIT 10
    `;

    const { rows: results } = await pool.query(query);

    return results.map((row) => ({
      sourceEntity: row.sourceentity,
      targetEntity: row.targetentity,
      inferredRelationship: 'similar connection patterns',
      confidence: Math.min(1.0, parseInt(row.commonconnectioncount, 10) * 0.2),
      supportingEvidence: [
        `Share ${row.commonconnectioncount} common connections`,
        `Average connection strength: ${((parseFloat(row.avgstrength1) || 0) + (parseFloat(row.avgstrength2) || 0)) / 2}`,
      ],
      reason: `Connected to many of the same entities`,
    }));
  }
}
