import { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/AppError';

/**
 * Middleware para obligar al cambio de contraseña.
 * Bloquea el acceso a cualquier ruta si el token es 'partial',
 * permitiendo únicamente la ruta de cambio de contraseña.
 */
export const enforceFullAuth = (req: Request, res: Response, next: NextFunction) => {
  // Hacemos el cast a 'any' para evitar el error de tipos de TS
  const user = (req as any).user;

  // Si el token tiene el flag 'partial' (primer login)
  if (user?.partial) {
    // Definimos las rutas permitidas (el endpoint de cambio de pass)
    // Usamos .includes o .endsWith para ser flexibles con la estructura de la URL
    const isChangePassRoute = req.path.endsWith('/user/chgpass') || req.path.includes('/chgpass');

    if (!isChangePassRoute) {
      return next(
        new AppError(
          'Acceso restringido: Debes completar el cambio de contraseña inicial para continuar.',
          403
        )
      );
    }
  }

  next();
};
