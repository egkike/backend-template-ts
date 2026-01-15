import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import swaggerSpecs from './swagger.ts';
import { loginLimiter, refreshLimiter, apiLimiter } from './middlewares/rateLimit.ts';
import { AppError } from './errors/AppError.ts';
import { config } from './config/index.ts';
import logger from './utils/logger.ts';
// Importamos las rutas
import authRoutes from './routes/auth.routes.ts';
import userRoutes from './routes/user.routes.ts';

const app = express();

// Helmet: añade headers de seguridad recomendados
app.use(
  helmet({
    // CSP ajustado - permite recursos locales + algunos externos comunes
    contentSecurityPolicy: {
      useDefaults: true, // mantiene los valores por defecto seguros
      directives: {
        defaultSrc: ["'self'"], // solo recursos de tu dominio
        //scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'], // sin unsafe-inline/eval
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'], // permite scripts inline, eval (si usas React/Vue), y CDN ejemplo
        //styleSrc: ["'self'"], // sin unsafe-inline
        styleSrc: ["'self'", "'unsafe-inline'"], // permite estilos inline (necesario para muchos frameworks)
        imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://via.placeholder.com'], // imágenes locales, data URLs, y ejemplos
        connectSrc: ["'self'", 'https://api.tu-dominio.com', 'wss://tu-dominio.com'], // Si conectas a otra API externa o WebSockets
        fontSrc: ["'self'", 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'], // fuentes de Google Fonts
        objectSrc: ["'none'"], // bloquea objetos (muy seguro)
        frameAncestors: ["'self'"], // evita clickjacking
        formAction: ["'self'"], // formularios solo a tu dominio
        upgradeInsecureRequests: [], // fuerza HTTPS
      },
    },

    // Otros headers de Helmet (mantén o ajusta según necesites)
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts:
      config.nodeEnv === 'production'
        ? {
            maxAge: 31536000, // 1 año
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

// Middlewares globales
app.use(express.json());
app.use(cookieParser());

// CORS usando configuración validada
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting específico por ruta
app.use('/api/login', loginLimiter); // Protege login
app.use('/api/refresh', refreshLimiter); // Protege refresh
// Rate limiting general para rutas protegidas (opcional)
app.use('/api', apiLimiter); // Aplica a todo /api después de login/refresh

// Rutas públicas (login, logout - sin autenticación)
app.use('/api', authRoutes);

// Rutas protegidas (todas las operaciones de usuarios - con jwt middleware dentro del router)
app.use('/api', userRoutes);

// Ruta de health check (útil para monitoreo y pruebas rápidas)
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

// Swagger UI - Documentación interactiva
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 404 - Ruta no encontrada (lanzamos AppError para que pase al handler global)
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new AppError('Ruta no encontrada', 404));
});

// Error handler global profesional
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Si es un error controlado (AppError)
  if (err instanceof AppError) {
    logger.warn('Error controlado manejado', {
      status: err.statusCode,
      message: err.message,
      path: req.path,
      method: req.method,
    });

    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Errores inesperados (cualquier cosa que no sea AppError)
  const statusCode = err.status || 500;
  const message = err.message || 'Error interno del servidor';

  logger.error('Error inesperado en el servidor', {
    error: err.message || err.toString(),
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Respuesta segura (más detalles solo en desarrollo)
  const response = {
    success: false,
    error: message,
  };

  if (config.nodeEnv === 'development') {
    Object.assign(response, {
      stack: err.stack,
      details: err.details || null,
    });
  }

  res.status(statusCode).json(response);
});

// Iniciar servidor
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`🚀 Servidor escuchando en http://localhost:${PORT}`);
  logger.info(`Entorno: ${config.nodeEnv}`);
  logger.info(`CORS permitidos: ${config.cors.origins.join(', ')}`);
});

export { app };
