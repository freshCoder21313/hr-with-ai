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
  ignorePatterns: [
    'dist',
    'dist-ssr',
    'coverage',
    'android',
    'test-results',
    'playwright-report',
    'blob-report',
    'graphify-out',
    'aidlc-docs',
    'node_modules',
  ],
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
    {
      // Node-side tooling: CLI scripts and root config files
      files: ['scripts/**/*.{js,cjs,ts}', '*.config.{js,cjs,ts}', '.eslintrc.cjs'],
      env: { node: true },
    },
    {
      // CLI scripts report progress on stdout
      files: ['scripts/**/*.{js,cjs,ts}'],
      rules: { 'no-console': 'off' },
    },
    {
      // Layering: features → services → lib/types. These layers must never depend on src/features.
      files: ['src/services/**', 'src/lib/**', 'src/types/**', 'src/hooks/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/features', '@/features/*', '**/features/**'],
                message:
                  'src/services, src/lib, src/types and src/hooks must not import from src/features (layering: features → services → lib/types).',
              },
            ],
          },
        ],
      },
    },
  ],
  settings: {
    react: {
      version: 'detect'
    }
  }
}
