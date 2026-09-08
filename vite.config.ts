import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import translateHandler from './api/translate.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-translate-dev-server',
      configureServer(server) {
        server.middlewares.use('/api/translate', async (req: any, res: any) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                req.body = JSON.parse(body || '{}');
                res.status = (code: number) => {
                  res.statusCode = code;
                  return res;
                };
                res.json = (data: any) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return res;
                };
                await translateHandler(req, res);
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message || 'Error' }));
              }
            });
          } else if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
          } else {
            res.statusCode = 405;
            res.end();
          }
        });
      },
    },
  ],
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
