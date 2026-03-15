import supertest from 'supertest';
// eslint-disable-next-line import/order
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
// Mock de Configuración Global
vi.mock('../config/index', () => ({
  config: {
    db: { schema: 'public' },
    jwt: {
      secret: 'access-secret-123',
      refreshSecret: 'refresh-secret-456',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
      accessTokenMaxAge: 900000,
      refreshTokenMaxAge: 604800000,
    },
    passwordPepper: 'test-pepper',
    mercadoPago: { accessToken: 'test_mp_token' },
    cors: { origins: '*' },
    apiBaseUrl: 'http://localhost:3000',
    frontendUrl: 'http://localhost:5173',
    daysOfGuarantee: 7,
    nodeEnv: 'test',
    recaptchaSecretKey: undefined,
  },
}));

// Mock de la base de datos
vi.mock('../db/postgres', () => ({
  default: { query: vi.fn(), connect: vi.fn(), on: vi.fn() },
  pool: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(() => ({ query: vi.fn(), release: vi.fn() })),
  },
}));

// Mock de config repository (CRÍTICO para role.middleware)
vi.mock('../repositories/config.repository', () => {
  const mockLevels = { GUEST: 0, USER: 1, STAFF: 5, ADMIN: 99 };
  return {
    configRepository: {
      getUserLevels: vi.fn().mockResolvedValue(mockLevels),
      clearLevelsCache: vi.fn(),
      getSetting: vi.fn().mockResolvedValue(JSON.stringify(mockLevels)),
      setSetting: vi.fn().mockResolvedValue(true),
      getSystemSettings: vi.fn().mockResolvedValue({}),
    },
  };
});

// Mock de bcrypt
vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(() => Promise.resolve(true)),
  },
}));

// Mock de user repository con datos completos - TODO DENTRO DEL FACTORY
vi.mock('../repositories/user.repository', () => {
  const mockUserAdmin = {
    id: 'admin-uuid',
    username: 'admin',
    email: 'admin@test.com',
    fullname: 'Admin Test',
    level: 5,
    active: 1,
    password: 'hashed_with_pepper',
    must_change_password: false,
  };

  const mockUserRegular = {
    id: 'user-uuid',
    username: 'user',
    email: 'user@test.com',
    fullname: 'Regular User',
    level: 1,
    active: 1,
    password: 'hashed_with_pepper',
    must_change_password: false,
  };

  return {
    userRepository: {
      findByCredentials: vi.fn((identifier: string) => {
        if (identifier === 'admin' || identifier === 'admin@test.com')
          return Promise.resolve(mockUserAdmin);
        if (identifier === 'user' || identifier === 'user@test.com')
          return Promise.resolve(mockUserRegular);
        return Promise.resolve(null);
      }),
      findByEmail: vi.fn(),
      findById: vi.fn((id: string) => {
        if (id === 'admin-uuid') return Promise.resolve(mockUserAdmin);
        if (id === 'user-uuid') return Promise.resolve(mockUserRegular);
        return Promise.resolve(null);
      }),
      getUsers: vi.fn().mockResolvedValue([mockUserAdmin, mockUserRegular]),
      getById: vi.fn((id: string) => {
        if (id === 'admin-uuid') return Promise.resolve(mockUserAdmin);
        if (id === 'user-uuid') return Promise.resolve(mockUserRegular);
        return Promise.resolve(null);
      }),
      createUser: vi.fn().mockResolvedValue({ ...mockUserRegular, id: 'new-user-uuid' }),
      updUser: vi.fn().mockResolvedValue(mockUserAdmin),
      deleteUser: vi.fn().mockResolvedValue(true),
      chgPassUser: vi.fn().mockResolvedValue(true),
      saveRefreshToken: vi.fn().mockResolvedValue(true),
      findRefreshToken: vi.fn().mockResolvedValue({
        id: 'refresh-uuid',
        token_hash: 'some-hash',
        user_id: 'admin-uuid',
        revoked: false,
        expires_at: new Date(Date.now() + 999999),
        created_at: new Date(),
      }),
      deleteSpecificRefreshToken: vi.fn().mockResolvedValue(true),
      verifyAccount: vi.fn().mockResolvedValue(true),
      saveResetToken: vi.fn().mockResolvedValue(true),
      resetPasswordByToken: vi.fn().mockResolvedValue(true),
      updatePasswordAndClearFlag: vi.fn().mockResolvedValue(true),
    },
  };
});

// Mock de EMAIL
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      verify: vi.fn().mockResolvedValue(true),
    }),
  },
}));

vi.mock('../services/auth.cleanup.service', () => ({
  AuthCleanupService: { cleanExpiredTokens: vi.fn().mockResolvedValue(true) },
}));

vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }));
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Importar DESPUÉS de los mocks
import bcrypt from 'bcrypt';

import { app } from '../index';
import { userRepository } from '../repositories/user.repository';

// Helper para resetear el mock de bcrypt en cada test
const resetBcryptMock = () => {
  vi.mocked(bcrypt.compare).mockReset();
  vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(true) as any);
};

const request = supertest(app);

describe('Autenticación API', () => {
  let adminCookies: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Restaurar mock de bcrypt a true
    resetBcryptMock();

    // Login como admin (STAFF)
    const resAdmin = await request
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'p1' });

    const rawAdmin = resAdmin.headers['set-cookie'];
    adminCookies = Array.isArray(rawAdmin) ? rawAdmin : rawAdmin ? [rawAdmin] : [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============ LOGIN TESTS ============

  it('login exitoso devuelve tokens', async () => {
    const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'p1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('login con credenciales incorrectas retorna 401', async () => {
    // Mock de bcrypt para que retorne false (contraseña incorrecta)
    vi.mocked(bcrypt.compare).mockImplementation(() => Promise.resolve(false) as any);

    const res = await request
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('login sin credenciales retorna 400', async () => {
    const res = await request.post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // ============ SESSION TESTS ============

  it('obtener sesión con token válido retorna 200', async () => {
    const res = await request.get('/api/session').set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
  });

  it('obtener sesión sin token retorna 401', async () => {
    const res = await request.get('/api/session');

    expect(res.status).toBe(401);
  });

  // ============ REFRESH TOKEN TESTS ============

  it('refresh token exitoso retorna 200', async () => {
    const res = await request.post('/api/auth/refresh').set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Token renovado');
  });

  it('refresh sin token retorna 403', async () => {
    const res = await request.post('/api/auth/refresh');

    expect(res.status).toBe(403);
  });

  // ============ LOGOUT TESTS ============

  it('logout exitoso retorna 200 y limpia cookies', async () => {
    const res = await request.post('/api/auth/logout').set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Sesión cerrada correctamente');
  });

  it('logout sin auth retorna 401', async () => {
    const res = await request.post('/api/auth/logout');

    expect(res.status).toBe(401);
  });
});

describe('Users API - Permisos', () => {
  let adminCookies: string[] = [];
  let userCookies: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    resetBcryptMock();

    // Login admin
    const resAdmin = await request
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'p1' });
    const rawAdmin = resAdmin.headers['set-cookie'];
    adminCookies = Array.isArray(rawAdmin) ? rawAdmin : rawAdmin ? [rawAdmin] : [];

    // Login user
    const resUser = await request
      .post('/api/auth/login')
      .send({ username: 'user', password: 'p1' });
    const rawUser = resUser.headers['set-cookie'];
    userCookies = Array.isArray(rawUser) ? rawUser : rawUser ? [rawUser] : [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============ LIST USERS ============

  it('admin puede listar usuarios (STAFF)', async () => {
    const res = await request.get('/api/users').set('Cookie', adminCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  it('usuario regular NO puede listar usuarios (403)', async () => {
    const res = await request.get('/api/users').set('Cookie', userCookies);

    expect(res.status).toBe(403);
  });

  // ============ GET USER BY ID ============

  it('admin puede obtener usuario por ID', async () => {
    const res = await request
      .post('/api/user/getbyid')
      .set('Cookie', adminCookies)
      .send({ id: 'user-uuid' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('usuario regular no puede obtener usuario por ID', async () => {
    const res = await request
      .post('/api/user/getbyid')
      .set('Cookie', userCookies)
      .send({ id: 'user-uuid' });

    expect(res.status).toBe(403);
  });

  // ============ CREATE USER ============

  it('admin puede crear usuario', async () => {
    const res = await request.post('/api/user/create').set('Cookie', adminCookies).send({
      username: 'newuser',
      email: 'new@test.com',
      password: 'Password123!',
      fullname: 'New User',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('usuario regular no puede crear usuario', async () => {
    const res = await request.post('/api/user/create').set('Cookie', userCookies).send({
      username: 'newuser',
      email: 'new@test.com',
      password: 'Password123!',
      fullname: 'New User',
    });

    expect(res.status).toBe(403);
  });

  // ============ UPDATE USER ============

  it('admin puede actualizar usuario', async () => {
    const res = await request
      .patch('/api/user/update')
      .set('Cookie', adminCookies)
      .send({ id: 'user-uuid', fullname: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ============ DELETE USER ============

  it('admin puede eliminar usuario', async () => {
    const res = await request
      .delete('/api/user/delete')
      .set('Cookie', adminCookies)
      .send({ id: 'user-uuid' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ============ CHANGE PASSWORD (PROFILE) ============

  it('usuario puede cambiar su propia contraseña', async () => {
    vi.mocked(userRepository.findByCredentials).mockResolvedValueOnce({
      id: 'user-uuid',
      username: 'user',
      email: 'user@test.com',
      fullname: 'Regular User',
      level: 1,
      active: 1,
      password: 'hashed_old',
      must_change_password: false,
    } as any);

    const res = await request
      .patch('/api/profile/change-password')
      .set('Cookie', userCookies)
      .send({
        oldPassword: 'OldPassword123!',
        password: 'NewPassword456!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Validación de Contraseñas', () => {
  let adminCookies: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    resetBcryptMock();
    const res = await request.post('/api/auth/login').send({ username: 'admin', password: 'p1' });
    const raw = res.headers['set-cookie'];
    adminCookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  });

  it('crear usuario con contraseña débil retorna 400', async () => {
    const res = await request.post('/api/user/create').set('Cookie', adminCookies).send({
      username: 'testuser',
      email: 'test@test.com',
      password: 'weak',
      fullname: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('reset password con contraseña débil retorna 400', async () => {
    const res = await request.post('/api/auth/reset-password').send({
      token: 'some-token',
      password: 'weak',
    });

    expect(res.status).toBe(400);
  });
});

describe('Endpoints Públicos', () => {
  it('GET /health retorna 200', async () => {
    const res = await request.get('/health');
    expect(res.status).toBe(200);
  });

  it('GET / retorna 200', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
  });

  it('POST /api/auth/forgot-password retorna 200 aunque email no exista (seguridad)', async () => {
    vi.mocked(userRepository.findByCredentials).mockResolvedValueOnce(null);

    const res = await request
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' });

    // Estrategia de seguridad: siempre retorna 200
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
