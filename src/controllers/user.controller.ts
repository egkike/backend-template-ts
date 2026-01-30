import { Request, Response } from 'express';

import { validatePartialUser, validatePasswordDetailed } from '../schemas/users';
import { userRepository } from '../repositories/user.repository';
// Importamos UserWithPassword para el cast de seguridad
import type { UserWithPassword } from '../repositories/user.repository';
import { AppError } from '../errors/AppError';

export class UserController {
  getSession(req: Request, res: Response) {
    return res.status(200).json({
      success: true,
      user: (req as any).user,
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
    const validation = validatePartialUser(req.body);
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const { username, password, email, fullname } = validation.data;

    if (!password) throw new AppError('La contraseña es requerida', 400);

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    const newUser = await userRepository.createUser({
      username: username!,
      password: password!,
      email: email!,
      fullname: fullname!,
    });

    /**
     * Usamos 'as UserWithPassword' porque el objeto que retorna el repo
     * en el create (RETURNING *) sí contiene el password, aunque la
     * interfaz User base no lo declare.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...publicUser } = newUser as UserWithPassword;

    return res.status(201).json({ success: true, user: publicUser });
  }

  async updUser(req: Request, res: Response) {
    const { id, fullname, level, active } = req.body;
    if (!id) throw new AppError('ID requerido', 400);

    const validation = validatePartialUser({ fullname, level, active });
    if (!validation.success) {
      const errorMsg = JSON.parse(validation.error.message)[0]?.message;
      throw new AppError(errorMsg || 'Datos inválidos', 400);
    }

    const updated = await userRepository.updUser({ id, input: validation.data });
    if (!updated) throw new AppError('Usuario no encontrado para actualizar', 404);

    return res.status(200).json({ success: true, user: updated });
  }

  async chgPassUser(req: Request, res: Response) {
    const { id, password } = req.body;
    if (!id || !password) throw new AppError('ID y contraseña requeridos', 400);

    const pwdCheck = validatePasswordDetailed(password);
    if (!pwdCheck.valid) {
      throw new AppError(pwdCheck.errors?.join('; ') || 'Contraseña inválida', 400);
    }

    const result = await userRepository.chgPassUser({ id, input: { password } });
    if (!result) throw new AppError('Usuario no encontrado', 404);

    return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
  }

  async deleteUser(req: Request, res: Response) {
    const { id } = req.body;
    if (!id) throw new AppError('ID requerido', 400);

    const success = await userRepository.deleteUser(id);
    if (!success) throw new AppError('Usuario no encontrado o ya eliminado', 404);

    return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
  }
}
