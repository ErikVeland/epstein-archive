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
  resolve: {
    alias: {
      '@client': path.resolve(__dirname, 'src/client'),
      '@design-system': path.resolve(__dirname, 'src/client/design-system'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __BUILD_DATE__: JSON.stringify(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ),
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Keep truly massive/isolated libraries separate
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';

            // Everything else in node_modules goes to vendor
            // This ensures React and its core ecosystem stay together
            return 'vendor';
          }

          // Feature-based grouping for our own source code.
          // Use lowercased id to match consistently on case-sensitive Linux filesystems.
          const normalizedId = id.toLowerCase();
          if (normalizedId.includes('src/client/components/investigation')) {
            return 'feature-investigation';
          }
          if (
            normalizedId.includes('src/client/components/media') ||
            normalizedId.includes('src/client/components/photo')
          ) {
            return 'feature-media';
          }
          if (normalizedId.includes('src/client/components/email')) {
            return 'feature-email';
          }
          if (normalizedId.includes('src/client/components/document')) {
            return 'feature-documents';
          }
          if (normalizedId.includes('src/client/components/networkvisualization')) {
            return 'feature-network';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
  },
  server: {
    port: 3002,
    open: true,
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
