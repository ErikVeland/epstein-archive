import { spawn, type ChildProcess } from 'child_process';
import 'dotenv/config';
import pg from 'pg';

function run(
  command: string,
  args: string[],
  opts: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: opts.env ?? process.env,
      cwd: opts.cwd,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function canUseDocker(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('docker', ['info'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    child.once('exit', finish);
    child.kill('SIGTERM');

    setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      setTimeout(finish, 1000);
    }, 5000);
  });
}

async function waitForDb(connectionString: string) {
  const deadline = Date.now() + 60_000;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const client = new pg.Client({ connectionString });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (e: unknown) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Timed out waiting for Postgres. Last error: ${message}`);
}

async function waitForReady(baseUrl: string) {
  const deadline = Date.now() + 60_000;
  let lastStatus: number | null = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/api/health/ready`);
      lastStatus = res.status;
      if (res.ok) {
        const json = (await res.json()) as { status?: string };
        if (json?.status === 'ok') return;
      }
    } catch (_e) {
      void _e;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for readiness endpoint. Last status: ${lastStatus ?? 'none'}`);
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3012';
  const databaseUrl =
    process.env.DATABASE_URL ?? 'postgresql://epstein:epstein@localhost:5432/epstein_archive';
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const rawCorpusBasePath = process.env.RAW_CORPUS_BASE_PATH ?? './data';

  const dockerMode = (process.env.LOCAL_SMOKE_DOCKER ?? 'auto').toLowerCase();
  const skipDocker = dockerMode === '0' || dockerMode === 'false';
  const requireDocker = dockerMode === '1' || dockerMode === 'true';
  if (!skipDocker) {
    const dockerOk = await canUseDocker();
    if (dockerOk) {
      await run('docker', ['compose', 'up', '-d', 'postgres']);
    } else if (requireDocker) {
      throw new Error(
        'Docker is not available. Start Docker Desktop, or set LOCAL_SMOKE_DOCKER=0 and provide a working DATABASE_URL.',
      );
    }
  }

  try {
    await waitForDb(databaseUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${message}\nFix by starting Postgres (pnpm local:db:up with Docker Desktop) or by setting DATABASE_URL to a reachable Postgres and running with LOCAL_SMOKE_DOCKER=0.`,
    );
  }

  await run('pnpm', ['db:migrate:pg'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: nodeEnv,
      RAW_CORPUS_BASE_PATH: rawCorpusBasePath,
    },
  });
  await run('pnpm', ['seed:minimal'], {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: nodeEnv,
      RAW_CORPUS_BASE_PATH: rawCorpusBasePath,
    },
  });

  const server = spawn('pnpm', ['exec', 'tsx', 'src/server.ts'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: nodeEnv,
      RAW_CORPUS_BASE_PATH: rawCorpusBasePath,
      API_PORT: process.env.API_PORT ?? process.env.PORT ?? '3012',
      PORT: process.env.API_PORT ?? process.env.PORT ?? '3012',
    },
  });

  try {
    await waitForReady(baseUrl);
    await run('bash', ['scripts/ci_pg_endpoint_smoke.sh'], {
      env: { ...process.env, BASE_URL: baseUrl, DATABASE_URL: databaseUrl },
    });
  } finally {
    await stopProcess(server);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[local_smoke] ${message}`);
  process.exit(1);
});
