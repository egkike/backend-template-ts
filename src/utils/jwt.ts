import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

import { config } from '../config/index';

import logger from './logger';

export interface UserTokenPayload {
  id: string;
  username: string;
  email?: string;
  fullname?: string;
  level?: number;
  active?: number;
  partial?: boolean; // Para restringir acceso en primer login
  iat?: number;
  exp?: number;
}

export function generateAccessToken(payload: UserTokenPayload): string {
  try {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: (config.jwt.accessTokenExpiry as StringValue) || '15m',
      algorithm: 'HS256',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error generando access token');
    throw new Error('No se pudo generar el access token');
  }
}

export function generateRefreshToken(payload: UserTokenPayload): string {
  try {
    // CORRECCIÓN: Ahora usa refreshTokenExpiry (7d)
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: (config.jwt.refreshTokenExpiry as StringValue) || '7d',
      algorithm: 'HS256',
    });
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Error generando refresh token');
    throw new Error('No se pudo generar el refresh token');
  }
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as UserTokenPayload;
  } catch (error: any) {
    logger.debug({ name: error.name, message: error.message }, 'Token inválido');
    return null;
  }
}

/**
 * Verifica un token y devuelve su contenido.
 */
export function verifyRefreshToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as UserTokenPayload; // 👈 Llave B
  } catch (error: any) {
    logger.debug({ name: error.name, message: error.message }, 'Token refresh inválido');
    return null;
  }
}

/**
 * Limpia el payload para generar un nuevo token
 * Evita errores de JWT al intentar firmar un objeto que ya tiene iat/exp
 */
export function cleanPayload(payload: UserTokenPayload): UserTokenPayload {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { iat: _iat, exp: _exp, ...clean } = payload;
  return clean as UserTokenPayload;
}
