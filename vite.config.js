import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    open: '/react.html',
  },
  preview: {
    host: '127.0.0.1',
    open: '/react.html',
  },
  build: {
    rollupOptions: {
      input: {
        react: resolve(process.cwd(), 'react.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
