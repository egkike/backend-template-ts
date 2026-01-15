import { Request, Response } from 'express';

import { validatePartialUser, validatePasswordDetailed } from '../schemas/users.ts';
import logger from '../utils/logger.ts';
import userRepository from '../repositories/user.repository.ts';
import { AppError } from '../errors/AppError.ts';

export class UserController {
  getSession(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  }

  async getUsers(_req: Request, res: Response) {
    const result = await userRepository.getUsers();

    if ('error' in result) {
      throw new AppError(result.error, 404);
    }

    return res.status(200).json({ success: true, users: result });
  }

  async getById(req: Request, res: Response) {
    const { id } = req.body;

    if (!id) {
      throw new AppError('ID requerido', 400);
    }

    const user = await userRepository.getById(id);

    if ('error' in user) {
      throw new AppError(user.error, 404);
    }

    return res.status(200).json({ success: true, user });
  }

  async createUser(req: Request, res: Response) {
    const validation = validatePartialUser(req.body);
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const pwdCheck = validatePasswordDetailed(validation.data.password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    const newUser = await userRepository.createUser(validation.data);

    if ('error' in newUser) {
      throw new AppError(newUser.error, 409);
    }

    const { password: _, ...publicUser } = newUser;
    return res.status(201).json({ success: true, user: publicUser });
  }

  async updUser(req: Request, res: Response) {
    const { id, fullname, level, active } = req.body;

    if (!id) {
      throw new AppError('ID requerido', 400);
    }

    const validation = validatePartialUser({ fullname, level, active });
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const updated = await userRepository.updUser({ id, input: validation.data });

    if ('error' in updated) {
      throw new AppError(updated.error, 404);
    }

    return res.status(200).json({ success: true, user: updated });
  }

  async chgPassUser(req: Request, res: Response) {
    const { id, password } = req.body;

    if (!id || !password) {
      throw new AppError('ID y contraseña requeridos', 400);
    }

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    const result = await userRepository.chgPassUser({ id, input: { password } });

    if ('error' in result) {
      throw new AppError(result.error, 404);
    }

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.body;

    if (!id) {
      throw new AppError('ID requerido', 400);
    }

    const result = await userRepository.deleteUser(id);

    if ('error' in result) {
      throw new AppError(result.error, 404);
    }

    return res.status(200).json({ success: true, message: result.success });
  }
}
