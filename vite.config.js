import { createBaseViteConfig } from './vite.base.config.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Legacy combined SPA entry (main.jsx → App.jsx). Kept for backward compatibility. */
export default createBaseViteConfig({
  appRoot: __dirname,
  outDir: path.resolve(__dirname, 'dist'),
  pwaScope: '/',
  pwaManifest: false,
  manualChunksExtra: {
    homepage: ['./src/pages/NidusHomepage'],
    admin: [
      './src/pages/admin/SecurityMonitoring',
      './src/pages/admin/AuditLogs',
      './src/pages/admin/GDPRCompliance',
      './src/pages/admin/SSOManagement',
      './src/pages/admin/PerformanceDashboard',
      './src/pages/admin/HelpManagement',
    ],
    project: [
      './src/pages/Projects',
      './src/pages/ProjectsCreate',
      './src/pages/ProjectsDetail',
      './src/pages/ProjectsEdit',
    ],
    task: [
      './src/pages/Tasks',
      './src/pages/TasksCreate',
      './src/pages/TasksDetail',
      './src/pages/TasksBoard',
      './src/pages/TasksCalendar',
    ],
    kanban: [
      './src/pages/kanban/KanbanBoard',
      './src/pages/kanban/KanbanBoards',
      './src/pages/kanban/MetricsDashboard',
    ],
    scrum: [
      './src/pages/scrum/SprintBoard',
      './src/pages/scrum/ProductBacklog',
      './src/pages/scrum/SprintPlanning',
      './src/pages/scrum/DailyScrum',
      './src/pages/scrum/SprintReview',
      './src/pages/scrum/SprintRetrospective',
    ],
    structured: [
      './src/pages/structured/InitiatingProject',
      './src/pages/structured/StartingUpProject',
      './src/pages/structured/StageGates',
      './src/pages/structured/ControllingStage',
      './src/pages/structured/ManagingProductDelivery',
      './src/pages/structured/DirectingProject',
      './src/pages/structured/StageBoundaries',
      './src/pages/structured/ClosingProject',
    ],
    help: [
      './src/pages/HelpCenter',
      './src/components/help/HelpButton',
      './src/components/help/GuidedTour',
      './src/components/help/ContextualHelp',
      './src/components/help/KnowledgeBase',
      './src/components/help/FAQ',
    ],
  },
})
