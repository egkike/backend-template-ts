import { Router } from 'express';

import { UserController } from '../controllers/user.controller';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware';
import { restrictTo } from '../middlewares/auth/role.middleware';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import userRepository from '../repositories/user.repository';

const router = Router();

// Middleware de autenticación para todas las rutas protegidas
router.use(jwtAuthMiddleware);

// Instanciamos directamente el controlador
const userController = new UserController();

// Rutas protegidas

/**
 * @swagger
 * /api/session:
 *   get:
 *     summary: Obtiene la información de la sesión actual (usuario autenticado)
 *     tags: [Auth]
 *     description: |
 *       Devuelve los datos del usuario actualmente autenticado.  
 *       Requiere access_token válido en la cookie HttpOnly.  
 *       No necesita body ni parámetros adicionales.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Datos de la sesión activa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "aea25ba5-0cff-4963-aa6c-e280cfec05cf"
 *                     username:
 *                       type: string
 *                       example: "admin"
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "admin@midominio.com"
 *                     fullname:
 *                       type: string
 *                       example: "Usuario Administrador"
 *                     level:
 *                       type: integer
 *                       example: 5
 *                     active:
 *                       type: integer
 *                       example: 1
 *                     iat:
 *                       type: integer
 *                       description: Timestamp de emisión del token
 *                     exp:
 *                       type: integer
 *                       description: Timestamp de expiración del token
 *       401:
 *         description: No autorizado (token inválido, expirado o ausente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/session', userController.getSession);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos los usuarios (con filtros opcionales)
 *     tags: [Users]
 *     description: Requiere permisos administrativos (level >= 5)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: Filtrar por estado activo (0 = inactivo, 1 = activo)
 *       - in: query
 *         name: level
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 10
 *         description: Filtrar por nivel de usuario
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página (paginación)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       username:
 *                         type: string
 *                       email:
 *                         type: string
 *                       fullname:
 *                         type: string
 *                       level:
 *                         type: integer
 *                       active:
 *                         type: integer
 *                       must_change_password:
 *                         type: boolean
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users', restrictTo(5), userController.getUsers); // Solo level >= 5

/**
 * @swagger
 * /api/user/getbyid:
 *   post:
 *     summary: Obtiene los detalles de un usuario por su ID
 *     tags: [Users]
 *     description: |
 *       Requiere autenticación JWT (access_token en cookie).
 *       El ID del usuario se envía en el body de la petición (no en la URL).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario a consultar (UUID)
 *                 example: "aea25ba5-0cff-4963-aa6c-e280cfec05cf"
 *     responses:
 *       200:
 *         description: Detalles del usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullname:
 *                       type: string
 *                     level:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     must_change_password:
 *                       type: boolean
 *                     createdate:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: ID no proporcionado o inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado (token inválido o ausente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/user/getbyid', userController.getById);

/**
 * @swagger
 * /api/user/create:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Users]
 *     description: Requiere autenticación y permisos administrativos (level >= 5)
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - email
 *               - fullname
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 4
 *                 description: Nombre de usuario único
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Contraseña (debe cumplir requisitos de seguridad)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email válido y único
 *               fullname:
 *                 type: string
 *                 minLength: 4
 *                 description: Nombre completo
 *     responses:
 *       201:
 *         description: Usuario creado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullname:
 *                       type: string
 *                     level:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     must_change_password:
 *                       type: boolean
 *       400:
 *         description: Datos inválidos o contraseña débil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Username o email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/user/create', restrictTo(5), userController.createUser); // Solo level >= 5

/**
 * @swagger
 * /api/user/update:
 *   patch:
 *     summary: Actualiza datos de un usuario
 *     tags: [Users]
 *     description: |
 *       Requiere autenticación y permisos (level >= 5).  
 *       Solo actualiza los campos enviados (fullname, level, active).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario a actualizar
 *                 example: "aea25ba5-0cff-4963-aa6c-e280cfec05cf"
 *               fullname:
 *                 type: string
 *                 minLength: 4
 *                 description: Nuevo nombre completo (opcional)
 *               level:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Nuevo nivel de permisos (opcional)
 *               active:
 *                 type: integer
 *                 enum: [0, 1]
 *                 description: Estado activo (0 = inactivo, 1 = activo) (opcional)
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     fullname:
 *                       type: string
 *                     level:
 *                       type: integer
 *                     active:
 *                       type: integer
 *                     must_change_password:
 *                       type: boolean
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/user/update', restrictTo(5), userController.updUser); // Solo level >= 5

/**
 * @swagger
 * /api/user/chgpass:
 *   patch:
 *     summary: Cambia la contraseña del usuario
 *     tags: [Users]
 *     description: |
 *       Requiere autenticación JWT y permisos adecuados (level >= 5).  
 *       La nueva contraseña debe cumplir requisitos de seguridad.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - password
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario cuyo password se cambia
 *                 example: "aea25ba5-0cff-4963-aa6c-e280cfec05cf"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Nueva contraseña (debe tener mayúscula, minúscula, número y carácter especial)
 *                 example: "NewPass123!"
 *     responses:
 *       200:
 *         description: Contraseña actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Contraseña actualizada correctamente"
 *       400:
 *         description: ID/contraseña no proporcionados o contraseña débil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/user/chgpass', restrictTo(5), userController.chgPassUser); // Solo level >= 5

/**
 * @swagger
 * /api/user/delete:
 *   delete:
 *     summary: Elimina un usuario por ID
 *     tags: [Users]
 *     description: |
 *       Requiere autenticación y permisos administrativos (level >= 5).  
 *       El ID se envía en el body.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 format: uuid
 *                 description: ID del usuario a eliminar
 *                 example: "aea25ba5-0cff-4963-aa6c-e280cfec05cf"
 *     responses:
 *       200:
 *         description: Usuario eliminado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Usuario eliminado correctamente"
 *       400:
 *         description: ID no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: No tienes permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/user/delete', restrictTo(5), userController.deleteUser); // Solo level >= 5

/**
 * @swagger
 * /api/refresh:
 *   post:
 *     summary: Refresca el access token usando el refresh token
 *     tags: [Refresh]
 *     description: |
 *       Genera nuevos access_token y refresh_token (rotación).  
 *       Requiere que el refresh_token esté presente en las cookies y sea válido/no revocado.  
 *       Actualiza las cookies en la respuesta.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tokens refrescados correctamente
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Nuevas cookies HttpOnly access_token y refresh_token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tokens refrescados"
 *       401:
 *         description: Refresh token requerido, inválido, expirado o revocado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh token requerido' });
  }

  const userId = await userRepository.validateRefreshToken(refreshToken);

  if (!userId) {
    return res
      .status(401)
      .json({ success: false, error: 'Refresh token inválido, expirado o revocado' });
  }

  const user = await userRepository.getById(userId);
  if ('error' in user) {
    return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullname: user.fullname,
    level: user.level,
    active: user.active,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  await userRepository.saveRefreshToken({
    userId: user.id,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Revocamos el viejo inmediatamente (mejor seguridad)
  //await userRepository.revokeRefreshToken(user.id);

  res.cookie('access_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({ success: true, message: 'Tokens refrescados' });
});

export default router;
