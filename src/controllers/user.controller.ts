import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import { validatePartialUser, validatePasswordDetailed } from '../schemas/users.schema';
import { CaptchaService } from '../services/captcha.service';
import { userRepository } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { config } from '../config/index';
import { AppError } from '../errors/AppError';
import logger from '../utils/logger';

export class UserController {
  getSession(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  }

  async getUsers(_req: Request, res: Response) {
    const users = await userRepository.getUsers();
    return res.status(200).json({ success: true, users });
  }

  async getById(req: Request, res: Response) {
    const { id } = req.body;
    if (!id) throw new AppError('ID requerido', 400);

    const user = await userRepository.getById(id);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return res.status(200).json({ success: true, user });
  }

  async createUser(req: Request, res: Response) {
    const { captchaToken, ...userData } = req.body;

    // 1. Validar Captcha en registro manual
    if (config.nodeEnv === 'production') {
      if (!config.recaptchaSecretKey) {
        throw new AppError('Configuración de seguridad faltante en producción', 500);
      }
      const isHuman = await CaptchaService.verifyToken(captchaToken);
      if (!isHuman) throw new AppError('Fallo en la validación de seguridad', 403);
    }

    const validation = validatePartialUser(userData);
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const { password, email, fullname, level, username } = validation.data;
    if (!password) throw new AppError('La contraseña es requerida', 400);

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    // 1. Crear usuario (active = 0 + token)
    const newUser = await userRepository.createUser({
      username,
      password: password!,
      email: email!,
      fullname: fullname!,
      level: level || 1,
    });

    // 2. Enviar email de verificación
    EmailService.sendVerificationEmail(
      newUser.email,
      newUser.fullname,
      newUser.verificationToken
    ).catch(err => logger.error('Error enviando email: ' + err.message));

    // Quitamos password y token de la respuesta pública
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, verificationToken: __, ...publicUser } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado. Por favor verifica tu email para activar la cuenta.',
      user: publicUser,
    });
  }

  async verifyEmail(req: Request, res: Response) {
    const { token } = req.query;
    if (!token) throw new AppError('Token de verificación requerido', 400);

    const success = await userRepository.verifyAccount(token as string);
    if (!success) {
      throw new AppError('Token inválido o expirado. Solicita uno nuevo.', 400);
    }

    return res.status(200).json({
      success: true,
      message: 'Cuenta activada correctamente. Ya puedes iniciar sesión.',
    });
  }

  async updUser(req: Request, res: Response) {
    const { id, fullname, level, active } = req.body;
    if (!id) throw new AppError('ID requerido', 400);

    // 1. Validamos los datos (esto devuelve un objeto que puede tener campos undefined)
    const validation = validatePartialUser({ fullname, level, active });
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    // 2. CREAMOS UN OBJETO LIMPIO: Solo incluimos lo que NO es undefined
    // Esto satisface la restricción de 'exactOptionalPropertyTypes'
    const updateData: any = {}; // Usamos any temporalmente para la construcción o definimos el tipo
    if (validation.data.fullname !== undefined) updateData.fullname = validation.data.fullname;
    if (validation.data.level !== undefined) updateData.level = validation.data.level;
    if (validation.data.active !== undefined) updateData.active = validation.data.active;

    // 3. Pasamos el objeto limpio al repositorio
    const updated = await userRepository.updUser({
      id,
      input: updateData,
    });

    if (!updated) throw new AppError('Usuario no encontrado', 404);

    return res.status(200).json({ success: true, user: updated });
  }

  /**
   * EL ADMIN resetea la contraseña de un tercero (NO requiere clave anterior)
   * RUTA: PATCH /api/user/chgpass-admin
   */
  async chgPassUser(req: Request, res: Response) {
    const { id, password } = req.body; // Solo recibimos el ID del objetivo y la nueva pass

    if (!id || !password) {
      throw new AppError('ID de usuario y nueva contraseña son requeridos', 400);
    }

    const user = await userRepository.getById(id);
    if (!user) throw new AppError('El usuario que intentas modificar no existe', 404);

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) throw new AppError('La nueva contraseña no cumple los requisitos', 400);

    // Actualizamos
    await userRepository.chgPassUser({ id, input: { password } });

    logger.info(
      { adminId: req.user?.id, targetUserId: id }, // Acceso seguro
      'Admin reseteó contraseña de usuario'
    );

    return res.status(200).json({
      success: true,
      message: 'Contraseña reseteada exitosamente por el administrador.',
    });
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.body;
    if (!id) throw new AppError('ID requerido', 400);

    const success = await userRepository.deleteUser(id);
    if (!success) throw new AppError('Usuario no encontrado', 404);

    return res.status(200).json({ success: true, message: 'Usuario eliminado' });
  }

  /**
   * EL USUARIO cambia su propia contraseña (requiere validar la anterior)
   * RUTA: PATCH /api/profile/change-password
   */
  async changeMyPassword(req: Request, res: Response) {
    const { oldPassword, password } = req.body;
    const { user: reqUser } = req;

    // Si reqUser es undefined, lanzamos error antes de usarlo
    if (!reqUser) {
      throw new AppError('Usuario no identificado', 401);
    }

    if (!password || !oldPassword) {
      throw new AppError('Contraseña actual y nueva son requeridas', 400);
    }

    const user = await userRepository.findByCredentials(reqUser.email);
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const isOldValid = await bcrypt.compare(oldPassword + config.passwordPepper, user.password);
    if (!isOldValid) throw new AppError('La contraseña actual es incorrecta', 401);

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) throw new AppError(pwdCheck.errors.join('; '), 400);

    await userRepository.chgPassUser({ id: user.id, input: { password } });

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada. Inicia sesión con tus nuevas credenciales.',
    });
  }
}
