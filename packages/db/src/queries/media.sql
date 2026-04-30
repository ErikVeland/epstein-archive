/* @name getAlbumsByMediaType */
SELECT
  a.id,
  a.name,
  a.description,
  a.created_at as "createdAt",
  a.date_modified as "dateModified",
  COUNT(m.id) as "itemCount",
  SUM(CASE WHEN COALESCE(m.is_sensitive, false) = true THEN 1 ELSE 0 END) as "sensitiveCount"
FROM media_albums a
LEFT JOIN media_items m ON a.id = m.album_id AND m.file_type LIKE :likePattern!
GROUP BY a.id
HAVING COUNT(m.id) > 0
ORDER BY a.name;

/* @name getMediaItemsByEntity */
SELECT DISTINCT
  m.id,
  m.entity_id as "entityId",
  m.document_id as "documentId",
  m.file_path as "filePath",
  m.thumbnail_path as "thumbnailPath",
  m.file_type as "fileType",
  m.file_size as "fileSize",
  m.width,
  m.height,
  m.title,
  m.description,
  m.is_sensitive as "isSensitive",
  m.verification_status as "verificationStatus",
  m.red_flag_rating as "redFlagRating",
  m.metadata_json as "metadataJson",
  m.date_taken as "dateTaken",
  m.created_at as "createdAt"
FROM media_items m
LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
WHERE m.entity_id = :entityId! OR mip.entity_id = :entityId!
ORDER BY m.red_flag_rating DESC, m.created_at DESC;

/* @name getAllMediaItems */
SELECT 
  m.id,
  m.entity_id as "entityId",
  m.document_id as "documentId",
  m.file_path as "filePath",
  m.file_type as "fileType",
  m.title,
  m.description,
  m.is_sensitive as "isSensitive",
  m.verification_status as "verificationStatus",
  m.red_flag_rating as "redFlagRating",
  m.metadata_json as "metadataJson",
  m.created_at as "createdAt",
  e.full_name as "entityName",
  string_agg(DISTINCT p.full_name, ',') as "relatedEntities"
FROM media_items m
LEFT JOIN entities e ON m.entity_id = e.id
LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
LEFT JOIN entities p ON mip.entity_id = p.id
GROUP BY m.id, e.full_name
ORDER BY m.red_flag_rating DESC, m.created_at DESC;

/* @name getMediaItemById */
SELECT
  id,
  entity_id as "entityId",
  document_id as "documentId",
  file_path as "filePath",
  thumbnail_path as "thumbnailPath",
  file_type as "fileType",
  file_size as "fileSize",
  width,
  height,
  title,
  description,
  is_sensitive as "isSensitive",
  verification_status as "verificationStatus",
  red_flag_rating as "redFlagRating",
  metadata_json as "metadataJson",
  date_taken as "dateTaken",
  created_at as "createdAt"
FROM media_items
WHERE id = :id!;

/* @name getPhotosForEntities */
SELECT * FROM (
  SELECT DISTINCT
    m.id,
    COALESCE(mip.entity_id, m.entity_id) as "entityId",
    m.file_path as "filePath",
    m.title,
    m.is_sensitive as "isSensitive",
    m.red_flag_rating as "redFlagRating",
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(mip.entity_id, m.entity_id) 
      ORDER BY m.red_flag_rating DESC, m.created_at DESC
    ) as rn
  FROM media_items m
  LEFT JOIN media_item_people mip ON m.id = mip.media_item_id::text
  WHERE (mip.entity_id IN (:entityIds!) OR m.entity_id IN (:entityIds!))
    AND m.file_type LIKE 'image/%'
) t WHERE rn <= 5;

/* @name countMediaItems */
SELECT COUNT(*)::integer as total
FROM media_items m
WHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)
  AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)
  AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag);

/* @name searchPaginatedMedia */
SELECT 
  m.id,
  m.entity_id as "entityId",
  m.document_id as "documentId",
  m.file_path as "filePath",
  m.thumbnail_path as "thumbnailPath",
  m.file_type as "fileType",
  m.file_size as "fileSize",
  m.width,
  m.height,
  m.title,
  m.description,
  m.album_id as "albumId",
  m.is_sensitive as "isSensitive",
  m.verification_status as "verificationStatus",
  m.red_flag_rating as "redFlagRating",
  m.metadata_json as "metadataJson",
  m.date_taken as "dateTaken",
  m.created_at as "createdAt",
  string_agg(DISTINCT e.id || ':' || e.full_name, ',') as people
FROM media_items m
LEFT JOIN media_item_people mp ON m.id = mp.media_item_id::text
LEFT JOIN entities e ON mp.entity_id = e.id
WHERE (:entityId::bigint IS NULL OR m.entity_id = :entityId)
  AND (:fileType::text IS NULL OR m.file_type LIKE :fileType)
  AND (:minRedFlag::int IS NULL OR m.red_flag_rating >= :minRedFlag)
GROUP BY m.id
ORDER BY m.red_flag_rating DESC, m.created_at DESC
LIMIT :limit! OFFSET :offset!;
