// Conexión al pool de PostgreSQL, tipada y con parseo correcto de tipos numéricos.
import { Pool, types } from 'pg';

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

// Configuramos el parseo de tipos numéricos de PostgreSQL como números JS
types.setTypeParser(types.builtins.NUMERIC, (value: string) => parseFloat(value));
types.setTypeParser(types.builtins.INT8, (value: string) => parseInt(value, 10));

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20, // máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // ssl: { rejectUnauthorized: false } // descomenta si usas SSL en producción
});

pool.on('error', (err, client) => {
  logger.error({ error: err.message }, 'Error inesperado en el pool de PostgreSQL');
});

// Función para verificar conexión al iniciar (opcional pero útil)
(async () => {
  try {
    const client = await pool.connect();
    logger.info('Conexión a PostgreSQL establecida correctamente');
    client.release();
  } catch (error) {
    logger.error({ error }, 'No se pudo conectar a PostgreSQL al inicio');
    process.exit(1); // Salimos si no hay conexión (en producción puedes manejarlo diferente)
  }
})();

export default pool;
