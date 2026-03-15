# Arquitectura del Proyecto

Este documento describe la arquitectura general del backend, los patrones utilizados y cómo fluye la información a través de las capas.

---

## Visión General

El proyecto sigue una **Layered Architecture** (Arquitectura por Capas), un patrón clásico y éprouvado para APIs REST. Cada capa tiene responsabilidad única y conoce solo a la capa inmediatamente inferior.

```
┌─────────────────────────────────────────────────────────────┐
│                        REQUEST                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      ROUTES                                 │
│  • Definición de endpoints (GET, POST, PATCH, DELETE)       │
│  • Validación básica de parámetros de ruta                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    MIDDLEWARES                               │
│  • JWT validation                                            │
│  • Rate limiting                                             │
│  • RBAC (restrictTo)                                         │
│  • Security (Helmet, CORS)                                   │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTROLLERS                               │
│  • Parseo del request                                       │
│  • Validación de schemas (Zod)                              │
│  • Transformación de datos                                  │
│  • Respuesta al cliente                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                    SERVICES                                  │
│  • Lógica de negocio                                         │
│  • Integraciones externas (email, captcha)                   │
│  • Orquestación de repositorios                              │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                   REPOSITORIES                               │
│  • Consultas a PostgreSQL                                    │
│  • Queries crudos (pg driver)                                │
│  • Abstracción de la base de datos                           │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                   POSTGRESQL                                 │
│  • Persistencia de datos                                     │
│  • Sistema de permisos (system_settings)                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Capas Detalladas

### 1. Routes (`src/routes/`)

Definen los endpoints de la API y delegan al controller correspondiente.

```typescript
// src/routes/auth.routes.ts
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
```

**Responsabilidades:**

- Mapear métodos HTTP a controladores
- Definir paths y parámetros de ruta
- No contienen lógica de negocio

---

### 2. Middlewares (`src/middlewares/`)

Funciones que se ejecutan antes del controller. Manejan concerns transversales.

| Middleware                 | Propósito                                        |
| -------------------------- | ------------------------------------------------ |
| `jwt.middleware.ts`        | Valida access token y adjunta usuario al request |
| `roles.middleware.ts`      | `restrictTo()` - Verifica permisos               |
| `rate-limit.middleware.ts` | Limita requests por IP/usuario                   |
| `password.middleware.ts`   | Validación de complejidad de password            |

#### Ejemplo: Middleware de Autenticación

```typescript
// src/middlewares/auth/jwt.middleware.ts
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded as TokenPayload;
    next();
  } catch {
    next(new AppError('Invalid token', 401));
  }
};
```

---

### 3. Controllers (`src/controllers/`)

Reciben el request, validan datos y orquestan la respuesta.

```typescript
// src/controllers/auth.controller.ts
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validar input con Zod schema
    const { email, password } = loginSchema.parse(req.body);

    // 2. Buscar usuario
    const user = await userRepository.findByEmail(email);

    // 3. Verificar password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    // 4. Generar tokens
    const tokens = await generateTokens(user);

    // 5. Responder
    setAuthCookies(res, tokens);
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};
```

**Responsabilidades:**

- Validar schemas con Zod
- Manejar errores con try/catch → next(error)
- Responder con el formato correcto
- No acceder a DB directamente (delegar a repositories)

---

### 4. Services (`src/services/`)

Lógica de negocio compleja e integraciones con servicios externos.

```
src/services/
├── email.service.ts      # Envío de emails (nodemailer)
├── captcha.service.ts    # Validación reCAPTCHA v3
└── auth-cleanup.service.ts  # Limpieza de tokens revocados
```

#### Ejemplo: Email Service

```typescript
// src/services/email.service.ts
export class EmailService {
  async sendVerificationEmail(user: User, token: string) {
    const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Verify your email',
      html: `<a href="${url}">Click to verify</a>`,
    });
  }
}
```

---

### 5. Repositories (`src/repositories/`)

Abstracción de la capa de datos. Contain queries a PostgreSQL.

```typescript
// src/repositories/user.repository.ts
export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [
      id,
    ]);
    return result.rows[0] || null;
  },

  async create(data: CreateUserData): Promise<User> {
    // Hash password, insert, return
  },
};
```

**Responsabilidades:**

- Solo queries a la DB
- No lógica de negocio
- Retornan tipos de TypeScript

---

### 6. Config (`src/config/`)

Validación de variables de entorno con Zod.

```typescript
// src/config/index.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  SECRET_JWT_KEY: z.string().min(32),
  // ...
});

export const env = envSchema.parse(process.env);
```

Si una variable requerida falta, la app **no inicia** - fail fast.

---

## Manejo de Errores

### Clase AppError

```typescript
// src/errors/app.error.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
```

### Error Handler Global

```typescript
// src/index.ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Error desconocido
  logger.error(err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});
```

---

## Sistema de Autenticación (JWT)

### Flujo de Tokens

```
┌──────────────┐     POST /login      ┌─────────────────┐
│   CLIENTE    │ ──────────────────▶ │      API        │
└──────────────┘                      └─────────┬───────┘
       │                                        │
       │  { access_token, refresh_token }       │
       │◀──────────────────────────────────────┤
       │                                        │
       │  GET /api/users (Authorization: Bearer)│
       │ ─────────────────────────────────────▶│
       │                                        │
       │         200 OK + data                  │
       │◀──────────────────────────────────────┤
```

### Access Token (15 min)

- Usado en cada request autenticado
- Validado por middleware `authenticate`
- expirado → 401 Unauthorized

### Refresh Token (7 días)

- Rotación: se renueva en cada uso
- Almacenado en DB (`refresh_tokens` table)
- Revocado en logout
- cookie HttpOnly + SameSite=Strict

### Archivos Clave

| Archivo                                  | Descripción                       |
| ---------------------------------------- | --------------------------------- |
| `src/utils/jwt.ts`                       | Generación y validación de tokens |
| `src/middlewares/auth/jwt.middleware.ts` | Middleware de autenticación       |
| `src/controllers/auth.controller.ts`     | Login, refresh, logout            |

---

## Sistema de Permisos (RBAC)

### Niveles

| Nivel | Valor | Descripción                   |
| ----- | ----- | ----------------------------- |
| GUEST | 0     | No autenticado                |
| USER  | 1     | Usuario regular autenticado   |
| STAFF | 5     | Staff (puede manage usuarios) |
| ADMIN | 99    | Administrador total           |

### Middleware restrictTo

```typescript
// Usage in routes
router.get('/users', authenticate, restrictTo('STAFF'), userController.list);
```

```typescript
// Implementation
export const restrictTo = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};
```

### Cache de Roles

Los roles se cachean en memoria (5 minutos) para evitar queries excesivos a DB.

---

## Base de Datos

### Esquema

- **Tablas principales**: `users`, `refresh_tokens`, `system_settings`
- **Driver**: `pg` (native PostgreSQL client)
- **Pool**: Configurado en `src/db/postgres.ts` con retry automático

### Inicialización

Los scripts en `db/init/` se ejecutan automáticamente al crear el contenedor PostgreSQL:

```
db/init/
├── 01-create-tables.sql      # Tablas principales
├── 02-create-indexes.sql     # Índices
└── 03-seed-data.sql          # Datos iniciales (roles, settings)
```

---

## Logging

### Pino Logger

```typescript
// src/utils/logger.ts
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
});
```

**Logs estructurados:**

```json
{
  "level": 30,
  "time": 1700000000000,
  "msg": "Request completed",
  "method": "GET",
  "url": "/api/users",
  "statusCode": 200,
  "responseTime": 45.2
}
```

---

## Testing

### Estructura de Tests

```
src/__tests__/
├── setup.ts           # Configuración global (mocks)
├── auth.test.ts       # Tests de autenticación
└── vitest.setup.ts    # Configuración vitest
```

### Patrones

```typescript
// Mocks con Vitest
vi.mock('bcrypt', async () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('hashed'),
  },
}));

// Tests de integración con Supertest
const response = await request(app)
  .post('/api/auth/login')
  .send({ email: 'test@test.com', password: 'password123' })
  .expect(200);
```

---

## Seguridad

### Headers (Helmet)

```typescript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);
```

### Rate Limiting

```typescript
// Global: 100 requests / 15 min
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Strict: 5 requests / min (auth endpoints)
const authRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5 });
router.post('/login', authRateLimit, authController.login);
```

### CORS

```typescript
app.use(
  cors({
    origin: process.env.CORS_ORIGINS?.split(','),
    credentials: true,
  })
);
```

---

## Links Relacionados

- [Setup Local](./guides/setup.md)
- [Variables de Entorno](./reference/environment.md)
- [README Principal](../README.md)
