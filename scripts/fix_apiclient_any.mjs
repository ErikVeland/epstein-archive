import * as fs from 'fs';

let content = fs.readFileSync('src/client/services/apiClient.ts', 'utf8');

// (value as any).message -> (value as Record<string, unknown>).message
content = content.replace(/\(value as any\)\.([a-zA-Z0-9_]+)/g, '(value as Record<string, unknown>).$1');

// error: any -> error: unknown
content = content.replace(/catch\s*\(\s*error\s*:\s*any\s*\)/g, 'catch (error: unknown)');
// (error as any).isContractError
content = content.replace(/\(error\s*as\s*any\)\.([a-zA-Z0-9_]+)/g, '(error as Record<string, unknown>).$1');

// body?: any -> body?: unknown
content = content.replace(/body\?: any/g, 'body?: unknown');
content = content.replace(/body:\s*any/g, 'body: unknown');

// e: any -> e: Record<string, unknown>
content = content.replace(/\(e:\s*any\)/g, '(e: Record<string, unknown>)');

// filters: Record<string, any> -> filters: Record<string, unknown>
content = content.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');

// fetchWithErrorHandling<any> -> fetchWithErrorHandling<unknown>
content = content.replace(/fetchWithErrorHandling<any>/g, 'fetchWithErrorHandling<unknown>');

// data.map((e: any) =>
// content = content.replace(/\(e:\s*any\)/g, '(e: Record<string, unknown>)');

// return { ...(resp as any), data: normalized } as PaginatedResponse;
content = content.replace(/\(resp as any\)/g, '(resp as unknown as Record<string, unknown>)');

// data: any[] -> data: unknown[]
content = content.replace(/data:\s*any\[\]/g, 'data: unknown[]');

// Array.isArray(r.entities) ? r.entities.map((e: any)
content = content.replace(/entities:\s*any\[\]/g, 'entities: unknown[]');
content = content.replace(/documents:\s*any\[\]/g, 'documents: unknown[]');
content = content.replace(/investigations\?:\s*any\[\]/g, 'investigations?: unknown[]');
content = content.replace(/articles\?:\s*any\[\]/g, 'articles?: unknown[]');
content = content.replace(/media\?:\s*any\[\]/g, 'media?: unknown[]');

content = content.replace(/options\s*as\s*any/g, 'options as unknown as RequestInit');

const countAny = (content.match(/[^a-zA-Z0-9_]any[^a-zA-Z0-9_]/g) || []).length;

fs.writeFileSync('src/client/services/apiClient.ts', content, 'utf8');
console.log('Instances of any left in apiClient.ts:', countAny);
