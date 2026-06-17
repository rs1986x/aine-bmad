import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      // Disable ESLint rules that conflict with Prettier formatting.
      eslintConfigPrettier,
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Align ESLint with tsconfig's noUnusedParameters underscore convention.
      // Required for genuinely-unused-but-mandatory params such as the Express
      // error middleware's 4th `next` arg (detected by arity).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Vitest exposes its API as globals (globals: true in vitest.config.ts).
    files: ['**/*.{test,spec}.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        suite: 'readonly',
        vi: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expectTypeOf: 'readonly',
        assert: 'readonly',
      },
    },
  },
])
