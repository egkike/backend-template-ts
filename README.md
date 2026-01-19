# Backend Template TS (Node.js + Express + PostgreSQL)

Template moderno, seguro y testeado de backend en **TypeScript** con Express, JWT (access + refresh token con rotación y revocación), PostgreSQL, rate limiting, roles/permisos, error handling profesional, tests con Vitest y documentación automática con Swagger.

Ideal para iniciar proyectos reales, APIs REST seguras o como base reutilizable.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://github.com/egkike/backend-template-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/egkike/backend-template-ts/actions)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](https://github.com/egkike/backend-template-ts)
[![Node](https://img.shields.io/badge/node-20+-blue)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-v8+-orange)](https://pnpm.io/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

## Tecnologías principales

- Node.js + TypeScript
- Express.js
- PostgreSQL (con pg)
- JWT (access + refresh token con rotación)
- Bcrypt para hashing de contraseñas
- Pino (logger estructurado)
- Zod para validación de env
- Vitest + Supertest (tests)
- Swagger/OpenAPI + Swagger UI (documentación interactiva)
- Helmet + CSP (seguridad HTTP)
- Rate limiting por ruta y usuario (express-rate-limit)
- Permisos por nivel (middleware restrictTo)

## Arquitectura rápida

El proyecto sigue una arquitectura clásica de API REST:

- **Frontend / Cliente** se comunica con la **API Express + Node.js** mediante HTTPS y JWT.
- La API maneja la lógica de negocio, autenticación, rate limiting, logging y seguridad.
- La **API se conecta a PostgreSQL 18** para persistencia de datos (con retry automático para arranque lento).
- Seguridad: Helmet (CSP), hpp, xss-clean, rate-limit por ruta.
- Validación: Zod + schemas estrictos.
- Tests: Vitest + Supertest.
- Documentación: Swagger interactiva (solo en desarrollo).

## Requisitos

- Node.js ≥ 20
- pnpm ≥ 8 (recomendado)
- PostgreSQL ≥ 15 (o Docker para DB)
- Editor con soporte TS (VS Code recomendado)

## Instalación

1. Clona el repositorio

```bash
git clone https://github.com/egkike/backend-template-ts.git
cd backend-template-ts
```

2. Instala dependencias

```bash
pnpm install
```

3. Crea el archivo .env (copia de .env.example)

```bash
cp .env.example .env
```

4. Edita `.env` con tus valores (ver sección Configuración)

## Configuración (.env)

```env
# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=development  # o production

# Base de datos PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
POSTGRES_DB=tu_base_de_datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu_password
DB_NAME=tu_base_de_datos
DB_SCHEMA=template

# JWT
SECRET_JWT_KEY=tu_secreto_super_largo_y_seguro_aqui_128_caracteres_minimo
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS (separados por coma)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Opcional: para producción
TRUST_PROXY=true  # si usas reverse proxy (nginx, etc.)
```

## Base de datos - Scripts de creación (PostgreSQL)
Ejecuta estos scripts en orden en tu instancia de PostgreSQL (pgAdmin, DBeaver, psql, etc.) para crear las tablas necesarias.

1. Habilita extensión UUID (si no está):

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

2. Tabla users

```sql
CREATE TABLE IF NOT EXISTS template.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  fullname VARCHAR(100) NOT NULL,
  password TEXT NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  active INTEGER DEFAULT 0 NOT NULL,
  must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
  createdate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON template.users(username);
CREATE INDEX idx_users_email ON template.users(email);
```

3. Tabla refresh_tokens

```sql
CREATE TABLE IF NOT EXISTS template.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES cursos.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_refresh_tokens_user_id ON template.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON template.refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON template.refresh_tokens(revoked);

-- Opcional: índice para limpieza periódica de expirados
CREATE INDEX idx_refresh_tokens_cleanup ON template.refresh_tokens (expires_at) WHERE revoked = FALSE;
```

**Notas**:
- Usa el schema `template` por defecto (o cambia a otro que prefieras).
- En producción, considera migraciones automáticas (ej: Drizzle, Prisma Migrate).

**Recomendación**: Usa pgAdmin o DBeaver para ejecutar estos scripts y ver las tablas.
- pgAdmin integrado: http://localhost:5050 (user: admin@local.com, pass: admin)
- Conexión automática a `db` (host: db, puerto: 5432, user: postgres)

## Comandos principales

```bash
pnpm dev          # Desarrollo (tsx watch)
pnpm build        # Compila a JavaScript (dist/)
pnpm start        # Ejecuta en producción (node dist/index.js)
pnpm test         # Ejecuta todos los tests
pnpm test:watch   # Tests en modo watch
pnpm test:coverage # Tests + reporte de cobertura
```

## Desarrollo con Docker (recomendado)

```bash
# Construir imagen (usa --network host si tienes problemas de DNS)
docker build -t backend-template-api -f Dockerfile --network host --no-cache .

# Levantar todo (API + DB + pgAdmin opcional)
docker-compose up -d
```

**Acceso**:
- API: http://localhost:3000
- Health: http://localhost:3000/health
- Swagger (solo dev): http://localhost:3000/api-docs
- pgAdmin: http://localhost:5050 (admin@local.com / admin)
- PostgreSQL: localhost:5432 (user: postgres, pass: del .env)

**Inicialización automática de la DB**:
- La primera vez que se levanta el contenedor db (cuando `./postgres-data` está vacío o no existe), Postgres ejecuta automáticamente todos los archivos `.sql` en la carpeta `./db/init` (en orden alfabético).
- Esto crea el schema, tablas, índices y datos iniciales (seed) sin intervención manual.
- En arranques posteriores (con datos ya existentes), los scripts se ignoran (comportamiento estándar de la imagen oficial de Postgres).

```bash
# Detener todo y eliminar los contenedores y la red (No borra el volúmen de datos en ./postgres-data):

docker-compose down
```

## Estructura de carpetas

```
backend-template-ts/
├── db
├── src
│   ├── __tests__     # Tests con Vitest
│   ├── config        # Configuración (db, env, etc.)
│   ├── controllers   # Controladores (auth, user)
│   ├── db            # Conexión al pool de PostgreSQL
│   ├── errors        # AppError personalizado
│   ├── middlewares   # JWT, roles, rate-limit
│   ├── repositories  # Acceso a DB (user.repository.ts)
│   ├── routes        # Rutas (auth.routes.ts, user.routes.ts)
│   ├── schemas       # Zod schemas (users.ts)
│   ├── types         # Tipos TypeScript
│   ├── utils         # JWT, logger, etc.
│   └── index.ts      # Entrada principal (app Express)
├── .env.example
├── .prettierrc
├── docker-compose.yml
├── Dockerfile
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.build.json
├── tsconfig.json
└── vitest.config.ts
```

## Funcionalidades clave

- Autenticación JWT con access (15 min) + refresh token (7 días, rotación + revocación en logout)
- Cookies HttpOnly + SameSite=Strict
- Permisos por nivel (middleware restrictTo)
- Rate limiting por ruta y usuario
- Validación de contraseñas detallada
- Error handler profesional con AppError
- Documentación Swagger interactiva (/api-docs)
- Tests con Vitest + Supertest (cobertura auth, logout, refresh, permisos)

## Swagger / Documentación API
Una vez levantado el servidor, accede a:

```
http://localhost:3000/api-docs
```

Interfaz interactiva para probar todos los endpoints (login, refresh, logout, CRUD usuarios, etc.).

## Tests

```bash
pnpm test
```

Cobertura actual:
- Login, refresh, logout + revocación
- Permisos (403 en rutas restringidas)
- Errores (400, 401, 403)
- Creación de usuario con contraseña débil (400)

## Contribuir

1. Forkea el repositorio
2. Crea tu rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commitea con conventional commits (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a tu rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

¡Todas las contribuciones son bienvenidas! (mejoras de seguridad, tests, docs, etc.)

## Licencia

MIT License - usa libremente, modifica y distribuye.

---
¡Gracias por usar este template!
Creado con ❤️ por Kike Garcia (@kike_eg)
¡Contribuye, forkéalo y hazlo tuyo!
