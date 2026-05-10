/* @name insertArticle */
INSERT INTO articles (
  title, link, description, content, pub_date, author, source, image_url, guid, red_flag_rating
) VALUES (
  :title!, :link!, :description, :content, :pubDate, :author, :source, :imageUrl, :guid, :redFlagRating
)
ON CONFLICT(link) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  content = EXCLUDED.content,
  updated_at = CURRENT_TIMESTAMP;

/* @name getArticles */
SELECT 
  id,
  title,
  link,
  author,
  source,
  pub_date as "pubDate",
  description,
  content,
  image_url as "imageUrl",
  red_flag_rating as "redFlagRating",
  created_at as "createdAt"
FROM articles 
WHERE (:search::text IS NULL 
    OR title ILIKE :search 
    OR description ILIKE :search 
    OR tags ILIKE :search)
  AND (:publication::text IS NULL 
    OR source = :publication 
    OR publication = :publication)
ORDER BY 
  CASE WHEN :sortBy::text = 'redFlag' THEN red_flag_rating END DESC,
  pub_date DESC
LIMIT :limit! OFFSET :offset!;

/* @name countArticles */
SELECT COUNT(*)::integer as total
FROM articles 
WHERE (:search::text IS NULL 
    OR title ILIKE :search 
    OR description ILIKE :search 
    OR tags ILIKE :search)
  AND (:publication::text IS NULL 
    OR source = :publication 
    OR publication = :publication);

/* @name getArticleById */
SELECT
  id,
  title,
  link,
  source,
  publication,
  pub_date,
  description,
  summary,
  tags,
  red_flag_rating,
  image_url,
  reading_time,
  created_at,
  updated_at,
  content,
  author,
  guid
FROM articles
WHERE id = :id!;
