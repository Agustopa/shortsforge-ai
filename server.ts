import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './server/routes/api';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // CORS & Preflight middleware for iframe and browser communication
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Body parsing middleware
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Ensure public generated, uploads, and audio directories exist
  const publicDir = path.join(process.cwd(), 'public');
  const generatedDir = path.join(publicDir, 'generated');
  const uploadsDir = path.join(publicDir, 'uploads');
  const audioDir = path.join(publicDir, 'audio');
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  // Serve static assets directly
  app.use('/generated', express.static(generatedDir));
  app.use('/uploads', express.static(uploadsDir));
  app.use('/audio', express.static(audioDir));
  app.use(express.static(publicDir));

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

  // 404 handler for API routes (prevents falling back to HTML SPA)
  app.use('/api', (req, res) => {
    res.status(404).json({
      success: false,
      error: `API route ${req.method} ${req.originalUrl} not found`
    });
  });

  // API Error handler for errors inside routes or multer
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api')) {
      console.error('[API Error Handler]', err);
      return res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Server error occurred during request'
      });
    }
    next(err);
  });

  // Vite middleware for development vs static serving for production
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Guard against Vite falling back to index.html on any /api calls
    app.use((req, res, next) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: `API endpoint ${req.method} ${req.originalUrl} not found`
        });
      }
      next();
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.originalUrl && req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ success: false, error: 'API route not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>ShortsForge AI</title></head><body><div id="root">ShortsForge AI Server Ready</div></body></html>');
      }
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
