import { vi } from 'vitest';
vi.mock('../config/index', () => ({
  config: {
    jwt: {
      secret: 'test-secret-super-largo-para-tests',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    db: {
      host: 'localhost',
      port: 5433,
      user: 'test-user',
      password: 'test-pass',
      database: 'test-db',
      schema: 'public',
    },
    cors: {
      origins: ['http://localhost:5173'],
    },
    nodeEnv: 'test',
    port: 3000,
  },
}));
vi.mock('../repositories/user.repository.ts', () => ({
  default: {
    login: vi.fn(async ({ username, password }) => {
      if (username === 'admin' && password === 'Admin1') {
        return {
          id: 'admin-id-mock',
          username: 'admin',
          email: 'admin@midominio.com',
          fullname: 'Usuario Administrador',
          level: 5,
          active: 1,
          must_change_password: false,
        };
      }
      return { error: 'Credenciales inválidas' };
    }),
    saveRefreshToken: vi.fn(async () => ({ success: true })),
    validateRefreshToken: vi.fn(async _ => {
      if (isTokenRevoked) {
        return null; // ¡Fix clave! Devuelve null para simular token inválido y forzar 401 en tu app code
      }
      return { userId: 'admin-id-mock', valid: true };
    }),
    revokeRefreshToken: vi.fn(async _ => {
      isTokenRevoked = true;
      return true;
    }),
    deleteRefreshToken: vi.fn(async () => true),
    getById: vi.fn(async _ => ({
      id: 'admin-id-mock',
      username: 'admin',
      level: 5,
      active: 1,
    })),
  },
}));
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

import { app } from '../index';

// Variable de estado global para simular revocación
let isTokenRevoked = false;

const request = supertest(app);

describe('Autenticación y Sesión', () => {
  let authCookies: string[] = [];

  beforeEach(async () => {
    isTokenRevoked = false;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const loginRes = await request.post('/api/login').send({
      username: 'admin',
      password: 'Admin1',
    });

    const setCookieHeader = loginRes.headers['set-cookie'];
    authCookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : setCookieHeader
        ? [setCookieHeader]
        : [];
  });

  afterEach(() => {
    authCookies = [];
  });

  it('debería obtener datos de sesión con token válido', async () => {
    const res = await request.get('/api/session').set('Cookie', authCookies).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.username).toBe('admin');
  });

  it('debería rechazar acceso sin token (401)', async () => {
    const res = await request.get('/api/session').expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No autorizado');
  });

  it('debería refrescar tokens correctamente', async () => {
    const res = await request.post('/api/refresh').set('Cookie', authCookies).expect(200);

    const newSetCookie = res.headers['set-cookie'];
    const newCookies = Array.isArray(newSetCookie)
      ? newSetCookie
      : newSetCookie
        ? [newSetCookie]
        : [];

    expect(newCookies.some(c => c.includes('access_token'))).toBe(true);
    expect(newCookies.some(c => c.includes('refresh_token'))).toBe(true);
  });

  it('debería cerrar sesión y limpiar cookies', async () => {
    const logoutRes = await request.post('/api/logout').set('Cookie', authCookies).expect(200);

    const newSetCookie = logoutRes.headers['set-cookie'];
    const newCookies = Array.isArray(newSetCookie)
      ? newSetCookie
      : newSetCookie
        ? [newSetCookie]
        : [];

    expect(newCookies.some(c => c.includes('access_token=;'))).toBe(true);
    expect(newCookies.some(c => c.includes('refresh_token=;'))).toBe(true);
  });

  it('debería rechazar refresh después de logout', async () => {
    await request.post('/api/logout').set('Cookie', authCookies).expect(200);

    const res = await request.post('/api/refresh').set('Cookie', authCookies).expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Refresh token inválido');
  });
});
