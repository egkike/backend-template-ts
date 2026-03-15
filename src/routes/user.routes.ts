import { Router } from 'express';

import { UserController } from '../controllers/user.controller';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware';
import { restrictTo } from '../middlewares/auth/role.middleware';
import { enforceFullAuth } from '../middlewares/auth/password.middleware';

const router = Router();
const userController = new UserController();

// --- RUTAS PROTEGIDAS ---
router.use(jwtAuthMiddleware);
router.use(enforceFullAuth);

/**
 * @swagger
 * /api/session:
 *   get:
 *     summary: Obtiene la sesión actual del usuario autenticado
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/session', userController.getSession.bind(userController));

/**
 * @swagger
 * /api/profile/change-password:
 *   patch:
 *     summary: Cambia la contraseña del usuario autenticado (requiere contraseña actual)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - password
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 description: Contraseña actual del usuario
 *                 example: PasswordActual123!
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: NuevaPassword456!
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookies de auth cleared
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
 *                   example: Contraseña actualizada. Inicia sesión con tus nuevas credenciales.
 *       400:
 *         description: Datos inválidos o contraseña no cumple requisitos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: La contraseña actual es incorrecta
 */
router.patch('/profile/change-password', userController.changeMyPassword.bind(userController));

/**
 * @swagger
 * /api/user/create:
 *   post:
 *     summary: Crea un nuevo usuario (solo STAFF+)
 *     tags: [Users]
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
 *               - email
 *               - password
 *               - fullname
 *             properties:
 *               username:
 *                 type: string
 *                 example: nuevo_usuario
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nuevo@ejemplo.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *               fullname:
 *                 type: string
 *                 example: Juan Pérez
 *               level:
 *                 type: number
 *                 example: 1
 *                 description: Nivel de permisos (1=USER, 5=STAFF, 99=ADMIN)
 *               captchaToken:
 *                 type: string
 *                 description: Token de reCAPTCHA v3 (requerido en producción)
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
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
 *                   example: Usuario registrado. Por favor verifica tu email para activar la cuenta.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos o contraseña débil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Permisos insuficientes o reCAPTCHA fallido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/user/create', restrictTo('STAFF'), userController.createUser.bind(userController));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lista todos los usuarios (solo STAFF+)
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
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
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Permisos insuficientes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users', restrictTo('STAFF'), userController.getUsers.bind(userController));

/**
 * @swagger
 * /api/user/getbyid:
 *   post:
 *     summary: Obtiene un usuario por su ID (solo STAFF+)
 *     tags: [Users]
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
 *                 description: ID del usuario
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: ID requerido
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
router.post('/user/getbyid', restrictTo('STAFF'), userController.getById.bind(userController));

/**
 * @swagger
 * /api/user/update:
 *   patch:
 *     summary: Actualiza un usuario existente (solo STAFF+)
 *     tags: [Users]
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
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               fullname:
 *                 type: string
 *                 example: Juan Pérez Actualizado
 *               level:
 *                 type: number
 *                 example: 5
 *                 description: Nivel de permisos (1=USER, 5=STAFF, 99=ADMIN)
 *               active:
 *                 type: number
 *                 example: 1
 *                 description: Estado de la cuenta (0=inactivo, 1=activo)
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Datos inválidos
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
router.patch('/user/update', restrictTo('STAFF'), userController.updUser.bind(userController));

/**
 * @swagger
 * /api/user/chgpass-admin:
 *   patch:
 *     summary: Resetea la contraseña de un usuario (solo STAFF+)
 *     tags: [Users]
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
 *                 description: ID del usuario objetivo
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: NuevaPass123!
 *     responses:
 *       200:
 *         description: Contraseña reseteada exitosamente
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
 *                   example: Contraseña reseteada exitosamente por el administrador.
 *       400:
 *         description: Datos inválidos o contraseña débil
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
router.patch(
  '/user/chgpass-admin',
  restrictTo('STAFF'),
  userController.chgPassUser.bind(userController)
);

/**
 * @swagger
 * /api/user/delete:
 *   delete:
 *     summary: Elimina un usuario (solo STAFF+)
 *     tags: [Users]
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
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Usuario eliminado exitosamente
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
 *                   example: Usuario eliminado
 *       400:
 *         description: ID requerido
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
router.delete('/user/delete', restrictTo('STAFF'), userController.deleteUser.bind(userController));

export default router;
