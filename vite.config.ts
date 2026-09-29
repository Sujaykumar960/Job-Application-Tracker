import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  if (command === 'build' && mode === 'production') {
    const env = loadEnv(mode, process.cwd(), '');
    const apiUrl = (env.VITE_API_BASE_URL || '').trim();
    if (!apiUrl) {
      throw new Error(
        '[CareerX build guard] VITE_API_BASE_URL is required for production builds. ' +
          'Set it in your deployment environment (e.g. https://your-backend.onrender.com/api) and rebuild.'
      );
    }
    if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
      throw new Error(
        `[CareerX build guard] VITE_API_BASE_URL must point at the API root (end with /api); got "${apiUrl}". ` +
          'Example: https://your-backend.onrender.com/api'
      );
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      // Raise the warning limit — individual page chunks are fine at 500 kB+
      // because they only load on demand (lazy import)
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // React core
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router-dom/') ||
                id.includes('node_modules/react-router/') ||
                id.includes('node_modules/scheduler/')) {
              return 'react-vendor';
            }
            // Charts
            if (id.includes('node_modules/recharts') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory-')) {
              return 'charts';
            }
            // Monaco / CodeMirror (code editor)
            if (id.includes('node_modules/monaco-editor') ||
                id.includes('node_modules/@monaco-editor') ||
                id.includes('node_modules/codemirror')) {
              return 'editor';
            }
            // Icons
            if (id.includes('node_modules/lucide-react') ||
                id.includes('node_modules/@heroicons') ||
                id.includes('node_modules/react-icons')) {
              return 'icons';
            }
            // Animation
            if (id.includes('node_modules/framer-motion')) {
              return 'animation';
            }
            // Date utilities
            if (id.includes('node_modules/date-fns') ||
                id.includes('node_modules/dayjs') ||
                id.includes('node_modules/moment')) {
              return 'date-utils';
            }
            // Everything else in node_modules → a single vendor chunk
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});

