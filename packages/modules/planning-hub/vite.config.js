import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'
import { FEDERATION_SHARED, PLANNING_FEDERATION_SHARED } from '../../shared/src/federation/federationShared.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const platformSrc = path.resolve(repoRoot, 'apps/platform/src')
const simulatorSrc = path.resolve(repoRoot, 'apps/simulator/src')
const shellSrc = 'planning-hub'.startsWith('sim-') ? simulatorSrc : platformSrc

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    federation({
      name: 'planning_hub',
      filename: 'remoteEntry.js',
      exposes: {
        './routes': './src/routes.jsx',
        './Module': './src/index.jsx',
      },
      shared: { ...FEDERATION_SHARED, ...PLANNING_FEDERATION_SHARED },
    }),
    {
      name: 'module-health-endpoint',
      configureServer(server) {
        server.middlewares.use('/health.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ name: 'planning_hub', version: '1.0.0', status: 'ok' }))
        })
        server.middlewares.use('/modules/planning-hub/health', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ name: 'planning_hub', version: '1.0.0', status: 'ok' }))
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
    port: Number('5201'),
    strictPort: true,
    cors: true,
  },
  preview: {
    port: Number('5201'),
    strictPort: true,
    cors: true,
  },
})
