import * as fs from 'fs';

let content = fs.readFileSync('src/client/services/apiClient.ts', 'utf8');

// Spread objects error
content = content.replace(/\.\.\.e,/g, '...(e as object),');
content = content.replace(/\.\.\.d,/g, '...(d as object),');

// Name / fullName access
content = content.replace(/e\.name \?\? e\.fullName/g, '(e as Record<string, unknown>).name ?? (e as Record<string, unknown>).fullName');
content = content.replace(/e\.fullName \?\? e\.name/g, '(e as Record<string, unknown>).fullName ?? (e as Record<string, unknown>).name');
content = content.replace(/e\.redFlagRating/g, '(e as Record<string, unknown>).redFlagRating');
content = content.replace(/e\.blackBookEntry/g, '(e as Record<string, unknown>).blackBookEntry');

// Document access
content = content.replace(/d\.fileName \?\? d\.file_name/g, '(d as Record<string, unknown>).fileName ?? (d as Record<string, unknown>).file_name');
content = content.replace(/d\.fileType \?\? d\.file_type/g, '(d as Record<string, unknown>).fileType ?? (d as Record<string, unknown>).file_type');
content = content.replace(/d\.contentPreview \?\? d\.content_preview/g, '(d as Record<string, unknown>).contentPreview ?? (d as Record<string, unknown>).content_preview');
content = content.replace(/d\.redFlagRating/g, '(d as Record<string, unknown>).redFlagRating');

// filter search
content = content.replace(/filters\.search/g, '(filters as Record<string, unknown>).search');
content = content.replace(/filters\.role/g, '(filters as Record<string, unknown>).role');
content = content.replace(/filters\.entityType/g, '(filters as Record<string, unknown>).entityType');
content = content.replace(/filters\.sortBy/g, '(filters as Record<string, unknown>).sortBy');
content = content.replace(/filters\.likelihood/g, '(filters as Record<string, unknown>).likelihood');

// map function return assignment casting Person
content = content.replace(/} as Person/g, '} as unknown as Person');
content = content.replace(/} as unknown as unknown as Person/g, '} as unknown as Person');

content = content.replace(/entities: unknown\[\];/g, 'entities: Person[];');
content = content.replace(/const ents = Array.isArray\(r.entities\)/g, 'const ents = Array.isArray((r as Record<string, unknown>).entities)');
content = content.replace(/r\.entities\.map/g, '((r as Record<string, unknown>).entities as unknown[]).map');
content = content.replace(/entities: ents/g, 'entities: ents as unknown as Person[]');
content = content.replace(/documents: r\.documents/g, 'documents: (r as Record<string, unknown>).documents');
content = content.replace(/investigations: r\.investigations/g, 'investigations: (r as Record<string, unknown>).investigations');
content = content.replace(/articles: r\.articles/g, 'articles: (r as Record<string, unknown>).articles');
content = content.replace(/media: r\.media/g, 'media: (r as Record<string, unknown>).media');

// The tricky getSubjects return PaginatedResponse mappings:
content = content.replace(/data: unknown\[\];/g, 'data: any[];'); // we'll avoid rewriting the entire backend DTOs

// readinessCheck matching
// Just force the return fetch to be the precise readiness generic
content = content.replace(/this\.fetchWithErrorHandling<unknown>\(`\S+\/readiness`\);/, "this.fetchWithErrorHandling<any>(`${API_BASE_URL}/readiness`, { useCache: false });");

fs.writeFileSync('src/client/services/apiClient.ts', content, 'utf8');
console.log('Patch complete.');
