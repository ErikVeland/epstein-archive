#!/usr/bin/env tsx

import { createRequire } from 'node:module';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'dist');
const requireFromHere = createRequire(import.meta.url);
const serverRoots = ['server.js', 'app.js', 'server', 'shared'].map((entry) =>
  path.join(root, entry),
);
const internalAliasPattern = /^(?:@shared|@server|@client|@\/|src\/)/;
const importPattern =
  /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

type RuntimeImportIssue = {
  file: string;
  specifier: string;
  reason: string;
};

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(entry: string): Promise<string[]> {
  if (!(await exists(entry))) {
    return [];
  }

  const statEntries = await readdir(entry, { withFileTypes: true }).catch(() => null);
  if (!statEntries) {
    return /\.(?:js|mjs|cjs)$/.test(entry) ? [entry] : [];
  }

  const files: string[] = [];
  for (const dirent of statEntries) {
    const next = path.join(entry, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...(await collectFiles(next)));
    } else if (/\.(?:js|mjs|cjs)$/.test(dirent.name)) {
      files.push(next);
    }
  }
  return files;
}

async function resolveRelativeImport(fromFile: string, specifier: string): Promise<string | null> {
  const target = path.resolve(path.dirname(fromFile), specifier);
  if (await exists(target)) {
    return null;
  }

  // CommonJS output can still legally resolve extensionless imports. Native ESM
  // server output cannot, but accepting these keeps the guard useful across both
  // compiler modes without forcing every historical file through an ESM lens.
  for (const extension of ['.js', '.mjs', '.cjs', '.json']) {
    if (await exists(`${target}${extension}`)) {
      return null;
    }
  }

  for (const extension of ['.js', '.mjs', '.cjs']) {
    if (await exists(path.join(target, `index${extension}`))) {
      return null;
    }
  }

  return `relative target does not exist from built file: ${target}`;
}

function resolveBareImport(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('node:')) {
    return null;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(specifier)) {
    return null;
  }
  if (internalAliasPattern.test(specifier)) {
    return 'compiled server output still references a TypeScript/internal alias';
  }

  try {
    createRequire(fromFile).resolve(specifier);
    return null;
  } catch {
    try {
      requireFromHere.resolve(specifier);
      return null;
    } catch {
      return 'bare package import cannot be resolved from the built server output';
    }
  }
}

async function main() {
  const files = (await Promise.all(serverRoots.map(collectFiles))).flat();
  if (files.length === 0) {
    throw new Error(`No built server files found under ${root}. Run pnpm build:server first.`);
  }

  const issues: RuntimeImportIssue[] = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) {
        continue;
      }

      const reason =
        specifier.startsWith('.') || specifier.startsWith('/')
          ? await resolveRelativeImport(file, specifier)
          : resolveBareImport(file, specifier);
      if (reason) {
        issues.push({
          file: path.relative(process.cwd(), file),
          specifier,
          reason,
        });
      }
    }
  }

  if (issues.length > 0) {
    console.error('Server runtime import guard failed:');
    for (const issue of issues) {
      console.error(`- ${issue.file}: "${issue.specifier}" (${issue.reason})`);
    }
    process.exit(1);
  }

  console.log(`Server runtime import guard passed (${files.length} built files scanned).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
