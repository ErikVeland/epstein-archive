import fs from 'fs';
let content = fs.readFileSync('src/client/services/apiClient.ts', 'utf8');

// Fix signal types for useCache object overlapping with standard RequestInit
content = content.replace(/signal:\s*options\?\.signal,?/g, 'signal: options?.signal || undefined,');

// Fix 'error' is unknown
content = content.replace(/if \(error\.isContractError\)/g, 'if ((error as any).isContractError)');

// All queryParams.append for filters that weren't fully caught as strings
content = content.replace(/queryParams\.append\('type', filters\.type\)/g, "queryParams.append('type', filters.type as string)");
content = content.replace(/queryParams\.append\('dateFrom', filters\.dateFrom\)/g, "queryParams.append('dateFrom', filters.dateFrom as string)");
content = content.replace(/queryParams\.append\('dateTo', filters\.dateTo\)/g, "queryParams.append('dateTo', filters.dateTo as string)");
content = content.replace(/queryParams\.append\('status', filters\.status\)/g, "queryParams.append('status', filters.status as string)");
content = content.replace(/queryParams\.append\('ownerId', filters\.ownerId\)/g, "queryParams.append('ownerId', filters.ownerId as string)");
content = content.replace(/queryParams\.append\('cursor', filters\.cursor\)/g, "queryParams.append('cursor', filters.cursor as string)");
content = content.replace(/queryParams\.append\('hasAttachments', filters\.hasAttachments\)/g, "queryParams.append('hasAttachments', filters.hasAttachments as string)");

// Object is unknown
content = content.replace(/filters\.likelihood\.forEach/g, '(filters.likelihood as string[]).forEach');

// map function unknown casting
content = content.replace(/\.map\(\(e: Record<string, unknown>\) => \(\{/g, '.map((e: any) => ({');

// Any remaining filter missing string casts reported
content = content.replace(/\(filters as Record<string, unknown>\)\.searchTerm/g, '(filters as Record<string, unknown>).searchTerm as string');
content = content.replace(/\(\(filters as Record<string, unknown>\)\.sortBy as any\)/g, '((filters as Record<string, unknown>).sortBy as string)');

fs.writeFileSync('src/client/services/apiClient.ts', content, 'utf8');
console.log('Final polish patch applied.');
