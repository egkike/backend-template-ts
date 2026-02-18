// Este middleware de roles permite que ciertas rutas o acciones solo sean accesibles para usuarios
// con un nivel específico (por ejemplo, solo level STAFF puede crear/eliminar usuarios,
// o level ADMIN para acciones administrativas).

import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError';
import { configRepository } from '../../repositories/config.repository';
import logger from '../../utils/logger';

// 1. Definimos los nombres de roles válidos según tu tabla system_settings
export type UserRole = 'GUEST' | 'USER' | 'STAFF' | 'ADMIN';

/**
 * Middleware para validar nivel de usuario de forma dinámica
 */
export const restrictTo = (roleName: UserRole) => {
  // Retornamos una función async porque necesitamos esperar a la DB/Caché
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user) {
        return next(new AppError('No autorizado - usuario no encontrado', 401));
      }

      // 2. Obtenemos el mapa de niveles desde el repositorio (que ya tiene caché)
      const levels = await configRepository.getUserLevels();

      // 3. Buscamos el valor numérico para el rol solicitado
      const requiredLevel = levels[roleName];

      if (user.level < requiredLevel) {
        logger.warn(
          {
            userId: user.id,
            userLevel: user.level,
            requiredRole: roleName,
            requiredLevel,
            path: req.path,
          },
          'Acceso denegado por nivel insuficiente'
        );
        return next(new AppError(`Acceso denegado. Se requiere nivel ${roleName}`, 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
