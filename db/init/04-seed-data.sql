-- 04-seed-data.sql
-- Inserta datos iniciales de prueba en la tabla users (en schema 'public' por defecto)
-- Hash password = Admin1 (Se recomienda cambiar por un hash propio en producción)

INSERT INTO users (username, password, email, fullname) VALUES 
('admin', '$2b$10$K59x//Okkfudik.Cs6jwmeROognDsr./JA90.oeS4cg3l/l.36OaG', 'admin@midominio.com', 'Usuario Administrador')
ON CONFLICT (username) DO NOTHING;

UPDATE users SET level = 5, active = 1, must_change_password = false
WHERE username = 'admin';