import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';
import {
  calculateEntityRiskRawScore,
  computeEntityRisk,
  EntityRiskAggregate,
  isTopRiskBaselineEntity,
} from '../src/utils/entityRisk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');

type RiskAggregateRow = {
  id: string | number;
  fullName: string;
  mentionCount: string | number | null;
  distinctDocuments: string | number | null;
  avgDocRedFlag: string | number | null;
  maxDocRedFlag: string | number | null;
  highRiskDocuments: string | number | null;
  mediumRiskDocuments: string | number | null;
  lowRiskDocuments: string | number | null;
  sourceCollectionsCount: string | number | null;
  blackBookCount: string | number | null;
  mediaEvidenceCount: string | number | null;
  avgMentionConfidence: string | number | null;
  evidenceTypeCounts: Record<string, number> | null;
};

const aggregateSql = `
  WITH mentionStats AS (
    SELECT
      em.entity_id AS "entityId",
      COUNT(*)::int AS "mentionCount",
      AVG(COALESCE(em.confidence, 1.0))::float AS "avgMentionConfidence"
    FROM entity_mentions em
    GROUP BY em.entity_id
  ),
  docEvidence AS (
    SELECT
      em.entity_id AS "entityId",
      d.id AS "documentId",
      LOWER(COALESCE(NULLIF(BTRIM(d.evidence_type), ''), 'document')) AS "evidenceType",
      GREATEST(COALESCE(em.doc_red_flag_rating, d.red_flag_rating, 0), 0)::int AS "docRedFlagRating",
      COALESCE(NULLIF(BTRIM(d.source_collection), ''), 'unknown') AS "sourceCollection"
    FROM entity_mentions em
    JOIN documents d ON d.id = em.document_id
    GROUP BY
      em.entity_id,
      d.id,
      LOWER(COALESCE(NULLIF(BTRIM(d.evidence_type), ''), 'document')),
      GREATEST(COALESCE(em.doc_red_flag_rating, d.red_flag_rating, 0), 0)::int,
      COALESCE(NULLIF(BTRIM(d.source_collection), ''), 'unknown')
  ),
  docStats AS (
    SELECT
      de."entityId",
      COUNT(*)::int AS "distinctDocuments",
      AVG(de."docRedFlagRating")::float AS "avgDocRedFlag",
      MAX(de."docRedFlagRating")::int AS "maxDocRedFlag",
      COUNT(*) FILTER (WHERE de."docRedFlagRating" >= 4)::int AS "highRiskDocuments",
      COUNT(*) FILTER (WHERE de."docRedFlagRating" BETWEEN 2 AND 3)::int AS "mediumRiskDocuments",
      COUNT(*) FILTER (WHERE de."docRedFlagRating" <= 1)::int AS "lowRiskDocuments",
      COUNT(DISTINCT CASE WHEN de."sourceCollection" <> 'unknown' THEN de."sourceCollection" END)::int
        AS "sourceCollectionsCount",
      COUNT(*) FILTER (WHERE de."evidenceType" = 'media')::int AS "mediaEvidenceCount"
    FROM docEvidence de
    GROUP BY de."entityId"
  ),
  typeCounts AS (
    SELECT
      de."entityId",
      de."evidenceType",
      COUNT(*)::int AS "docCount"
    FROM docEvidence de
    GROUP BY de."entityId", de."evidenceType"
  ),
  typeAgg AS (
    SELECT
      tc."entityId",
      jsonb_object_agg(tc."evidenceType", tc."docCount") AS "evidenceTypeCounts"
    FROM typeCounts tc
    GROUP BY tc."entityId"
  ),
  blackBookStats AS (
    SELECT
      bbe.person_id AS "entityId",
      COUNT(*)::int AS "blackBookCount"
    FROM black_book_entries bbe
    GROUP BY bbe.person_id
  )
  SELECT
    e.id,
    e.full_name AS "fullName",
    COALESCE(ms."mentionCount", 0) AS "mentionCount",
    COALESCE(ds."distinctDocuments", 0) AS "distinctDocuments",
    COALESCE(ds."avgDocRedFlag", 0) AS "avgDocRedFlag",
    COALESCE(ds."maxDocRedFlag", 0) AS "maxDocRedFlag",
    COALESCE(ds."highRiskDocuments", 0) AS "highRiskDocuments",
    COALESCE(ds."mediumRiskDocuments", 0) AS "mediumRiskDocuments",
    COALESCE(ds."lowRiskDocuments", 0) AS "lowRiskDocuments",
    COALESCE(ds."sourceCollectionsCount", 0) AS "sourceCollectionsCount",
    COALESCE(bs."blackBookCount", 0) AS "blackBookCount",
    COALESCE(ds."mediaEvidenceCount", 0) AS "mediaEvidenceCount",
    COALESCE(ms."avgMentionConfidence", 1) AS "avgMentionConfidence",
    COALESCE(ta."evidenceTypeCounts", '{}'::jsonb) AS "evidenceTypeCounts"
  FROM entities e
  LEFT JOIN mentionStats ms ON ms."entityId" = e.id
  LEFT JOIN docStats ds ON ds."entityId" = e.id
  LEFT JOIN blackBookStats bs ON bs."entityId" = e.id
  LEFT JOIN typeAgg ta ON ta."entityId" = e.id
  ORDER BY e.id ASC
`;

const toNumber = (value: string | number | null | undefined, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toAggregate = (row: RiskAggregateRow): EntityRiskAggregate => ({
  fullName: String(row.fullName || '').trim(),
  mentionCount: toNumber(row.mentionCount),
  distinctDocuments: toNumber(row.distinctDocuments),
  avgDocRedFlag: toNumber(row.avgDocRedFlag),
  maxDocRedFlag: toNumber(row.maxDocRedFlag),
  highRiskDocuments: toNumber(row.highRiskDocuments),
  mediumRiskDocuments: toNumber(row.mediumRiskDocuments),
  lowRiskDocuments: toNumber(row.lowRiskDocuments),
  sourceCollectionsCount: toNumber(row.sourceCollectionsCount),
  blackBookCount: toNumber(row.blackBookCount),
  mediaEvidenceCount: toNumber(row.mediaEvidenceCount),
  avgMentionConfidence: toNumber(row.avgMentionConfidence, 1),
  evidenceTypeCounts: row.evidenceTypeCounts ?? {},
});

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required to recalculate entity risk.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const columnCheck = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'entities' AND column_name = 'red_flag_score'
      ) AS exists
    `);
    const hasRedFlagScoreColumn = Boolean(columnCheck.rows[0]?.exists);

    const aggregateResult = await client.query<RiskAggregateRow>(aggregateSql);
    const aggregates = aggregateResult.rows.map((row) => ({
      id: String(row.id),
      aggregate: toAggregate(row),
    }));

    const anchorRawScore = Math.max(
      1,
      ...aggregates
        .filter(({ aggregate }) => isTopRiskBaselineEntity(aggregate.fullName))
        .map(({ aggregate }) => calculateEntityRiskRawScore(aggregate)),
    );

    const computed = aggregates.map(({ id, aggregate }) => ({
      id,
      aggregate,
      risk: computeEntityRisk(aggregate, anchorRawScore),
    }));

    if (dryRun) {
      console.table(
        computed
          .sort((a, b) => b.risk.normalizedScore - a.risk.normalizedScore)
          .slice(0, 20)
          .map(({ aggregate, risk }) => ({
            fullName: aggregate.fullName,
            normalizedScore: risk.normalizedScore,
            redFlagRating: risk.redFlagRating,
            riskLevel: risk.riskLevel,
            distinctDocuments: aggregate.distinctDocuments,
          })),
      );
      return;
    }

    await client.query('BEGIN');

    const updateSql = hasRedFlagScoreColumn
      ? `
          UPDATE entities
          SET
            mentions = $2,
            red_flag_rating = $3,
            red_flag_score = $4,
            risk_level = $5,
            red_flag_description = $6,
            entity_metadata_json = COALESCE(entity_metadata_json, '{}'::jsonb) || $7::jsonb,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1::bigint
        `
      : `
          UPDATE entities
          SET
            mentions = $2,
            red_flag_rating = $3,
            risk_level = $4,
            red_flag_description = $5,
            entity_metadata_json = COALESCE(entity_metadata_json, '{}'::jsonb) || $6::jsonb,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1::bigint
        `;

    for (const { id, aggregate, risk } of computed) {
      const metadataPatch = JSON.stringify({
        riskV2: {
          version: 'entityRisk-v1',
          lastCalculatedAt: new Date().toISOString(),
          rawScore: risk.rawScore,
          normalizedScore: risk.normalizedScore,
          anchorScore: anchorRawScore,
          driverLabels: risk.driverLabels,
          inputs: {
            mentionCount: aggregate.mentionCount,
            distinctDocuments: aggregate.distinctDocuments,
            avgDocRedFlag: aggregate.avgDocRedFlag,
            maxDocRedFlag: aggregate.maxDocRedFlag,
            highRiskDocuments: aggregate.highRiskDocuments,
            mediumRiskDocuments: aggregate.mediumRiskDocuments,
            sourceCollectionsCount: aggregate.sourceCollectionsCount,
            blackBookCount: aggregate.blackBookCount,
            mediaEvidenceCount: aggregate.mediaEvidenceCount,
            avgMentionConfidence: aggregate.avgMentionConfidence,
            evidenceTypeCounts: aggregate.evidenceTypeCounts,
          },
        },
      });

      const params = hasRedFlagScoreColumn
        ? [
            id,
            aggregate.mentionCount,
            risk.redFlagRating,
            risk.normalizedScore,
            risk.riskLevel,
            risk.description,
            metadataPatch,
          ]
        : [
            id,
            aggregate.mentionCount,
            risk.redFlagRating,
            risk.riskLevel,
            risk.description,
            metadataPatch,
          ];

      await client.query(updateSql, params);
    }

    await client.query('COMMIT');

    console.log(
      JSON.stringify({
        updatedEntities: computed.length,
        anchorScore: anchorRawScore,
        hasRedFlagScoreColumn,
        topRisk: computed
          .sort((a, b) => b.risk.normalizedScore - a.risk.normalizedScore)
          .slice(0, 10)
          .map(({ aggregate, risk }) => ({
            fullName: aggregate.fullName,
            normalizedScore: risk.normalizedScore,
            redFlagRating: risk.redFlagRating,
            riskLevel: risk.riskLevel,
          })),
      }),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
