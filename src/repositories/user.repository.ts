// Métodos de la tabla users
import bcrypt from 'bcrypt';

import pool from '../db/postgres.js';
import logger from '../utils/logger.js';
import { config } from '../config/index.js';

const schema = config.db.schema;

export interface User {
  id: string;
  username: string;
  email: string;
  fullname: string;
  level: number;
  active: number;
  must_change_password: boolean;
  createdate: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

export const userRepository = {
  async login(input: {
    username?: string;
    email?: string;
    password: string;
  }): Promise<UserWithPassword | { error: string }> {
    const { username = '', email = '', password } = input;

    let query = '';
    let params: string[] = [];

    if (username) {
      query = `SELECT id, username, password, email, fullname, level, active, must_change_password, createdate
               FROM "${schema}".users WHERE username = $1`;
      params = [username];
    } else if (email) {
      query = `SELECT id, username, password, email, fullname, level, active, must_change_password, createdate
               FROM "${schema}".users WHERE email = $1`;
      params = [email];
    } else {
      return { error: 'Se requiere username o email' };
    }

    try {
      const result = await pool.query(query, params);
      if (result.rows.length === 0) return { error: 'Usuario o contraseña inválidos' };

      const user = result.rows[0] as UserWithPassword;
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) return { error: 'Usuario o contraseña inválidos' };

      // Verificación de cambio obligatorio de contraseña
      if (user.must_change_password) {
        return { error: 'Debes cambiar la contraseña en tu primer login' };
      }

      // Verificación de usuario activo
      if (user.active === 0) {
        return { error: 'Usuario inactivo. Contacta al administrador.' };
      }

      return user;
    } catch (error) {
      logger.error({ error }, 'Error en login');
      return { error: 'Error interno al autenticar' };
    }
  },

  async getUsers(): Promise<User[] | { error: string }> {
    try {
      const result = await pool.query(
        `SELECT id, username, email, fullname, level, active, must_change_password, createdate
         FROM "${schema}".users`
      );
      return result.rows as User[];
    } catch (error) {
      logger.error({ error }, 'Error al obtener usuarios');
      return { error: 'Error al obtener lista de usuarios' };
    }
  },

  async getById(id: string): Promise<User | { error: string }> {
    try {
      const result = await pool.query(
        `SELECT id, username, email, fullname, level, active, must_change_password, createdate
         FROM "${schema}".users WHERE id = $1`,
        [id]
      );
      if (result.rows.length === 0) return { error: 'Usuario no encontrado' };
      return result.rows[0] as User;
    } catch (error) {
      logger.error({ id, error }, 'Error al obtener usuario por ID');
      return { error: 'Error al buscar usuario' };
    }
  },

  async createUser(input: {
    username: string;
    password: string;
    email: string;
    fullname: string;
  }): Promise<User | { error: string }> {
    const { username, password, email, fullname } = input;

    try {
      // Verificar duplicados
      const [userCheck, emailCheck] = await Promise.all([
        pool.query(`SELECT 1 FROM "${schema}".users WHERE username = $1`, [username]),
        pool.query(`SELECT 1 FROM "${schema}".users WHERE email = $1`, [email]),
      ]);

      if (userCheck.rows.length > 0) return { error: 'El nombre de usuario ya existe' };
      if (emailCheck.rows.length > 0) return { error: 'El email ya está registrado' };

      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO "${schema}".users (username, password, email, fullname)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, fullname, level, active, must_change_password, createdate`,
        [username, hash, email, fullname]
      );

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ error }, 'Error al crear usuario');
      return { error: 'Error al crear usuario' };
    }
  },

  /**
   * Actualiza los datos básicos del usuario (fullname, level, active)
   */
  async updUser({
    id,
    input,
  }: {
    id: string;
    input: { fullname?: string; level?: number; active?: number };
  }): Promise<User | { error: string }> {
    const { fullname, level, active } = input;

    try {
      // Verificar que el usuario existe
      const userCheck = await this.getById(id);
      if ('error' in userCheck) {
        return { error: userCheck.error };
      }

      // Construir query dinámica según qué campos se envíen
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (fullname !== undefined) {
        updates.push(`fullname = $${paramIndex++}`);
        values.push(fullname);
      }
      if (level !== undefined) {
        updates.push(`level = $${paramIndex++}`);
        values.push(level);
      }
      if (active !== undefined) {
        updates.push(`active = $${paramIndex++}`);
        values.push(active);
      }

      if (updates.length === 0) {
        return { error: 'No se proporcionaron campos para actualizar' };
      }

      const query = `
        UPDATE "${schema}".users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, fullname, level, active, must_change_password, createdate
      `;

      values.push(id);

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return { error: 'Usuario no encontrado o no se pudo actualizar' };
      }

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ id, error }, 'Error al actualizar usuario');
      return { error: 'Error interno al actualizar usuario' };
    }
  },

  /**
   * Cambia la contraseña de un usuario (y opcionalmente activa la cuenta)
   */
  async chgPassUser({
    id,
    input,
  }: {
    id: string;
    input: { password: string };
  }): Promise<User | { error: string }> {
    const { password } = input;

    try {
      // Verificar que el usuario existe
      const userCheck = await this.getById(id);
      if ('error' in userCheck) {
        return { error: userCheck.error };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `
          UPDATE "${schema}".users
          SET password = $1,
              active = 1, must_change_password = FALSE
          WHERE id = $2
          RETURNING id, username, email, fullname, level, active, must_change_password, createdate
        `,
        [hashedPassword, id]
      );

      if (result.rows.length === 0) {
        return { error: 'Usuario no encontrado o no se pudo actualizar' };
      }

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ id, error }, 'Error al cambiar contraseña');
      return { error: 'Error interno al cambiar contraseña' };
    }
  },

  /**
   * Elimina un usuario por ID
   */
  async deleteUser(id: string): Promise<{ success: string } | { error: string }> {
    try {
      // Verificar existencia
      const userCheck = await this.getById(id);
      if ('error' in userCheck) {
        return { error: userCheck.error };
      }

      await pool.query(`DELETE FROM "${schema}".users WHERE id = $1`, [id]);

      return { success: 'Usuario eliminado correctamente' };
    } catch (error) {
      logger.error({ id, error }, 'Error al eliminar usuario');
      return { error: 'Error interno al eliminar usuario' };
    }
  },

  /**
   * Guarda un nuevo refresh token hasheado para un usuario
   */
  async saveRefreshToken({
    userId,
    token,
    expiresAt,
  }: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const hash = await bcrypt.hash(token, 10);

    await pool.query(
      `INSERT INTO "${schema}".refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
      [userId, hash, expiresAt]
    );
  },

  /**
   * Verifica si un refresh token es válido y no revocado
   * @returns userId si es válido, null si no
   */
  async validateRefreshToken(token: string): Promise<string | null> {
    try {
      const result = await pool.query(
        `SELECT user_id, token_hash, expires_at
       FROM "${schema}".refresh_tokens
       WHERE revoked IS FALSE 
       AND expires_at > NOW()`
      );

      for (const row of result.rows) {
        const isValid = await bcrypt.compare(token, row.token_hash);
        if (isValid) {
          return row.user_id as string;
        }
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Error validando refresh token');
      return null;
    }
  },

  /**
   * Marca TODOS los refresh tokens de un usuario como revocados
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    await pool.query(
      `UPDATE "${schema}".refresh_tokens
     SET revoked = TRUE, revoked_at = NOW()
     WHERE user_id = $1`,
      [userId]
    );
  },
};

export default userRepository;
