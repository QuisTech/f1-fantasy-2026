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
        exec('node scripts/autoSync.cjs', (error, stdout, stderr) => {
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
      } else if (req.url === '/api/build-history' && req.method === 'POST') {
        exec('node scripts/buildHistoricalRounds.cjs', (error, stdout, stderr) => {
          if (error) {
            console.error('Error running buildHistoricalRounds:', stderr);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: stderr }));
            return;
          }
          console.log('Build Historical Rounds Output:', stdout);
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
