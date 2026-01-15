// Este middleware de roles permite que ciertas rutas o acciones solo sean accesibles para usuarios
// con un nivel específico (por ejemplo, solo level >= 5 puede crear/eliminar usuarios,
// o level >= 10 para acciones administrativas).

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError.ts';
import logger from '../../utils/logger.ts';

/**
 * Middleware para validar nivel de usuario (roles/permisos)
 * Ej: restrictTo(5) permite solo level >= 5
 */
export const restrictTo = (requiredLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('No autorizado - usuario no encontrado', 401));
    }

    if (req.user.level < requiredLevel) {
      logger.warn('Acceso denegado por nivel insuficiente', {
        userId: req.user.id,
        userLevel: req.user.level,
        requiredLevel,
        path: req.path,
      });
      return next(new AppError('No tienes permisos suficientes para esta acción', 403));
    }

    next();
  };
};
