import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRouter from './server/routes/api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Ensure public generated and uploads directories exist
  const publicDir = path.join(process.cwd(), 'public');
  const generatedDir = path.join(publicDir, 'generated');
  const uploadsDir = path.join(publicDir, 'uploads');
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Serve static generated assets and uploads directly
  app.use('/generated', express.static(generatedDir));
  app.use('/uploads', express.static(uploadsDir));

  // Mount API routes
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter); // Alias for compatibility

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ShortsForge AI Server',
      timestamp: new Date().toISOString()
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ShortsForge AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
