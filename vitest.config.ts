/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/test/**/*.test.{ts,tsx}',
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/query-count.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@client': path.resolve(import.meta.dirname, './src/client'),
      '@server': path.resolve(import.meta.dirname, './src/server'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@epstein/db': path.resolve(import.meta.dirname, './packages/db/src/index.ts'),
    },
  },
});
