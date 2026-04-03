import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const MODELS_DIR = path.join(process.cwd(), 'data', 'models');
const BASE_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model';

const MANIFESTS = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'face_landmark_68_model-weights_manifest.json',
  'face_recognition_model-weights_manifest.json',
];

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

async function downloadFile(filename: string) {
  const dest = path.join(MODELS_DIR, filename);
  if (fs.existsSync(dest)) {
    console.log(`✅ ${filename} already exists.`);
    return dest;
  }

  const url = `${BASE_URL}/${filename}`;
  console.log(`⬇️ Downloading ${filename}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${filename}: ${response.status} ${response.statusText}`);
  }

  if (!response.body) throw new Error('No body');

  const file = fs.createWriteStream(dest);
  await pipeline(response.body as unknown as NodeJS.ReadableStream, file);
  console.log(`✅ Downloaded ${filename}`);
  return dest;
}

async function main() {
  console.log('🚀 Downloading Face API Models...');
  try {
    for (const manifestName of MANIFESTS) {
      // 1. Download Manifest
      const manifestPath = await downloadFile(manifestName);

      // 2. Read Manifest
      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // 3. Download Weights (paths)
      // Manifest is usually an array of objects, each with 'paths' array
      // or just an object with 'weights' and 'paths'
      let paths: string[] = [];
      if (Array.isArray(manifest)) {
        for (const item of manifest as Record<string, unknown>[]) {
          if (item.paths && Array.isArray(item.paths)) {
            paths.push(...(item.paths as string[]));
          }
        }
      } else {
        const m = manifest as { paths?: string[] };
        if (m.paths) paths = m.paths;
      }

      // Unique paths
      paths = [...new Set(paths)];

      for (const weightFile of paths) {
        await downloadFile(weightFile);
      }
    }
    console.log('✨ All models downloaded successfully.');
  } catch (error) {
    console.error('❌ Error downloading models:', error);
    process.exit(1);
  }
}

main();
