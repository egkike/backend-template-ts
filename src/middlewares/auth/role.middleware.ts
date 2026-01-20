// Este middleware de roles permite que ciertas rutas o acciones solo sean accesibles para usuarios
// con un nivel específico (por ejemplo, solo level >= 5 puede crear/eliminar usuarios,
// o level >= 10 para acciones administrativas).

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError';
import logger from '../../utils/logger';

/**
 * Middleware para validar nivel de usuario (roles/permisos)
 * Ej: restrictTo(5) permite solo level >= 5
 */
export const restrictTo = (requiredLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).user) {
      return next(new AppError('No autorizado - usuario no encontrado', 401));
    }

    if ((req as any).user.level < requiredLevel) {
      logger.warn({
        userId: (req as any).user.id,
        userLevel: (req as any).user.level,
        requiredLevel,
        path: req.path,
      }, 'Acceso denegado por nivel insuficiente');
      return next(new AppError('No tienes permisos suficientes para esta acción', 403));
    }

    next();
  };
};
