import pool from '../db/postgres';
import logger from '../utils/logger';
import { config } from '../config/index';

export class AuthCleanupService {
  static async cleanExpiredTokens() {
    const schema = config.db.schema;
    const client = await pool.connect(); // Solicitamos una conexión dedicada

    try {
      const result = await client.query(
        `DELETE FROM "${schema}".refresh_tokens WHERE expires_at < NOW()`
      );

      const deletedCount = result.rowCount ?? 0;

      if (deletedCount > 0) {
        logger.info(`🧹 Limpieza: Se eliminaron ${deletedCount} refresh tokens expirados.`);
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Error en el Cron de limpieza de tokens');
    } finally {
      client.release(); // Liberamos la conexión pase lo que pase
    }
  }
}
