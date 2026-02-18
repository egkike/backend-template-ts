import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';

import swaggerSpecs from './swagger';
import { loginLimiter, refreshLimiter, apiLimiter } from './middlewares/rateLimit';
import { AppError } from './errors/AppError';
import { config } from './config/index';
import logger from './utils/logger';
import { AuthCleanupService } from './services/auth.cleanup.service';
// Importamos las rutas
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

const app = express();

// --- CONFIGURACIÓN DE PROXY Y PARSERS ---
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- HELMET & SECURITY (Completo como lo tenías) ---
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://*.mercadopago.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://via.placeholder.com'],
        connectSrc: ["'self'", 'https://*.mercadopago.com'],
        fontSrc: [
          "'self'",
          'data:',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'https://*.mercadopago.com',
        ],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts:
      config.nodeEnv === 'production'
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
  })
);

// --- CORS ---
app.use(
  cors({
    origin: config.cors?.origins || true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- RUTAS DE SALUD ---
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    environment: config.nodeEnv,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Ruta raíz simple para confirmar que el servidor está vivo
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Backend Template TS - Todo listo 🚀' });
});

// --- RATE LIMITING (Solo fuera de tests para evitar inesperados) ---
if (config.nodeEnv !== 'test') {
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/refresh', refreshLimiter);
  app.use('/api', apiLimiter);
}

// --- DEFINICIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);

// --- SWAGGER DOCS ---
if (config.nodeEnv !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
}

// --- ERROR HANDLING ---
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError('Ruta no encontrada', 404));
});

// Error handler global profesional
app.use((err: any, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(
      { status: err.statusCode, message: err.message, path: req.path },
      'Error controlado'
    );
    return res.status(err.statusCode).json({ success: false, error: err.message });
  }

  const statusCode = err.status || 500;
  logger.error({ error: err.message, stack: err.stack, path: req.path }, 'Error inesperado');

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
});

// --- PROCESOS DE ARRANQUE Y CRONS (Excluidos en Test) ---
if (config.nodeEnv !== 'test') {
  // CRON: Limpieza de Tokens expirados
  cron.schedule('0 3 * * *', async () => {
    await AuthCleanupService.cleanExpiredTokens();
  });
}

// --- START SERVER ---
let server: any;
if (config.nodeEnv !== 'test') {
  server = app.listen(config.port, () => {
    logger.info(`🚀 Servidor en puerto ${config.port} (${config.nodeEnv})`);
  });
}

process.on('SIGTERM', () => {
  if (server) {
    server.close(() => {
      logger.info('Servidor HTTP cerrado.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

export { app };
