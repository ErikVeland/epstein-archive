#!/usr/bin/env python3
import sys
import os
import json
import shutil
import tempfile
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from deepface import DeepFace

# Configuration
DB_CONNECTION = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/epstein_archive")
MODEL_NAME = "VGG-Face"
DETECTOR_BACKEND = "opencv" # Options: opencv, retinaface, mtcnn, ssd, dlib, mediapipe

def connect_db():
    try:
        return psycopg2.connect(DB_CONNECTION)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def scan_faces():
    conn = connect_db()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    print(f"🚀 Starting DeepFace Scanner ({MODEL_NAME} / {DETECTOR_BACKEND})...")
    
    # 1. Get images to process
    cursor.execute("""
        SELECT id, file_path, metadata_json 
        FROM media_items 
        WHERE file_type LIKE 'image/%' 
        AND (metadata_json IS NULL OR metadata_json::text NOT LIKE '%face_recognition_version%')
        ORDER BY created_at DESC
        LIMIT 100
    """)
    
    images = cursor.fetchall()
    print(f"   Found {len(images)} images to process.")

    processed_count = 0
    faces_found_total = 0

    for img in images:
        file_path = img['file_path']
        img_id = img['id']
        
        # Fix path mapping
        if file_path.startswith('/data/'):
             file_path = os.path.join(os.getcwd(), 'data', file_path[6:])
             
        if not os.path.exists(file_path):
            print(f"   ⚠️ File not found: {file_path}")
            continue

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

        # Handle Non-ASCII paths for DeepFace/OpenCV compatibility
        temp_file = None
        process_path = file_path
        
        try:
            try:
                file_path.encode('ascii')
            except UnicodeEncodeError:
                # Create temp file with ascii name
                fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file_path)[1])
                os.close(fd)
                shutil.copy2(file_path, temp_path)
                process_path = temp_path
                temp_file = temp_path

            # Generate Embeddings
            # enforce_detection=True raises ValueError if no face found
            objs = DeepFace.represent(
                img_path=process_path, 
                model_name=MODEL_NAME, 
                detector_backend=DETECTOR_BACKEND,
                enforce_detection=True
            )
            
            valid_faces = []
            for obj in objs:
                valid_faces.append({
                    'embedding': obj['embedding'],
                    'box': obj['facial_area'],
                    # 'confidence': obj.get('face_confidence', 0)
                })

            faces_found_total += len(valid_faces)
            
            # Update metadata
            meta['faces_deepface'] = valid_faces
            meta['face_count_deepface'] = len(valid_faces)
            meta['face_recognition_version'] = f'deepface-{MODEL_NAME}'
            meta['face_scan_date'] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            if len(valid_faces) > 0:
                print(f"   📸 {os.path.basename(file_path)}: Found {len(valid_faces)} faces")
            
            # Update DB
            cursor.execute("""
                UPDATE media_items 
                SET metadata_json = %s 
                WHERE id = %s
            """, (json.dumps(meta), img_id))
            
            conn.commit()
            processed_count += 1

        except ValueError:
            # No face found (raised by enforce_detection=True)
            # print(f"   No faces found in {os.path.basename(file_path)}")
            meta['faces_deepface'] = []
            meta['face_count_deepface'] = 0
            meta['face_recognition_version'] = f'deepface-{MODEL_NAME}'
            meta['face_scan_date'] = time.strftime("%Y-%m-%d %H:%M:%S")
            
            cursor.execute("""
                UPDATE media_items 
                SET metadata_json = %s 
                WHERE id = %s
            """, (json.dumps(meta), img_id))
            conn.commit()
            processed_count += 1
            
        except Exception as e:
            print(f"   ❌ Error processing {os.path.basename(file_path)}: {e}")
            
            # Check connection
            if conn.closed:
                 print("   ⚠️ DB Connection lost, reconnecting...")
                 conn = connect_db()
                 cursor = conn.cursor(cursor_factory=RealDictCursor)

        finally:
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)

    print(f"\n✅ Scan Complete.")
    print(f"   Processed: {processed_count}")
    print(f"   Faces Found: {faces_found_total}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    scan_faces()
