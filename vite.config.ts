import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/gdrive-pdf': {
        target: 'https://drive.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gdrive-pdf/, ''),
      },
      '/gdrive-user-content': {
        target: 'https://drive.usercontent.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gdrive-user-content/, ''),
      },
    },
  },
});
