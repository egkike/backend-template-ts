// Este archivo permite que TypeScript "entienda" que puedes agregar propiedades personalizadas a req 
// (como req.user después de validar el JWT).
// Después de crear este archivo, TypeScript ya no se quejará cuando escribas req.user?.id en tus middlewares o controladores.

import { JwtPayload } from 'jsonwebtoken';

// Extendemos el tipo Request de Express
declare module 'express-serve-static-core' {
  interface Request {
    // Usuario autenticado (después de verificar el JWT)
    user?: {
      id: string;
      username: string;
      email: string;
      fullname: string;
      level: number;
      active: number;
    } & JwtPayload;

    // Si en algún momento decides mantener algo de "session" (aunque recomendamos solo JWT)
    session?: {
      tokenData?: any;
      error?: string;
    };
  }
}
