import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const apiBaseUrl = process.env.VITE_API_URL || 'http://localhost:3012/api';
const apiProxyTarget = apiBaseUrl.replace(/\/api\/?$/, '');

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ),
  },
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, 'src/client'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@root': path.resolve(__dirname, '.'),
    },
    dedupe: ['react', 'react-dom'],
  },
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // manualChunks removed to fix initialization order issues
        /*
        manualChunks(id) {
          ...
        }
        */
      },
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
  },
  server: {
    port: 3002,
    open: true,
    watch: {
      // Prevent ENOSPC crashes on large local datasets / checkpoints.
      ignored: [
        '**/pipeline_checkpoints/**',
        '**/pipeline_runs/**',
        '**/data/**',
        '**/.pnpm-store/**',
      ],
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
