import { Request, Response, NextFunction } from 'express';

import { verifyToken } from '../../utils/jwt';
import logger from '../../utils/logger';

/**
 * Middleware de autenticación JWT
 * - Busca el token en la cookie 'access_token' (nuevo sistema)
 * - Verifica el token y adjunta el usuario en req.user
 */
export const jwtAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Buscamos en la nueva cookie
  const token = req.cookies.access_token;

  if (!token) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        ip: req.ip,
      },
      'Acceso sin token'
    );

    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Se requiere autenticación (token no presente)',
    });
  }

  const user = verifyToken(token);

  if (!user) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
      },
      'Token inválido o expirado'
    );

    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Token inválido o expirado',
    });
  }

  // ASIGNACIÓN LIMPIA: TS ya sabe que req.user existe por express.d.ts
  req.user = user as typeof req.user;

  // Validación de Primer Login (Flag Partial)
  if (user.partial) {
    // Solo permitimos la ruta específica de cambio de contraseña
    const isChangePasswordPath = req.path.includes('change-password-first');

    if (!isChangePasswordPath) {
      logger.warn({ userId: user.id }, 'Intento de acceso con token parcial');
      return res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: 'Acceso restringido: Debes completar el cambio de contraseña obligatorio.',
      });
    }
  }

  logger.debug(
    {
      userId: user.id,
      username: user.username,
      level: user.level,
      path: req.path,
    },
    `Autenticación exitosa`
  );

  next();
};

/**
 * Middleware de autenticación JWT OPCIONAL
 * - Si hay token, valida y pone al usuario en req.user.
 * - Si NO hay token o es inválido, deja pasar la petición (req.user será null).
 */
export const optionalJwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.access_token;
  if (!token) {
    req.user = undefined; // En lugar de null, para coincidir con el "?" de la interfaz
    return next();
  }
  const user = verifyToken(token);
  req.user = user ? (user as typeof req.user) : undefined;
  next();
};
