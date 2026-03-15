import { vi } from 'vitest';

// 1. Mock de Configuración Global - DEBE IR PRIMERO
// Este secreto será el mismo para TODO el entorno de test
vi.mock('../config/index', () => ({
  config: {
    db: { schema: 'public' },
    jwt: {
      // Secreto para Access Tokens
      secret: 'access-secret-123',
      // Secreto para Refresh Tokens (ESTO FALTABA)
      refreshSecret: 'refresh-secret-456',

      // Formatos para la firma (jwt.sign)
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',

      // Formatos para las Cookies (res.cookie)
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

// 2. Mock de la base de datos
vi.mock('../db/postgres', () => ({
  default: { query: vi.fn(), connect: vi.fn(), on: vi.fn() },
  pool: {
    query: vi.fn(),
    on: vi.fn(),
    connect: vi.fn(() => ({ query: vi.fn(), release: vi.fn() })),
  },
}));

// 3. Mock de repositories
vi.mock('../repositories/user.repository', () => ({
  userRepository: {
    findByCredentials: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    getUsers: vi.fn(),
    getById: vi.fn(),
    createUser: vi.fn(),
    updUser: vi.fn(),
    deleteUser: vi.fn(),
    chgPassUser: vi.fn(),
    saveRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    deleteSpecificRefreshToken: vi.fn(),
    verifyAccount: vi.fn(),
    saveResetToken: vi.fn(),
    resetPasswordByToken: vi.fn(),
    updatePasswordAndClearFlag: vi.fn(),
  },
}));

vi.mock('../repositories/config.repository', () => {
  // Caché en memoria para los tests
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

// 4. Mock de EMAIL (Nodemailer)
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

// 5. Mock de Cron y Logger
vi.mock('node-cron', () => ({ default: { schedule: vi.fn() } }));
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
