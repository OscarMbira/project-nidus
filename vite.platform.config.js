import path from 'path'
import { fileURLToPath } from 'url'
import { mergeConfig, defineConfig } from 'vite'
import { createBaseViteConfig } from './vite.base.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(
  createBaseViteConfig({
    appRoot: __dirname,
    outDir: path.resolve(__dirname, 'dist/platform'),
    pwaManifest: path.resolve(__dirname, 'platform/manifest.json'),
    manualChunksExtra: {
      'platform-core': ['./src/routes/platformRoutes.jsx', './src/PlatformApp.jsx'],
    },
  }),
  defineConfig({
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'platform/index.html'),
      },
    },
  }),
)
