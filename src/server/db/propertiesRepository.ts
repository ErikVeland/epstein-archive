import { getApiPool } from './connection.js';

export interface Property {
  id: number;
  pcn: string;
  owner_name_1: string | null;
  owner_name_2: string | null;
  street_name: string | null;
  site_address: string | null;
  total_tax_value: number | null;
  acres: number | null;
  property_use: string | null;
  year_built: number | null;
  bedrooms: number | null;
  full_bathrooms: number | null;
  half_bathrooms: number | null;
  stories: number | null;
  building_value: number | null;
  building_area: number | null;
  living_area: number | null;
  is_epstein_property: number;
  is_known_associate: number;
  linked_entity_id: number | null;
}

export interface PropertyStats {
  totalProperties: number;
  epsteinProperties: number;
  knownAssociateProperties: number;
  avgTaxValue: number;
  maxTaxValue: number;
  propertyTypes: { type: string; count: number }[];
}

export const propertiesRepository = {
  /**
   * Get properties with filtering and pagination
   */
  getProperties: async (
    filters: {
      page?: number;
      limit?: number;
      ownerSearch?: string;
      minValue?: number;
      maxValue?: number;
      propertyUse?: string;
      knownAssociatesOnly?: boolean;
      sortBy?: 'value' | 'owner' | 'year';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{
    properties: Property[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> => {
    const pool = getApiPool();
    const {
      page = 1,
      limit = 50,
      ownerSearch,
      minValue,
      maxValue,
      propertyUse,
      knownAssociatesOnly = false,
      sortBy = 'value',
      sortOrder = 'desc',
    } = filters;

    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (ownerSearch) {
      conditions.push(`(owner_name_1 ILIKE $${i} OR owner_name_2 ILIKE $${i + 1})`);
      params.push(`%${ownerSearch}%`, `%${ownerSearch}%`);
      i += 2;
    }

    if (minValue !== undefined) {
      conditions.push(`total_tax_value >= $${i++}`);
      params.push(minValue);
    }

    if (maxValue !== undefined) {
      conditions.push(`total_tax_value <= $${i++}`);
      params.push(maxValue);
    }

    if (propertyUse) {
      conditions.push(`property_use = $${i++}`);
      params.push(propertyUse);
    }

    if (knownAssociatesOnly) {
      conditions.push('is_known_associate = 1');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM palm_beach_properties ${whereClause}`,
      params,
    );
    const total = parseInt(countRes.rows[0].total, 10);

    // Determine sort column
    let orderClause = '';
    const dir: 'ASC' | 'DESC' = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const ALLOWED_SORT_COLS: Record<string, string> = {
      owner: 'owner_name_1',
      year: 'year_built',
      value: 'total_tax_value',
    };
    const sortCol = ALLOWED_SORT_COLS[sortBy] ?? 'total_tax_value';
    const nullsClause = sortBy === 'owner' ? '' : ' NULLS LAST';
    orderClause = `ORDER BY ${sortCol} ${dir}${nullsClause}`;

    // Get properties
    const query = `
      SELECT * FROM palm_beach_properties
      ${whereClause}
      ${orderClause}
      LIMIT $${i++} OFFSET $${i++}
    `;
    const propertiesRes = await pool.query(query, [...params, limit, offset]);

    return {
      properties: propertiesRes.rows as Property[],
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Get property by ID
   */
  getPropertyById: async (id: number): Promise<Property | null> => {
    const pool = getApiPool();
    const res = await pool.query('SELECT * FROM palm_beach_properties WHERE id = $1', [id]);
    return (res.rows[0] as Property) || null;
  },

  /**
   * Get all properties owned by known associates or linked to entities
   */
  getKnownAssociateProperties: async (): Promise<Property[]> => {
    const pool = getApiPool();
    const res = await pool.query(`
      SELECT * FROM palm_beach_properties
      WHERE is_known_associate = 1 OR linked_entity_id IS NOT NULL
      ORDER BY total_tax_value DESC
    `);
    return res.rows as Property[];
  },

  /**
   * Get Epstein's properties
   */
  getEpsteinProperties: async (): Promise<Property[]> => {
    const pool = getApiPool();
    const res = await pool.query(`
      SELECT * FROM palm_beach_properties
      WHERE is_epstein_property = 1
      ORDER BY total_tax_value DESC
    `);
    return res.rows as Property[];
  },

  /**
   * Get property statistics
   */
  getPropertyStats: async (): Promise<PropertyStats> => {
    const pool = getApiPool();

    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        SUM(is_epstein_property) as epstein_properties,
        SUM(CASE WHEN is_known_associate = 1 OR linked_entity_id IS NOT NULL THEN 1 ELSE 0 END) as known_associate_properties,
        ROUND(AVG(total_tax_value)::numeric, 0) as avg_tax_value,
        MAX(total_tax_value) as max_tax_value
      FROM palm_beach_properties
    `);
    const stats = statsRes.rows[0];

    const typesRes = await pool.query(`
      SELECT property_use as type, COUNT(*) as count
      FROM palm_beach_properties
      WHERE property_use IS NOT NULL
      GROUP BY property_use
      ORDER BY count DESC
    `);

    return {
      totalProperties: parseInt(stats.total_properties || '0', 10),
      epsteinProperties: parseInt(stats.epstein_properties || '0', 10),
      knownAssociateProperties: parseInt(stats.known_associate_properties || '0', 10),
      avgTaxValue: parseFloat(stats.avg_tax_value || '0'),
      maxTaxValue: parseFloat(stats.max_tax_value || '0'),
      propertyTypes: typesRes.rows.map((r) => ({ type: r.type, count: parseInt(r.count, 10) })),
    };
  },

  /**
   * Search property owners against entity database
   */
  findMatchingEntities: async (
    ownerName: string,
  ): Promise<{ id: number; full_name: string; match_score: number }[]> => {
    const pool = getApiPool();
    const searchTerms = ownerName.split(/\s+/).filter((t) => t.length > 2);
    if (searchTerms.length === 0) return [];

    const conditions = searchTerms.map((_, idx) => `full_name ILIKE $${idx + 1}`).join(' OR ');
    const params = searchTerms.map((t) => `%${t}%`);

    // Postgres simple matching logic - counting how many terms match via subquery
    /*
    const sql = `
      SELECT id, full_name, 
        (SELECT COUNT(*) FROM (
          SELECT 1 FROM (SELECT $1 as term UNION ALL SELECT $2 as term) t WHERE full_name ILIKE term
        ) s) as match_score
      FROM entities
      WHERE (${conditions})
      AND primary_role IS NOT NULL
      ORDER BY red_flag_rating DESC
      LIMIT 5
    `;
    */
    // Note: The count logic above is simplified for the migration.
    // In Postgres, we should ideally use Word Similarity or TSVector for scores.
    // Keeping it simple to match the functional requirement.
    const res = await pool.query(
      `
      SELECT id, full_name, red_flag_rating as red_flag_rating
      FROM entities
      WHERE (${conditions})
      AND primary_role IS NOT NULL
      ORDER BY red_flag_rating DESC
      LIMIT 5
    `,
      params,
    );

    return res.rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      match_score: 1, // simplified score
    }));
  },

  /**
   * Link a property to an entity
   */
  linkPropertyToEntity: async (propertyId: number, entityId: number): Promise<void> => {
    const pool = getApiPool();
    await pool.query(
      `
      UPDATE palm_beach_properties
      SET linked_entity_id = $1, is_known_associate = 1
      WHERE id = $2
    `,
      [entityId, propertyId],
    );
  },

  /**
   * Get property value distribution
   */
  getValueDistribution: async (): Promise<{ range: string; count: number }[]> => {
    const pool = getApiPool();
    const res = await pool.query(`
      SELECT 
        CASE 
          WHEN total_tax_value < 500000 THEN 'Under $500K'
          WHEN total_tax_value < 1000000 THEN '$500K - $1M'
          WHEN total_tax_value < 5000000 THEN '$1M - $5M'
          WHEN total_tax_value < 10000000 THEN '$5M - $10M'
          WHEN total_tax_value < 50000000 THEN '$10M - $50M'
          ELSE 'Over $50M'
        END as range,
        COUNT(*) as count
      FROM palm_beach_properties
      WHERE total_tax_value IS NOT NULL
      GROUP BY range
      ORDER BY MIN(total_tax_value)
    `);
    return res.rows.map((r) => ({ range: r.range, count: parseInt(r.count, 10) }));
  },

  /**
   * Get top property owners by total value
   */
  getTopOwners: async (
    limit = 20,
  ): Promise<{ owner_name: string; property_count: number; total_value: number }[]> => {
    const pool = getApiPool();
    const res = await pool.query(
      `
      SELECT 
        COALESCE(owner_name_1, 'Unknown') as owner_name,
        COUNT(*) as property_count,
        SUM(total_tax_value) as total_value
      FROM palm_beach_properties
      WHERE owner_name_1 IS NOT NULL AND owner_name_1 != '' AND owner_name_1 != 'Unknown'
      GROUP BY owner_name_1
      HAVING SUM(total_tax_value) > 0
      ORDER BY total_value DESC
      LIMIT $1
    `,
      [limit],
    );
    return res.rows.map((r) => ({
      owner_name: r.owner_name,
      property_count: parseInt(r.property_count, 10),
      total_value: parseFloat(r.total_value || '0'),
    }));
  },
};
