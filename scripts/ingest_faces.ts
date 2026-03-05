import { spawn } from 'child_process';
import { join } from 'path';
import 'dotenv/config';

async function main() {
  console.log('🚀 Launching Face Recognition Scanner...');

  const pythonScript = join(process.cwd(), 'scripts', 'scan_faces_deepface.py');
  const venvPython = join(process.cwd(), 'venv', 'bin', 'python3');

  const child = spawn(venvPython, [pythonScript], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Face scanner exited with code ${code}`);
      process.exit(code || 1);
    } else {
      console.log('✅ Face scanner finished successfully.');
    }
  });
}

main().catch(console.error);
