module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'react'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Phase 3 quality gates
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['error', { allow: ['warn', 'error', 'debug', 'info'] }],
    'react/prop-types': 'off'
  },
  overrides: [
    {
      // Logger is the only module allowed to call console.log (not used currently)
      files: ['src/lib/logger.ts'],
      rules: { 'no-console': 'off' },
    },
    {
      files: ['**/*.{test,spec}.{ts,tsx}', '**/setupTests.ts', 'e2e/**/*.{ts,tsx}'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
}
