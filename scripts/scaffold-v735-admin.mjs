#!/usr/bin/env node
/**
 * v735 Admin System scaffold — generates project-nidus-admin mini-monorepo
 * Run: node scripts/scaffold-v735-admin.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ADMIN_ROOT = path.resolve('E:/Hifo/AI Business/project-nidus-admin')

const MODULES = [
  { name: 'users', port: 5180, federation: 'admin_users', title: 'Users & Organisations' },
  { name: 'subscriptions', port: 5181, federation: 'admin_subscriptions', title: 'Subscriptions' },
  { name: 'system', port: 5182, federation: 'admin_system', title: 'System' },
  { name: 'support', port: 5183, federation: 'admin_support', title: 'Support' },
  { name: 'errors', port: 5184, federation: 'admin_errors', title: 'Error Monitoring' },
  { name: 'mirrors', port: 5185, federation: 'admin_mirrors', title: 'Menu Mirrors' },
  { name: 'platform', port: 5186, federation: 'admin_platform', title: 'Platform Admin' },
  { name: 'simulator', port: 5187, federation: 'admin_simulator', title: 'Simulator Admin' },
  { name: 'security', port: 5188, federation: 'admin_security', title: 'Security' },
  { name: 'content', port: 5189, federation: 'admin_content', title: 'Content' },
  { name: 'feedback', port: 5190, federation: 'admin_feedback', title: 'Feedback' },
  { name: 'audit', port: 5191, federation: 'admin_audit', title: 'Audit' },
  { name: 'admin-mgmt', port: 5192, federation: 'admin_admin_mgmt', title: 'Admin Management' },
]

const MODULE_PAGES = {
  users: ['UserListPage', 'UserDetailPage', 'OrgListPage', 'OrgDetailPage', 'UserActivityPage'],
  subscriptions: ['SubscriptionListPage', 'SubscriptionDetailPage', 'PricingPlansPage', 'PaymentTransactionsPage', 'RevenueDashboardPage'],
  system: ['SystemSettingsPage', 'FeatureFlagsPage', 'MaintenanceModePage', 'SystemHealthPage'],
  support: ['SupportTicketListPage', 'SupportTicketDetailPage', 'UserImpersonationPage', 'AnnouncementsPage'],
  errors: ['ErrorDashboardPage', 'ErrorDetailPage', 'ErrorAlertRulesPage'],
  mirrors: ['PlatformMirrorPage', 'SimulatorMirrorPage'],
  platform: ['PlatformProjectsOverviewPage', 'PlatformSettingsPage', 'PlatformHealthPage'],
  simulator: ['SimScenarioAdminPage', 'SimLearningPathAdminPage', 'SimCertificateAdminPage', 'SimLeaderboardAdminPage', 'SimNPCAdminPage', 'SimHealthPage'],
  security: ['SecuritySettingsPage', 'SSOManagementPage', 'SecurityMonitoringPage', 'GDPRCompliancePage', 'PerformanceMetricsPage'],
  content: ['DocumentationCMSPage', 'HelpManagementPage', 'PWASettingsPage', 'RoleMenuConfigPage'],
  feedback: ['BugTrackingPage', 'FeatureRequestsPage', 'FeedbackAnalysisPage', 'ImprovementBacklogPage'],
  audit: ['AuditTrailPage', 'AdminActivityPage', 'ExportLogsPage'],
  'admin-mgmt': ['AdminUserListPage', 'AdminUserInvitePage', 'PendingActivationsPage', 'AdminUserEditPage', 'RolePermissionsPage', 'ActiveSessionsPage'],
}

function write(filePath, content) {
  const full = path.join(ADMIN_ROOT, filePath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content, 'utf8')
  console.log('  +', filePath)
}

function moduleViteConfig(mod) {
  return `import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import federation from '@originjs/vite-plugin-federation'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    federation({
      name: '${mod.federation}',
      filename: 'remoteEntry.js',
      exposes: { './routes': './src/index.jsx' },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.30.2' },
        '@supabase/supabase-js': { singleton: true },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@nidus-admin/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@nidus-admin/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  build: { target: 'esnext', minify: false, cssCodeSplit: false, modulePreload: false },
  server: { port: ${mod.port}, strictPort: true, cors: true },
  preview: { port: ${mod.port}, strictPort: true, cors: true },
})
`
}

function modulePackageJson(mod) {
  const pkg = `@nidus-admin/${mod.name}`
  return JSON.stringify({
    name: pkg,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview', test: 'vitest run' },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.30.2',
      '@supabase/supabase-js': '^2.49.1',
      '@nidus-admin/ui': 'workspace:*',
      '@nidus-admin/shared': 'workspace:*',
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.3.4',
      '@originjs/vite-plugin-federation': '^1.3.6',
      vite: '^6.0.7',
      vitest: '^3.0.5',
    },
  }, null, 2)
}

function moduleIndex(mod) {
  const pages = MODULE_PAGES[mod.name] || []
  const imports = pages.map((p) => `import ${p} from './pages/${p}.jsx'`).join('\n')
  const routes = pages.map((p) => {
    const route = p.replace(/Page$/, '').replace(/([A-Z])/g, (m, c, i) => (i ? '-' : '') + c.toLowerCase())
    return `      <Route path="${route}" element={<${p} />} />`
  }).join('\n')
  return `import { Routes, Route, Navigate } from 'react-router-dom'
${imports}

export default function ${mod.name.split('-').map((s, i) => i ? s.charAt(0).toUpperCase() + s.slice(1) : s.charAt(0).toUpperCase() + s.slice(1)).join('')}Routes() {
  return (
    <Routes>
${routes}
      <Route path="*" element={<Navigate to="${pages[0] ? pages[0].replace(/Page$/, '').replace(/([A-Z])/g, (m, c, i) => (i ? '-' : '') + c.toLowerCase()) : ''}" replace />} />
    </Routes>
  )
}
`
}

function pageComponent(pageName, mod) {
  const title = pageName.replace(/Page$/, '').replace(/([A-Z])/g, ' $1').trim()
  return `import { useState, useEffect } from 'react'
import { AdminTable, AdminCard, LoadingState, EmptyState } from '@nidus-admin/ui'

export default function ${pageName}() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(false)
    setRows([])
  }, [])

  if (loading) return <LoadingState message="Loading ${title}..." />
  if (error) return <div className="text-red-400 p-4">{error}</div>

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-100">${title}</h1>
        <span className="text-sm text-gray-500">${mod.title} module</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard title="Total" value={rows.length} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No records" description="Data will appear here once loaded from the database." />
      ) : (
        <AdminTable columns={[{ key: 'id', label: 'ID' }]} rows={rows} />
      )}
    </div>
  )
}
`
}

console.log('Scaffolding v735 Admin System at:', ADMIN_ROOT)
fs.mkdirSync(ADMIN_ROOT, { recursive: true })

// Root files
write('pnpm-workspace.yaml', `packages:\n  - 'shell'\n  - 'modules/*'\n  - 'packages/*'\n`)

write('package.json', JSON.stringify({
  name: 'project-nidus-admin',
  private: true,
  version: '1.0.0',
  type: 'module',
  packageManager: 'pnpm@9.15.0',
  scripts: {
    dev: 'turbo dev',
    build: 'turbo build',
    test: 'turbo test',
    lint: 'turbo lint',
    'admin:seed-super': 'node scripts/seed-super-admin.js',
  },
}, null, 2))

write('turbo.json', JSON.stringify({
  $schema: 'https://turbo.build/schema.json',
  pipeline: {
    build: { dependsOn: ['^build'], outputs: ['dist/**'] },
    dev: { cache: false, persistent: true },
    test: { dependsOn: ['build'] },
    lint: {},
  },
}, null, 2))

write('.env.example', `# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ADMIN_KEY=your-service-role-key

# Module Federation URLs (dev defaults to localhost ports)
VITE_ADMIN_USERS_URL=http://localhost:5180/remoteEntry.js
VITE_ADMIN_SUBSCRIPTIONS_URL=http://localhost:5181/remoteEntry.js
VITE_ADMIN_SYSTEM_URL=http://localhost:5182/remoteEntry.js
VITE_ADMIN_SUPPORT_URL=http://localhost:5183/remoteEntry.js
VITE_ADMIN_ERRORS_URL=http://localhost:5184/remoteEntry.js
VITE_ADMIN_MIRRORS_URL=http://localhost:5185/remoteEntry.js
VITE_ADMIN_PLATFORM_URL=http://localhost:5186/remoteEntry.js
VITE_ADMIN_SIMULATOR_URL=http://localhost:5187/remoteEntry.js
VITE_ADMIN_SECURITY_URL=http://localhost:5188/remoteEntry.js
VITE_ADMIN_CONTENT_URL=http://localhost:5189/remoteEntry.js
VITE_ADMIN_FEEDBACK_URL=http://localhost:5190/remoteEntry.js
VITE_ADMIN_AUDIT_URL=http://localhost:5191/remoteEntry.js
VITE_ADMIN_ADMIN_MGMT_URL=http://localhost:5192/remoteEntry.js
`)

write('.gitignore', `node_modules\ndist\n.env\n.env.local\n*.log\n.DS_Store\ndev-start-all.bat\n`)

// Modules
for (const mod of MODULES) {
  write(`modules/${mod.name}/package.json`, modulePackageJson(mod))
  write(`modules/${mod.name}/vite.config.js`, moduleViteConfig(mod))
  write(`modules/${mod.name}/src/index.jsx`, moduleIndex(mod))
  for (const page of MODULE_PAGES[mod.name] || []) {
    write(`modules/${mod.name}/src/pages/${page}.jsx`, pageComponent(page, mod))
  }
}

// Template module
write('modules/_template/package.json', modulePackageJson({ name: '_template', port: 5199, federation: 'admin_template' }))
write('modules/_template/vite.config.js', moduleViteConfig({ federation: 'admin_template', port: 5199 }))
write('modules/_template/src/index.jsx', `export default function TemplateRoutes() { return <div className="p-6 text-gray-300">Template module</div> }\n`)

console.log('\nScaffold complete. Shell and packages require manual setup — run scaffold-v735-admin-shell.mjs next.')
