/* eslint-disable no-undef */

export const shorthands = undefined;

/**
 * Enriches palm_beach_properties.site_address for the ~544 rows where the
 * owner_name_1 is an address-named LLC/Trust/LP (e.g. "700 NORTH LAKE LLC").
 *
 * Criteria for a match:
 *   1. No existing site_address
 *   2. owner_name_1 starts with a house number (one or more digits then space)
 *   3. Contains at least one directional OR street-type keyword — ensures
 *      "702 ASSOCIATES LLC" and "123 LLC" are NOT matched.
 *
 * The legal-entity suffix (LLC, LP, TRUST, INC, etc.) is stripped before
 * writing to site_address.
 *
 * address_source values:
 *   'original'     — present in the source CSV
 *   'name_derived' — extracted from owner_name_1 by this migration
 */

export async function up(pgm) {
  // 1. Add provenance column
  pgm.sql(`
    ALTER TABLE palm_beach_properties
    ADD COLUMN IF NOT EXISTS address_source text;
  `);

  // 2. Mark existing real addresses
  pgm.sql(`
    UPDATE palm_beach_properties
    SET address_source = 'original'
    WHERE site_address IS NOT NULL AND site_address <> '';
  `);

  // 3. Derive addresses from qualifying owner names
  pgm.sql(`
    UPDATE palm_beach_properties
    SET
      site_address = TRIM(
        REGEXP_REPLACE(
          owner_name_1,
          '\\s+(LAND\\s+TRUST|LLC|L\\.L\\.C\\.|LP|L\\.P\\.|INC\\.?|INCORPORATED|TRUST|LTD\\.?|CORP\\.?|CORPORATION|HOLDINGS|ASSOCIATES|ASSOC|REALTY|PROPERTIES|GROUP|PARTNERSHIP|PARTNERS|COMPANY|CO\\.?)\\s*$',
          '',
          'gi'
        )
      ),
      address_source = 'name_derived'
    WHERE
      (site_address IS NULL OR site_address = '')
      AND owner_name_1 ~ '^[0-9]+ '
      AND owner_name_1 ~* '\\y(BLVD|BOULEVARD|RD|ROAD|AVE|AVENUE|WAY|DR|DRIVE|LN|LANE|CT|COURT|CIRCLE|CIR|TERRACE|TER|PKWY|PARKWAY|PL|PLACE|NORTH|SOUTH|EAST|WEST|OCEAN|LAKE|COUNTY|HARBOR|HARBOR|COCONUT|BANYAN|ROYAL|PALM|INLET|ISLAND|SOUND)\\y';
  `);
}

export async function down(pgm) {
  // Revert derived addresses and drop the column
  pgm.sql(`
    UPDATE palm_beach_properties
    SET site_address = NULL
    WHERE address_source = 'name_derived';
  `);

  pgm.dropColumn('palm_beach_properties', 'address_source');
}
