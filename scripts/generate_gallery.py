#!/usr/bin/env python3
import psycopg2
import os

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

cur.execute("""
    SELECT fc.name, f.crop_path 
    FROM faces f 
    JOIN face_clusters fc ON f.cluster_id = fc.id 
    WHERE f.crop_path IS NOT NULL 
    ORDER BY fc.name, f.created_at DESC
""")

rows = cur.fetchall()

html = """
<html>
<head>
<style>
body { font-family: sans-serif; padding: 20px; }
.cluster { margin-bottom: 40px; }
.faces { display: flex; flex-wrap: wrap; gap: 10px; }
img { height: 150px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s; }
img:hover { transform: scale(1.1); z-index: 10; }
</style>
</head>
<body>
<h1>Face Clusters</h1>
"""

current_cluster = None

for row in rows:
    cluster_name, crop_path = row
    
    # Path in DB is relative 'data/faces_crops/...', we need to make it accessible or absolute for local viewing
    # Assuming user opens this file from project root
    # crop_path is already 'data/faces_crops/...'
    
    if cluster_name != current_cluster:
        if current_cluster is not None:
            html += "</div></div>"
        
        current_cluster = cluster_name
        html += f"<div class='cluster'><h2>{cluster_name}</h2><div class='faces'>"
    
    # We need to go up one level from data/faces_crops/gallery.html to find data/faces_crops
    # Actually, if we save gallery.html in root, then data/faces_crops/ is correct relative path.
    # Let's save gallery.html in project root.
    html += f'<img src="{crop_path}" title="{crop_path}" />'

if current_cluster is not None:
    html += "</div></div>"

html += "</body></html>"

with open("gallery.html", "w") as f:
    f.write(html)

print("✅ Gallery generated at gallery.html")
