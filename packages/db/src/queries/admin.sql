/* @name getDbMeta */
SELECT
  version() AS "serverVersion",
  current_setting('statement_timeout') AS "statementTimeout",
  current_setting('lock_timeout') AS "lockTimeout";

/* @name getEntityAndDocumentCounts */
SELECT 
  (SELECT COUNT(*)::integer FROM entities) as entities,
  (SELECT COUNT(*)::integer FROM documents) as documents;

/* @name listUsers */
SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive" 
FROM users 
ORDER BY username ASC;

/* @name getUserById */
SELECT id, username, email, role, created_at as "createdAt", last_active as "lastActive" 
FROM users 
WHERE id = :id!;

/* @name createUser */
INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
VALUES (:id!, :username!, :email, :role!, :passwordHash!, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

/* @name updateUser */
UPDATE users 
SET 
  username = COALESCE(:username, username),
  email = COALESCE(:email, email),
  role = COALESCE(:role, role),
  password_hash = COALESCE(:passwordHash, password_hash)
WHERE id = :id!;

/* @name resetJunkFlags */
UPDATE entities 
SET junk_tier = 'clean', junk_reason = NULL, junk_probability = 0;
