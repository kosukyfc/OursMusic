import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    hmr: { port: 5173 },
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      // Em dev: /api → backend local sem o prefixo /api
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        ws: true, // WebSocket (Socket.io)
      },
    },
  },
});
