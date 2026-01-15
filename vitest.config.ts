import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,                // permite usar describe, test, expect sin import
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'], // genera reportes en consola, JSON y HTML
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'node_modules/**'],
    },
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});