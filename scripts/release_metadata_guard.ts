#!/usr/bin/env tsx
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseTimeZone = 'Australia/Brisbane';

export interface ReleaseMetadataInput {
  currentVersion: string;
  baseVersion: string;
  currentNotes: string;
  baseNotes: string;
  expectedDate: string;
}

interface ParsedReleaseHeading {
  version: string;
  date: string;
  title: string;
  body: string;
}

function parseVersion(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isVersionGreater(current: string, base: string): boolean {
  const currentParts = parseVersion(current);
  const baseParts = parseVersion(base);
  if (!currentParts || !baseParts) return false;

  for (let index = 0; index < currentParts.length; index += 1) {
    if (currentParts[index] !== baseParts[index]) {
      return currentParts[index] > baseParts[index];
    }
  }
  return false;
}

function parseTopRelease(notes: string): ParsedReleaseHeading | null {
  const lines = notes.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => /^##\s+/.test(line));
  if (headingIndex < 0) return null;

  const heading = lines[headingIndex];
  const match = heading.match(
    /^##\s+v?(\d+\.\d+\.\d+)\s+(?:-|—)\s+(\d{4}-\d{2}-\d{2})\s+(?:-|—)\s+(.+?)\s*$/,
  );
  if (!match) return null;

  const nextReleaseIndex = lines.findIndex(
    (line, index) => index > headingIndex && /^##\s+/.test(line),
  );
  const body = lines
    .slice(headingIndex + 1, nextReleaseIndex < 0 ? undefined : nextReleaseIndex)
    .join('\n');

  return {
    version: match[1],
    date: match[2],
    title: match[3].trim(),
    body,
  };
}

export function currentDateInTimeZone(date: Date, timeZone = releaseTimeZone): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function validateReleaseMetadata(input: ReleaseMetadataInput): string[] {
  const errors: string[] = [];
  const currentVersionParts = parseVersion(input.currentVersion);
  const baseVersionParts = parseVersion(input.baseVersion);

  if (!currentVersionParts) {
    errors.push(`package.json version must use x.y.z format; found ${input.currentVersion}`);
  }
  if (!baseVersionParts) {
    errors.push(`base package version must use x.y.z format; found ${input.baseVersion}`);
  }
  if (
    currentVersionParts &&
    baseVersionParts &&
    !isVersionGreater(input.currentVersion, input.baseVersion)
  ) {
    errors.push(
      `package.json version must increase for every deployment; ${input.currentVersion} is not greater than ${input.baseVersion}`,
    );
  }

  if (input.currentNotes === input.baseNotes) {
    errors.push('release_notes.md must change for every deployment');
  }

  const release = parseTopRelease(input.currentNotes);
  if (!release) {
    errors.push(
      'release_notes.md must start with: ## x.y.z - YYYY-MM-DD - Descriptive release title',
    );
    return errors;
  }

  if (release.version !== input.currentVersion) {
    errors.push(
      `top release-note version ${release.version} does not match package.json ${input.currentVersion}`,
    );
  }
  if (release.date !== input.expectedDate) {
    errors.push(
      `top release-note date must be ${input.expectedDate} (${releaseTimeZone}); found ${release.date}`,
    );
  }
  if (release.title.length < 4) {
    errors.push('top release-note title must describe the release');
  }
  if (!/^###\s+\S+/m.test(release.body)) {
    errors.push('top release note must contain at least one named section');
  }
  if (!/^-\s+\S+/m.test(release.body)) {
    errors.push('top release note must contain at least one change bullet');
  }

  return errors;
}

function readPackageVersion(contents: string, source: string): string {
  const parsed = JSON.parse(contents) as { version?: unknown };
  if (typeof parsed.version !== 'string' || parsed.version.length === 0) {
    throw new Error(`${source} does not contain a valid version`);
  }
  return parsed.version;
}

function gitShow(baseRef: string, relativePath: string): string {
  return execFileSync('git', ['show', `${baseRef}:${relativePath}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function getBaseRef(args: string[]): string {
  const baseIndex = args.indexOf('--base');
  const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined;
  if (!baseRef || baseRef.startsWith('-')) {
    throw new Error('Usage: pnpm check:release-metadata -- --base <git-ref>');
  }
  return baseRef;
}

function main(): void {
  try {
    const baseRef = getBaseRef(process.argv.slice(2));
    execFileSync('git', ['rev-parse', '--verify', `${baseRef}^{commit}`], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });

    const currentPackage = fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8');
    const currentNotes = fs.readFileSync(path.join(repositoryRoot, 'release_notes.md'), 'utf8');
    const basePackage = gitShow(baseRef, 'package.json');
    const baseNotes = gitShow(baseRef, 'release_notes.md');
    const currentVersion = readPackageVersion(currentPackage, 'package.json');
    const baseVersion = readPackageVersion(basePackage, `${baseRef}:package.json`);
    const expectedDate = currentDateInTimeZone(new Date());

    const errors = validateReleaseMetadata({
      currentVersion,
      baseVersion,
      currentNotes,
      baseNotes,
      expectedDate,
    });

    if (errors.length > 0) {
      console.error('[release-metadata] BLOCKED');
      for (const error of errors) console.error(`  - ${error}`);
      process.exitCode = 1;
      return;
    }

    console.log(
      `[release-metadata] OK: ${baseVersion} -> ${currentVersion}, notes dated ${expectedDate}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[release-metadata] BLOCKED: ${message}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
