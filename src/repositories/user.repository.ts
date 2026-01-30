import bcrypt from 'bcrypt';

import pool from '../db/postgres';
import logger from '../utils/logger';
import { config } from '../config/index';

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
  async findByCredentials(identifier: string): Promise<UserWithPassword | null> {
    const query = `
      SELECT id, username, password, email, fullname, level, active, must_change_password, createdate
      FROM "${schema}".users 
      WHERE username = $1 OR email = $1
    `;
    try {
      const { rows } = await pool.query(query, [identifier]);
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ error: error.message, identifier }, 'DB Error: findByCredentials failed');
      throw error;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const { rows } = await pool.query(
        `SELECT id, username, email, fullname, level, active, must_change_password, createdate
         FROM "${schema}".users ORDER BY createdate DESC`
      );
      return rows;
    } catch (error: any) {
      logger.error({ error: error.message }, 'DB Error: getUsers failed');
      throw error;
    }
  },

  async getById(id: string): Promise<User | null> {
    try {
      const { rows } = await pool.query(
        `SELECT id, username, email, fullname, level, active, must_change_password, createdate
         FROM "${schema}".users WHERE id = $1`,
        [id]
      );
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ id, error: error.message }, 'DB Error: getById failed');
      throw error;
    }
  },

  async createUser(input: any): Promise<User> {
    const { username, password, email, fullname } = input;
    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `INSERT INTO "${schema}".users (username, password, email, fullname)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, email, fullname, level, active, must_change_password, createdate`,
        [username, hash, email, fullname]
      );
      return rows[0];
    } catch (error: any) {
      logger.error({ error: error.message }, 'DB Error: createUser failed');
      throw error;
    }
  },

  async updUser({ id, input }: { id: string; input: any }): Promise<User | null> {
    const { fullname, level, active } = input;
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

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const query = `UPDATE "${schema}".users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, fullname, level, active, must_change_password, createdate`;

    try {
      const { rows } = await pool.query(query, values);
      return rows[0] || null;
    } catch (error: any) {
      logger.error({ id, error: error.message }, 'DB Error: updUser failed');
      throw error;
    }
  },

  async chgPassUser({ id, input }: { id: string; input: any }): Promise<boolean> {
    try {
      const hash = await bcrypt.hash(input.password, 10);
      const { rowCount } = await pool.query(
        `UPDATE "${schema}".users SET password = $1, must_change_password = FALSE WHERE id = $2`,
        [hash, id]
      );
      return rowCount !== null && rowCount > 0;
    } catch (error: any) {
      logger.error({ id, error: error.message }, 'DB Error: chgPassUser failed');
      throw error;
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      const { rowCount } = await pool.query(`DELETE FROM "${schema}".users WHERE id = $1`, [id]);
      return rowCount !== null && rowCount > 0;
    } catch (error: any) {
      logger.error({ id, error: error.message }, 'DB Error: deleteUser failed');
      throw error;
    }
  },

  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    try {
      const hash = await bcrypt.hash(token, 10);
      await pool.query(
        `INSERT INTO "${schema}".refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, hash, expiresAt]
      );
    } catch (error: any) {
      logger.error({ error: error.message }, 'DB Error: saveRefreshToken failed');
      throw error;
    }
  },

  async validateRefreshToken(token: string): Promise<string | null> {
    try {
      const { rows } = await pool.query(
        `SELECT user_id, token_hash FROM "${schema}".refresh_tokens 
         WHERE revoked IS FALSE AND expires_at > NOW()`
      );

      for (const row of rows) {
        if (await bcrypt.compare(token, row.token_hash)) return row.user_id;
      }
      return null;
    } catch (error: any) {
      logger.error({ error: error.message }, 'DB Error: validateRefreshToken failed');
      return null;
    }
  },

  // ESTE ES EL MÉTODO QUE FALTABA
  async revokeRefreshToken(userId: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE "${schema}".refresh_tokens 
         SET revoked = TRUE, revoked_at = NOW() 
         WHERE user_id = $1 AND revoked = FALSE`,
        [userId]
      );
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'DB Error: revokeRefreshToken failed');
      throw error;
    }
  },
};
