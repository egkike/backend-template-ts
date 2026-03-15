# Variables de Entorno

Todas las variables de entorno se validan automáticamente con [Zod](https://zod.dev/) al iniciar la aplicación. Si falta una variable requerida, la app no arrancará.

---

## Servidor

| Variable    | Tipo   | Required | Default | Descripción                                                          |
| ----------- | ------ | -------- | ------- | -------------------------------------------------------------------- |
| `NODE_ENV`  | enum   | ✅       | -       | Entorno: `development`, `production`, `test`                         |
| `PORT`      | number | ❌       | `3000`  | Puerto donde corre el servidor                                       |
| `LOG_LEVEL` | string | ❌       | `info`  | Nivel de logging: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

---

## JWT (Autenticación)

| Variable                 | Tipo   | Required | Default | Descripción                                                                                                |
| ------------------------ | ------ | -------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| `SECRET_JWT_KEY`         | string | ✅       | -       | Clave secreta para firmar access tokens. **Mínimo 32 caracteres**. Generala con: `openssl rand -base64 32` |
| `SECRET_REFRESH_JWT_KEY` | string | ✅       | -       | Clave secreta para refresh tokens. **Distinta** a `SECRET_JWT_KEY`. Mínimo 32 caracteres.                  |
| `JWT_ACCESS_EXPIRY`      | string | ❌       | `15m`   | Tiempo de expiración del access token. Formato: `15m`, `1h`, `30s`                                         |
| `JWT_REFRESH_EXPIRY`     | string | ❌       | `7d`    | Tiempo de expiración del refresh token. Formato: `7d`, `30d`                                               |

> **Security**: Estas claves deben ser únicas por entorno (desarrollo, staging, producción). Nunca las commitees al repositorio.

---

## Base de Datos (PostgreSQL)

| Variable      | Tipo    | Required | Default  | Descripción                                                                   |
| ------------- | ------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `DB_HOST`     | string  | ✅       | -        | Host de PostgreSQL. En Docker: `db` (nombre del servicio). Local: `localhost` |
| `DB_PORT`     | number  | ❌       | `5432`   | Puerto de PostgreSQL                                                          |
| `DB_USER`     | string  | ✅       | -        | Usuario de la base de datos                                                   |
| `DB_PASSWORD` | string  | ✅       | -        | Password del usuario                                                          |
| `DB_NAME`     | string  | ✅       | -        | Nombre de la base de datos                                                    |
| `DB_SCHEMA`   | string  | ❌       | `public` | Schema de PostgreSQL                                                          |
| `DB_SSL`      | boolean | ❌       | `false`  | Usar SSL para conexión (recomendado en producción)                            |

### Docker Compose (valores por defecto)

```env
DB_HOST=db
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=app_db
```

---

## CORS (Cross-Origin Resource Sharing)

| Variable       | Tipo   | Required | Descripción                                                                                            |
| -------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------ |
| `CORS_ORIGINS` | string | ✅       | Lista de origins permitidos separados por coma. Ejemplo: `http://localhost:5173,http://localhost:3000` |

### Desarrollo

```env
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Producción

```env
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com
```

---

## SMTP (Email)

| Variable    | Tipo   | Required | Descripción                                               |
| ----------- | ------ | -------- | --------------------------------------------------------- |
| `SMTP_HOST` | string | ❌       | Servidor SMTP (ej: `smtp.gmail.com`, `smtp.sendgrid.net`) |
| `SMTP_PORT` | number | ❌       | Puerto SMTP (típicamente `587` para TLS, `465` para SSL)  |
| `SMTP_USER` | string | ❌       | Usuario o email para autenticación                        |
| `SMTP_PASS` | string | ❌       | Password o API key                                        |
| `SMTP_FROM` | string | ❌       | Email del remitente (ej: `noreply@tudominio.com`)         |

> **Nota**: Sin configurar SMTP, las funcionalidades de email (verificación, recovery) no funcionarán pero la app arrancará igual.

### Ejemplo: Gmail

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tuemail@gmail.com
SMTP_PASS=tu_app_password
SMTP_FROM=noreply@tudominio.com
```

### Ejemplo: SendGrid

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxx
SMTP_FROM=noreply@tudominio.com
```

---

## reCAPTCHA (Google)

| Variable               | Tipo   | Required | Descripción                                                                           |
| ---------------------- | ------ | -------- | ------------------------------------------------------------------------------------- |
| `RECAPTCHA_SECRET_KEY` | string | ❌       | Secret key de Google reCAPTCHA v3. Obtenela en https://www.google.com/recaptcha/admin |

Sin esta variable, la verificación de reCAPTCHA se跳过 (skip).

```env
RECAPTCHA_SECRET_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
```

(La key de arriba es la de testing de Google - siempre pasa validación)

---

## Seguridad Adicional

| Variable          | Tipo   | Required | Descripción                                                                                                                              |
| ----------------- | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PASSWORD_PEPPER` | string | ✅       | String arbitraria que se agrega al password antes de hashear (peppering). **Mínimo 32 caracteres**. NO la reutilices en otros proyectos. |

### Generar Password Pepper

```bash
openssl rand -base64 32
```

> **Importante**: Esta variable debe ser consistente entre arranques. Si la cambias, los passwords existentes no servirán.

---

## URLs Externas

| Variable       | Tipo   | Required | Descripción                                                 |
| -------------- | ------ | -------- | ----------------------------------------------------------- |
| `FRONTEND_URL` | string | ❌       | URL del frontend (para generar links de verificación/reset) |
| `API_URL`      | string | ❌       | URL pública de la API (para emails, documentación)          |

```env
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000
```

---

## Ejemplo: `.env` Completo (Desarrollo)

```env
# Servidor
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# JWT
SECRET_JWT_KEY=desarrollo_clave_jwt_muy_larga_32_chars_minimo
SECRET_REFRESH_JWT_KEY=desarrollo_refresh_clave_diferente_tambien_larga
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Database
DB_HOST=db
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=app_db
DB_SCHEMA=public

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# URLs
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:3000

# Security
PASSWORD_PEPPER=pepper_de_desarrollo_largo_32_caracteres_minimo

# SMTP (opcional para dev)
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=

# reCAPTCHA (opcional)
# RECAPTCHA_SECRET_KEY=
```

---

## Ejemplo: `.env` Completo (Producción)

```env
# Servidor
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# JWT
SECRET_JWT_KEY=<genera_con_openssl_rand_base64_32>
SECRET_REFRESH_JWT_KEY=<genera_otra_diferente>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Database
DB_HOST=db.production.internal
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=<password_fuerte>
DB_NAME=app_db
DB_SCHEMA=public
DB_SSL=true

# CORS
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com

# URLs
FRONTEND_URL=https://tudominio.com
API_URL=https://api.tudominio.com

# Security
PASSWORD_PEPPER=<genera_otra_pepper_larga>

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxx
SMTP_FROM=noreply@tudominio.com

# reCAPTCHA
RECAPTCHA_SECRET_KEY=<tu_secret_key>
```

---

## Validación de Entorno

La app valida las variables al iniciar. Si hay un error, verás un mensaje claro:

```
❌ Invalid environment variables:
- SECRET_JWT_KEY: String must contain at least 32 character(s)
- DB_HOST: Required
```

---

## Links Relacionados

- [Setup Local](./guides/setup.md)
- [Arquitectura](./architecture/overview.md)
- [Zod Documentation](https://zod.dev/)
