import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { validatePartialUser } from '../schemas/users';
import logger from '../utils/logger';
import { config } from '../config/index';
// CORRECCIÓN: Importamos UserWithPassword explícitamente
import { userRepository, type UserWithPassword } from '../repositories/user.repository';
import { AppError } from '../errors/AppError';

export class AuthController {
  async login(req: Request, res: Response) {
    const { username, email, password } = req.body;

    const input = username ? { username, password } : { email, password };
    const validation = validatePartialUser(input);
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const identifier = username || email;
    const user = await userRepository.findByCredentials(identifier);

    if (!user) {
      logger.warn({ identifier }, 'Intento de login: Usuario no encontrado');
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn({ identifier }, 'Intento de login: Password incorrecto');
      throw new AppError('Credenciales inválidas', 401);
    }

    if (user.active === 0) {
      throw new AppError('Usuario inactivo. Contacta al administrador.', 403);
    }

    if (user.must_change_password) {
      const tempToken = generateAccessToken({ id: user.id, username: user.username });
      res.cookie('access_token', tempToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
      });

      return res.status(403).json({
        success: false,
        mustChangePassword: true,
        message: 'Debes cambiar la contraseña en tu primer login.',
      });
    }

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      level: user.level,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await userRepository.saveRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    const cookieOptions = {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };

    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // CORRECCIÓN: Quitamos el password para la respuesta
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...publicUser } = user as UserWithPassword;
    return res.status(200).json({ success: true, user: publicUser });
  }

  async logout(req: Request, res: Response) {
    const user = (req as any).user;

    // Si el linter sigue chillando aquí, asegúrate de que el archivo
    // user.repository.ts tenga el método revokeRefreshToken y esté guardado.
    if (user?.id) {
      await userRepository.revokeRefreshToken(user.id);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
  }
}
