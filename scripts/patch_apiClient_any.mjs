import fs from 'fs';

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Apply standard Promise bounds
  code = code.replace(/Promise<any>/g, 'Promise<unknown>');
  code = code.replace(/Promise<any\[\]>/g, 'Promise<unknown[]>');

  // Apply generic fetch bounds
  code = code.replace(/<any>/g, '<unknown>');
  code = code.replace(/<any\[\]>/g, '<unknown[]>');

  // Apply casting bounds
  code = code.replace(/ as any;/g, ' as unknown;');
  code = code.replace(/ as any\[\]/g, ' as unknown[]');
  code = code.replace(/\(d\: any\)/g, '(d: Record<string, unknown>)');
  code = code.replace(/\(raw\: any\)/g, '(raw: Record<string, unknown>)');
  code = code.replace(/\(entity\: any\)/g, '(entity: Record<string, unknown>)');
  code = code.replace(/\: any /g, ': unknown ');
  code = code.replace(/\: any\b/g, ': unknown');

  fs.writeFileSync(file, code);
  console.log(`Patched ${file}`);
}

const targetFiles = [
  'src/client/services/apiClient.ts',
  'src/client/services/optimizedDataLoader.ts',
  'src/client/services/GraphService.ts',
  'src/client/services/ContentNavigationService.tsx',
  'src/client/services/NavigationContext.tsx',
];

targetFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    patchFile(file);
  }
});
