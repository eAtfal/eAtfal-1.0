// Flat config for ESLint v9 that mirrors the project's .eslintrc.json
module.exports = [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    env: {
      browser: true,
      es2020: true,
      node: true,
    },
    ignores: ['dist', '.eslintrc'],
    plugins: {
      react: require('eslint-plugin-react'),
      'react-refresh': require('eslint-plugin-react-refresh'),
    },
    rules: {
      // Keep project's custom rules
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: '18.2',
      },
    },
    // Extend recommended configs via the legacy "extends" mechanism
    // Note: flat config supports 'extends' as an array of configs
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:react/jsx-runtime',
      'plugin:react-hooks/recommended',
    ],
  },
]
