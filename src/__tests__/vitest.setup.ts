import { defineConfig } from 'vitest/config';
import { beforeAll, afterAll } from 'vitest';

import { app } from '../index';

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  console.info('[Vitest Setup] Iniciando servidor de test...');

  return new Promise<void>((resolve, reject) => {
    const port = 3000;
    server = app.listen(port, '0.0.0.0', () => {
      console.info(`[Vitest Setup] Servidor de test OK en http://localhost:${port}`);
      resolve();
    });

    server.on('error', (err) => {
      console.error('[Vitest Setup] Error al levantar servidor:', err);
      reject(err);
    });
  });
});

afterAll(async () => {
  if (server) {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.info('[Vitest Setup] Servidor de test cerrado');
        resolve();
      });
    });
  }
});

export default defineConfig({
  test: {
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    environment: 'node',
  },
});
