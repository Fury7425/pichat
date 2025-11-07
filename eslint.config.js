import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsProjectGlobs = [
  './tsconfig.json',
  './tsconfig.base.json',
  './apps/*/tsconfig.json',
  './packages/*/tsconfig.json',
];

const tsConfigs = tseslint.configs.recommended.map((config) => ({
  ...config,
  files: ['**/*.{ts,tsx}'],
  languageOptions: {
    ...config.languageOptions,
    parserOptions: {
      ...(config.languageOptions?.parserOptions ?? {}),
      project: tsProjectGlobs,
      projectService: true,
      tsconfigRootDir: __dirname,
      ecmaFeatures: {
        ...(config.languageOptions?.parserOptions?.ecmaFeatures ?? {}),
        jsx: true,
      },
    },
  },
  rules: {
    ...(config.rules ?? {}),
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
  },
}));

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/android/**',
      '**/ios/**',
      'apps/mobile/**',
      'packages/**',
      'jest.config.js',
    ],
  },
  js.configs.recommended,
  ...tsConfigs,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ...reactPlugin.configs.flat.recommended,
    files: ['**/*.{ts,tsx,js,jsx}'],
  },
  {
    ...reactHooksPlugin.configs['recommended-latest'],
    files: ['**/*.{ts,tsx,js,jsx}'],
  },
  {
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
  }
);
