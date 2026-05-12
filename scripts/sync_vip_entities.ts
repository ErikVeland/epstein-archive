#!/usr/bin/env tsx

import 'dotenv/config';
import { Client } from 'pg';
import { VIP_RULES } from './filters/vipRules.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

function csv(values: string[]): string {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).join(',');
}

const vipPeople = VIP_RULES.filter((rule) => rule.type === 'Person');
const client = new Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
  await client.query('BEGIN');

  let updated = 0;
  let inserted = 0;

  for (const rule of vipPeople) {
    const aliases = csv(rule.aliases || []);
    const riskLevel = rule.metadata?.riskLevel?.toUpperCase() || 'MEDIUM';
    const role = rule.metadata?.category || 'VIP';

    const existing = await client.query<{ id: string }>(
      `
        SELECT id
        FROM entities
        WHERE LOWER(full_name) = LOWER($1)
        ORDER BY id ASC
        LIMIT 1
      `,
      [rule.canonicalName],
    );

    if (existing.rows[0]) {
      await client.query(
        `
          UPDATE entities
          SET
            entity_type = 'Person',
            is_vip = 1,
            manually_reviewed = 1,
            junk_tier = 'clean',
            junk_probability = 0,
            junk_reason = NULL,
            quarantine_status = 0,
            aliases = CASE
              WHEN $2::text = '' THEN aliases
              WHEN aliases IS NULL OR BTRIM(aliases) = '' THEN $2::text
              WHEN aliases NOT ILIKE '%' || $2::text || '%' THEN aliases || ',' || $2::text
              ELSE aliases
            END,
            primary_role = COALESCE(NULLIF(primary_role, ''), $3::text),
            risk_level = COALESCE(NULLIF(risk_level, ''), $4::text),
            bio = COALESCE(NULLIF(bio, ''), $5::text),
            birth_date = COALESCE(NULLIF(birth_date, ''), $6::text),
            death_date = COALESCE(NULLIF(death_date, ''), $7::text),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          existing.rows[0].id,
          aliases,
          role,
          riskLevel,
          rule.metadata?.bio || rule.metadata?.notes || null,
          rule.metadata?.birthDate || null,
          rule.metadata?.deathDate || null,
        ],
      );
      updated += 1;
      continue;
    }

    await client.query(
      `
        INSERT INTO entities (
          full_name,
          entity_type,
          primary_role,
          risk_level,
          aliases,
          bio,
          birth_date,
          death_date,
          is_vip,
          manually_reviewed,
          junk_tier,
          junk_probability,
          quarantine_status,
          mentions,
          red_flag_rating,
          created_at,
          updated_at
        )
        VALUES ($1, 'Person', $2, $3, $4, $5, $6, $7, 1, 1, 'clean', 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [
        rule.canonicalName,
        role,
        riskLevel,
        aliases,
        rule.metadata?.bio || rule.metadata?.notes || null,
        rule.metadata?.birthDate || null,
        rule.metadata?.deathDate || null,
      ],
    );
    inserted += 1;
  }

  const count = await client.query<{ total: string }>(
    "SELECT COUNT(*)::bigint AS total FROM entities WHERE COALESCE(is_vip, 0) = 1 AND COALESCE(junk_tier, 'clean') = 'clean' AND COALESCE(quarantine_status, 0) = 0",
  );

  await client.query('COMMIT');
  console.log(
    `[entity-quality] synced VIP people=${vipPeople.length} updated=${updated} inserted=${inserted} cleanVipTotal=${count.rows[0]?.total ?? 0}`,
  );
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
