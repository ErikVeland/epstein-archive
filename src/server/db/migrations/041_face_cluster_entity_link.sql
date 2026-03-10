-- Link face clusters to canonical entities so named people surface in
-- the PhotoBrowser "People" filter via media_item_people.
ALTER TABLE face_clusters
  ADD COLUMN IF NOT EXISTS entity_id INTEGER REFERENCES entities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_face_clusters_entity_id ON face_clusters(entity_id);
