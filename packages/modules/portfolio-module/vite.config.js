import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const platformSrc = path.resolve(repoRoot, 'apps/platform/src')
const simulatorSrc = path.resolve(repoRoot, 'apps/simulator/src')
const shellSrc = 'portfolio-module'.startsWith('sim-') ? simulatorSrc : platformSrc

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    federation({
      name: 'portfolio_module',
      filename: 'remoteEntry.js',
      exposes: {
        './routes': './src/routes.jsx',
        './Module': './src/index.jsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
      },
    }),
    {
      name: 'module-health-endpoint',
      configureServer(server) {
        server.middlewares.use('/health.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ name: 'portfolio_module', version: '1.0.0', status: 'ok' }))
        })
        server.middlewares.use('/modules/portfolio-module/health', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ name: 'portfolio_module', version: '1.0.0', status: 'ok' }))
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@platform': platformSrc,
      '@simulator': simulatorSrc,
      '@shell': shellSrc,
      '@nidus/ui': path.resolve(shellSrc, 'components/ui'),
      '@nidus/shared/utils': path.resolve(shellSrc, 'utils'),
      '@nidus/shared/hooks': path.resolve(shellSrc, 'hooks'),
      '@nidus/shared/context': path.resolve(shellSrc, 'context'),
      '@nidus/shared/constants': path.resolve(shellSrc, 'constants'),
    },
  },
  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    outDir: 'dist',
    modulePreload: false,
  },
  server: {
    port: Number('5210'),
    strictPort: true,
    cors: true,
  },
  preview: {
    port: Number('5210'),
    strictPort: true,
    cors: true,
  },
})
