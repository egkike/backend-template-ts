import crypto from 'crypto';

import bcrypt from 'bcrypt';

import pool from '../db/postgres';
import { config } from '../config/index';

// --- INTERFACES DE CONTRATO ---

export interface UserBase {
  id: string;
  username: string;
  email: string;
  fullname: string;
  level: number;
  active: number;
  affiliate_slug: string;
  must_change_password: boolean;
  createdate: Date;
}

export interface UserWithPassword extends UserBase {
  password: string;
}

export interface CreateUserInput {
  email: string;
  fullname: string;
  username?: string;
  password?: string;
  level?: number;
  active?: number;
}

export interface UpdateUserInput {
  fullname?: string;
  level?: number;
  active?: number;
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export const userRepository = {
  /**
   * Busca un usuario por username o email para el proceso de Login.
   */
  async findByCredentials(identifier: string): Promise<UserWithPassword | null> {
    const schema = config.db?.schema || 'public';
    const query = `
      SELECT id, username, password, email, fullname, level, active, must_change_password, createdate, affiliate_slug
      FROM "${schema}".users 
      WHERE username = $1 OR email = $1
    `;
    const { rows } = await pool.query<UserWithPassword>(query, [identifier]);
    return rows[0] || null;
  },

  /**
   * Obtiene la información pública/básica de un usuario por su ID.
   */
  async getById(id: string): Promise<UserBase | null> {
    const schema = config.db?.schema || 'public';
    const query = `SELECT id, username, email, fullname, level, active, must_change_password, createdate, affiliate_slug
                   FROM "${schema}".users WHERE id = $1`;
    const { rows } = await pool.query<UserBase>(query, [id]);
    return rows[0] || null;
  },

  /**
   * Obtiene lista de todos los usuarios
   */
  async getUsers(): Promise<UserBase[]> {
    const schema = config.db?.schema || 'public';
    const query = `SELECT id, username, email, fullname, level, active, createdate, affiliate_slug, must_change_password 
                   FROM "${schema}".users ORDER BY createdate DESC`;
    const { rows } = await pool.query<UserBase>(query);
    return rows;
  },

  // --- MÉTODOS DE REFRESH TOKEN ---

  async saveRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const schema = config.db?.schema || 'public';
    const query = `
      INSERT INTO "${schema}".refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `;
    await pool.query(query, [userId, tokenHash, expiresAt]);
  },

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null> {
    const schema = config.db?.schema || 'public';
    const query = `
      SELECT * FROM "${schema}".refresh_tokens 
      WHERE token_hash = $1 AND revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
    `;
    const { rows } = await pool.query<RefreshTokenRow>(query, [tokenHash]);
    return rows[0] || null;
  },

  async deleteSpecificRefreshToken(tokenHash: string): Promise<void> {
    const schema = config.db?.schema || 'public';
    const query = `DELETE FROM "${schema}".refresh_tokens WHERE token_hash = $1`;
    await pool.query(query, [tokenHash]);
  },

  async deleteRefreshToken(userId: string): Promise<void> {
    const schema = config.db?.schema || 'public';
    const query = `DELETE FROM "${schema}".refresh_tokens WHERE user_id = $1`;
    await pool.query(query, [userId]);
  },

  // --- MÉTODOS DE GESTIÓN DE USUARIO ---

  async createUser(input: CreateUserInput) {
    const schema = config.db?.schema || 'public';
    const { password, email, fullname, level = 1, active = 0, username } = input;

    // LÓGICA DE USERNAME: Prioriza el enviado, de lo contrario genera uno.
    let finalUsername: string;
    if (username && username.trim() !== '') {
      finalUsername = username.toLowerCase().trim();
    } else {
      const baseName = email.split('@')[0].substring(0, 15);
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      finalUsername = `${baseName}${randomSuffix}`;
    }

    // El slug de afiliado siempre coincide con el username final
    const affiliateSlug = finalUsername;

    const mustChangePassword = Number(level) === 1;
    // Si no hay password (registro manual admin), generamos uno aleatorio temporal
    const rawPassword = password || crypto.randomBytes(12).toString('hex');
    const passwordWithPepper = rawPassword + config.passwordPepper;
    const hash = await bcrypt.hash(passwordWithPepper, 12);

    const verificationToken = active === 0 ? crypto.randomBytes(32).toString('hex') : null;
    const expires = active === 0 ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const query = `
    INSERT INTO "${schema}".users 
      (username, affiliate_slug, password, email, fullname, level, active, 
       verification_token, verification_token_expires, must_change_password)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, username, affiliate_slug, email, fullname, level, active;
    `;

    const { rows } = await pool.query(query, [
      finalUsername,
      affiliateSlug,
      hash,
      email,
      fullname,
      level,
      active,
      verificationToken,
      expires,
      mustChangePassword,
    ]);

    return { ...rows[0], verificationToken };
  },

  async verifyAccount(token: string): Promise<boolean> {
    const schema = config.db?.schema || 'public';
    const query = `
      UPDATE "${schema}".users 
      SET active = 1, verification_token = NULL, verification_token_expires = NULL
      WHERE verification_token = $1 AND verification_token_expires > CURRENT_TIMESTAMP
      RETURNING id
    `;
    const { rows } = await pool.query(query, [token]);
    return rows.length > 0;
  },

  async updUser(
    { id, input }: { id: string; input: UpdateUserInput },
    client?: any
  ): Promise<UserBase | null> {
    const schema = config.db?.schema || 'public';
    const { fullname, level, active } = input;
    const updates: string[] = [];
    const values: (string | number)[] = [];
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
    const query = `UPDATE "${schema}".users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

    const db = client || pool;
    const { rows } = await db.query(query, values);

    return (rows[0] as UserBase) || null;
  },

  async chgPassUser({ id, input }: { id: string; input: { password: string } }): Promise<void> {
    const schema = config.db?.schema || 'public';
    const passwordWithPepper = input.password + config.passwordPepper;
    const hash = await bcrypt.hash(passwordWithPepper, 12);
    const query = `UPDATE "${schema}".users SET password = $1, must_change_password = false WHERE id = $2`;
    await pool.query(query, [hash, id]);
  },

  async updatePasswordAndClearFlag(id: string, passwordHash: string): Promise<boolean> {
    const schema = config.db?.schema || 'public';
    const query = `UPDATE "${schema}".users SET password = $1, must_change_password = false WHERE id = $2`;
    const result = await pool.query(query, [passwordHash, id]);
    return (result.rowCount ?? 0) > 0;
  },

  async deleteUser(id: string): Promise<boolean> {
    const schema = config.db?.schema || 'public';
    const query = `DELETE FROM "${schema}".users WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  },

  async validateRefreshToken(tokenHash: string): Promise<string | null> {
    const token = await this.findRefreshToken(tokenHash);
    return token ? token.user_id : null;
  },

  async saveResetToken(
    email: string,
    token: string,
    expires: Date
  ): Promise<{ id: string } | null> {
    const schema = config.db?.schema || 'public';
    const query = `
      UPDATE "${schema}".users 
      SET reset_password_token = $1, reset_password_expires = $2
      WHERE email = $3
      RETURNING id;
    `;
    const { rows } = await pool.query<{ id: string }>(query, [token, expires, email]);
    return rows[0] || null;
  },

  async resetPasswordByToken(token: string, newPasswordHash: string): Promise<boolean> {
    const schema = config.db?.schema || 'public';
    const query = `
      UPDATE "${schema}".users 
      SET password = $1, 
          reset_password_token = NULL, 
          reset_password_expires = NULL,
          must_change_password = false
      WHERE reset_password_token = $2 AND reset_password_expires > CURRENT_TIMESTAMP
      RETURNING id;
    `;
    const { rows } = await pool.query(query, [newPasswordHash, token]);
    return rows.length > 0;
  },

  async findByAffiliateSlug(
    slug: string
  ): Promise<Pick<UserBase, 'id' | 'username' | 'affiliate_slug'> | null> {
    const schema = config.db?.schema || 'public';
    const query = `
      SELECT id, username, affiliate_slug 
      FROM "${schema}".users 
      WHERE affiliate_slug = $1 OR id::text = $1 
      LIMIT 1
    `;
    const { rows } = await pool.query<Pick<UserBase, 'id' | 'username' | 'affiliate_slug'>>(query, [
      slug,
    ]);
    return rows[0] || null;
  },
};
