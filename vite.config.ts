/// <reference types="vitest" />
import path from 'path';
// Restart trigger
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { localApiPlugin } from './local-api-plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Ensure environment variables are available to Node.js process (for api/sync.ts)
  Object.assign(process.env, env);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), localApiPlugin()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'clover', 'json'],
        reportsDirectory: './coverage',
        // Report only in Phase 0 — thresholds land in Phase 3
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/*.integration.test.{ts,tsx}',
          'src/setupTests.ts',
          'src/types/**',
        ],
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
              'monaco-vendor': ['@monaco-editor/react'],
              'markdown-vendor': ['react-markdown', 'react-syntax-highlighter'],
              'recharts-vendor': ['recharts'],
              'mermaid-vendor': ['mermaid'],
              'tldraw-vendor': ['tldraw'],
              'ai-vendor': ['@google/genai'],
              'pdf-vendor': ['pdfjs-dist'],
            },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
  };
});
