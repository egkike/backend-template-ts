import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Inicia sesión y genera tokens de acceso y refresco
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *               username:
 *                 type: string
 *                 example: usuario
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MiPassword123!
 *     responses:
 *       200:
 *         description: Login exitoso
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookies HttpOnly con access_token y refresh_token
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
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Credenciales inválidas
 *       403:
 *         description: Cuenta inactiva o requiere cambio de contraseña
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 mustChangePassword:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Debes cambiar la contraseña en tu primer login.
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renueva el access_token usando el refresh_token de las cookies
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Nueva cookie access_token
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
 *                   example: Token renovado
 *       403:
 *         description: Refresh token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cierra la sesión del usuario
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookies de auth expiradas
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
 *                   example: Sesión cerrada correctamente
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', jwtAuthMiddleware, authController.logout.bind(authController));

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verifica la cuenta del usuario mediante un token enviado por email
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de verificación enviado al email
 *         example: abc123def456...
 *     responses:
 *       200:
 *         description: Cuenta verificada exitosamente
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
 *                   example: Cuenta activada correctamente. Ya puedes iniciar sesión.
 *       400:
 *         description: Token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/verify-email', authController.verifyEmail.bind(authController));

/**
 * @swagger
 * /api/auth/change-password-first-login:
 *   post:
 *     summary: Cambio de contraseña obligatorio en el primer ingreso
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña que cumple los requisitos de seguridad
 *                 example: NuevaPassword123!
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
 *                   example: Contraseña actualizada. Ahora puedes iniciar sesión normalmente.
 *       400:
 *         description: Contraseña no cumple requisitos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.
 */
router.post(
  '/change-password-first-login',
  jwtAuthMiddleware,
  authController.changePasswordFirstLogin.bind(authController)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicita un enlace de recuperación de contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@ejemplo.com
 *     responses:
 *       200:
 *         description: Email de recuperación enviado (si el email existe)
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
 *                   example: Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
 *       400:
 *         description: Email requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Cambia la contraseña usando el token de recuperación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token de recuperación recibido por email
 *                 example: abc123def456...
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Nueva contraseña
 *                 example: NuevaPassword123!
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
 *                   example: Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.
 *       400:
 *         description: Token inválido o contraseña no cumple requisitos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/reset-password', authController.resetPassword.bind(authController));

export default router;
