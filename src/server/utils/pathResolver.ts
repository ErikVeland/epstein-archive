import path from 'path';
import fs from 'fs';

/**
 * Resolves a database file path to an absolute filesystem path.
 * Handles various path formats stored in the database:
 * - /data/... paths (leading slash)
 * - data/... paths (no leading slash)
 * - Absolute paths
 * - Relative paths
 *
 * @param dbPath - The path stored in the database
 * @param fallbackDir - Optional fallback directory for relative paths (defaults to 'data')
 * @returns The resolved absolute path
 */
const REMOTE_PATH_PREFIXES = ['http://', 'https://', 'file://', 'ftp://', 'data:', '//'];

export function resolveMediaPath(dbPath: string, fallbackDir: string = 'data'): string {
  if (!dbPath) {
    return '';
  }

  // Reject protocol-based paths — DB-sourced paths must never point to remote resources.
  for (const prefix of REMOTE_PATH_PREFIXES) {
    if (dbPath.startsWith(prefix)) {
      return '';
    }
  }

  const cwd = process.cwd();
  const normalizedDbPath = dbPath.replace(/\\/g, '/');

  if (normalizedDbPath.startsWith('/media/') || normalizedDbPath.startsWith('media/')) {
    const publicRelativePath = normalizedDbPath.replace(/^\/?media\//, 'media/');
    const builtPath = path.join(cwd, 'dist', publicRelativePath);
    if (fs.existsSync(builtPath)) {
      return builtPath;
    }
    return path.join(cwd, 'public', publicRelativePath);
  }

  // Robust parsing: extract anything after 'data/' in the path if present.
  const dataMatch = normalizedDbPath.match(/(?:^|[/\\])data[/\\](.+)/i);
  if (dataMatch) {
    return path.join(cwd, 'data', dataMatch[1]);
  }

  // Path starting with /data/ - resolve relative to cwd
  if (dbPath.startsWith('/data/')) {
    return path.join(cwd, dbPath.substring(1));
  }

  // Path starting with data/ - resolve relative to cwd
  if (dbPath.startsWith('data/')) {
    return path.join(cwd, dbPath);
  }

  // Path starting with /thumbnails/ - resolve relative to data dir
  if (dbPath.startsWith('/thumbnails/')) {
    return path.join(cwd, 'data', dbPath.substring(1));
  }

  // Absolute path - only allow if it's within the data directory
  if (path.isAbsolute(dbPath)) {
    const dataRoot = path.resolve(cwd, 'data');
    const normalizedRoot = dataRoot.endsWith(path.sep) ? dataRoot : `${dataRoot}${path.sep}`;
    if (dbPath !== dataRoot && !dbPath.startsWith(normalizedRoot)) {
      const basename = path.basename(dbPath);
      return path.join(cwd, fallbackDir, basename);
    }
    return dbPath;
  }

  // Relative path - resolve relative to fallback directory
  return path.join(cwd, fallbackDir, dbPath);
}

/**
 * Checks if a file exists at the resolved path.
 *
 * @param dbPath - The path stored in the database
 * @param fallbackDir - Optional fallback directory for relative paths
 * @returns Object with resolved path and existence status
 */
export function resolveAndCheckPath(
  dbPath: string,
  fallbackDir: string = 'data',
): { path: string; exists: boolean } {
  const resolved = resolveMediaPath(dbPath, fallbackDir);
  return {
    path: resolved,
    exists: resolved ? fs.existsSync(resolved) : false,
  };
}

/**
 * Finds the first existing file from multiple potential paths.
 * Useful for fallback logic (e.g., thumbnail -> original image).
 *
 * @param paths - Array of database paths to try
 * @param fallbackDir - Optional fallback directory for relative paths
 * @returns The first resolved path that exists, or null if none exist
 */
export function findFirstExistingPath(
  paths: string[],
  fallbackDir: string = 'data',
): string | null {
  for (const dbPath of paths) {
    if (!dbPath) continue;

    const decodedPath = (() => {
      try {
        return decodeURIComponent(dbPath);
      } catch {
        return dbPath;
      }
    })();
    const variants = Array.from(new Set([dbPath, decodedPath]));

    for (const variant of variants) {
      const resolved = resolveMediaPath(variant, fallbackDir);
      if (resolved && fs.existsSync(resolved)) {
        return resolved;
      }
    }
  }
  return null;
}

/** Constructs an absolute path under the project's data/ directory. */
export function dataPath(...segments: string[]): string {
  return path.join(process.cwd(), 'data', ...segments);
}
