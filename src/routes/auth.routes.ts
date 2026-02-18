import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/verify-email:
 * get:
 * summary: Verifica la cuenta del usuario mediante un token enviado por email
 * tags: [Auth]
 */
router.get('/verify-email', authController.verifyEmail.bind(authController));

/**
 * @swagger
 * /api/auth/login:
 * post:
 * summary: Inicia sesión y genera tokens de acceso y refresco
 * tags: [Auth]
 */
router.post('/login', authController.login.bind(authController));

/**
 * @swagger
 * /api/auth/refresh:
 * post:
 * summary: Renueva el access_token usando el refresh_token de las cookies
 * tags: [Auth]
 */
// 2. Añadimos el refresh (que ya estaba en tu controlador)
router.post('/refresh', authController.refresh.bind(authController));

/**
 * @swagger
 * /api/auth/logout:
 * post:
 * summary: Cierra la sesión del usuario
 * tags: [Auth]
 */
router.post('/logout', jwtAuthMiddleware, authController.logout.bind(authController));

/**
 * @swagger
 * /api/auth/change-password-first-login:
 * post:
 * summary: Cambio de contraseña obligatorio en el primer ingreso
 * tags: [Auth]
 */
router.post('/change-password-first-login', jwtAuthMiddleware, authController.changePasswordFirstLogin.bind(authController));

/**
 * @swagger
 * /api/auth/forgot-password:
 * post:
 * summary: Solicita un enlace de recuperación de contraseña
 * tags: [Auth]
 */
router.post('/forgot-password', authController.forgotPassword.bind(authController));

/**
 * @swagger
 * /api/auth/reset-password:
 * post:
 * summary: Cambia la contraseña usando el token de recuperación
 * tags: [Auth]
 */
router.post('/reset-password', authController.resetPassword.bind(authController));

export default router;
