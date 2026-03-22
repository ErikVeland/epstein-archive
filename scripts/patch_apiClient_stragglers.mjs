import fs from 'fs';
let content = fs.readFileSync('src/client/services/apiClient.ts', 'utf8');

// Header idempotency
content = content.replace(/\(options\?\.headers as any\)/g, "(options?.headers as Record<string, string>)");

// Error Data mapping
content = content.replace(/\(errorData as any\)/g, "(errorData as Record<string, unknown>)");

// Options generic fallback
content = content.replace(/options as any/g, "options as RequestInit & { signal?: AbortSignal }");

// Filter overrides
content = content.replace(/\(filters as any\)/g, "(filters as Record<string, unknown>)");
content = content.replace(/} as any/g, "} as unknown as Record<string, unknown>");

// Fallback subject row
content = content.replace(/\(s: any\)/g, "(s: import(\"./apiClient\").RawApiEntity)");

// Complex Promise Returns
content = content.replace(/: Promise<\{ data: any\[\];/g, ": Promise<{ data: unknown[];");
content = content.replace(/<\{ data: any\[\];/g, "<{ data: unknown[];");
content = content.replace(/messages: any\[\]/g, "messages: unknown[]");

// Generic POST creations
content = content.replace(/createEntity\(data: any\): Promise<any>/g, "createEntity(data: unknown): Promise<unknown>");
content = content.replace(/createRelationship\(data: any\): Promise<any>/g, "createRelationship(data: unknown): Promise<unknown>");

// Arrays and objects
content = content.replace(/as any\[\]/g, "as unknown[]");
content = content.replace(/annotations\?: any\[\]/g, "annotations?: unknown[]");
content = content.replace(/annotation: any/g, "annotation: unknown");
content = content.replace(/updates: any\)/g, "updates: unknown)");

fs.writeFileSync('src/client/services/apiClient.ts', content, 'utf8');
console.log('Final stragglers patch applied.');
