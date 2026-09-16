import { exec } from 'child_process';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

const harImporterPlugin = () => ({
  name: 'har-importer',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      if (req.url === '/api/import-har' && req.method === 'POST') {
        exec('npm run update-data', (error, stdout, stderr) => {
          if (error) {
            console.error('Error running update-data:', stderr);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: stderr }));
            return;
          }
          console.log('Update Data Output:', stdout);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, output: stdout }));
        });
      } else {
        next();
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), harImporterPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3005,
    host: true,
  },
});
