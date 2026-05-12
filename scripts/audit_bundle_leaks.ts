#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

// CRITICAL SERVER-ONLY TARGETS
const FORBIDDEN_TERMS = [
  '"@tensorflow/',
  "'@tensorflow/",
  'require("canvas")',
  "require('canvas')",
  'from "canvas"',
  "from 'canvas'",
  'tesseract.js',
  'face-api',
  'node-pg-migrate',
  'mailparser',
  'adm-zip',
];

const DIST_DIR = path.resolve(process.cwd(), 'dist/assets');

function main() {
  console.log('>>> [BUNDLE AUDIT] Commencing leakage check across dist/assets/');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('>>> [ERROR] No dist/assets/ folder found. Did you build first?');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.js'));
  console.log(
    `Scanning ${files.length} output bundles for ${FORBIDDEN_TERMS.length} forbidden signatures...`,
  );

  let leaksFound = 0;

  for (const file of files) {
    const fullPath = path.join(DIST_DIR, file);
    const stat = fs.statSync(fullPath);

    // Only read reasonably sized files directly to string for checking
    if (stat.size > 10 * 1024 * 1024) {
      console.warn(`Skipping massive file for memory safety: ${file}`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    for (const term of FORBIDDEN_TERMS) {
      // Check if terms appear in string/import definitions.
      // Note: Minifiers can mangle strings, but references generally preserve key tokens.
      // We target raw inclusion detection.
      if (content.includes(term)) {
        console.error(`>>> [LEAK] File ${file} contains server-only module reference: "${term}"`);
        leaksFound++;
      }
    }
  }

  if (leaksFound > 0) {
    console.error(
      `\n>>> [FAIL] Found ${leaksFound} security/weight violations. Bundle contains backend dependencies.`,
    );
    process.exit(1);
  }

  console.log('\n>>> [PASS] Zero server-side leakages detected in UI assets.');
  process.exit(0);
}

main();
