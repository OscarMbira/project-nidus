import path from 'path'
import { fileURLToPath } from 'url'
import { mergeConfig, defineConfig } from 'vite'
import { createBaseViteConfig } from '../../vite.base.config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../..')

/**
 * v1239 Slice 5.1 — Nidus Project Planner (planner.<domain>, dev port 5176).
 * @nidus/* resolve to packages/* (no alias overrides, CLAUDE.md rule 34.3). The planning screens
 * are bundled from @nidus/planning (D17), not loaded through Module Federation.
 */
export default mergeConfig(
  createBaseViteConfig({
    appRoot: __dirname,
    srcDir: path.resolve(__dirname, 'src'),
    publicDir: path.resolve(repoRoot, 'public'),
    outDir: path.resolve(__dirname, 'dist'),
    pwaManifest: {
      name: 'Nidus Project Planner',
      short_name: 'Nidus Planner',
      description: 'Plan, schedule and track projects',
      start_url: '/app',
      scope: '/',
      display: 'standalone',
      background_color: '#111827',
      theme_color: '#111827',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    manualChunksExtra: {
      'planner-core': [path.resolve(__dirname, 'src/App.jsx')],
    },
  }),
  defineConfig({
    envDir: repoRoot,
    server: { port: 5176, strictPort: true },
    preview: { port: 5176, strictPort: true },
    build: {
      rollupOptions: { input: path.resolve(__dirname, 'index.html') },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [path.resolve(__dirname, 'src/test/setup.js')],
      include: ['src/**/*.test.{js,jsx}'],
      env: {
        VITE_SUPABASE_URL: 'https://test-placeholder.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-placeholder-anon-key-not-real',
      },
    },
  }),
)
