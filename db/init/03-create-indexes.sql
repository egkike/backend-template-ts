-- 03-create-indexes.sql
-- Crea índices útiles sobre las tablas principales (en schema 'public' por defecto)
-- No usamos schema custom para mantener el template simple y estándar

-- Índices en tabla users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Índices recomendados en tabla refresh_tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
  ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at 
  ON refresh_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked 
  ON refresh_tokens (revoked);

-- Opcional: índice para limpieza periódica de tokens expirados no revocados
CREATE INDEX idx_refresh_tokens_cleanup ON refresh_tokens (expires_at) WHERE revoked = FALSE;