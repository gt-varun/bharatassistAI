import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Locale JSON is loaded eagerly (the completeness check needs every
          // language in memory at init), but it doesn't need to share a chunk
          // with app code — each locale gets its own chunk so the browser can
          // cache them independently of everything else.
          const localeMatch = id.match(/\/i18n\/locales\/([a-z]{2})\.json$/);
          if (localeMatch) return `locale-${localeMatch[1]}`;

          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react-router-dom') || id.includes('/react/') || id.includes('/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('i18next')) return 'vendor-i18n';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          return 'vendor';
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
});
