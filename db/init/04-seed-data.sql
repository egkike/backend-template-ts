-- Hash password = Admin1 (Se recomienda cambiar por un hash propio)
INSERT INTO template.users (username, password, email, fullname) VALUES 
('admin', '$2b$10$K59x//Okkfudik.Cs6jwmeROognDsr./JA90.oeS4cg3l/l.36OaG', 'admin@midominio.com', 'Usuario Administrador')
ON CONFLICT (username) DO NOTHING;

UPDATE template.users SET level = 5, active = 1, must_change_password = false
WHERE username = 'admin';