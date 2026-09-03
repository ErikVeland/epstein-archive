/* @name getBlackBookEntries */
SELECT
  bb.id,
  bb.person_id as "personId",
  bb.entry_text as "entryText",
  bb.phone_numbers as "phoneNumbers",
  bb.addresses,
  bb.email_addresses as "emailAddresses",
  bb.notes,
  bb.entry_category as "entryCategory",
  bb.document_id as "documentId",
  p.full_name as "personName",
  COALESCE(p.full_name, TRIM(SUBSTR(bb.entry_text, 1, 
    CASE 
      WHEN strpos(bb.entry_text, chr(10)) > 0 THEN strpos(bb.entry_text, chr(10)) - 1 
      ELSE length(bb.entry_text) 
    END))) as "displayName"
FROM black_book_entries bb
LEFT JOIN entities p ON bb.person_id = p.id
WHERE (:letter::text IS NULL OR UPPER(SUBSTR(COALESCE(p.full_name, bb.entry_text), 1, 1)) = UPPER(:letter::text))
  AND (:search::text IS NULL OR (
      bb.entry_text ILIKE '%' || :search || '%' OR
      bb.phone_numbers::text ILIKE '%' || :search || '%' OR
      bb.email_addresses::text ILIKE '%' || :search || '%' OR
      bb.addresses::text ILIKE '%' || :search || '%'
  ))
  AND (:hasPhone::boolean IS NULL OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers::text <> '[]'))
ORDER BY "displayName" ASC
LIMIT :limit!;

/* @name getBlackBookReviewStats */
SELECT 
  COUNT(*)::integer as total,
  COUNT(CASE WHEN needs_review = 1 THEN 1 END) as remaining,
  COUNT(CASE WHEN needs_review = 0 OR manually_reviewed = 1 THEN 1 END) as reviewed
FROM entities
WHERE id IN (SELECT person_id FROM black_book_entries);

/* @name updateBlackBookReview */
UPDATE entities 
SET full_name = :fullName!, needs_review = 0, manually_reviewed = 1
WHERE id = :id!;
/* @name getBlackBookSourceEntries */
SELECT bb.id, bb.person_id AS "personId", bb.entry_text AS "entryText",
  bb.phone_numbers AS "phoneNumbers", bb.addresses, bb.email_addresses AS "emailAddresses",
  bb.notes, bb.entry_category AS "entryCategory", bb.document_id AS "documentId",
  bb.page_number AS "pageNumber"
FROM black_book_entries bb
WHERE bb.entry_category = :category!
  AND (:search::text IS NULL OR bb.entry_text ILIKE '%' || :search || '%')
  AND (:hasPhone::boolean IS NOT TRUE OR (bb.phone_numbers IS NOT NULL AND bb.phone_numbers <> '[]'))
  AND (:hasEmail::boolean IS NOT TRUE OR (bb.email_addresses IS NOT NULL AND bb.email_addresses <> '[]'))
  AND (:hasAddress::boolean IS NOT TRUE OR (bb.addresses IS NOT NULL AND bb.addresses <> '[]'))
ORDER BY bb.id
LIMIT :limit!;

/* @name getBlackBookIdentityIndex */
WITH portraits AS (
  SELECT DISTINCT ON (fc.entity_id) fc.entity_id, f.crop_path
  FROM face_clusters fc
  JOIN faces f ON f.id = fc.representative_face_id
  JOIN media_items m ON m.id = f.media_item_id::text
  WHERE fc.entity_id IS NOT NULL AND fc.is_hidden = false
    AND m.verification_status IN ('verified', 'source_verified')
    AND COALESCE(m.is_sensitive, false) = false
  ORDER BY fc.entity_id, fc.id
)
SELECT e.id, e.full_name AS "fullName", e.is_vip AS "isVip",
  e.primary_role AS "primaryRole",
  portraits.crop_path AS "thumbnailPath"
FROM entities e
LEFT JOIN portraits ON portraits.entity_id = e.id
WHERE (e.is_vip = 1 OR e.manually_reviewed = 1)
  AND COALESCE(e.quarantine_status, 0) = 0
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND lower(COALESCE(e.entity_type, '')) = 'person'
  AND COALESCE(e.primary_role, '') !~* 'victim|survivor|minor'
  AND e.full_name IS NOT NULL;
