import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { VitePWA } from 'vite-plugin-pwa'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    nodePolyfills({ include: ['stream'] }),
    VitePWA({
      registerType: 'prompt',
      manifest: false,
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
        // Default is 2 MiB; manualChunks (e.g. project-*.js) can exceed that and fail the build.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: pwaRuntimeCaching(),
        importScripts: ['/push-notifications-sw.js'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  optimizeDeps: {
    // Pre-bundle ALL heavy deps at server startup so they're ready on first page load.
    // Without this list, Vite discovers them mid-load, restarts optimization, and forces
    // a full page reload — adding 10-30s to perceived load time.
    include: [
      // Core
      'react', 'react-dom', 'react-router-dom',
      // Supabase
      '@supabase/supabase-js',
      // UI / Icons
      'lucide-react',
      'framer-motion',
      'react-hot-toast',
      'react-calendar',
      // Data / Charts
      'recharts',
      'date-fns',
      '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities',
      // Markdown
      'react-markdown', 'rehype-raw', 'remark-gfm',
      // Export / Document generation (heavy — must be pre-bundled, not discovered on-demand)
      'xlsx', 'xlsx-js-style',
      'pptxgenjs',
      'docx',
      'jspdf',
      'html2canvas',
      // Gantt
      'frappe-gantt',
    ],
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    fs: {
      strict: false
    },
    proxy: {
      // Ollama local model — proxied to avoid CORS issues in dev
      '/api/ai/chat': {
        target: 'http://localhost:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/ai/chat', '/api/chat'),
        // Must exceed OLLAMA_TIMEOUT_MS — model loading can take 60-180s
        timeout: 190000,
        proxyTimeout: 190000,
      },
    },
    // Pre-transform the hottest source files at server start so the first page
    // request is served from the warm transform cache instead of triggering a
    // cold transform cascade.
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/pages/NidusHomepage.jsx',
        './src/components/homepage/HeroSection.jsx',
        './src/components/homepage/CTASection.jsx',
        './src/components/ErrorBoundary.jsx',
        './src/services/supabase/supabaseClient.js',
      ],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Landing page — keep "/" in one small chunk for fast load
          'homepage': ['./src/pages/NidusHomepage'],
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'chart-vendor': ['frappe-gantt'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Feature chunks - route-based code splitting
          'admin': [
            './src/pages/admin/SecurityMonitoring',
            './src/pages/admin/AuditLogs',
            './src/pages/admin/GDPRCompliance',
            './src/pages/admin/SSOManagement',
            './src/pages/admin/PerformanceDashboard',
            './src/pages/admin/HelpManagement'
          ],
          'project': [
            './src/pages/Projects',
            './src/pages/ProjectsCreate',
            './src/pages/ProjectsDetail',
            './src/pages/ProjectsEdit'
          ],
          'task': [
            './src/pages/Tasks',
            './src/pages/TasksCreate',
            './src/pages/TasksDetail',
            './src/pages/TasksBoard',
            './src/pages/TasksCalendar'
          ],
          'kanban': [
            './src/pages/kanban/KanbanBoard',
            './src/pages/kanban/KanbanBoards',
            './src/pages/kanban/MetricsDashboard'
          ],
          'scrum': [
            './src/pages/scrum/SprintBoard',
            './src/pages/scrum/ProductBacklog',
            './src/pages/scrum/SprintPlanning',
            './src/pages/scrum/DailyScrum',
            './src/pages/scrum/SprintReview',
            './src/pages/scrum/SprintRetrospective'
          ],
          'structured': [
            './src/pages/structured/InitiatingProject',
            './src/pages/structured/StartingUpProject',
            './src/pages/structured/StageGates',
            './src/pages/structured/DirectingProject',
            './src/pages/structured/DirectingAuthorizations',
            './src/pages/structured/ControllingStage',
            './src/pages/structured/ManagingProductDelivery',
            './src/pages/structured/StageBoundaries',
            './src/pages/structured/ClosingProject'
          ],
          'help': [
            './src/pages/HelpCenter',
            './src/components/help/HelpButton',
            './src/components/help/GuidedTour',
            './src/components/help/ContextualHelp',
            './src/components/help/KnowledgeBase',
            './src/components/help/FAQ'
          ]
        }
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (optional)
    sourcemap: false
  }
})
