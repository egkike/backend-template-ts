import { z } from 'zod';
import dotenv from 'dotenv';

import logger from '../utils/logger';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SECRET_JWT_KEY: z.string().min(32),
  SECRET_REFRESH_JWT_KEY: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('10m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SCHEMA: z.string().default('public'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  API_BASE_URL: z.string().optional(),
  APP_URL: z.string().default('http://localhost:5173'),
  RECAPTCHA_SECRET_KEY: z.string().optional().default(''),
  SMTP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('"App" <noreply@app.com>'),
});

const isTest = process.env.NODE_ENV === 'test';

// --- TRUCO PARA TESTS ---
// Si estamos en test, creamos un objeto con valores mínimos para que Zod no explote.
// Si no, usamos el process.env real.
const rawData = isTest
  ? {
      ...process.env,
      SECRET_JWT_KEY: process.env.SECRET_JWT_KEY || 'a-dummy-secret-at-least-32-chars-long!!',
      DB_USER: process.env.DB_USER || 'test_user',
      DB_PASSWORD: process.env.DB_PASSWORD || 'test_pass',
      DB_NAME: process.env.DB_NAME || 'test_db',
    }
  : process.env;

const parsedEnv = envSchema.safeParse(rawData);

if (!parsedEnv.success && !isTest) {
  console.error(
    '❌ Error en las variables de entorno:',
    JSON.stringify(parsedEnv.error.format(), null, 2)
  );
  process.exit(1);
}

// Usamos los datos validados o el rawData si falló en test
const env = parsedEnv.success ? parsedEnv.data : (rawData as any);

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  jwt: {
    secret: env.SECRET_JWT_KEY,
    refreshSecret: env.SECRET_REFRESH_JWT_KEY,
    accessTokenExpiry: env.JWT_ACCESS_EXPIRY,
    refreshTokenExpiry: env.JWT_REFRESH_EXPIRY,
    accessTokenMaxAge: 15 * 60 * 1000, // 15 min
    refreshTokenMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
  },
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    schema: env.DB_SCHEMA || 'public', // Valor seguro para evitar errores en repositorios
  },
  cors: {
    origins: String(env.CORS_ORIGINS || '')
      .split(',')
      .map((o: string) => o.trim().replace(/\/$/, '')),
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  },
  apiBaseUrl: (env.API_BASE_URL || `http://localhost:${env.PORT}`).trim().replace(/\/$/, ''),
  frontendUrl: (env.APP_URL || '').trim().replace(/\/$/, ''),
  recaptchaSecretKey: env.RECAPTCHA_SECRET_KEY,
  passwordPepper: process.env.PASSWORD_PEPPER || 'dev_pepper_fallback_local',
} as const;

if (config.nodeEnv === 'development') {
  logger.info(
    {
      port: config.port,
      apiBaseUrl: config.apiBaseUrl,
      frontendUrl: config.frontendUrl,
    },
    '🔧 Configuración cargada correctamente'
  );
}
