#!/usr/bin/env tsx

import * as fs from 'node:fs';
import * as path from 'node:path';

const distDir = path.resolve(process.cwd(), process.env.ASSET_GRAPH_DIST || 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error(`[asset-graph] Missing assets directory: ${assetsDir}`);
  process.exit(1);
}

const jsFiles = fs
  .readdirSync(assetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.join(assetsDir, file));

const importPattern = /(?:from\s*|import\s*\()\s*["']\.\/([^"']+\.(?:js|css))["']/g;
const missing: string[] = [];

for (const filePath of jsFiles) {
  const source = fs.readFileSync(filePath, 'utf8');
  let match: RegExpExecArray | null = importPattern.exec(source);
  while (match) {
    const relativeImport = match[1];
    const targetPath = path.join(path.dirname(filePath), relativeImport);
    if (!fs.existsSync(targetPath)) {
      missing.push(`${path.relative(distDir, filePath)} -> ${relativeImport}`);
    }
    match = importPattern.exec(source);
  }
}

if (missing.length > 0) {
  console.error('[asset-graph] Missing built asset imports:');
  for (const ref of missing) {
    console.error(`  ${ref}`);
  }
  process.exit(1);
}

console.log(`[asset-graph] verified ${jsFiles.length} JS chunks`);
