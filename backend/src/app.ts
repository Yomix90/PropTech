import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(helmet());

  // 2. Cross-Origin Resource Sharing (CORS)
  app.use(
    cors({
      origin: env.FRONTEND_URL === '*' ? true : env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // 3. Rate Limiting
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

  // 6. Root status endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Spotwork Coworking API',
      version: '1.0.0',
      description: 'API REST pour plateforme de gestion d’espaces de coworking avec IA',
      documentation: '/api/health',
    });
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
