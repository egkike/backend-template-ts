import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import typescriptParser from '@typescript-eslint/parser';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json', // Añadido aquí para mejor integración
      },
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true, // Debe ir AQUÍ adentro
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'import/extensions': ['off'],
      'import/no-unresolved': 'error',
      'import/order': ['warn', { 'newlines-between': 'always' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }], // Agregué info para tus logs
      eqeqeq: ['error', 'always'],
    },
  },

  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'postgres-data/**',
      'docker/**',
      'docker-compose*.yml',
      '*.log',
    ],
  }
);
