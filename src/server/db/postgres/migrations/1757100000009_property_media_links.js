/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.createTable('property_media_links', {
    property_id: {
      type: 'bigint',
      notNull: true,
      references: 'palm_beach_properties(id)',
      onDelete: 'CASCADE',
    },
    media_item_id: {
      type: 'text',
      notNull: true,
      references: 'media_items(id)',
      onDelete: 'CASCADE',
    },
    match_basis: { type: 'text', notNull: true },
    confidence: { type: 'real', notNull: true },
    is_primary: { type: 'boolean', notNull: true, default: false },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });

  pgm.addConstraint('property_media_links', 'property_media_links_pk', {
    primaryKey: ['property_id', 'media_item_id'],
  });
  pgm.addConstraint('property_media_links', 'property_media_links_confidence_check', {
    check: 'confidence >= 0 AND confidence <= 1',
  });
  pgm.createIndex('property_media_links', ['media_item_id']);
  pgm.createIndex('property_media_links', ['property_id', 'is_primary', 'confidence']);

  // Restore the historic situs address from the exact parcel record in the
  // preserved source evidence. Do not infer addresses from owner names.
  pgm.sql(`
    UPDATE palm_beach_properties
    SET
      site_address = '358 EL BRILLO WAY, PALM BEACH, FL 33480',
      address_source = 'document_verified'
    WHERE pcn = '50434327060000391'
      AND owner_name_1 = 'EPSTEIN JEFFREY'
      AND (site_address IS NULL OR btrim(site_address) = '');
  `);
}

export async function down(pgm) {
  pgm.sql(`
    UPDATE palm_beach_properties
    SET site_address = NULL, address_source = NULL
    WHERE pcn = '50434327060000391'
      AND owner_name_1 = 'EPSTEIN JEFFREY'
      AND address_source = 'document_verified';
  `);
  pgm.dropTable('property_media_links');
}
