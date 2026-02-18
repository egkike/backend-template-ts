-- 03-seed-data.sql

-- Inserta datos iniciales en la tabla users (en schema 'public' por defecto)
-- Hash password = UnaNuevaClaveSegura2026! (Se recomienda cambiar por un hash propio en producción. Tomar en cuenta el PASSWORD_PEPPER)
INSERT INTO users (username, password, email, fullname, level, active, must_change_password) VALUES 
('admin', '$2b$12$7OR1Xy6A2.hqaskZjOizle13AcMRLUVBH//NKR40MyeQJx4//CeSq', 'admin@app.com', 'Super Administrador de App', 99, 1, false)
ON CONFLICT (username) DO NOTHING;

-- Configuración de Niveles de Usuarios del sistema
INSERT INTO system_settings (key, value, description) VALUES 
('user_levels', '{"GUEST": 0, "USER": 1, "STAFF": 5, "ADMIN": 99}', 'Mapeo de niveles de permisos y roles')
ON CONFLICT (key) DO NOTHING;
