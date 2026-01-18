-- Crea indices sobre la tabla users:
CREATE INDEX idx_users_username ON template.users(username);
CREATE INDEX idx_users_email ON template.users(email);

-- Índices recomendados sobre la tabla refresh_tokens:
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id 
  ON template.refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at 
  ON template.refresh_tokens (expires_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked 
  ON template.refresh_tokens (revoked);

-- Opcional: índice para limpieza periódica de expirados
CREATE INDEX idx_refresh_tokens_cleanup ON template.refresh_tokens (expires_at) WHERE revoked = FALSE;
