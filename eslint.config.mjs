import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        alwaysTryTypes: true,
      },
    },
    rules: {
      'import/extensions': [
        'off',
      ],
      'import/no-unresolved': 'error',
      'import/order': ['warn', { 'newlines-between': 'always' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off', 
      '@typescript-eslint/no-explicit-any': 'off', 
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'postgres-data/**',       // ← ignora TODA la carpeta de datos Postgres/Docker
      'docker/**',              // si tenés alguna carpeta docker extra
      'docker-compose*.yml',    // archivos compose
      '*.log',                  // logs varios
    ],
  }
);