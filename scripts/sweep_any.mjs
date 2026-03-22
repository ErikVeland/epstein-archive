import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src/client');

let totalReplaced = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const initial = content;
  
  // 1. Arrays and Promises
  content = content.replace(/:\s*any\[\]/g, ': Record<string, unknown>[]');
  content = content.replace(/Promise<any>/g, 'Promise<Record<string, unknown>>');
  content = content.replace(/Array<any>/g, 'Array<Record<string, unknown>>');
  
  // 2. Map and Record
  content = content.replace(/Record<string,\s*any>/g, 'Record<string, unknown>');
  content = content.replace(/Map<([^,]+),\s*any>/g, 'Map<$1, unknown>');
  
  // 3. Catch error
  content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*:\s*any\s*\)/g, 'catch ($1: unknown)');
  
  // 4. Type assertions
  content = content.replace(/as\s+any\s*\./g, 'as Record<string, unknown>.');
  content = content.replace(/as\s+any(\s*[,;\]}\)\>])/g, 'as unknown$1');
  
  // 5. Function arguments and assignments
  content = content.replace(/:\s*any(\s*[,=\)])/g, ': unknown$1');
  
  // 6. Generic parameters empty
  content = content.replace(/<any>/g, '<unknown>');
  content = content.replace(/<any,\s*any>/g, '<unknown, unknown>');

  if (content !== initial) {
    fs.writeFileSync(file, content, 'utf8');
    totalReplaced++;
  }
}

console.log(`Updated ${totalReplaced} files.`);
