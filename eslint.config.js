import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

const platformFiles = [
  'src/pages/platform-app/**/*.jsx',
  'src/pages/platform-app/**/*.js',
  'src/pages/app/**/*.jsx',
  'src/pages/app/**/*.js',
  'src/components/app/**/*.jsx',
  'src/components/app/**/*.js',
]

const simulatorFiles = [
  'src/pages/simulator/**/*.jsx',
  'src/pages/simulator/**/*.js',
  'src/pages/sim/**/*.jsx',
  'src/pages/sim/**/*.js',
  'src/components/sim/**/*.jsx',
  'src/components/sim/**/*.js',
  'src/services/sim/**/*.js',
]

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
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
            group: ['**/pages/simulator/**', '**/pages/sim/**', '**/components/sim/**', '**/services/sim/**'],
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
            group: ['**/pages/platform-app/**', '**/pages/app/**', '**/components/app/**'],
            message: 'Simulator code must not import Platform-only modules.',
          },
        ],
      }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'src/App.jsx.backup-v729'],
  },
]
