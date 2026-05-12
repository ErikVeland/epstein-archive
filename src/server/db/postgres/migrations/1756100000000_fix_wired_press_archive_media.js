/* eslint-disable no-undef */

export const shorthands = undefined;

const WIRED_URL =
  'https://www.wired.com/story/a-library-dedicated-solely-to-the-epstein-files-is-opening-in-new-york/';
const WIRED_TITLE = 'A Library Dedicated Solely to the Epstein Files Is Opening in New York';
const WIRED_IMAGE = '/media/press/wired-epstein-library-cover.svg';

export async function up(pgm) {
  pgm.sql(`
    INSERT INTO articles (
      title, link, url, source, publication, pub_date, published_date,
      description, summary, tags, red_flag_rating, image_url, reading_time,
      created_at, updated_at, content, author, guid
    ) VALUES (
      '${WIRED_TITLE.replace(/'/g, "''")}',
      '${WIRED_URL}',
      '${WIRED_URL}',
      'WIRED',
      'WIRED',
      '2026-05-06',
      '2026-05-06',
      'WIRED coverage of the public Epstein Files reading room and its physical archive in New York.',
      'WIRED reports on the Institute for Primary Facts opening a public reading room dedicated to the Epstein files and related records in New York.',
      'WIRED, Press Archive, Epstein Files, Reading Room, New York',
      4,
      '${WIRED_IMAGE}',
      '5 min read',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      NULL,
      'Ej Dickson',
      '${WIRED_URL}'
    )
    ON CONFLICT (link) DO UPDATE SET
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      source = EXCLUDED.source,
      publication = EXCLUDED.publication,
      pub_date = EXCLUDED.pub_date,
      published_date = EXCLUDED.published_date,
      description = EXCLUDED.description,
      summary = EXCLUDED.summary,
      tags = EXCLUDED.tags,
      red_flag_rating = EXCLUDED.red_flag_rating,
      image_url = EXCLUDED.image_url,
      reading_time = EXCLUDED.reading_time,
      author = EXCLUDED.author,
      guid = EXCLUDED.guid,
      updated_at = CURRENT_TIMESTAMP;
  `);

  pgm.sql(`
    DO $$
    DECLARE
      wired_media_id text;
    BEGIN
      INSERT INTO media_albums (
        id, name, description, cover_image_id, created_at, date_modified, is_sensitive
      ) OVERRIDING SYSTEM VALUE VALUES (
        10,
        'Wired',
        'WIRED press coverage and archive material related to the Epstein Files reading room.',
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        false
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        date_modified = CURRENT_TIMESTAMP,
        is_sensitive = EXCLUDED.is_sensitive;

      SELECT id
        INTO wired_media_id
      FROM media_items
      WHERE title = 'Wired Magazine Cover'
        AND id ~ '^[0-9]+$'
      ORDER BY id::bigint
      LIMIT 1;

      IF wired_media_id IS NULL THEN
        SELECT (COALESCE(MAX(id::bigint), 0) + 1)::text
          INTO wired_media_id
        FROM media_items
        WHERE id ~ '^[0-9]+$';
      END IF;

      INSERT INTO media_items (
        id, document_id, album_id, file_type, file_path, thumbnail_path,
        title, description, verification_status, red_flag_rating,
        is_sensitive, metadata_json, created_at
      ) VALUES (
        wired_media_id,
        NULL,
        10,
        'image/svg+xml',
        '${WIRED_IMAGE}',
        '${WIRED_IMAGE}',
        'Wired Magazine Cover',
        'Press archive card for WIRED coverage of the Epstein Files reading room in New York.',
        'verified',
        4,
        false,
        jsonb_build_object(
          'source', 'WIRED',
          'sourceUrl', '${WIRED_URL}',
          'articleTitle', '${WIRED_TITLE.replace(/'/g, "''")}',
          'kind', 'press_archive_card'
        ),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
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

      UPDATE media_albums
      SET cover_image_id = wired_media_id,
          date_modified = CURRENT_TIMESTAMP
      WHERE id = 10;

      DELETE FROM media_items
      WHERE id = 'wired_cover_1';
    END $$;
  `);

  pgm.sql(`
    SELECT setval(pg_get_serial_sequence('articles', 'id'), COALESCE((SELECT MAX(id) FROM articles), 1), true);
    SELECT setval(pg_get_serial_sequence('media_albums', 'id'), COALESCE((SELECT MAX(id) FROM media_albums), 1), true);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DELETE FROM media_items
    WHERE title = 'Wired Magazine Cover'
      AND metadata_json->>'sourceUrl' = '${WIRED_URL}';

    UPDATE media_albums
    SET cover_image_id = NULL
    WHERE id = 10;

    DELETE FROM articles
    WHERE link = '${WIRED_URL}';
  `);
}
