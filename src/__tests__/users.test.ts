// Test users.test.ts
// Permisos/roles (403 en rutas restringidas con level bajo)
// Errores controlados (ej: 400 con contraseña débil, 409 con usuario duplicado)
// Flujo de CRUD (create user con permisos, update, delete)

import { vi } from 'vitest';
// Mock de config para tests (evita ZodError en CI)
vi.mock('../config/index', () => ({
  config: {
    jwt: {
      secret: 'test-secret-super-largo-para-tests',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    db: {
      host: 'localhost',
      port: 5432,
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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

import { app } from '../index.ts';
import 'dotenv/config';

const request = supertest(app);

describe('Users API (con permisos)', () => {
  let adminCookies: string[] = [];
  let normalCookies: string[] = [];

  beforeEach(async () => {
    // Login como admin (level alto)
    const adminLogin = await request.post('/api/login').send({
      username: 'admin',
      password: 'Admin1',
    });

    const adminSetCookie = adminLogin.headers['set-cookie'];
    adminCookies = Array.isArray(adminSetCookie)
      ? adminSetCookie
      : adminSetCookie
        ? [adminSetCookie]
        : [];

    // Login como usuario normal (level bajo, ej: 1)
    const normalLogin = await request.post('/api/login').send({
      username: 'testuser2',
      password: 'Password123!',
    });

    const normalSetCookie = normalLogin.headers['set-cookie'];
    normalCookies = Array.isArray(normalSetCookie)
      ? normalSetCookie
      : normalSetCookie
        ? [normalSetCookie]
        : [];
  });

  afterEach(() => {
    adminCookies = [];
    normalCookies = [];
  });

  it('admin puede listar usuarios (200)', async () => {
    const res = await request.get('/api/users').set('Cookie', adminCookies).expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('usuario normal NO puede listar usuarios (403)', async () => {
    const res = await request.get('/api/users').set('Cookie', normalCookies).expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No tienes permisos suficientes');
  });

  it('admin puede crear usuario nuevo (201)', async () => {
    const res = await request
      .post('/api/user/create')
      .set('Cookie', adminCookies)
      .send({
        username: 'newuser' + Date.now(),
        password: 'NewPass123!',
        email: 'new' + Date.now() + '@test.com',
        fullname: 'Nuevo Usuario Test',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.user).toHaveProperty('id');
  });

  it('usuario normal NO puede crear usuario (403)', async () => {
    const res = await request
      .post('/api/user/create')
      .set('Cookie', normalCookies)
      .send({
        username: 'invalid',
        password: 'Pass123!',
        email: 'invalid@test.com',
        fullname: 'Invalid',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('No tienes permisos suficientes');
  });

  it('crear usuario con contraseña débil devuelve 400', async () => {
    const res = await request
      .post('/api/user/create')
      .set('Cookie', adminCookies)
      .send({
        username: 'weakpass',
        password: '123',
        email: 'weak@test.com',
        fullname: 'Weak Pass',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Password'); // ← Cambia a 'Password' (en inglés)
    expect(res.body.error).toContain('6'); // ← Opcional: verifica también el largo mínimo
  });
});
