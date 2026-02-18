import pool from '../db/postgres';
import logger from '../utils/logger';
import { config } from '../config/index';

// --- Lógica de Caché para Niveles de Usuario ---
let cachedLevels: Record<string, number> | null = null;
let lastFetch: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutos de vida para el caché

export const configRepository = {
  /**
   * Obtiene los niveles de usuario desde system_settings con caché en memoria.
   */
  async getUserLevels(): Promise<Record<string, number>> {
    const now = Date.now();

    if (cachedLevels && now - lastFetch < CACHE_TTL) {
      return cachedLevels;
    }

    // Buscamos el setting 'user_levels' que contiene el JSON
    const levelsJson = await this.getSetting('user_levels', '');

    try {
      if (levelsJson) {
        cachedLevels = JSON.parse(levelsJson);
        lastFetch = now;
        return cachedLevels!;
      }
    } catch (err: any) {
      // Logueamos el error para saber qué pasó, pero no bloqueamos el sistema
      logger.error(
        { msg: err.message },
        'Error cargando user_levels desde DB, usando fallback estático'
      );
    }

    // Fallback estático de seguridad si la DB no responde o el JSON está roto
    return { GUEST: 0, USER: 1, STAFF: 5, ADMIN: 99 };
  },

  /**
   * Limpia el caché de niveles. Llamar después de actualizar system_settings.
   */
  clearLevelsCache(): void {
    cachedLevels = null;
    logger.info('Caché de niveles de usuario limpiado.');
  },

  /**
   * Obtiene todas las configuraciones de texto (Globales)
   */
  async getSystemSettings(): Promise<Record<string, string>> {
    const schema = config.db?.schema || 'public';
    const query = `SELECT key, value FROM "${schema}".system_settings`;
    try {
      const { rows } = await pool.query(query);
      return rows.reduce(
        (acc, row) => {
          acc[row.key] = row.value;
          return acc;
        },
        {} as Record<string, string>
      );
    } catch (error: any) {
      logger.error({ error: error.message }, 'DB Error: getSystemSettings failed');
      throw error;
    }
  },

  /**
   * Obtiene un setting específico con fallback
   */
  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    const schema = config.db?.schema || 'public';
    const query = `SELECT value FROM "${schema}".system_settings WHERE key = $1`;
    try {
      const { rows } = await pool.query(query, [key]);
      return rows[0]?.value ?? defaultValue;
    } catch (error: any) {
      logger.error({ error: error.message, key }, 'Error fetching setting');
      return defaultValue;
    }
  },
};
