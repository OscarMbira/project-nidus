import path from 'path'
import { fileURLToPath } from 'url'
import { mergeConfig, defineConfig, loadEnv } from 'vite'
import { createBaseViteConfig } from '../../vite.base.config.js'
import { createFederationHostPlugin } from '../../packages/shared/src/federation/createFederationHostPlugin.js'
import { SIMULATOR_MODULES } from '../../packages/modules/registry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')
const mode = process.env.NODE_ENV || 'development'
const env = { ...process.env, ...loadEnv(mode, repoRoot, '') }
const federationPlugin = createFederationHostPlugin({ modules: SIMULATOR_MODULES, env })
const federationEnabled = env.VITE_FEDERATION_ENABLED === 'true'

export default mergeConfig(
  createBaseViteConfig({
    appRoot: __dirname,
    srcDir: path.resolve(__dirname, 'src'),
    publicDir: path.resolve(repoRoot, 'public'),
    outDir: path.resolve(__dirname, 'dist'),
    pwaManifest: path.resolve(repoRoot, 'simulator/manifest.json'),
    manualChunksExtra: {
      'sim-core': [
        path.resolve(__dirname, 'src/routes/simulatorRoutes.jsx'),
        path.resolve(__dirname, 'src/App.jsx'),
      ],
    },
  }),
  defineConfig({
    envDir: repoRoot,
    plugins: federationPlugin ? [federationPlugin] : [],
    resolve: {
      alias: {
        '@nidus/ui': path.resolve(__dirname, 'src/components/ui'),
        '@nidus/shared/utils': path.resolve(__dirname, 'src/utils'),
        '@nidus/shared/hooks': path.resolve(__dirname, 'src/hooks'),
        '@nidus/shared/context': path.resolve(__dirname, 'src/context'),
        '@nidus/shared/constants': path.resolve(__dirname, 'src/constants'),
        '@nidus/shared/federation': path.resolve(repoRoot, 'packages/shared/src/federation'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
    },
    build: {
      target: federationEnabled ? 'esnext' : undefined,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: [path.resolve(__dirname, 'src/test/setup.js')],
      globals: true,
    },
  }),
)
