import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

const platformFiles = [
  'apps/platform/src/**/*.jsx',
  'apps/platform/src/**/*.js',
]

const simulatorFiles = [
  'apps/simulator/src/**/*.jsx',
  'apps/simulator/src/**/*.js',
]

export default [
  js.configs.recommended,
  {
    files: ['apps/*/src/**/*.{js,jsx}', 'packages/*/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        HTMLElement: 'readonly',
        MutationObserver: 'readonly',
        IntersectionObserver: 'readonly',
        ResizeObserver: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        crypto: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        AbortController: 'readonly',
        structuredClone: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: platformFiles,
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/simulator/**', '../simulator/**', '../../simulator/**'],
            message: 'Platform code must not import Simulator-only modules.',
          },
        ],
      }],
    },
  },
  {
    files: simulatorFiles,
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/platform/**', '../platform/**', '../../platform/**'],
            message: 'Simulator code must not import Platform-only modules.',
          },
        ],
      }],
    },
  },
  {
    ignores: [
      'dist/**',
      '**/dist/**',
      'node_modules/**',
      '**/node_modules/**',
      'src/App.jsx.backup-v729',
      '**/App.jsx.backup-v729',
    ],
  },
]
