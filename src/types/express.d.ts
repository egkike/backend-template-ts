// Este archivo permite que TypeScript "entienda" que puedes agregar propiedades personalizadas a req
// (como req.user después de validar el JWT).
// Después de crear este archivo, TypeScript ya no se quejará cuando escribas req.user?.id en tus middlewares o controladores.

import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        fullname?: string;
        level: number;
        active: number;
        affiliate_slug?: string;
        iat?: number;
      } & Partial<JwtPayload> | undefined;
      rateLimit?: {
        key: string;
        limit: number;
        current: number;
        remaining: number;
        resetTime: Date;
      };
    }
  }
}

export {};
