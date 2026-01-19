import { Request, Response, NextFunction } from 'express';

import { verifyToken } from '../../utils/jwt.ts';
import logger from '../../utils/logger.ts';

/**
 * Middleware de autenticación JWT
 * - Busca el token en la cookie 'access_token' (nuevo sistema)
 * - Verifica el token y adjunta el usuario en req.user
 */
export const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Buscamos en la nueva cookie
  const token = req.cookies.access_token;

  if (!token) {
    logger.warn({
      path: req.path,
      method: req.method,
      ip: req.ip,
    }, 'Acceso sin token');

    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Se requiere autenticación (token no presente)',
    });
  }

  const user = verifyToken(token);

  if (!user) {
    logger.warn({
      path: req.path,
      method: req.method,
    }, 'Token inválido o expirado');

    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Token inválido o expirado',
    });
  }

  (req as any).user = user;

  logger.debug({
    userId: user.id,
    username: user.username,
    level: user.level,
    path: req.path,
  }, `Autenticación exitosa`);

  next();
};
