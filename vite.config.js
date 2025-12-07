import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic'
  })],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    force: true
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    fs: {
      strict: false
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'framer-motion'],
          'chart-vendor': ['frappe-gantt', 'frappe-gantt-react'],
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
            './src/pages/structured/DirectingProject',
            './src/pages/structured/ControllingStage',
            './src/pages/structured/ManagingProductDelivery',
            './src/pages/structured/ManagingStageBoundary',
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
