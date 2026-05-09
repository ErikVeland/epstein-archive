/* eslint-disable no-undef */

export const shorthands = undefined;

export async function up(pgm) {
  // 1. Insert Wired Article (ID: 34)
  pgm.sql(`
    INSERT INTO articles (
      id, title, link, url, source, publication, pub_date, published_date, 
      description, summary, tags, red_flag_rating, image_url, reading_time, 
      created_at, updated_at, content, author, guid
    ) OVERRIDING SYSTEM VALUE VALUES (
      34,
      'A Library Dedicated Solely to the Epstein Files Is Opening in New York',
      'https://www.wired.com/story/a-library-dedicated-solely-to-the-epstein-files-is-opening-in-new-york/',
      NULL,
      'Wired',
      'Wired',
      '2026-05-01',
      NULL,
      'A new physical library dedicated entirely to cataloging and preserving documents related to the Jeffrey Epstein investigation is set to open in New York City.',
      'An upcoming public archive and library in New York City aims to make all Jeffrey Epstein files, records, and related investigative materials fully accessible to the public, offering a physical location for research and evidence review.',
      'Library, New York, Archive, Documents, Research',
      4,
      '/data/media/images/wired_logo.png',
      '5 min read',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      NULL,
      'Wired Staff',
      NULL
    ) ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      link = EXCLUDED.link,
      url = EXCLUDED.url,
      source = EXCLUDED.source,
      publication = EXCLUDED.publication,
      pub_date = EXCLUDED.pub_date,
      description = EXCLUDED.description,
      summary = EXCLUDED.summary,
      tags = EXCLUDED.tags,
      red_flag_rating = EXCLUDED.red_flag_rating,
      image_url = EXCLUDED.image_url,
      reading_time = EXCLUDED.reading_time,
      updated_at = CURRENT_TIMESTAMP,
      content = EXCLUDED.content,
      author = EXCLUDED.author,
      guid = EXCLUDED.guid;
  `);

  // 2. Insert Wired Media Album (ID: 10)
  pgm.sql(`
    INSERT INTO media_albums (
      id, name, description, cover_image_id, created_at, date_modified, is_sensitive
    ) OVERRIDING SYSTEM VALUE VALUES (
      10,
      'Wired',
      'Media coverage and investigative articles published by Wired Magazine regarding the Jeffrey Epstein archive and files.',
      'wired_cover_1',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      false
    ) ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      cover_image_id = EXCLUDED.cover_image_id,
      date_modified = CURRENT_TIMESTAMP,
      is_sensitive = EXCLUDED.is_sensitive;
  `);

  // 3. Insert Wired Cover Image inside media_items (linked to Album ID: 10)
  pgm.sql(`
    INSERT INTO media_items (
      id, document_id, album_id, file_type, file_path, thumbnail_path, 
      title, description, verification_status, red_flag_rating, 
      is_sensitive, metadata_json, created_at
    ) VALUES (
      'wired_cover_1',
      NULL,
      10,
      'image/png',
      '/data/media/images/wired_logo.png',
      '/data/media/images/wired_logo.png',
      'Wired Magazine Cover',
      'Official Logo of Wired Magazine, representing the dedicated press coverage and archival library announcements.',
      'verified',
      1,
      false,
      '{}'::jsonb,
      CURRENT_TIMESTAMP
    ) ON CONFLICT (id) DO UPDATE SET
      document_id = EXCLUDED.document_id,
      album_id = EXCLUDED.album_id,
      file_type = EXCLUDED.file_type,
      file_path = EXCLUDED.file_path,
      thumbnail_path = EXCLUDED.thumbnail_path,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      verification_status = EXCLUDED.verification_status,
      red_flag_rating = EXCLUDED.red_flag_rating,
      is_sensitive = EXCLUDED.is_sensitive,
      metadata_json = EXCLUDED.metadata_json;
  `);

  // 4. Update articles serial sequence
  pgm.sql(`
    SELECT setval(pg_get_serial_sequence('articles', 'id'), COALESCE((SELECT MAX(id) FROM articles), 1), true);
  `);

  // 5. Update media_albums serial sequence
  pgm.sql(`
    SELECT setval(pg_get_serial_sequence('media_albums', 'id'), COALESCE((SELECT MAX(id) FROM media_albums), 1), true);
  `);
}

export async function down(pgm) {
  pgm.sql(`DELETE FROM media_items WHERE id = 'wired_cover_1';`);
  pgm.sql(`DELETE FROM media_albums WHERE id = 10;`);
  pgm.sql(`DELETE FROM articles WHERE id = 34;`);
}
