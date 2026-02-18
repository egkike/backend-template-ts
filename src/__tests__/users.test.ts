import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

import { app } from '../index';

vi.mock('bcrypt', () => ({
  default: { compare: vi.fn().mockResolvedValue(true) },
}));

vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    // Cambiamos el parámetro a 'username' para ser consistentes
    findByCredentials: vi.fn(async (username: string) => ({
      id: username === 'admin' ? 'admin-id' : 'user-id',
      username: username,
      email: `${username}@test.com`,
      level: username === 'admin' ? 10 : 1,
      active: 1,
      password: 'p1',
      must_change_password: false,
    })),
    // El controlador suele esperar un booleano o un objeto simple, no anidado
    saveRefreshToken: vi.fn().mockResolvedValue(true),
    getById: vi.fn(async (requestedId: string) => ({
      id: requestedId,
      username: requestedId === 'admin-id' ? 'admin' : 'testuser',
      level: requestedId === 'admin-id' ? 10 : 1,
      active: 1,
    })),
    getUsers: vi.fn(async () => [
      { id: '1', username: 'user1', email: 'u1@t.com', level: 1, active: 1 },
    ]),
  },
}));

const request = supertest(app);

describe('Users API', () => {
  let adminCookies: string[] = [];
  let userCookies: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Espera hasta que el servidor responda OK en /health (máximo 10 segundos)
    let ready = false;
    const start = Date.now();

    while (!ready && Date.now() - start < 10000) {
      try {
        const health = await request.get('/health');
        if (health.status === 200) {
          ready = true;
        }
      } catch {
        // Ignora errores y reintenta
      }
      if (!ready) await new Promise(r => setTimeout(r, 300)); // espera 300ms entre intentos
    }

    if (!ready) {
      throw new Error('Servidor no levantó en tiempo (timeout 10s)');
    }

    // LOGIN ADMIN
    const resAdmin = await request
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'p1' });

    const rawAdmin = resAdmin.headers['set-cookie'];
    // FIX DE TIPOS: Normalizamos a string[]
    adminCookies = Array.isArray(rawAdmin) ? rawAdmin : rawAdmin ? [rawAdmin] : [];

    // LOGIN USER
    const resUser = await request
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'p1' });

    const rawUser = resUser.headers['set-cookie'];
    // FIX DE TIPOS: Normalizamos a string[]
    userCookies = Array.isArray(rawUser) ? rawUser : rawUser ? [rawUser] : [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('admin puede listar usuarios (200)', async () => {
    const res = await request.get('/api/users').set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    const data = Array.isArray(res.body) ? res.body : res.body.data || res.body.users;
    expect(Array.isArray(data)).toBe(true);
  });

  it('usuario normal NO puede listar usuarios (403)', async () => {
    const res = await request.get('/api/users').set('Cookie', userCookies);
    expect(res.status).toBe(403);
  });
});
