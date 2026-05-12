/* @name searchEntities */
SELECT
  e.id,
  e.full_name          AS "fullName",
  e.primary_role       AS "primaryRole",
  e.aliases,
  e.red_flag_rating    AS "redFlagRating",
  ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM entities e
WHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
  AND e.full_name IS NOT NULL
  AND BTRIM(e.full_name) != ''
  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
  AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
  AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
  AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
  AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
  AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
  AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
  AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
  AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
  AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchEntitiesPrefix */
SELECT
  e.id,
  e.full_name          AS "fullName",
  e.primary_role       AS "primaryRole",
  e.aliases,
  e.red_flag_rating    AS "redFlagRating",
  ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
FROM entities e
WHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
  AND e.full_name IS NOT NULL
  AND BTRIM(e.full_name) != ''
  AND LOWER(e.full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
  AND LOWER(e.full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
  AND LOWER(e.full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
  AND LOWER(e.full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
  AND LOWER(e.full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
  AND LOWER(e.full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
  AND LOWER(e.full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
  AND LOWER(e.full_name) !~* '\m(direction|provided)\M\s*$'
  AND LOWER(e.full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
  AND LOWER(e.full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND LOWER(e.full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchDocuments */
SELECT
  d.id,
  d.file_name           AS "fileName",
  d.file_path           AS "filePath",
  d.evidence_type       AS "evidenceType",
  d.red_flag_rating     AS "redFlagRating",
  ts_headline('english',
    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
    websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
  ) AS snippet,
  ts_rank_cd(d.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM documents d
WHERE d.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchDocumentsPrefix */
SELECT
  d.id,
  d.file_name           AS "fileName",
  d.file_path           AS "filePath",
  d.evidence_type       AS "evidenceType",
  d.red_flag_rating     AS "redFlagRating",
  ts_headline('english',
    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
    to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
  ) AS snippet,
  ts_rank_cd(d.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
FROM documents d
WHERE d.fts_vector @@ to_tsquery('english', :searchTerm!)
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchSentences */
SELECT
  s.id,
  s.document_id,
  s.page_id,
  s.sentence_text,
  s.signal_score,
  d.file_name,
  COALESCE(p.page_number, 1) AS page_number,
  ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=15,MinWords=5') AS snippet
FROM document_sentences s
JOIN documents d ON d.id = s.document_id
LEFT JOIN document_pages p ON p.id = s.page_id
WHERE to_tsvector('english', s.sentence_text) @@ websearch_to_tsquery('english', :searchTerm!)
ORDER BY ts_rank_cd(to_tsvector('english', s.sentence_text), websearch_to_tsquery('english', :searchTerm!), 32) DESC
LIMIT :limit!;

/* @name searchInvestigations */
SELECT
  id,
  uuid,
  title,
  description,
  status,
  ts_headline('english', title || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8') AS snippet,
  ts_rank_cd(to_tsvector('english', title || ' ' || coalesce(description, '')), websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM investigations
WHERE to_tsvector('english', title || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', :searchTerm!)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchArticles */
SELECT
  id,
  title,
  source,
  author,
  pub_date AS "pubDate",
  ts_headline('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(content, ''), websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8') AS snippet,
  ts_rank_cd(to_tsvector('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')), websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM articles
WHERE to_tsvector('english', title || ' ' || coalesce(description, '') || ' ' || coalesce(content, '')) @@ websearch_to_tsquery('english', :searchTerm!)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchMedia */
SELECT
  id,
  file_path AS "filename",
  title,
  description,
  file_path AS "filePath",
  file_type AS "fileType",
  ts_headline('english', file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, ''), websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8') AS snippet,
  ts_rank_cd(to_tsvector('english', file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, '')), websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM media_items
WHERE to_tsvector('english', file_path || ' ' || coalesce(title, '') || ' ' || coalesce(description, '')) @@ websearch_to_tsquery('english', :searchTerm!)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchDocumentsSemantic */
SELECT
  id,
  file_name           AS "fileName",
  file_path           AS "filePath",
  evidence_type       AS "evidenceType",
  red_flag_rating     AS "redFlagRating",
  1 - (content_embedding <=> :embedding) AS similarity
FROM documents
WHERE (:evidenceType::text IS NULL OR evidence_type = :evidenceType::text)
ORDER BY similarity DESC
LIMIT :limit!;

/* @name searchEntitiesSemantic */
SELECT
  id,
  full_name          AS "fullName",
  primary_role       AS "primaryRole",
  1 - (description_embedding <=> :embedding) AS similarity
FROM entities
WHERE COALESCE(junk_tier, 'clean') = 'clean'
  AND COALESCE(quarantine_status, 0) = 0
  AND full_name IS NOT NULL
  AND BTRIM(full_name) != ''
  AND LOWER(full_name) !~* '^(to|from|cc|bcc|subject|re|fwd|fw|sent|received)\M[:\s-]*'
  AND LOWER(full_name) !~* '^(on|at|in|with)\s+(mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\M'
  AND LOWER(full_name) !~* '\m(mon|tue|wed|thu|fri|sat|sun)\M\s*$'
  AND LOWER(full_name) !~* '\m([[:alpha:]]{3,})\s+\1\M'
  AND LOWER(full_name) !~* '\m(department|office|policy|inc|llc|corp|corporation|ltd|associates|foundation|trust|university|school|academy|committee|ministry|agency|bureau|division|building|street|road|avenue|contact|privacy|terms)\M'
  AND LOWER(full_name) !~* '\m(bluray|blu-ray|disc|rewritable|dumpster|hauls|columns|demolition|ditchin|postage|acoustics|personnel|persoanel)\M'
  AND LOWER(full_name) !~* '^(east|west|north|south)\s+(if|aft|aftstreet|street|road|avenue)\M'
  AND LOWER(full_name) !~* '\m(direction|provided)\M\s*$'
  AND LOWER(full_name) !~* '\m(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M\s*$'
  AND LOWER(full_name) !~* '\m[[:alpha:]]+''?s\s+(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
  AND LOWER(full_name) !~* '^(lawyer|assistant|aide|counsel|staff|pilot|masseuse|housekeeper)\M'
ORDER BY similarity DESC
LIMIT :limit!;
