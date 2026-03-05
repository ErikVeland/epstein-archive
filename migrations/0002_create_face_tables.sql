-- Create tables for face clustering (Apple Photos style)

-- 1. Face Clusters (The "People" albums)
CREATE TABLE IF NOT EXISTS face_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT, -- User assigned name (e.g. "Jeffrey Epstein")
    is_hidden BOOLEAN DEFAULT FALSE, -- To hide "Unknown" or junk clusters
    representative_face_id UUID, -- The "thumbnail" for this person
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Faces (Individual detected faces)
CREATE TABLE IF NOT EXISTS faces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_item_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
    cluster_id UUID REFERENCES face_clusters(id) ON DELETE SET NULL,
    embedding FLOAT8[], -- Vector embedding (2622 or 4096 dim)
    bounding_box JSONB, -- {x, y, w, h}
    detection_confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_faces_media_item_id ON faces(media_item_id);
CREATE INDEX IF NOT EXISTS idx_faces_cluster_id ON faces(cluster_id);
