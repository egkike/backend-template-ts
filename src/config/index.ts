import { z } from 'zod';
import dotenv from 'dotenv';

import logger from '../utils/logger.ts';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  SECRET_JWT_KEY: z.string().min(32, 'JWT secret debe tener al menos 32 caracteres'),
  TOKEN_TIME: z.string().default('15m'), // access token
  REFRESH_TOKEN_TIME: z.string().default('7d'), // refresh token

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SCHEMA: z.string().default('public'),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
});

const env = envSchema.parse({
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  SECRET_JWT_KEY: process.env.SECRET_JWT_KEY,
  TOKEN_TIME: process.env.TOKEN_TIME,
  REFRESH_TOKEN_TIME: process.env.REFRESH_TOKEN_TIME,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_SCHEMA: process.env.DB_SCHEMA,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
});

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',

  jwt: {
    secret: env.SECRET_JWT_KEY,
    accessTokenExpiry: env.TOKEN_TIME,
    refreshTokenExpiry: env.REFRESH_TOKEN_TIME,
  },

  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    schema: env.DB_SCHEMA,
  },

  cors: {
    origins: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  },
} as const;

if (config.nodeEnv === 'development') {
  logger.info('🔧 Configuración cargada (development):', {
    port: config.port,
    dbHost: config.db.host,
    jwtAccessExpiry: config.jwt.accessTokenExpiry,
    jwtRefreshExpiry: config.jwt.refreshTokenExpiry,
  });
}
