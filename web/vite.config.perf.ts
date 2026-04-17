import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-compression-plugin';

export default defineConfig({
  plugins: [
    react(),
    // Bundle size visualization
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
    // Gzip compression
    compression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli compression
    compression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotli',
      ext: '.br',
    }),
  ],
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['zustand', 'react-hook-form', 'zod'],
          'player': ['/src/components/Player'],
          'playlist': ['/src/components/Playlist'],
        },
      },
    },
    // Optimize bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    // Report compressed size
    reportCompressedSize: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 200,
  },
  // Analyze dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'zustand',
      'react-hook-form',
      'zod',
      'socket.io-client',
    ],
  },
});
