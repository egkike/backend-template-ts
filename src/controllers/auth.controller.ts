import crypto from 'crypto';

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  cleanPayload,
} from '../utils/jwt';
import { validatePasswordDetailed } from '../schemas/users.schema';
import logger from '../utils/logger';
import { config } from '../config/index';
import { userRepository, type UserWithPassword } from '../repositories/user.repository';
import { EmailService } from '../services/email.service';
import { AppError } from '../errors/AppError';

export class AuthController {
  async login(req: Request, res: Response) {
    const { username, email, password } = req.body;

    // Si el frontend ya no envía username, el identifier será el email
    const identifier = email || username;

    if (!identifier || !password) {
      throw new AppError('Email y contraseña son requeridos', 400);
    }

    const user = await userRepository.findByCredentials(identifier);

    if (!user) {
      logger.warn({ identifier }, 'Intento de login: Usuario no encontrado');
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await bcrypt.compare(password + config.passwordPepper, user.password);

    if (!isValidPassword) {
      logger.warn({ identifier }, 'Intento de login: Password incorrecto');
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.active === 0) {
      throw new AppError('Cuenta no verificada o inactiva. Revisa tu email.', 403);
    }

    const sameSiteValue = config.nodeEnv === 'production' ? 'strict' : 'lax';

    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: sameSiteValue as 'strict' | 'lax',
      path: '/',
    };

    if (user.must_change_password) {
      const tempToken = generateAccessToken({
        id: user.id,
        username: user.username,
        partial: true,
      } as any);

      res.cookie('access_token', tempToken, cookieOptions);

      return res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: 'Debes cambiar la contraseña en tu primer login.',
      });
    }

    const payload = cleanPayload({
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      level: user.level,
      active: user.active,
    });

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Usamos los tiempos centralizados en config
    await userRepository.saveRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + config.jwt.refreshTokenMaxAge)
    );

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: config.jwt.accessTokenMaxAge,
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: config.jwt.refreshTokenMaxAge,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...publicUser } = user as UserWithPassword;
    return res.status(200).json({ success: true, user: publicUser });
  }

  async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refresh_token;

    if (refreshToken) {
      await userRepository.deleteSpecificRefreshToken(refreshToken);
    }

    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
  }

  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refresh_token;

      if (!refreshToken) {
        throw new AppError('Refresh token no proporcionado', 401);
      }

      const tokenData = await userRepository.findRefreshToken(refreshToken);
      if (!tokenData) {
        throw new AppError('Token inválido o expirado', 403);
      }

      const decoded = verifyRefreshToken(refreshToken) as any;
      const cleanData = cleanPayload(decoded); // <--- Limpia iat y exp

      const newAccessToken = generateAccessToken(cleanData);

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
        path: '/',
        maxAge: config.jwt.accessTokenMaxAge,
      });

      return res.status(200).json({ success: true, message: 'Token renovado' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error en Auth Refresh');
      throw new AppError('No se pudo renovar la sesión', 403);
    }
  }

  async changePasswordFirstLogin(req: Request, res: Response) {
    const { password } = req.body;
    const user = (req as any).user;

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors.join('; '), 400);
    }

    const passwordWithPepper = password + config.passwordPepper;
    const passwordHash = await bcrypt.hash(passwordWithPepper, 12);

    const success = await userRepository.updatePasswordAndClearFlag(user.id, passwordHash);

    if (!success) throw new AppError('No se pudo actualizar la contraseña', 500);

    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Contraseña actualizada. Ahora puedes iniciar sesión normalmente.',
    });
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      if (!email) throw new AppError('Email requerido', 400);

      const user = await userRepository.findByCredentials(email);

      // Estrategia de seguridad: No confirmamos si el email existe o no
      if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hora de validez

        await userRepository.saveResetToken(email, token, expires);

        // No bloqueamos la respuesta esperando al email
        EmailService.sendResetPasswordEmail(email, user.fullname, token).catch(err =>
          logger.error({ err: err.message, email }, 'Error enviando reset password email')
        );
      }

      res.json({
        success: true,
        message: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      if (!token || !password) throw new AppError('Token y nueva contraseña requeridos', 400);

      const pwdCheck = validatePasswordDetailed(password);
      if (!pwdCheck.valid) {
        throw new AppError(pwdCheck.errors.join('; '), 400);
      }

      // Aplicamos Pepper + Hash
      const passwordWithPepper = password + config.passwordPepper;
      const hash = await bcrypt.hash(passwordWithPepper, 12);

      const success = await userRepository.resetPasswordByToken(token, hash);

      if (!success) {
        throw new AppError('El enlace es inválido o ha expirado.', 400);
      }

      res.json({
        success: true,
        message: 'Tu contraseña ha sido actualizada. Ya puedes iniciar sesión.',
      });
    } catch (error) {
      next(error);
    }
  }
}
