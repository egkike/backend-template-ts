// Rate Limiting avanzado, sirve para proteger tu API contra ataques de fuerza bruta,
// spam y sobrecarga (especialmente en rutas sensibles como /login y /refresh).
import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';

import logger from '../utils/logger';

// Limite para login (anti-brute force)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos
  message: {
    success: false,
    error:
      'Has alcanzado el límite de intentos de inicio de sesión. Espera un momento y vuelve a intentarlo.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    // Evita crash si req.user es undefined
    const user = (req as any).user;
    return user?.id || ipKeyGenerator(req as any);
  },
  handler: (req, res, next, options) => {
    logger.warn({ key: (req as any).rateLimit?.key, ip: req.ip }, 'Límite de login alcanzado');
    res.status(options.statusCode || 429).json(options.message);
  },
});

// Limite para refresh token (anti-abuso)
export const refreshLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutos
  max: 10, // máximo 10 refreshes
  message: {
    success: false,
    error:
      'Has alcanzado el límite de refrescos de sesión. Espera un momento y vuelve a intentarlo.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => {
    // Evita crash si req.user es undefined
    const user = (req as any).user;
    return user?.id || ipKeyGenerator(req as any);
  },
  handler: (req, res, next, options) => {
    logger.warn({ key: (req as any).rateLimit?.key, ip: req.ip }, 'Límite de refresh alcanzado');
    res.status(options.statusCode || 429).json(options.message);
  },
});

// Limite general para rutas protegidas (más permisivo)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 peticiones
  message: {
    success: false,
    error: 'Demasiadas peticiones. Intenta de nuevo en 1 minuto.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
