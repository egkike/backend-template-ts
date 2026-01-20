-- 02-create-tables.sql
-- Crea las tablas principales en el schema por defecto 'public'
-- No usamos schema custom para mantener el template simple y estándar

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Habilitar uuid_generate_v4()

-- Tabla users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    fullname VARCHAR(100),
    password TEXT NOT NULL,
    level INT DEFAULT 1 NOT NULL,
    active INT DEFAULT 0 NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
    createdate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla refresh_tokens (almacenamiento de tokens de refresco)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);