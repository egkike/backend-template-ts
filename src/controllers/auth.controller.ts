import { Request, Response } from 'express';

import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { validatePartialUser } from '../schemas/users.js';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';
import userRepository from '../repositories/user.repository.js';
import { AppError } from '../errors/AppError.js';

export class AuthController {
  async login(req: Request, res: Response) {
    const { username = '', email = '', password } = req.body;

    const input = username ? { username, password } : { email, password };
    const validation = validatePartialUser(input);
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const userResult = await userRepository.login(input);

    // Caso especial: debe cambiar contraseña
    if (
      'error' in userResult &&
      userResult.error === 'Debes cambiar la contraseña en tu primer login'
    ) {
      return res.status(403).json({
        success: false,
        error: userResult.error,
        mustChangePassword: true,
        message:
          'Tu cuenta requiere cambio de contraseña inicial. Usa /user/chgpass con el access_token actual.',
      });
    }

    // Error normal (credenciales inválidas, usuario no existe, etc.)
    if ('error' in userResult || !userResult) {
      logger.warn({ input: { ...input, password: '***' } }, 'Intento de login fallido');
      throw new AppError('Credenciales inválidas', 401);
    }

    // Ahora sí: userResult es el usuario válido
    const user = userResult;

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      level: user.level,
      active: user.active,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await userRepository.saveRefreshToken({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password: _, ...publicUser } = user;
    return res.status(200).json({ success: true, user: publicUser });
  }

  logout(req: Request, res: Response) {
    const user = (req as any).user;

    if (user) {
      userRepository.revokeRefreshToken(user.id);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
  }
}
