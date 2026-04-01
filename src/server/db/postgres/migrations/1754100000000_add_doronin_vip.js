/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  pgm.sql(`
    -- Insert or Update Vladislav Doronin as a VIP
    INSERT INTO entities (full_name, type, risk_level, is_vip, aliases, bio, birth_date)
    VALUES (
      'Vladislav Doronin',
      'Person',
      'medium',
      1,
      'dvycut,DV,Vladislav,Doronin,Vlad Doronin',
      'Russian-born Swiss billionaire, real estate developer, and art collector. Founder of Capital Group and owner of Aman Resorts. Documents show he invited Epstein to Moscow in 2009 and advised him on Russian visas.',
      '1962-11-07'
    )
    ON CONFLICT (full_name, type) DO UPDATE SET
      is_vip = 1,
      aliases = CASE 
                  WHEN entities.aliases IS NULL THEN 'dvycut,DV,Vladislav,Doronin,Vlad Doronin'
                  WHEN entities.aliases NOT LIKE '%dvycut%' THEN entities.aliases || ',dvycut,DV'
                  ELSE entities.aliases
                END,
      risk_level = 'medium',
      bio = COALESCE(entities.bio, 'Russian-born Swiss billionaire, real estate developer, and art collector. Founder of Capital Group and owner of Aman Resorts. Documents show he invited Epstein to Moscow in 2009 and advised him on Russian visas.'),
      birth_date = COALESCE(entities.birth_date, '1962-11-07');
  `);
}

export async function down(pgm) {
  pgm.sql(`
    UPDATE entities SET is_vip = 0 WHERE full_name = 'Vladislav Doronin';
  `);
}
