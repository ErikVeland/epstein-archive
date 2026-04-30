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
