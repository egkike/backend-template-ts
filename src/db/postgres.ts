// Conexión al pool de PostgreSQL, tipada y con parseo correcto de tipos numéricos.
import { Pool, types } from 'pg';

import { config } from '../config/index';
import logger from '../utils/logger';

// Configuramos el parseo de tipos numéricos de PostgreSQL como números JS
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));
types.setTypeParser(types.builtins.INT8, (value: string) => parseInt(value, 10));

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  options: `-c search_path=${config.db.schema || 'public'},public`,
  max: 20, // máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 segundos por conexión individual
  // ssl: { rejectUnauthorized: false } // descomenta si usas SSL en producción
});

// Logs de eventos del pool
pool.on('connect', () => {
  logger.debug('Nueva conexión establecida en el pool de PostgreSQL');
});

pool.on('acquire', () => {
  logger.debug('Conexión adquirida del pool');
});

pool.on('error', (err, _) => {
  logger.error({ error: err.message }, 'Error inesperado en el pool de PostgreSQL');
});

// Función con retry para conectar al iniciar la app
async function connectWithRetry(maxRetries = 20, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      logger.info('Conexión a PostgreSQL establecida correctamente');
      return pool;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn(`Intento ${i + 1}/${maxRetries} fallido: ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  const errorMsg = 'No se pudo conectar a PostgreSQL después de 20 intentos';
  logger.error(errorMsg);
  throw new Error(errorMsg);
}

// Inicialización automática al cargar el módulo
(async () => {
  try {
    await connectWithRetry();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Inicialización de DB fallida - saliendo: ${errorMessage}`);
    process.exit(1);
  }
})();

export default pool;
