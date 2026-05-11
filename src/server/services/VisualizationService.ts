import { getApiPool } from '../db/connection.js';
import { relationshipsRepository } from '../db/relationshipsRepository.js';
import { logger } from './Logger.js';

export interface RelationshipNode {
  id: string;
  label: string;
  type: string;
  redFlagRating?: number;
  group?: string;
  x?: number;
  y?: number;
}

export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  confidence?: number;
}

export interface NetworkGraph {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
}

export interface GeospatialData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  connections: string[];
}

export interface TimelineVisualization {
  events: {
    id: string;
    title: string;
    date: string;
    entities: string[];
    documents: string[];
    type: string;
  }[];
}

export class VisualizationService {
  async getRelationshipGraph(entityId?: number, maxNodes: number = 100): Promise<NetworkGraph> {
    const pool = getApiPool();

    let nodes: RelationshipNode[] = [];
    let edges: RelationshipEdge[] = [];

    if (entityId) {
      // Get a specific entity's network
      const graphData = await relationshipsRepository.getGraphSlice(entityId, 3);

      // Process nodes
      nodes = graphData.nodes.map((node) => ({
        id: node.id.toString(),
        label: node.label,
        type: node.type,
        group: node.type,
      }));

      // Process edges
      edges = graphData.edges.flatMap((edge) => {
        return [
          {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            strength: edge.weight ?? 0.5,
          },
        ];
      });
    } else {
      // Get top connected entities for a broader view
      const topEntitiesRes = await pool.query(
        `
        SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.red_flag_rating,
          COUNT(er.id) as connectionCount
        FROM entities e
        LEFT JOIN entity_relationships er ON e.id = er.source_id OR e.id = er.target_id
        GROUP BY e.id
        ORDER BY connectionCount DESC
        LIMIT $1
      `,
        [maxNodes],
      );

      const topEntities = topEntitiesRes.rows;

      // Add top entities as nodes
      nodes = topEntities.map(
        (entity: {
          id: number;
          full_name: string;
          primary_role: string;
          red_flag_rating: number;
        }) => ({
          id: entity.id.toString(),
          label: entity.full_name,
          type: entity.primary_role || 'Person',
          redFlagRating: entity.red_flag_rating,
          group: entity.primary_role || 'Person',
        }),
      );

      // Get relationships between these top entities
      const entityIds = topEntities.map((e: { id: number }) => e.id);
      if (entityIds.length > 0) {
        const placeholders = entityIds.map((_, idx) => `$${idx + 1}`).join(',');
        const relationshipsRes = await pool.query(
          `
          SELECT 
            er.source_id,
            er.target_id,
            er.relationship_type,
            COALESCE(er.strength, er.proximity_score, 0.5) as strength
          FROM entity_relationships er
          WHERE (er.source_id IN (${placeholders}) AND er.target_id IN (${placeholders}))
        `,
          entityIds, // Simplifying: in Postgres we could use = ANY($1) for better performance
        );

        edges = relationshipsRes.rows.map(
          (rel: {
            source_id: number;
            target_id: number;
            relationship_type: string;
            strength: string | number;
          }) => ({
            id: `${rel.source_id}-${rel.target_id}`,
            source: rel.source_id.toString(),
            target: rel.target_id.toString(),
            type: rel.relationship_type,
            strength: parseFloat(String(rel.strength ?? '0.5')),
          }),
        );
      }
    }

    return { nodes, edges };
  }

  async getGeospatialData(): Promise<GeospatialData[]> {
    const pool = getApiPool();
    const locations: GeospatialData[] = [];

    try {
      const res = await pool.query(
        `
        SELECT DISTINCT 
          departure_airport,
          arrival_airport,
          departure_lat,
          departure_lon,
          arrival_lat,
          arrival_lon
        FROM flights
        WHERE departure_lat IS NOT NULL AND departure_lon IS NOT NULL
        LIMIT 50
      `,
      );

      const flightLocations = res.rows;

      flightLocations.forEach(
        (flight: {
          departure_airport: string;
          arrival_airport: string;
          departure_lat: string;
          departure_lon: string;
          arrival_lat: string;
          arrival_lon: string;
        }) => {
          if (flight.departure_lat && flight.departure_lon) {
            locations.push({
              id: `dep-${flight.departure_airport}`,
              name: flight.departure_airport,
              latitude: parseFloat(flight.departure_lat),
              longitude: parseFloat(flight.departure_lon),
              type: 'departure',
              connections: [flight.arrival_airport],
            });
          }

          if (flight.arrival_lat && flight.arrival_lon) {
            locations.push({
              id: `arr-${flight.arrival_airport}`,
              name: flight.arrival_airport,
              latitude: parseFloat(flight.arrival_lat),
              longitude: parseFloat(flight.arrival_lon),
              type: 'arrival',
              connections: [flight.departure_airport],
            });
          }
        },
      );
    } catch (e) {
      logger.info({ err: e }, 'Flight data not available for geospatial visualization');
    }

    return locations;
  }

  async getTimelineVisualization(searchTerm?: string): Promise<TimelineVisualization> {
    const pool = getApiPool();

    let query = `
      SELECT 
        d.id,
        d.file_name as title,
        d.date_created as date,
        d.evidence_type as type,
        STRING_AGG(e.full_name, ',') as entities
      FROM documents d
      LEFT JOIN entity_mentions em ON d.id = em.document_id
      LEFT JOIN entities e ON em.entity_id = e.id
    `;

    const params: string[] = [];

    if (searchTerm) {
      query += ` WHERE d.file_name ILIKE $1 OR d.content ILIKE $1`;
      params.push(`%${searchTerm}%`);
    }

    query += ` GROUP BY d.id ORDER BY d.date_created ASC LIMIT 100`;

    interface TimelineRow {
      id: number;
      title: string;
      date: string | null;
      entities: string | null;
      type: string | null;
    }

    const res = await pool.query<TimelineRow>(query, params);
    const results = res.rows;

    const events = results.map((row) => ({
      id: row.id.toString(),
      title: row.title,
      date: row.date || '',
      entities: row.entities ? row.entities.split(',') : [],
      documents: [row.title],
      type: row.type || 'document',
    }));

    return { events };
  }

  async getNetworkAnalysis(): Promise<{
    networkMetrics: {
      totalEntities: number;
      totalRelationships: number;
      density: number;
      averageConnectionsPerEntity: number;
    };
    centralFigures: Record<string, unknown>[];
    relationshipTypes: Record<string, unknown>[];
    informationFlow: Record<string, unknown>[];
  }> {
    const pool = getApiPool();

    // Calculate network metrics
    const totalEntitiesRes = await pool.query('SELECT COUNT(*) as count FROM entities');
    const totalEntities = parseInt(totalEntitiesRes.rows[0].count, 10);

    const totalRelRes = await pool.query('SELECT COUNT(*) as count FROM entity_relationships');
    const totalRelationships = parseInt(totalRelRes.rows[0].count, 10);

    // Find central figures
    const centralFiguresRes = await pool.query(`
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.red_flag_rating,
        (SELECT COUNT(*) FROM entity_relationships WHERE source_id = e.id OR target_id = e.id) as connection_count
      FROM entities e
      ORDER BY connection_count DESC
      LIMIT 10
    `);

    // Find relationship types distribution
    const relTypesRes = await pool.query(`
      SELECT 
        relationship_type,
        COUNT(*) as count
      FROM entity_relationships
      WHERE relationship_type IS NOT NULL
      GROUP BY relationship_type
      ORDER BY count DESC
    `);

    // Information flow patterns
    const infoFlowRes = await pool.query(`
      SELECT 
        e1.full_name as source,
        e2.full_name as target,
        er.relationship_type,
        COALESCE(er.strength, er.proximity_score) as strength
      FROM entity_relationships er
      JOIN entities e1 ON er.source_id = e1.id
      JOIN entities e2 ON er.target_id = e2.id
      ORDER BY strength DESC
      LIMIT 20
    `);

    return {
      networkMetrics: {
        totalEntities,
        totalRelationships,
        density: totalEntities > 0 ? totalRelationships / (totalEntities * (totalEntities - 1)) : 0,
        averageConnectionsPerEntity: totalEntities > 0 ? totalRelationships / totalEntities : 0,
      },
      centralFigures: centralFiguresRes.rows,
      relationshipTypes: relTypesRes.rows,
      informationFlow: infoFlowRes.rows,
    };
  }

  async getInteractiveMapData(): Promise<{
    nodes: (RelationshipNode & { x: number; y: number })[];
    edges: RelationshipEdge[];
    layout: string;
  }> {
    // This would provide data for an interactive relationship map
    // For now, return a structure that could be used for visualization

    const graph = await this.getRelationshipGraph();

    // Add coordinates for visualization (using a simple layout algorithm)
    const nodesWithCoords = graph.nodes.map((node, index) => {
      // Simple circular layout
      const angle = (2 * Math.PI * index) / graph.nodes.length;
      return {
        ...node,
        x: 300 + 200 * Math.cos(angle),
        y: 300 + 200 * Math.sin(angle),
      };
    });

    return {
      nodes: nodesWithCoords,
      edges: graph.edges,
      layout: 'circular',
    };
  }

  async getConnectionInference(entityId: number): Promise<
    {
      entity: string;
      primaryRole: string | null;
      redFlagRating: number | null;
      confidence: number;
      sharedConnectionCount: number;
      reason: string;
    }[]
  > {
    const pool = getApiPool();

    const query = `
      WITH direct_connections AS (
        SELECT target_id as connected_id
        FROM entity_relationships
        WHERE source_id = $1
        UNION
        SELECT source_id as connected_id
        FROM entity_relationships
        WHERE target_id = $2
      ),
      shared_connections AS (
        SELECT 
          er1.target_id as potential_connection,
          COUNT(*) as shared_count
        FROM entity_relationships er1
        JOIN entity_relationships er2 ON er1.target_id = er2.target_id
        JOIN direct_connections dc ON er2.source_id = dc.connected_id
        WHERE er1.source_id = $3
          AND er1.target_id != $4
          AND er2.target_id != $5
        GROUP BY er1.target_id
        HAVING COUNT(*) >= 2
      )
      SELECT 
        e.id,
        e.full_name,
        e.primary_role,
        e.red_flag_rating,
        sc.shared_count
      FROM shared_connections sc
      JOIN entities e ON sc.potential_connection = e.id
      ORDER BY sc.shared_count DESC
      LIMIT 10
    `;

    interface ConnectionRow {
      id: number;
      full_name: string;
      primary_role: string | null;
      red_flag_rating: number | null;
      shared_count: string | number;
    }

    const res = await pool.query<ConnectionRow>(query, [
      entityId,
      entityId,
      entityId,
      entityId,
      entityId,
    ]);
    const inferredConnections = res.rows;

    return inferredConnections.map((conn) => {
      const sharedCount = Number(conn.shared_count || 0);
      return {
        entity: conn.full_name,
        primaryRole: conn.primary_role,
        redFlagRating: conn.red_flag_rating,
        confidence: sharedCount > 0 ? Math.min(1.0, sharedCount * 0.2) : 0,
        sharedConnectionCount: sharedCount,
        reason: `Connected through ${sharedCount} shared connections`,
      };
    });
  }
}
