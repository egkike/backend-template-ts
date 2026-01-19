import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller.ts';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware.ts';

const router = Router();

// Instanciamos directamente (sin dbModel)
const authController = new AuthController();

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Inicia sesión y genera tokens de acceso y refresco
 *     tags: [Auth]
 *     description: |
 *       Autentica al usuario con username o email + contraseña.
 *       Devuelve datos públicos del usuario y establece cookies HttpOnly:
 *       - access_token (15 min)
 *       - refresh_token (7 días)
 *
 *       Si es el primer login del usuario (contraseña temporal), devuelve 403 con indicador para cambiar contraseña.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: testuser2
 *                 description: Nombre de usuario (opcional si se usa email)
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test2@ejemplo.com
 *                 description: Email (opcional si se usa username)
 *               password:
 *                 type: string
 *                 example: Password123!
 *                 description: Contraseña
 *     responses:
 *       200:
 *         description: Login exitoso (usuario ya activo)
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookies HttpOnly access_token y refresh_token
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
 *                       example: 1
 *                     active:
 *                       type: integer
 *                       example: 1
 *                     must_change_password:
 *                       type: boolean
 *                       example: false
 *                     createdate:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: Usuario pendiente de cambio de contraseña inicial
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Debes cambiar la contraseña en tu primer login"
 *                 mustChangePassword:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Tu cuenta requiere cambio de contraseña inicial. Usa /user/chgpass."
 *       400:
 *         description: Datos inválidos o contraseña débil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Cierra la sesión del usuario
 *     tags: [Auth]
 *     description: |
 *       Elimina las cookies de access_token y refresh_token del navegador.
 *       Invalida el refresh token en la base de datos (revocación real).
 *       Requiere que el usuario esté autenticado (access_token válido).
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
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
 *                   example: "Sesión cerrada correctamente"
 *       401:
 *         description: No autorizado (token inválido o ausente)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', jwtAuthMiddleware, authController.logout); // ← Agrega jwtAuthMiddleware aquí

export default router;
