// Tests con Vitest (auth.test.ts con login, refresh y logout)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';

import { app } from '../index.ts'; // Solo app, sin listen

const request = supertest(app);

describe('Autenticación y Sesión', () => {
  let cookies: string[] = [];

  beforeEach(async () => {
    // Login válido para obtener cookies
    const loginRes = await request.post('/api/login').send({
      username: 'admin',
      password: 'Admin1',
    });

    cookies = loginRes.headers['set-cookie'] || [];
  });

  afterEach(() => {
    cookies = []; // Limpia cookies entre tests
  });

  it('debería obtener datos de sesión con token válido', async () => {
    const res = await request.get('/api/session').set('Cookie', cookies).expect(200);

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
    const res = await request.post('/api/refresh').set('Cookie', cookies).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Tokens refrescados');

    const newCookies = res.headers['set-cookie'] || [];
    expect(newCookies.some(c => c.includes('access_token'))).toBe(true);
    expect(newCookies.some(c => c.includes('refresh_token'))).toBe(true);
  });

  it('debería cerrar sesión y limpiar cookies', async () => {
    const logoutRes = await request.post('/api/logout').set('Cookie', cookies).expect(200);

    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.message).toBe('Sesión cerrada correctamente');

    const newCookies = logoutRes.headers['set-cookie'] || [];
    expect(newCookies.some(c => c.includes('access_token=;'))).toBe(true);
    expect(newCookies.some(c => c.includes('refresh_token=;'))).toBe(true);
  });

  it('debería rechazar refresh después de logout', async () => {
    // Logout primero
    await request.post('/api/logout').set('Cookie', cookies);

    const res = await request.post('/api/refresh').set('Cookie', cookies).expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('inválido');
  });
});
