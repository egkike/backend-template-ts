import { vi } from 'vitest';
// Mock de config
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
// Mock de bcrypt: siempre pasa la comparación en tests
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
  },
}));
// Mock de userRepository
vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    findByCredentials: vi.fn(async (identifier: string) => {
      if (identifier === 'admin') {
        return {
          id: 'a6288fe1-27a9-4775-b12d-65769d002896',
          username: 'admin',
          email: 'admin@midominio.com',
          fullname: 'Usuario Administrador',
          password: 'hashed-admin-password',
          level: 5,
          active: 1,
          must_change_password: false,
        };
      }
      if (identifier === 'testuser2') {
        return {
          id: 'normal-id-mock',
          username: 'testuser2',
          email: 'testuser2@local.com',
          fullname: 'Usuario Test',
          password: 'hashed-test-password',
          level: 1,
          active: 1,
          must_change_password: false,
        };
      }
      return null;
    }),
    getUsers: vi.fn(async () => [
      { id: '1', username: 'user1', email: 'user1@test.com' },
      { id: '2', username: 'user2', email: 'user2@test.com' },
    ]),
    createUser: vi.fn(async data => {
      if (data.password.length < 6) {
        throw new AppError('Password debe tener al menos 6 caracteres', 400);
      }
      return {
        id: 'new-id-' + Date.now(),
        username: data.username,
        email: data.email,
        fullname: data.fullname,
        level: 1,
        active: 1,
        must_change_password: false,
      };
    }),
    saveRefreshToken: vi.fn(async () => {}),
  },
}));
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

import { app } from '../index';
import { AppError } from '../errors/AppError';

const request = supertest(app);

describe('Users API (con permisos)', () => {
  let adminCookies: string = '';
  let normalCookies: string = '';

  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Login admin
    const adminLogin = await request.post('/api/login').send({
      username: 'admin',
      password: 'Admin1',
    });

    const adminSetCookie = adminLogin.headers['set-cookie'];
    if (adminSetCookie) {
      adminCookies = Array.isArray(adminSetCookie) ? adminSetCookie.join('; ') : adminSetCookie;
    } else {
      console.warn('No cookies en login admin. Respuesta:', adminLogin.body);
    }

    // Login normal
    const normalLogin = await request.post('/api/login').send({
      username: 'testuser2',
      password: 'Password123!',
    });

    const normalSetCookie = normalLogin.headers['set-cookie'];
    if (normalSetCookie) {
      normalCookies = Array.isArray(normalSetCookie) ? normalSetCookie.join('; ') : normalSetCookie;
    } else {
      console.warn('No cookies en login normal. Respuesta:', normalLogin.body);
    }
  });

  afterEach(() => {
    adminCookies = '';
    normalCookies = '';
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
    expect(res.body.error).toContain('Password');
    expect(res.body.error).toContain('6');
  });
});
