-- 03-seed-data.sql

-- Inserta datos iniciales en la tabla users (en schema 'public' por defecto)
-- Ingresa con UnaNuevaClaveSegura2026! (Se recomienda cambiar por uno propio en producción). 
-- El pimienta usado fue: "App_SecurE_StronG_PeppeR_2026_!" (Se recomienda cambiar el pimienta y generar pass a partir de ahi).
INSERT INTO users (username, password, email, fullname, level, active, must_change_password) VALUES 
('admin_app', '$2b$12$IN2ti71A/NuhtlX1APZmDuiogRT6StubhjLKbqcPlhM2NnlBB8kPS', 'admin@app.com', 'Super Administrador de App', 99, 1, false)
ON CONFLICT (username) DO NOTHING;

-- Configuración de Niveles de Usuarios del sistema
INSERT INTO system_settings (key, value, description) VALUES 
('user_levels', '{"GUEST": 0, "USER": 1, "STAFF": 5, "ADMIN": 99}', 'Mapeo de niveles de permisos y roles')
ON CONFLICT (key) DO NOTHING;
