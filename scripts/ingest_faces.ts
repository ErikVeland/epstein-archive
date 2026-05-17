import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const pythonBin = process.env.FACE_PIPELINE_PYTHON || join(process.cwd(), 'venv', 'bin', 'python3');

async function runPythonStep(label: string, scriptName: string): Promise<void> {
  const scriptPath = join(process.cwd(), 'scripts', scriptName);
  if (!existsSync(scriptPath)) {
    throw new Error(`Face pipeline step is missing: ${scriptPath}`);
  }

  console.log(`\n▶ ${label}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(pythonBin, [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${scriptName} exited with code ${code ?? 1}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Launching unified face intelligence pipeline...');

  await runPythonStep('DeepFace scan and embedding extraction', 'scan_faces_deepface.py');
  await runPythonStep('Embedding migration and cluster assignment', 'cluster_faces.py');
  await runPythonStep('Representative face crop generation', 'generate_face_crops.py');

  console.log('\n✅ Face intelligence pipeline finished successfully.');
}

main().catch((error) => {
  console.error('❌ Face intelligence pipeline failed:', error);
  process.exit(1);
});
