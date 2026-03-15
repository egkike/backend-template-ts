# Backend Template TS

Template moderno, seguro y testeado de backend en **TypeScript** con Express, JWT (access + refresh token con rotación y revocación), PostgreSQL, rate limiting, roles/permisos, error handling profesional, tests con Vitest y documentación automática con Swagger.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/egkike/backend-template-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/egkike/backend-template-ts/actions)
[![Node](https://img.shields.io/badge/node-22+-blue)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v10+-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-3178c6)](https://www.typescriptlang.org/)

---

## Tabla de Contenidos

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Características](#características)
- [Arquitectura](#arquitectura)
- [API Endpoints](#api-endpoints)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Scripts Disponibles](#scripts-disponibles)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

---

## Quick Start

```bash
# 1. Clonar e instalar
git clone https://github.com/egkike/backend-template-ts.git
cd backend-template-ts
pnpm install

# 2. Configurar entorno
cp .env.example .env
# Edita .env con tus valores

# 3. Levantar servicios (API + PostgreSQL + pgAdmin)
docker-compose up -d

# 4. ¡Listo!
# API: http://localhost:3000
# Swagger: http://localhost:3000/api-docs
# Health: http://localhost:3000/health
```

---

## Tech Stack

| Categoria     | Tecnología                   |
| ------------- | ---------------------------- |
| Runtime       | Node.js 22+                  |
| Lenguaje      | TypeScript 5.9 (strict)      |
| Framework     | Express.js 5.x               |
| Base de Datos | PostgreSQL 18                |
| Driver DB     | `pg` (native queries)        |
| Autenticación | JWT (access + refresh token) |
| Hashing       | bcrypt                       |
| Validación    | Zod                          |
| Logging       | Pino + pino-pretty           |
| Rate Limiting | express-rate-limit           |
| Seguridad     | Helmet (CSP)                 |
| Testing       | Vitest + Supertest           |
| Linting       | ESLint 9 + Prettier          |
| Documentación | Swagger UI + swagger-jsdoc   |
| Scheduler     | node-cron                    |
| Email         | Nodemailer                   |
| Captcha       | Google reCAPTCHA v3          |

---

## Características

### Autenticación y Autorización

- **JWT con rotación**: Access token (15 min) + Refresh token (7 días)
- **Revocación de tokens**: Posibilidad de invalidar sesiones
- **Cookies HttpOnly**: Seguridad XSS
- **RBAC**: Niveles de permisos (GUEST, USER, STAFF, ADMIN)
- **Middleware restrictTo**: Control de acceso por rol

### Seguridad

- Helmet con CSP completo
- Rate limiting por IP y usuario
- Validación de contraseñas detallada (mayúsculas, minúsculas, números, símbolos)
- Protección contra ataques comunes (XSS, HPP)
- reCAPTCHA v3 opcional

### Desarrollo

- Hot reload con `tsx` en desarrollo
- Swagger UI interactiva (`/api-docs`)
- Logging estructurado con pino
- Health checks (`/health`)

### Calidad

- TypeScript strict mode
- ESLint + Prettier configurados
- Tests con Vitest + Supertest
- Conventional Commits

---

## Arquitectura

El proyecto sigue una **Layered Architecture**:

```
Request → Routes → Middlewares → Controllers → Services → Repositories → PostgreSQL
                                    ↓
                              AppError (Error Handler Global)
```

### Capas

| Capa             | Responsabilidad                                   |
| ---------------- | ------------------------------------------------- |
| **Routes**       | Definición de endpoints y validación básica       |
| **Middlewares**  | Auth, RBAC, rate limiting, seguridad              |
| **Controllers**  | Lógica de request/response, validación de schemas |
| **Services**     | Lógica de negocio (email, captcha, cleanup)       |
| **Repositories** | Acceso a PostgreSQL (queries raw)                 |
| **Config**       | Validación de variables de entorno con Zod        |

### Manejo de Errores

- Clase personalizada `AppError`
- Error handler global en `index.ts`
- Stack trace solo en desarrollo
- Códigos de error HTTP consistentes

> Para más detalles, ver [docs/architecture/overview.md](./docs/architecture/overview.md)

---

## API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint                                | Descripción                  |
| ------ | --------------------------------------- | ---------------------------- |
| POST   | `/api/auth/login`                       | Iniciar sesión               |
| POST   | `/api/auth/refresh`                     | Renovar access token         |
| POST   | `/api/auth/logout`                      | Cerrar sesión                |
| GET    | `/api/auth/verify-email`                | Verificar email              |
| POST   | `/api/auth/forgot-password`             | Solicitar reset password     |
| POST   | `/api/auth/reset-password`              | Resetear password            |
| POST   | `/api/auth/change-password-first-login` | Cambio password primer login |

### Usuarios (`/api`)

| Método | Endpoint                       | Descripción            | Permiso |
| ------ | ------------------------------ | ---------------------- | ------- |
| GET    | `/api/session`                 | Obtener sesión actual  | USER+   |
| PATCH  | `/api/profile/change-password` | Cambiar mi password    | USER+   |
| GET    | `/api/users`                   | Listar usuarios        | STAFF+  |
| POST   | `/api/user/create`             | Crear usuario          | STAFF+  |
| POST   | `/api/user/getbyid`            | Obtener usuario por ID | STAFF+  |
| PATCH  | `/api/user/update`             | Actualizar usuario     | STAFF+  |
| PATCH  | `/api/user/chgpass-admin`      | Admin resetea password | STAFF+  |
| DELETE | `/api/user/delete`             | Eliminar usuario       | STAFF+  |

### Públicos

| Método | Endpoint    | Descripción           |
| ------ | ----------- | --------------------- |
| GET    | `/health`   | Health check          |
| GET    | `/`         | Raíz                  |
| GET    | `/api-docs` | Swagger UI (solo dev) |

> Documentación interactiva disponible en: http://localhost:3000/api-docs

---

## Estructura del Proyecto

```
backend-template-ts/
├── db/
│   └── init/                  # Scripts SQL de inicialización
├── docs/                      # Documentación
│   ├── architecture
│   │   └── overview.md
│   ├── guides
│   │   └── setup.md
│   └── reference
│       └── environment.md
├── src/
│   ├── __tests__/             # Tests con Vitest
│   ├── config/                # Configuración (Zod env validation)
│   ├── controllers/           # Controladores (auth, user)
│   ├── db/                    # Pool PostgreSQL
│   ├── errors/                # AppError personalizado
│   ├── middlewares/           # JWT, RBAC, rate limiting
│   ├── repositories/          # Acceso a DB (queries)
│   ├── routes/                # Definición de rutas
│   ├── schemas/               # Zod schemas
│   ├── services/             # Servicios (email, captcha)
│   ├── types/                 # Tipos TypeScript
│   ├── utils/                 # JWT, logger
│   ├── swagger.ts            # Configuración Swagger
│   └── index.ts              # Entry point Express
├── .env.example              # Template de variables
├── docker-compose.yml        # Servicios (API + DB + pgAdmin)
├── Dockerfile                # Multi-stage build
├── package.json              # Dependencias y scripts
├── tsconfig.json             # TypeScript config
├── vitest.config.ts         # Vitest config
└── eslint.config.mjs        # ESLint config
```

---

## Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor con hot reload (tsx watch)
pnpm build            # Compila a JavaScript (dist/)
pnpm start            # Ejecuta en producción

# Testing
pnpm test             # Ejecuta todos los tests
pnpm test:watch      # Tests en modo watch
pnpm test:coverage   # Tests con coverage
pnpm test:ci         # Tests con DB Docker (CI)

# Calidad
pnpm lint             # ESLint
pnpm lint:fix         # ESLint con auto-fix
pnpm format           # Prettier

# Docker
docker-compose up -d          # Levantar servicios
docker-compose down           # Detener servicios
docker-compose up --build -d  # Reconstruir y levantar
```

---

## Configuración

Las variables de entorno se validan automáticamente con Zod al iniciar la aplicación.

> Ver [docs/reference/environment.md](./docs/reference/environment.md) para lista completa de variables.

---

## Contribuir

1. Forkea el repositorio
2. Crea tu rama: `git checkout -b feature/nueva-funcionalidad`
3. Commitea con [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` nueva funcionalidad
   - `fix:` bug fix
   - `chore:` tareas de mantenimiento
   - `docs:` documentación
   - `test:` tests
4. Push a tu rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

### Requisitos antes de PR

```bash
pnpm lint          # Sin errores de lint
pnpm test          # Todos los tests pasando
pnpm build         # Compilación exitosa
```

---

## Licencia

MIT License - usa libremente, modifica y distribuye.

---

## Enlaces

- [Documentación de Arquitectura](./docs/architecture/overview.md)
- [Guía de Setup](./docs/guides/setup.md)
- [Variables de Entorno](./docs/reference/environment.md)
- [Swagger UI](http://localhost:3000/api-docs) (con servidor corriendo)
