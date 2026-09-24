import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers via Helmet (configured to allow CDNs & fonts)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: env.FRONTEND_URL === '*' ? true : env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Rate Limiting on API endpoints
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de requêtes effectuées depuis cette adresse IP, veuillez réessayer plus tard.',
    },
  });
  app.use('/api', limiter);

  // 4. Request Parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // 5. Mount API Routes
  app.use('/api', apiRoutes);

  // 6. Serve static frontend files (Index.html, styles.css, app.js)
  app.use(express.static(rootDir));

  // Serve Index.html on root path
  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(rootDir, 'Index.html'));
  });

  // 7. 404 Handler for Unknown Routes
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: `La route ${req.method} ${req.originalUrl} n'existe pas sur ce serveur`,
    });
  });

  // 8. Global Error Handler
  app.use(errorHandler);

  return app;
};
