#!/usr/bin/env python3
import sys
import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import time

# Check dependencies
try:
    import cv2
    import numpy as np
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install required packages:")
    print("pip install opencv-python numpy psycopg2-binary")
    sys.exit(1)

# Configuration
DB_CONNECTION = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/epstein_archive")
BATCH_SIZE = 50

def connect_db():
    try:
        return psycopg2.connect(DB_CONNECTION)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def scan_faces():
    conn = connect_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    print("🚀 Starting Face Scan Pipeline (OpenCV Haar Cascade)...")
    
    # Initialize Haar Cascade
    cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
    if not os.path.exists(cascade_path):
        print(f"❌ Error: Haar cascade file not found at {cascade_path}")
        sys.exit(1)
        
    face_cascade = cv2.CascadeClassifier(cascade_path)

    # 1. Get images that haven't been scanned for faces yet
    cursor.execute("""
        SELECT id, file_path, metadata_json 
        FROM media_items 
        WHERE file_type LIKE 'image/%' 
        AND (metadata_json IS NULL OR metadata_json::text NOT LIKE '%face_scan_version%')
        ORDER BY created_at DESC
        LIMIT 1000
    """)
    
    images = cursor.fetchall()
    print(f"   Found {len(images)} images to scan.")

    processed_count = 0
    faces_found_total = 0

    for img in images:
        file_path = img['file_path']
        
        # Fix path mapping:
        # DB has: /data/media/images/...
        # Local has: ./data/media/images/...
        if file_path.startswith('/data/'):
            # Remove leading /data/ and join with CWD/data
            rel_path = file_path[6:] # remove '/data/'
            file_path = os.path.join(os.getcwd(), 'data', rel_path)
        
        img_id = img['id']
        
        # Parse metadata
        meta = {}
        if img['metadata_json']:
            if isinstance(img['metadata_json'], dict):
                meta = img['metadata_json']
            else:
                try:
                    meta = json.loads(img['metadata_json'])
                except:
                    pass

        if not os.path.exists(file_path):
            print(f"   ⚠️ File not found: {file_path}")
            continue

        try:
            # Load image with OpenCV
            image = cv2.imread(file_path)
            if image is None:
                print(f"   ⚠️ Could not read image: {file_path}")
                continue

            # Convert to Grayscale (Haar requires gray)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            # scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
            faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            
            face_count = len(faces)
            faces_found_total += face_count
            
            # Update metadata
            meta['face_count'] = face_count
            meta['face_scan_version'] = 'opencv-haar-1.0'
            meta['face_scan_date'] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            if face_count > 0:
                print(f"   📸 {os.path.basename(file_path)}: Found {face_count} faces")
            
            # Update DB
            cursor.execute("""
                UPDATE media_items 
                SET metadata_json = %s 
                WHERE id = %s
            """, (json.dumps(meta), img_id))
            
            conn.commit()
            processed_count += 1
            
        except Exception as e:
            print(f"   ❌ Error processing {os.path.basename(file_path)}: {e}")

    print(f"\n✅ Scan Complete.")
    print(f"   Processed: {processed_count}")
    print(f"   Faces Found: {faces_found_total}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    scan_faces()
