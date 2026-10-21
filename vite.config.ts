/// <reference types="vitest" />

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { schoolApiPlugin } from './server/vite-plugin.mjs';

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '**/.git/**', '**/.school-data/**', '**/server/**'] },
  },
  preview: { host: '127.0.0.1', port: 3000, strictPort: true },
  plugins: [react(), schoolApiPlugin({ ...loadEnv(mode, process.cwd(), ''), ...process.env })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'server/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
}));
