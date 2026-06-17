import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Workbox runtime caching: static assets precached; APIs network-only; offline page for failed navigations. */
function pwaRuntimeCaching() {
  const bg = (name) => ({
    backgroundSync: {
      name,
      options: { maxRetentionTime: 24 * 60 },
    },
  })
  const sb = '[a-z0-9]+\\.supabase\\.co'
  return [
    {
      urlPattern: new RegExp(`^https://${sb}/rest/v1/tasks`, 'i'),
      handler: 'NetworkOnly',
      options: bg('sync-tasks'),
    },
    {
      urlPattern: new RegExp(`^https://${sb}/rest/v1/issues`, 'i'),
      handler: 'NetworkOnly',
      options: bg('sync-issues'),
    },
    {
      urlPattern: new RegExp(`^https://${sb}/rest/v1/risks`, 'i'),
      handler: 'NetworkOnly',
      options: bg('sync-risks'),
    },
    {
      urlPattern: new RegExp(`^https://${sb}/rest/v1/defects`, 'i'),
      handler: 'NetworkOnly',
      options: bg('sync-defects'),
    },
    {
      urlPattern: new RegExp(`^https://${sb}/`, 'i'),
      handler: 'NetworkOnly',
    },
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/manifest\.json$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'manifest',
        expiration: { maxAgeSeconds: 60 * 60 },
      },
    },
  ]
}

/** Shared Vite settings for all entry points (legacy, platform, simulator). */
export function createBaseViteConfig({ appRoot, outDir, pwaScope, pwaManifest, manualChunksExtra = {} }) {
  return defineConfig({
    root: appRoot,
    publicDir: path.resolve(__dirname, 'public'),
    plugins: [
      react({ jsxRuntime: 'automatic' }),
      nodePolyfills({ include: ['stream'] }),
      VitePWA({
        registerType: 'prompt',
        manifest: pwaManifest || false,
        injectRegister: 'auto',
        includeAssets: [
          'offline.html',
          'manifest.json',
          'icon-192.png',
          'icon-512.png',
          'maskable-icon-512.png',
          'apple-touch-icon-180.png',
          'favicon-16.png',
          'favicon-32.png',
          'push-notifications-sw.js',
        ],
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}'],
          navigateFallback: `${pwaScope || '/'}offline.html`,
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: pwaRuntimeCaching(),
          importScripts: ['/push-notifications-sw.js'],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: true,
        },
        devOptions: { enabled: false },
      }),
    ],
    optimizeDeps: {
      include: [
        'react', 'react-dom', 'react-router-dom',
        '@supabase/supabase-js',
        'lucide-react', 'framer-motion', 'react-hot-toast', 'react-calendar',
        'recharts', 'date-fns',
        '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
        'react-markdown', 'rehype-raw', 'remark-gfm',
        'xlsx', 'xlsx-js-style', 'pptxgenjs', 'docx', 'jspdf', 'html2canvas',
        'frappe-gantt',
      ],
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router-dom'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, 'src/shared'),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      fs: { strict: false },
      proxy: {
        '/api/ai/chat': {
          target: 'http://localhost:11434',
          changeOrigin: true,
          rewrite: (p) => p.replace('/api/ai/chat', '/api/chat'),
          timeout: 190000,
          proxyTimeout: 190000,
        },
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'framer-motion'],
            ...manualChunksExtra,
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
    },
  })
}

export default createBaseViteConfig({
  appRoot: __dirname,
  outDir: path.resolve(__dirname, 'dist'),
})
