-- 01-create-tables.sql
-- Crea las tablas principales en el schema por defecto 'public'
-- No usamos schema custom para mantener el template simple y estándar

-- Tabla users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    fullname VARCHAR(100),
    password TEXT NOT NULL,
    level INT DEFAULT 1 NOT NULL,
    active INT DEFAULT 0 NOT NULL,
    affiliate_slug VARCHAR(50) UNIQUE,
    must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
    verification_token TEXT,
    verification_token_expires TIMESTAMP WITH TIME ZONE,
    reset_password_token TEXT,
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    createdate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla refresh_tokens (almacenamiento de tokens de refresco)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de configuraciones generales
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Función para los triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_upd_system_settings BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
