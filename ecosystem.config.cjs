/**
 * PM2 Ecosystem Configuration for Epstein Archive
 *
 * PORT ASSIGNMENTS (MUST MATCH NGINX):
 * - glasscode.academy/api/* → 8080 (this app)
 * - glasscode.academy/* → 3000 (Next.js frontend, separate PM2 process)
 * - epstein.academy/* → 3012 (legacy, routed via Nginx)
 *
 * CRITICAL: Do not change PORT without updating Nginx config!
 *
 * DEPLOYMENT SAFETY:
 * - This config includes safeguards against database corruption and crashes
 * - The health endpoint at /api/health/deep provides comprehensive verification
 * - PM2 will auto-restart on crash but with backoff to prevent thrashing
 */
module.exports = {
  apps: [
    {
      name: 'epstein-archive',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',

      // === RELIABILITY & CRASH RECOVERY ===
      autorestart: true,
      watch: false,
      max_memory_restart: '1500M', // Restart if memory exceeds 1.5GB
      kill_timeout: 10000, // 10s for graceful shutdown (ensure DB closes cleanly)

      // === CRASH LOOP PREVENTION ===
      // These settings prevent PM2 from hammering a broken app
      min_uptime: '30s', // Must run 30s before considered "started" successfully
      max_restarts: 5, // Max 5 restarts within window before giving up
      restart_delay: 10000, // 10s between restart attempts
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms

      // === HEALTH CHECK MONITORING ===
      // PM2 built-in health monitoring (if pm2-health is installed)
      // Run: pm2 install pm2-health
      // health_check: {
      //   type: 'http',
      //   livenessProbe: 'http://localhost:3012/api/health',
      //   readinessProbe: 'http://localhost:3012/api/health/ready',
      // },

      // === LOGGING ===
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json', // Structured logging for easier parsing

      // === GRACEFUL SHUTDOWN ===
      // Handle SIGINT and SIGTERM for clean database closure
      shutdown_with_message: true,
      listen_timeout: 8000, // Wait 8s for server to be ready
      wait_ready: true, // Wait for 'ready' event from application (if implemented)

      // === ENVIRONMENT ===
      // Secrets (JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL) MUST be in the remote .env file.
      // Never hardcode secrets in this file — it is tracked in Git.
      env: {
        NODE_ENV: 'production',
        PORT: 3012,
        RAW_CORPUS_BASE_PATH: './data',
        CORS_ORIGIN:
          'https://epstein.academy,https://www.epstein.academy,https://glasscode.academy,https://www.glasscode.academy',
        EXO_MODEL: 'mlx-community/Qwen3-30B-A3B-4bit',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3012,
        RAW_CORPUS_BASE_PATH: './data',
        CORS_ORIGIN:
          'https://epstein.academy,https://www.epstein.academy,https://glasscode.academy,https://www.glasscode.academy',
        EXO_MODEL: 'mlx-community/Qwen3-30B-A3B-4bit',
      },
    },
    {
      name: 'ingest-intelligence',
      script: 'npm',
      args: 'run ingest:intelligence',
      instances: 1,
      exec_mode: 'fork',
      autorestart: false, // Don't auto-restart if it exits (it finishes when done)
      watch: false,
      max_memory_restart: '2G',
      env: {
        NODE_ENV: 'production',
        EXO_MODEL: 'mlx-community/Qwen3-30B-A3B-4bit',
      },
    },
  ],

  // === DEPLOYMENT CONFIGURATION ===
  // These settings are used by `pm2 deploy` if configured
  deploy: {
    production: {
      // Deploy settings (fill in if using pm2 deploy)
      // user: 'deploy',
      // host: 'your-server',
      // ref: 'origin/main',
      // repo: 'git@github.com:your/repo.git',
      // path: '/home/deploy/epstein-archive',
      // 'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.cjs --env production',
    },
  },
};
