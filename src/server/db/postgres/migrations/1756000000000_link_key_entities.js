/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // Add missing VIP entities avoiding duplication
  pgm.sql(`
    DO $$
    DECLARE
      target_names TEXT[] := ARRAY[
        'Al Seckel', 'Kimbal Musk', 'Karyna Shuliak', 'Deepak Chopra', 'Ken Starr', 'Peter Attia',
        'Jeremy Rubin', 'Neri Oxman', 'Marvin Minsky', 'Lawrence Krauss', 'Seth Lloyd', 'Boris Nikolic',
        'Jean Luc Brunel', 'Lesley Groff', 'Sarah Kellen', 'Nadia Marcinkova', 'Darren Indyke',
        'Mark Epstein', 'Emad Hanna', 'Joscha Bach', 'Rich Kahn', 'Cecilia Steen', 'John Amerling',
        'Sultan Bin Sulayem', 'Matthew Hiltzik', 'Peter Mandelson', 'Howard Lutnick'
      ];
      name_item TEXT;
    BEGIN
      FOREACH name_item IN ARRAY target_names
      LOOP
        IF EXISTS (SELECT 1 FROM entities WHERE full_name = name_item) THEN
          UPDATE entities SET is_vip = 1, manually_reviewed = 1 WHERE full_name = name_item;
        ELSE
          INSERT INTO entities (full_name, entity_type, is_vip, manually_reviewed)
          VALUES (name_item, 'Person', 1, 1);
        END IF;
      END LOOP;
    END $$;
  `);

  // Alias link for canonical Epstein
  pgm.sql(`
    DO $$
    DECLARE
      v_epstein_id bigint;
    BEGIN
      SELECT id INTO v_epstein_id FROM entities WHERE full_name ILIKE '%Jeffrey%Epstein%' ORDER BY length(full_name) ASC LIMIT 1;
      IF v_epstein_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM entities WHERE full_name = 'Jeffrey Epstein') THEN
          INSERT INTO entities (full_name, entity_type, canonical_id, is_vip, manually_reviewed)
          VALUES ('Jeffrey Epstein', 'Person', v_epstein_id, 1, 1);
        ELSE
          UPDATE entities SET canonical_id = v_epstein_id, is_vip = 1, manually_reviewed = 1 WHERE full_name = 'Jeffrey Epstein';
        END IF;
      END IF;
    END $$;
  `);

  // Create explicit relationships targeting Jeffrey Epstein
  pgm.sql(`
    DO $$
    DECLARE
      v_epstein_id bigint;
    BEGIN
      SELECT id INTO v_epstein_id FROM entities WHERE full_name ILIKE '%Jeffrey%Epstein%' ORDER BY length(full_name) ASC LIMIT 1;
      
      IF v_epstein_id IS NOT NULL THEN
        INSERT INTO entity_relationships (source_entity_id, target_entity_id, relationship_type, strength, confidence, proximity_score)
        SELECT id, v_epstein_id, 'associated_with', 8.0, 0.9, 75.0
        FROM entities
        WHERE full_name IN (
          'Al Seckel', 'Kimbal Musk', 'Karyna Shuliak', 'Deepak Chopra', 'Ken Starr', 'Peter Attia',
          'Jeremy Rubin', 'Neri Oxman', 'Marvin Minsky', 'Lawrence Krauss', 'Seth Lloyd', 'Boris Nikolic',
          'Jean Luc Brunel', 'Lesley Groff', 'Sarah Kellen', 'Nadia Marcinkova', 'Darren Indyke',
          'Mark Epstein', 'Emad Hanna', 'Joscha Bach', 'Rich Kahn', 'Cecilia Steen', 'John Amerling',
          'Sultan Bin Sulayem', 'Matthew Hiltzik', 'Peter Mandelson', 'Howard Lutnick'
        )
        AND id <> v_epstein_id
        ON CONFLICT (source_entity_id, target_entity_id, relationship_type) DO NOTHING;
      END IF;
    END $$;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DELETE FROM entity_relationships WHERE relationship_type = 'associated_with' AND target_entity_id IN (
      SELECT id FROM entities WHERE full_name ILIKE '%Jeffrey%Epstein%'
    );
  `);
}
