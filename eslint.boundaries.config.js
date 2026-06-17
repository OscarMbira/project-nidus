import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

const platformFiles = [
  'src/pages/platform-app/**/*.{js,jsx}',
  'src/pages/app/**/*.{js,jsx}',
  'src/components/app/**/*.{js,jsx}',
]

const simulatorFiles = [
  'src/pages/simulator/**/*.{js,jsx}',
  'src/pages/sim/**/*.{js,jsx}',
  'src/components/sim/**/*.{js,jsx}',
  'src/services/sim/**/*.js',
]

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: platformFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/pages/simulator/**', '**/pages/sim/**', '**/components/sim/**', '**/services/sim/**'],
            message: 'Platform code must not import Simulator-only modules.',
          },
        ],
      }],
    },
  },
  {
    files: simulatorFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/pages/platform-app/**', '**/pages/app/**', '**/components/app/**'],
            message: 'Simulator code must not import Platform-only modules.',
          },
        ],
      }],
    },
  },
]
