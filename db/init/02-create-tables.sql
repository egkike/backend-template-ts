CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Crear la extencion para habilitar uuid_generate_v4()

-- Crea la tabla users:
CREATE TABLE IF NOT EXISTS template.users (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
username VARCHAR(50) UNIQUE NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
fullname VARCHAR(100),
password TEXT NOT NULL,
level INT DEFAULT 1 NOT null,
active INT DEFAULT 0 NOT NULL,
must_change_password BOOLEAN DEFAULT TRUE NOT null,
createdate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crea la tabla refresh_tokens (si no existe)
CREATE TABLE IF NOT EXISTS template.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES template.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP WITH TIME ZONE
);
