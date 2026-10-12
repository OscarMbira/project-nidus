import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'

const platformFiles = [
  'apps/platform/src/pages/platform-app/**/*.{js,jsx}',
  'apps/platform/src/pages/app/**/*.{js,jsx}',
  'apps/platform/src/components/app/**/*.{js,jsx}',
]

const simulatorFiles = [
  'apps/simulator/src/pages/simulator/**/*.{js,jsx}',
  'apps/simulator/src/pages/sim/**/*.{js,jsx}',
  'apps/simulator/src/components/sim/**/*.{js,jsx}',
  'apps/simulator/src/services/sim/**/*.js',
]

// v1240 / CLAUDE.md rules 34.3 + 49: app code reaches shared code only through @nidus/* package
// names, never a relative path into packages/ (that is how the old app-local shadow copies hid).
const NO_RELATIVE_PACKAGES = {
  group: ['**/packages/*/src/**'],
  message: 'Import shared code via @nidus/* (packages/* is the single source of truth, rule 34.3).',
}

export default [
  { ignores: ['dist/**', 'node_modules/**', 'apps/*/dist/**'] },
  {
    files: ['apps/*/src/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [NO_RELATIVE_PACKAGES] }],
    },
  },
  {
    files: platformFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/simulator/**', '**/pages/simulator/**', '**/pages/sim/**', '**/components/sim/**', '**/services/sim/**'],
            message: 'Platform code must not import Simulator-only modules.',
          },
          NO_RELATIVE_PACKAGES,
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
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/platform/**', '**/pages/platform-app/**', '**/pages/app/**', '**/components/app/**'],
            message: 'Simulator code must not import Platform-only modules.',
          },
          NO_RELATIVE_PACKAGES,
        ],
      }],
    },
  },
  {
    files: ['packages/**/*.{js,jsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['**/apps/**'],
            message: 'packages/* must not import from apps/*.',
          },
        ],
      }],
    },
  },
]
