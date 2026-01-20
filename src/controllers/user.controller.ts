import { Request, Response } from 'express';

import { validatePartialUser, validatePasswordDetailed } from '../schemas/users';
import userRepository from '../repositories/user.repository';
import type { User } from '../repositories/user.repository';
import { AppError } from '../errors/AppError';

export class UserController {
  getSession(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      user: (req as any).user,
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

    const password = validation.data.password;
    if (!password) {
      throw new AppError('La contraseña es requerida', 400);
    }
    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    const newUser = await userRepository.createUser({
      username: validation.data.username!, // ! = non-null assertion (Zod ya validó que existe)
      password: validation.data.password!,
      email: validation.data.email!,
      fullname: validation.data.fullname!,
    });

    if ('error' in newUser) {
      throw new AppError(newUser.error, 409);
    }

    type PublicUser = Omit<User, 'password'>;
    const publicUser: PublicUser = newUser;
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

    const input = {
      ...(validation.data.fullname !== undefined && { fullname: validation.data.fullname }),
      ...(validation.data.level !== undefined && { level: validation.data.level }),
      ...(validation.data.active !== undefined && { active: validation.data.active }),
    };

    const updated = await userRepository.updUser({ id, input });
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
