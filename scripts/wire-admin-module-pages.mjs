#!/usr/bin/env node
/**
 * Wire admin module list pages to shared dataServices + AdminListPageLayout
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve('E:/Hifo/AI Business/project-nidus-admin/modules')

const PAGE_CONFIG = {
  'users/UserListPage': { title: 'Users', fetch: 'fetchUsers', cols: "['full_name','email','is_active','last_login_at']" },
  'users/OrgListPage': { title: 'Organisations', fetch: 'fetchAccounts', cols: "['account_name','is_verified','created_at']" },
  'subscriptions/SubscriptionListPage': { title: 'Subscriptions', fetch: 'fetchPlatformSubscriptions', cols: "['status','plan_id','user_id','start_date']" },
  'subscriptions/PricingPlansPage': { title: 'Pricing Plans', fetch: 'fetchSubscriptionPlans', cols: "['plan_name','plan_code','price_monthly','is_active']" },
  'subscriptions/PaymentTransactionsPage': { title: 'Payment Transactions', fetch: 'fetchPaymentTransactions', cols: "['amount','currency','status','created_at']" },
  'system/SystemSettingsPage': { title: 'System Settings', fetch: 'fetchSystemSettings', cols: "['setting_key','category','setting_value']" },
  'system/FeatureFlagsPage': { title: 'Feature Flags', fetch: 'fetchFeatureFlags', cols: "['flag_key','flag_name','is_enabled']" },
  'system/MaintenanceModePage': { title: 'Maintenance Windows', fetch: 'fetchMaintenanceWindows', cols: "['starts_at','ends_at','system_target']" },
  'support/SupportTicketListPage': { title: 'Support Tickets', fetch: 'fetchSupportTickets', cols: "['subject','status','priority','created_at']" },
  'support/AnnouncementsPage': { title: 'Announcements', fetch: 'fetchAnnouncements', cols: "['title','status','published_at']" },
  'errors/ErrorDashboardPage': { title: 'Error Dashboard', fetch: 'fetchErrorAggregations', cols: "['error_type','page_route','occurrence_count','status','severity']" },
  'errors/ErrorAlertRulesPage': { title: 'Alert Rules', fetch: 'fetchErrorAlertRules', cols: "['rule_name','threshold_users','threshold_occurrences','is_active']" },
  'platform/PlatformProjectsOverviewPage': { title: 'Platform Projects', fetch: 'fetchAllProjects', cols: "['project_name','project_status','account_id','created_at']" },
  'simulator/SimScenarioAdminPage': { title: 'Scenarios', fetch: 'fetchSimScenarios', cols: "['title','scenario_type','is_active']" },
  'simulator/SimCertificateAdminPage': { title: 'Certificates', fetch: 'fetchSimCertificates', cols: "['certificate_name','is_active']" },
  'simulator/SimLeaderboardAdminPage': { title: 'Leaderboard', fetch: 'fetchSimLeaderboard', cols: "['user_id','score','rank_position']" },
  'audit/AuditTrailPage': { title: 'Audit Trail', fetch: 'fetchAuditLog', cols: "['action','admin_role','target_type','created_at']" },
  'audit/AdminActivityPage': { title: 'Admin Activity', fetch: 'fetchAdminActivity', cols: "['action_type','action_category','target_name','created_at']" },
  'admin-mgmt/AdminUserListPage': { title: 'Admin Users', fetch: 'fetchAdminUsers', cols: "['full_name','email','role','activation_status']" },
  'admin-mgmt/ActiveSessionsPage': { title: 'Active Sessions', fetch: 'fetchAdminSessions', cols: "['admin_user_id','ip_address','started_at','expires_at']" },
  'feedback/BugTrackingPage': { title: 'Bug Reports', fetch: 'fetchBugReports', cols: "['title','status','priority','created_at']" },
  'feedback/FeatureRequestsPage': { title: 'Feature Requests', fetch: 'fetchFeatureRequests', cols: "['title','status','votes','created_at']" },
}

for (const [rel, cfg] of Object.entries(PAGE_CONFIG)) {
  const [mod, page] = rel.split('/')
  const file = path.join(ROOT, mod, 'src/pages', `${page}.jsx`)
  const storageKey = `admin-${mod}-${page}`
  const columns = cfg.cols.replace(/'/g, '"').replace(/\[/g, '[').split(',').map((c) => c.trim().replace(/[\[\]"]/g, '')).filter(Boolean)
  const colJsx = columns.map((c) => `{ key: '${c}', label: '${c.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase())}' }`).join(', ')

  const content = `import { AdminListPageLayout } from '@nidus-admin/shared'
import { ${cfg.fetch} } from '@nidus-admin/shared'

export default function ${page}() {
  return (
    <AdminListPageLayout
      title="${cfg.title}"
      storageKey="${storageKey}"
      fetchFn={${cfg.fetch}}
      columns={[${colJsx}]}
      renderCard={(r, i) => (
        <div key={r.id || i} className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <span className="text-xs text-gray-500">#{i + 1}</span>
          <p className="font-medium text-gray-100">{r.${columns[0]} ?? r.id ?? '—'}</p>
        </div>
      )}
    />
  )
}
`
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  console.log('Updated', file)
}
