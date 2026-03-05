#!/usr/bin/env python3
import sys
import os
import json
import psycopg2
import numpy as np
from psycopg2.extras import RealDictCursor
from sklearn.cluster import DBSCAN

# Configuration
DB_CONNECTION = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/epstein_archive")

# Clustering Parameters
# eps: The maximum distance between two samples for one to be considered as in the neighborhood of the other.
# min_samples: The number of samples (or total weight) in a neighborhood for a point to be considered as a core point.
CLUSTERING_EPS = 0.5 # Cosine distance threshold (0.4-0.6 is typical for DeepFace/VGG-Face)
CLUSTERING_METRIC = 'cosine'
MIN_SAMPLES = 3 # Minimum faces to form a "person" cluster

def connect_db():
    try:
        return psycopg2.connect(DB_CONNECTION)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def migrate_json_to_table(conn):
    """
    Reads media_items with faces_deepface metadata and inserts them into the faces table
    if they are not already there.
    """
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    print("🔄 Migrating faces from JSON to Table...")

    # Find media items with DeepFace data that are NOT in faces table
    # This is a bit simplistic (check if ANY face exists for that media item), but good for initial migration
    cursor.execute("""
        SELECT m.id, m.metadata_json 
        FROM media_items m
        LEFT JOIN faces f ON m.id = f.media_item_id
        WHERE m.metadata_json::text LIKE '%faces_deepface%'
        AND f.id IS NULL
    """)
    
    rows = cursor.fetchall()
    print(f"   Found {len(rows)} media items to migrate.")
    
    migrated_count = 0
    for row in rows:
        media_id = row['id']
        meta = row['metadata_json']
        
        if isinstance(meta, str):
            meta = json.loads(meta)
            
        faces_list = meta.get('faces_deepface', [])
        
        for face in faces_list:
            embedding = face.get('embedding')
            box = face.get('box') or face.get('facial_area')
            
            if embedding:
                cursor.execute("""
                    INSERT INTO faces (media_item_id, embedding, bounding_box)
                    VALUES (%s, %s, %s)
                """, (media_id, embedding, json.dumps(box)))
                migrated_count += 1
    
    conn.commit()
    print(f"   ✅ Migrated {migrated_count} faces.")
    cursor.close()

def cluster_faces(conn):
    """
    Loads all embeddings, clusters them, and updates face_clusters table.
    """
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    print("🧩 Starting Face Clustering...")

    # 1. Load all embeddings
    cursor.execute("SELECT id, embedding FROM faces")
    rows = cursor.fetchall()
    
    if not rows:
        print("   No faces found to cluster.")
        return

    print(f"   Loaded {len(rows)} faces.")
    
    face_ids = [r['id'] for r in rows]
    embeddings = [r['embedding'] for r in rows]
    X = np.array(embeddings)
    
    # 2. Run DBSCAN
    print(f"   Running DBSCAN (eps={CLUSTERING_EPS}, min_samples={MIN_SAMPLES})...")
    # metric='cosine' expects distance, so we might need to normalize or use precomputed distance matrix if sklearn version is old,
    # but modern sklearn supports metric='cosine' for DBSCAN algorithm='brute'
    db = DBSCAN(eps=CLUSTERING_EPS, min_samples=MIN_SAMPLES, metric=CLUSTERING_METRIC, algorithm='brute')
    db.fit(X)
    
    labels = db.labels_
    
    # Label -1 means noise (unknown person)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    print(f"   Found {n_clusters} clusters.")

    # 3. Update Database
    # We need to map cluster_label -> face_cluster_id (UUID)
    
    # First, let's get existing clusters or clear them?
    # For this MVP, let's just create new clusters for now or reuse if we had a persistent mapping.
    # To avoid duplicates on re-run, we should probably wipe existing cluster assignments or be smarter.
    # Let's wipe assignments for re-clustering (simplest for MVP).
    
    print("   Updating database...")
    
    # Create a mapping for this run: label_id -> database_uuid
    cluster_uuid_map = {}
    
    for label in set(labels):
        if label == -1:
            continue
            
        # Create a new cluster entry
        cursor.execute("""
            INSERT INTO face_clusters (name) 
            VALUES (%s) 
            RETURNING id
        """, (f"Person {label + 1}",))
        cluster_id = cursor.fetchone()['id']
        cluster_uuid_map[label] = cluster_id

    # Update faces
    updated_count = 0
    for i, label in enumerate(labels):
        face_id = face_ids[i]
        
        if label != -1:
            cluster_id = cluster_uuid_map[label]
            cursor.execute("""
                UPDATE faces 
                SET cluster_id = %s 
                WHERE id = %s
            """, (cluster_id, face_id))
            updated_count += 1
        else:
            # Mark as unclustered (NULL)
            cursor.execute("""
                UPDATE faces 
                SET cluster_id = NULL 
                WHERE id = %s
            """, (face_id,))

    # 4. Set Representative Faces
    for label, cluster_id in cluster_uuid_map.items():
        # Find the first face in this cluster to be the thumbnail
        cursor.execute("""
            SELECT id FROM faces WHERE cluster_id = %s LIMIT 1
        """, (cluster_id,))
        rep_face = cursor.fetchone()
        if rep_face:
            cursor.execute("""
                UPDATE face_clusters 
                SET representative_face_id = %s 
                WHERE id = %s
            """, (rep_face['id'], cluster_id))

    conn.commit()
    print(f"   ✅ Assigned {updated_count} faces to {n_clusters} clusters.")
    cursor.close()

if __name__ == "__main__":
    conn = connect_db()
    migrate_json_to_table(conn)
    cluster_faces(conn)
    conn.close()
