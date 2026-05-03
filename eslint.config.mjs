import js from '@eslint/js';

export default [
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-undef': 'off'
    }
  }
];
