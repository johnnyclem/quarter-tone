// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.vite/**',
      // Legacy monolith kept at the repo root; migrated piecemeal into packages/*.
      'index.html',
      'src/scaleMapper.js',
      'tests/scaleMapper.test.js',
      // Service worker uses a service-worker global scope (self, importScripts)
      // and is authored/minified outside the TS/React tree.
      'sw.js',
    ],
  },

  // JS / TS baseline
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript sources
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },

  // React / JSX sources (app package)
  {
    files: ['packages/app/**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ...reactPlugin.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Node-side tooling files
  {
    files: ['**/*.config.{js,cjs,mjs,ts}', '**/vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Test fakes intentionally alias `this` to mirror Tone.js's call semantics.
  {
    files: ['packages/audio/tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-this-alias': 'off',
    },
  },

  // Disable stylistic rules that conflict with Prettier — always last.
  prettierConfig,
);
