import jwt from 'jsonwebtoken';

import { config } from '../config/index.ts';

import logger from './logger.ts';

export interface UserTokenPayload {
  id: string;
  username: string;
  email: string;
  fullname: string;
  level: number;
  active: number;
  iat?: number;
  exp?: number;
}

/**
 * Limpia el payload para que solo contenga valores serializables por JWT
 */
function cleanPayload(payload: Partial<UserTokenPayload>): UserTokenPayload {
  return {
    id: payload.id || '',
    username: payload.username || '',
    email: payload.email || '',
    fullname: payload.fullname || '',
    level: Number(payload.level) || 0,
    active: Number(payload.active) || 0,
  };
}

/**
 * Genera el access token (corto)
 */
export function generateAccessToken(rawPayload: Partial<UserTokenPayload>): string {
  try {
    const payload = cleanPayload(rawPayload);
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry || '15m',
      algorithm: 'HS256',
    });
  } catch (error) {
    logger.error('Error generando access token', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw new Error('No se pudo generar el access token');
  }
}

/**
 * Genera el refresh token (largo)
 */
export function generateRefreshToken(rawPayload: Partial<UserTokenPayload>): string {
  try {
    const payload = cleanPayload(rawPayload);
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpiry || '7d',
      algorithm: 'HS256',
    });
  } catch (error) {
    logger.error('Error generando refresh token', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw new Error('No se pudo generar el refresh token');
  }
}

/**
 * Verifica cualquier token
 */
export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as UserTokenPayload;
  } catch (error: any) {
    logger.debug('Token inválido', { name: error.name, message: error.message });
    return null;
  }
}
