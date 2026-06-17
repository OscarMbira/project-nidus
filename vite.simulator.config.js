import path from 'path'
import { fileURLToPath } from 'url'
import { mergeConfig, defineConfig } from 'vite'
import { createBaseViteConfig } from './vite.base.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  createBaseViteConfig({
    appRoot: __dirname,
    outDir: path.resolve(__dirname, 'dist/simulator'),
    pwaManifest: path.resolve(__dirname, 'simulator/manifest.json'),
    manualChunksExtra: {
      'sim-core': ['./src/routes/simulatorRoutes.jsx', './src/SimulatorApp.jsx'],
    },
  }),
  defineConfig({
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'simulator/index.html'),
      },
    },
  }),
)
