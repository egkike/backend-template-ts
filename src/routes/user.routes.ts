import { Router } from 'express';

import { UserController } from '../controllers/user.controller';
import { AuthController } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middlewares/auth/jwt.middleware';
import { restrictTo } from '../middlewares/auth/role.middleware';
import { enforceFullAuth } from '../middlewares/auth/password.middleware';

const router = Router();
const userController = new UserController();
const authController = new AuthController(); // Instanciamos para usar su refresh

// --- RUTAS PROTEGIDAS ---
router.use(jwtAuthMiddleware);
router.use(enforceFullAuth);

/**
 * Gestión de Perfil (Cualquier usuario logueado)
 */
router.get('/session', userController.getSession.bind(userController));
router.patch('/profile/change-password', userController.changeMyPassword.bind(userController));

/**
 * Rutas Administrativas (Solo Level >= STAFF)
 */
router.get('/users', restrictTo('STAFF'), userController.getUsers.bind(userController));
router.post('/user/getbyid', restrictTo('STAFF'), userController.getById.bind(userController));
router.patch('/user/update', restrictTo('STAFF'), userController.updUser.bind(userController));
router.patch('/user/chgpass-admin', restrictTo('STAFF'), userController.chgPassUser.bind(userController));
router.delete('/user/delete', restrictTo('STAFF'), userController.deleteUser.bind(userController));

/**
 * Refresh Token (Centralizado en AuthController)
 * Eliminamos todo el código manual que tenías aquí y usamos el controlador
 */
router.post('/refresh', authController.refresh.bind(authController));

export default router;
