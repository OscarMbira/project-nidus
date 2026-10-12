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

// v1240 / CLAUDE.md rules 34.3 + 49: app code reaches shared code only through @nidus/* package
// names, never a relative path into packages/ (that is how the old app-local shadow copies hid).
const NO_RELATIVE_PACKAGES = {
  group: ['**/packages/*/src/**'],
  message: 'Import shared code via @nidus/* (packages/* is the single source of truth, rule 34.3).',
}

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
          NO_RELATIVE_PACKAGES,
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
          NO_RELATIVE_PACKAGES,
        ],
      }],
    },
  },
  {
    // v1239 Slice 5.1: the Planner reaches shared code only through @nidus/*, never another app.
    files: ['apps/planner/src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/platform/**', '**/apps/simulator/**', '../platform/**', '../simulator/**', '../../platform/**', '../../simulator/**'],
            message: 'Planner code must not import Platform or Simulator modules — shared code lives in packages/* (rule 46).',
          },
          NO_RELATIVE_PACKAGES,
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
