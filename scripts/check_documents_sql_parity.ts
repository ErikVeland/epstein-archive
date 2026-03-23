import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function extractNamedSqlBlock(sqlFile: string, name: string): string {
  const marker = `/* @name ${name} */`;
  const idx = sqlFile.indexOf(marker);
  if (idx < 0) throw new Error(`Missing SQL block marker: ${marker}`);
  const nextIdx = sqlFile.indexOf('/* @name ', idx + marker.length);
  const body = sqlFile.slice(idx + marker.length, nextIdx < 0 ? undefined : nextIdx).trim();
  return body.replace(/;+\s*$/g, '');
}

function extractTemplateVar(tsFile: string, varName: string): string {
  const prefix = `const ${varName} = \``;
  const start = tsFile.indexOf(prefix);
  if (start < 0) throw new Error(`Missing template string for ${varName}`);
  const bodyStart = start + prefix.length;
  let i = bodyStart;
  while (i < tsFile.length) {
    if (tsFile[i] === '`' && tsFile[i - 1] !== '\\') {
      return tsFile
        .slice(bodyStart, i)
        .trim()
        .replace(/;+\s*$/g, '');
    }
    i += 1;
  }
  throw new Error(`Unterminated template string for ${varName}`);
}

function normalizeSql(sql: string): string {
  return sql
    .toLowerCase()
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\$\{[^}]+\}/g, '') // strip JS template expressions (dynamic ORDER BY etc.)
    .replace(/::[a-z_][a-z0-9_]*(\[\])?/g, '') // remove explicit casts
    .replace(/\$[0-9]+/g, ':p') // positional params
    .replace(/:[a-z_][a-z0-9_]*!?/g, ':p') // named params
    .replace(/\border\s+by\b[\s\S]*?(?=\blimit\b)/i, '') // strip ORDER BY (intentionally dynamic)
    .replace(/\s+/g, ' ')
    .replace(/\s*([(),=])\s*/g, '$1')
    .trim();
}

function assertEqual(name: string, a: string, b: string) {
  if (a !== b) {
    throw new Error(`Documents SQL parity failed for ${name}`);
  }
}

function main() {
  const sourceSql = read('packages/db/src/queries/documents.sql');
  const repoTs = read('src/server/db/documentsRepository.ts');

  const sourceGet = normalizeSql(extractNamedSqlBlock(sourceSql, 'getDocuments'));
  const sourceCount = normalizeSql(extractNamedSqlBlock(sourceSql, 'countDocuments'));
  const hotfixGet = normalizeSql(extractTemplateVar(repoTs, 'docsSql'));
  const hotfixCount = normalizeSql(extractTemplateVar(repoTs, 'countSql'));

  assertEqual('getDocuments', sourceGet, hotfixGet);
  assertEqual('countDocuments', sourceCount, hotfixCount);

  if (/documentsQueries\.(getDocuments|countDocuments)\.run/.test(repoTs)) {
    throw new Error(
      'documentsRepository still calls generated getDocuments/countDocuments queries; hotfix parity guard expects explicit SQL path only.',
    );
  }

  console.log('[documents-sql-parity] OK');
}

main();
