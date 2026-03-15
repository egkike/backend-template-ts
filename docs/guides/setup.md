# Guía de Setup Local

Esta guía cubre cómo configurar el proyecto localmente para desarrollo.

---

## Requisitos Previos

| Requisito      | Versión Mínima | Notas                       |
| -------------- | -------------- | --------------------------- |
| Node.js        | 22+            | LTS recomendado             |
| pnpm           | 10+            | Package manager             |
| Docker         | Latest         | Para PostgreSQL             |
| Docker Compose | v2+            | Incluido con Docker Desktop |

### Verificar Instalación

```bash
node --version    # >= 22.0.0
pnpm --version    # >= 10.0.0
docker --version
docker compose version
```

---

## Paso 1: Clonar e Instalar

```bash
git clone https://github.com/egkike/backend-template-ts.git
cd backend-template-ts
pnpm install
```

---

## Paso 2: Configurar Variables de Entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores. Las variables requeridas son:

```env
# Servidor
PORT=3000
NODE_ENV=development

# JWT (genera claves seguras de al menos 32 caracteres)
SECRET_JWT_KEY=tu_clave_super_segura_aqui_minimo_32_chars
SECRET_REFRESH_JWT_KEY=otra_clave_diferente_tambien_minimo_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=app_db
DB_SCHEMA=public

# CORS ( URLs separadas por coma )
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# SMTP (opcional para desarrollo)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=tu_email@example.com
SMTP_PASS=tu_password

# reCAPTCHA (opcional)
RECAPTCHA_SECRET_KEY=

# Password pepper (arbitrary string agregada al hash)
PASSWORD_PEPPER=algun_pepper_largo_y_unico
```

> **Nota**: Para desarrollo local, las variables de DB pueden rester usando `localhost` si tenés PostgreSQL instalado directamente, o `db` si usás Docker.

---

## Paso 3: Levantar la Base de Datos

### Opción A: Docker (Recomendado)

```bash
docker compose up -d
```

Esto levanta:

- **API**: http://localhost:3000
- **PostgreSQL**: localhost:5432
- **pgAdmin**: http://localhost:5050 (solo dev)

### Verificar que PostgreSQL esté corriendo

```bash
docker compose ps
```

Deberías ver:

```
NAME                IMAGE               STATUS
backend-api         backend-ts          Up
backend-db          postgres:18         Up
backend-pgadmin     dpage/pgadmin4      Up
```

### Opción B: PostgreSQL Local

Si preferísno usar Docker:

```bash
# Crear usuario y base de datos
psql -U postgres
CREATE USER app_user WITH PASSWORD 'app_password';
CREATE DATABASE app_db OWNER app_user;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
```

Ejecutar scripts de inicialización:

```bash
psql -U app_user -d app_db -f db/init/01-tables.sql
psql -U app_user -d app_db -f db/init/02-indexes.sql
psql -U app_user -d app_db -f db/init/03-seed-data.sql
```

---

## Paso 4: Iniciar el Servidor

### Desarrollo (con hot reload)

```bash
pnpm dev
```

Salida esperada:

```
> backend-template-ts@1.0.0 dev
> tsx watch src/index.ts

Server running on http://localhost:3000
Environment: development
Database: connected
```

### Producción

```bash
pnpm build    # Compila a dist/
pnpm start    # Ejecuta el build
```

---

## Paso 5: Verificar que Funciona

### Health Check

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Swagger UI

Abre en tu navegador: http://localhost:3000/api-docs

Acá podés probar todos los endpoints interactivamente.

---

## Testing

### Tests Unitarios y de Integración

```bash
pnpm test           # Todos los tests
pnpm test:watch    # Modo watch
pnpm test:coverage # Con coverage
```

### Tests con DB Docker

```bash
pnpm test:ci
```

Esto levanta un contenedor PostgreSQL temporal, corre los tests, y lo destruye.

---

## Flujo de Desarrollo Típico

```bash
# 1. Crear una rama
git checkout -b feature/nueva-funcionalidad

# 2. Hacer cambios
# ... edits ...

# 3. Verificar que todo pasa
pnpm lint
pnpm test
pnpm build

# 4. Commitear (conventional commits)
git commit -m 'feat: nueva funcionalidad'

# 5. Push
git push origin feature/nueva-funcionalidad
```

---

## Troubleshooting

### "Connection refused" a PostgreSQL

1. Verificar que Docker esté corriendo: `docker ps`
2. Esperar unos segundos al inicio (PostgreSQL puede tardar)
3. Ver logs: `docker compose logs db`

### "Module not found" errors

```bash
pnpm install
```

Si persisten errores, borrar `node_modules` y reinstalar:

```bash
rm -rf node_modules
pnpm install
```

### Puerto 3000 en uso

Cambiar el puerto en `.env`:

```env
PORT=3001
```

### Error de Typescript

Asegurate de tener la versión correcta de Node:

```bash
nvm use 22
```

---

## Scripts Disponibles

| Script        | Descripción               |
| ------------- | ------------------------- |
| `pnpm dev`    | Desarrollo con hot reload |
| `pnpm build`  | Compilar a JavaScript     |
| `pnpm start`  | Ejecutar producción       |
| `pnpm test`   | Correr tests              |
| `pnpm lint`   | ESLint                    |
| `pnpm format` | Prettier                  |

---

## Siguientes Pasos

- [Arquitectura](./architecture/overview.md) - Entender cómo funciona
- [Variables de Entorno](./reference/environment.md) - Configuración detallada
- [API Documentation](http://localhost:3000/api-docs) - Swagger interactivo
