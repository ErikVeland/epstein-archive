// @ts-ignore
import * as faceapi from '@vladmandic/face-api/dist/face-api.js';
import { Canvas, Image, ImageData, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import 'dotenv/config';

// Monkey patch for Node.js environment
faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const MODELS_DIR = path.join(process.cwd(), 'data', 'models');

async function main() {
  console.log('🚀 Starting Face Recognition Scanner (CPU Mode)...');

  // Initialize TensorFlow Backend via face-api's bundled TF
  const tf = faceapi.tf as any;
  await tf.setBackend('cpu');
  await tf.ready();
  console.log('   ✅ TensorFlow Backend Initialized:', tf.getBackend());

  // 1. Load Models
  console.log('   Loading AI models...');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(MODELS_DIR);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR);
  console.log('   ✅ Models loaded.');

  // 2. Get Images
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT id, file_path, metadata_json 
      FROM media_items 
      WHERE file_type LIKE 'image/%' 
      AND (metadata_json IS NULL OR metadata_json::text NOT LIKE '%face_recognition_version%')
      ORDER BY created_at DESC
      LIMIT 100
    `); // Start with small batch

    console.log(`   Found ${res.rows.length} images to process.`);

    for (const row of res.rows) {
      let filePath = row.file_path;

      // Fix path mapping if needed
      if (filePath.startsWith('/data/')) {
        filePath = path.join(process.cwd(), 'data', filePath.substring(6));
      }

      if (!fs.existsSync(filePath)) {
        console.log(`   ⚠️ File not found: ${filePath}`);
        continue;
      }

      try {
        const image = await loadImage(filePath);

        // Detect faces
        const detections = await faceapi
          .detectAllFaces(image as any)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const faces = detections.map((d) => ({
          box: d.detection.box,
          descriptor: Array.from(d.descriptor), // Convert Float32Array to normal array
          score: d.detection.score,
        }));

        console.log(
          `   📸 ${path.basename(filePath)}: Found ${faces.length} faces (with descriptors)`,
        );

        // Update DB
        let meta = row.metadata_json || {};
        if (typeof meta === 'string') meta = JSON.parse(meta);

        meta.faces = faces;
        meta.face_count = faces.length; // Update count with recognition count
        meta.face_recognition_version = 'face-api-1.0';
        meta.face_scan_date = new Date().toISOString();

        await client.query(
          `
          UPDATE media_items 
          SET metadata_json = $1 
          WHERE id = $2
        `,
          [JSON.stringify(meta), row.id],
        );
      } catch (err) {
        console.error(`   ❌ Error processing ${path.basename(filePath)}:`, err);
      }
    }

    console.log('\n✅ Recognition Batch Complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
