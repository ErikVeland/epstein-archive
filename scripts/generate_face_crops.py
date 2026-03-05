#!/usr/bin/env python3
import sys
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import cv2
import numpy as np

# Configuration
DB_CONNECTION = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/epstein_archive")
OUTPUT_DIR = os.path.join(os.getcwd(), 'data', 'faces_crops')

# Crop Settings
PADDING_PCT = 0.5 # 50% padding around the face box (to include hair, chin)
MIN_SIZE = 50 # Ignore tiny faces

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def connect_db():
    try:
        return psycopg2.connect(DB_CONNECTION)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def generate_crops():
    conn = connect_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    print("✂️  Starting Face Cropping...")
    
    # Select all faces that belong to a cluster (or all faces if desired)
    # Let's focus on clustered faces first as they are "People"
    cursor.execute("""
        SELECT f.id, f.cluster_id, f.bounding_box, f.media_item_id, m.file_path, fc.name as cluster_name
        FROM faces f
        JOIN media_items m ON f.media_item_id = m.id
        LEFT JOIN face_clusters fc ON f.cluster_id = fc.id
        WHERE f.crop_path IS NULL
        AND f.cluster_id IS NOT NULL -- Only crop people we've identified for now
        ORDER BY f.created_at DESC
    """)
    
    rows = cursor.fetchall()
    print(f"   Found {len(rows)} faces to crop.")
    
    processed_count = 0
    errors = 0

    for row in rows:
        face_id = str(row['id'])
        cluster_id = str(row['cluster_id'])
        cluster_name = row['cluster_name'] or "Unknown"
        file_path = row['file_path']
        box = row['bounding_box']
        
        # Fix path
        if file_path.startswith('/data/'):
             file_path = os.path.join(os.getcwd(), 'data', file_path[6:])
             
        if not os.path.exists(file_path):
            print(f"   ⚠️ File not found: {file_path}")
            errors += 1
            continue

        try:
            # Load Image
            # Handle non-ascii paths with cv2.imdecode
            # (Standard cv2.imread fails on non-ascii on some systems, let's use numpy workaround)
            stream = open(file_path, "rb")
            bytes = bytearray(stream.read())
            numpyarray = np.asarray(bytes, dtype=np.uint8)
            img = cv2.imdecode(numpyarray, cv2.IMREAD_UNCHANGED)
            
            if img is None:
                print(f"   ⚠️ Could not read image: {file_path}")
                errors += 1
                continue
                
            h_img, w_img = img.shape[:2]
            
            # Parse Box
            # DeepFace/VGG returns: {'x': 365, 'y': 236, 'w': 140, 'h': 140}
            if isinstance(box, str):
                box = json.loads(box)
                
            x = int(box.get('x', 0))
            y = int(box.get('y', 0))
            w = int(box.get('w', 0))
            h = int(box.get('h', 0))
            
            if w < MIN_SIZE or h < MIN_SIZE:
                continue
                
            # Calculate Padding
            pad_w = int(w * PADDING_PCT)
            pad_h = int(h * PADDING_PCT)
            
            # Coordinates with padding
            x1 = max(0, x - pad_w)
            y1 = max(0, y - pad_h)
            x2 = min(w_img, x + w + pad_w)
            y2 = min(h_img, y + h + pad_h)
            
            # Crop
            crop = img[y1:y2, x1:x2]
            
            # Output Path
            # Organize by cluster: data/faces_crops/<cluster_id>/<face_id>.jpg
            cluster_dir = os.path.join(OUTPUT_DIR, cluster_id)
            if not os.path.exists(cluster_dir):
                os.makedirs(cluster_dir)
                
            out_filename = f"{face_id}.jpg"
            out_path = os.path.join(cluster_dir, out_filename)
            
            # Save
            # cv2.imwrite handles ascii paths fine usually, but let's be safe
            is_success, im_buf_arr = cv2.imencode(".jpg", crop)
            if is_success:
                im_buf_arr.tofile(out_path)
            
            # Update DB
            # We store relative path from project root for portability
            rel_path = os.path.join('data', 'faces_crops', cluster_id, out_filename)
            
            cursor.execute("""
                UPDATE faces 
                SET crop_path = %s 
                WHERE id = %s
            """, (rel_path, face_id))
            
            processed_count += 1
            if processed_count % 50 == 0:
                conn.commit()
                print(f"   Processed {processed_count} faces...")
                
        except Exception as e:
            print(f"   ❌ Error processing {face_id}: {e}")
            errors += 1

    conn.commit()
    print(f"\n✅ Cropping Complete.")
    print(f"   Processed: {processed_count}")
    print(f"   Errors: {errors}")
    print(f"   Output: {OUTPUT_DIR}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    generate_crops()
