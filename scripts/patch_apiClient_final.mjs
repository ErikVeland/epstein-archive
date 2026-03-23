import * as fs from 'fs';
let content = fs.readFileSync('src/client/services/apiClient.ts', 'utf8');

content = content.replace(
  /if \(error\.name === 'AbortError'\)/g,
  "if ((error as Error).name === 'AbortError')",
);

content = content.replace(
  /queryParams\.append\('search', filters\.search\)/g,
  "queryParams.append('search', filters.search as string)",
);
content = content.replace(
  /queryParams\.append\('role', filters\.role\)/g,
  "queryParams.append('role', filters.role as string)",
);
content = content.replace(
  /queryParams\.append\('entityType', filters\.entityType\)/g,
  "queryParams.append('entityType', filters.entityType as string)",
);
content = content.replace(
  /queryParams\.append\('sortBy', filters\.sortBy\)/g,
  "queryParams.append('sortBy', filters.sortBy as string)",
);
content = content.replace(
  /queryParams\.append\('likelihoodScore', l\)/g,
  "queryParams.append('likelihoodScore', l as string)",
);
content = content.replace(
  /queryParams\.append\('likelihoodScore', filters\.likelihood\)/g,
  "queryParams.append('likelihoodScore', filters.likelihood as string)",
);

content = content.replace(
  /return await response\.json\(\);/g,
  'return (await response.json()) as { pages: string[]; total: number };',
);

content = content.replace(
  /encodeURIComponent\(evidenceId\)/g,
  'encodeURIComponent(evidenceId as string)',
);

content = content.replace(
  /return this.fetchWithErrorHandling<unknown>\(`\S+\/health`\);/,
  'return this.fetchWithErrorHandling<any>(`${API_BASE_URL}/health`);',
);

content = content.replace(
  /const d = await this\.fetchWithErrorHandling<unknown>\(url\);/g,
  'const d = await this.fetchWithErrorHandling<Record<string, unknown>>(url);',
);
content = content.replace(
  /const e = await this\.fetchWithErrorHandling<unknown>\(url\);/g,
  'const e = await this.fetchWithErrorHandling<Record<string, unknown>>(url);',
);

content = content.replace(
  /e\.name \?\? e\.fullName/g,
  '(e as Record<string, unknown>).name ?? (e as Record<string, unknown>).fullName',
);
content = content.replace(
  /e\.fullName \?\? e\.name/g,
  '(e as Record<string, unknown>).fullName ?? (e as Record<string, unknown>).name',
);
content = content.replace(/e\.redFlagRating/g, '(e as Record<string, unknown>).redFlagRating');
content = content.replace(/e\.blackBookEntry/g, '(e as Record<string, unknown>).blackBookEntry');

content = content.replace(
  /d\.fileName \?\? d\.file_name/g,
  '(d as Record<string, unknown>).fileName ?? (d as Record<string, unknown>).file_name',
);
content = content.replace(
  /d\.fileType \?\? d\.file_type/g,
  '(d as Record<string, unknown>).fileType ?? (d as Record<string, unknown>).file_type',
);
content = content.replace(
  /d\.contentPreview \?\? d\.content_preview/g,
  '(d as Record<string, unknown>).contentPreview ?? (d as Record<string, unknown>).content_preview',
);
content = content.replace(/d\.redFlagRating/g, '(d as Record<string, unknown>).redFlagRating');

content = content.replace(
  /documents: \(r as Record<string, unknown>\)\.documents \|\| \[\]/g,
  'documents: ((r as Record<string, unknown>).documents || []) as unknown[]',
);
content = content.replace(
  /investigations: \(r as Record<string, unknown>\)\.investigations \|\| \[\]/g,
  'investigations: ((r as Record<string, unknown>).investigations || []) as unknown[]',
);
content = content.replace(
  /articles: \(r as Record<string, unknown>\)\.articles \|\| \[\]/g,
  'articles: ((r as Record<string, unknown>).articles || []) as unknown[]',
);
content = content.replace(
  /media: \(r as Record<string, unknown>\)\.media \|\| \[\]/g,
  'media: ((r as Record<string, unknown>).media || []) as unknown[]',
);

content = content.replace(
  /if \(filters\.timeRange && filters\.timeRange\[0\]\) params\.append\('startDate', filters\.timeRange\[0\]\);/g,
  "if ((filters as Record<string, string[]>).timeRange && (filters as Record<string, string[]>).timeRange[0]) params.append('startDate', (filters as Record<string, string[]>).timeRange[0]);",
);
content = content.replace(
  /if \(filters\.timeRange && filters\.timeRange\[1\]\) params\.append\('endDate', filters\.timeRange\[1\]\);/g,
  "if ((filters as Record<string, string[]>).timeRange && (filters as Record<string, string[]>).timeRange[1]) params.append('endDate', (filters as Record<string, string[]>).timeRange[1]);",
);
content = content.replace(
  /if \(filters\.limit\) params\.append\('limit', filters\.limit\.toString\(\)\);/g,
  "if ((filters as Record<string, number>).limit) params.append('limit', (filters as Record<string, number>).limit.toString());",
);

fs.writeFileSync('src/client/services/apiClient.ts', content, 'utf8');
console.log('Final patch complete.');
