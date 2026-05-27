import { Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { ThemeProvider } from '../../../context/ThemeContext'
import { ToastProvider } from '../../../context/ToastContext'
import Layout from '../../../components/Layout'
import PMLayout from '../../../components/pm/PMLayout'
import PMOLayout from '../../../components/pmo/PMOLayout'
import SimulatorPMOLayout from '../../../components/sim/pmo/SimulatorPMOLayout'
import SimulatorPMLayout from '../../../components/sim/pm/SimulatorPMLayout'
import { createGapListPage } from '../pages/gapPageFactory'

const Loading = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
  </div>
)

function withProviders(el) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProtectedRoute>{el}</ProtectedRoute>
      </ToastProvider>
    </ThemeProvider>
  )
}

function wrapPm(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<PMLayout>{el}</PMLayout>)}
    </Suspense>
  )
}

function wrapPmo(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<PMOLayout>{el}</PMOLayout>)}
    </Suspense>
  )
}

function wrapSimPm(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMLayout>{el}</SimulatorPMLayout>)}
    </Suspense>
  )
}

function wrapSimPmo(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMOLayout>{el}</SimulatorPMOLayout>)}
    </Suspense>
  )
}

function wrapPlain(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(el)}
    </Suspense>
  )
}

function wrapPlatform(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<Layout>{el}</Layout>)}
    </Suspense>
  )
}

function wrapSimulator(el) {
  return (
    <Suspense fallback={<Loading />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <Layout>{el}</Layout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

const AutomationHubPage = lazy(() => import('../pages/AutomationHubPage'))
const AutomationRuleBuilder = lazy(() => import('../../../pages/AutomationRuleBuilder'))
const OKRDashboardPage = lazy(() => import('../pages/OKRDashboardPage'))
const WorkloadHeatmapPage = lazy(() => import('../pages/WorkloadHeatmapPage'))
const UniversalCalendarPage = lazy(() => import('../pages/UniversalCalendarPage'))
const PlanningPokerPage = lazy(() => import('../pages/PlanningPokerPage'))
const DashboardBuilderPage = lazy(() => import('../pages/DashboardBuilderPage'))
const PortfolioMapPage = lazy(() => import('../pages/PortfolioMapPage'))
const WhiteboardPage = lazy(() => import('../pages/WhiteboardPage'))
const SCurvePage = lazy(() => import('../pages/SCurvePage'))
const SimMultiplayerPage = lazy(() => import('../pages/sim/SimMultiplayerPage'))
const SimExamModePage = lazy(() => import('../pages/sim/SimExamModePage'))
const SimMarketplacePage = lazy(() => import('../pages/sim/SimMarketplacePage'))
const SimCrossRunAnalyticsPage = lazy(() => import('../pages/sim/SimCrossRunAnalyticsPage'))

const CUSTOM_FIELD_COLUMNS = [
  { key: 'field_code', label: 'Code' },
  { key: 'label', label: 'Field' },
  { key: 'field_type', label: 'Type' },
  { key: 'workflow_status', label: 'Status' },
]

const CustomFieldsPage = createGapListPage({
  gapId: 'GAP-04',
  title: 'Custom Fields',
  table: 'custom_field_definitions',
  iconName: 'SlidersHorizontal',
  columns: CUSTOM_FIELD_COLUMNS,
})

const IntakeFormsPage = createGapListPage({
  gapId: 'GAP-06',
  title: 'Public Intake Forms',
  table: 'intake_forms',
  iconName: 'FileInput',
  columns: [
    { key: 'form_name', label: 'Form' },
    { key: 'form_status', label: 'Status' },
    { key: 'public_token', label: 'Token' },
    { key: 'created_at', label: 'Created' },
  ],
})

const ClientPortalPage = createGapListPage({
  gapId: 'GAP-07',
  title: 'Client Portal',
  table: 'client_portal_configs',
  iconName: 'Globe',
  columns: [
    { key: 'portal_name', label: 'Portal' },
    { key: 'portal_status', label: 'Status' },
    { key: 'public_token', label: 'Token' },
  ],
})

const RecurringTasksPage = createGapListPage({
  gapId: 'GAP-08',
  title: 'Recurring Tasks',
  table: 'recurring_task_templates',
  iconName: 'Repeat',
  columns: [
    { key: 'template_name', label: 'Template' },
    { key: 'recurrence_pattern', label: 'Pattern' },
    { key: 'is_active', label: 'Active' },
  ],
})

const RaciPage = createGapListPage({
  gapId: 'GAP-10',
  title: 'RACI Matrix',
  table: 'raci_matrices',
  iconName: 'Table2',
  columns: [
    { key: 'matrix_name', label: 'Matrix' },
    { key: 'project_id', label: 'Project' },
    { key: 'updated_at', label: 'Updated' },
  ],
})

const SkillsPage = createGapListPage({
  gapId: 'GAP-11',
  title: 'Skills Matrix',
  table: 'skill_catalog',
  iconName: 'BookMarked',
  columns: [
    { key: 'skill_name', label: 'Skill' },
    { key: 'category_name', label: 'Category' },
    { key: 'is_active', label: 'Active' },
  ],
})

const VendorsPage = createGapListPage({
  gapId: 'GAP-12',
  title: 'Vendor Register',
  table: 'vendors',
  iconName: 'ShoppingCart',
  columns: [
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'vendor_category', label: 'Category' },
    { key: 'rating', label: 'Rating' },
  ],
})

const TimesheetApprovalsPage = createGapListPage({
  gapId: 'GAP-13',
  title: 'Timesheet Approvals',
  table: 'timesheet_approvals',
  iconName: 'Clock',
  columns: [
    { key: 'timesheet_id', label: 'Timesheet' },
    { key: 'approval_status', label: 'Status' },
    { key: 'submitted_at', label: 'Submitted' },
  ],
})

const GuestAccessPage = createGapListPage({
  gapId: 'GAP-19',
  title: 'Guest Access',
  table: 'guest_collaborators',
  iconName: 'UserPlus',
  columns: [
    { key: 'guest_email', label: 'Email' },
    { key: 'access_level', label: 'Access' },
    { key: 'is_active', label: 'Active' },
  ],
})

const TrainingPage = createGapListPage({
  gapId: 'GAP-20',
  title: 'Training Tracker',
  table: 'training_certifications',
  iconName: 'GraduationCap',
  columns: [
    { key: 'certification_name', label: 'Certification' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'validity_months', label: 'Validity (mo)' },
  ],
})

const NotificationPrefsPage = createGapListPage({
  gapId: 'GAP-21',
  title: 'Notification Preferences',
  table: 'notification_preferences',
  iconName: 'Bell',
  columns: [
    { key: 'channel', label: 'Channel' },
    { key: 'event_type', label: 'Event' },
    { key: 'is_enabled', label: 'Enabled' },
  ],
})

const ProjectClonePage = createGapListPage({
  gapId: 'GAP-22',
  title: 'Project Clone Jobs',
  table: 'project_clone_jobs',
  iconName: 'Copy',
  columns: [
    { key: 'source_project_id', label: 'Source' },
    { key: 'clone_status', label: 'Status' },
    { key: 'created_at', label: 'Created' },
  ],
})

const ScheduledReportsPage = createGapListPage({
  gapId: 'GAP-23',
  title: 'Scheduled Health Reports',
  table: 'scheduled_health_reports',
  iconName: 'CalendarClock',
  columns: [
    { key: 'report_name', label: 'Report' },
    { key: 'schedule_cron', label: 'Schedule' },
    { key: 'is_active', label: 'Active' },
  ],
})

const IntegrationsPage = createGapListPage({
  gapId: 'GAP-25',
  title: 'Integrations Marketplace',
  table: 'integration_catalog',
  iconName: 'Plug',
  columns: [
    { key: 'integration_name', label: 'Integration' },
    { key: 'category', label: 'Category' },
    { key: 'is_available', label: 'Available' },
  ],
})

/** Simulator-scoped list pages (sim schema via gapDataService) */
function simList(base) {
  return createGapListPage({ ...base, sim: true, storageKeyPrefix: `sim-${base.gapId}` })
}

const CustomFieldsPageSim = simList({
  gapId: 'GAP-04',
  title: 'Custom Fields',
  table: 'custom_field_definitions',
  iconName: 'SlidersHorizontal',
  columns: CUSTOM_FIELD_COLUMNS,
})
const IntakeFormsPageSim = simList({
  gapId: 'GAP-06',
  title: 'Public Intake Forms',
  table: 'intake_forms',
  iconName: 'FileInput',
  columns: [
    { key: 'form_name', label: 'Form' },
    { key: 'form_status', label: 'Status' },
    { key: 'public_token', label: 'Token' },
    { key: 'created_at', label: 'Created' },
  ],
})
const ClientPortalPageSim = simList({
  gapId: 'GAP-07',
  title: 'Client Portal',
  table: 'client_portal_configs',
  iconName: 'Globe',
  columns: [
    { key: 'portal_name', label: 'Portal' },
    { key: 'portal_status', label: 'Status' },
    { key: 'public_token', label: 'Token' },
  ],
})
const RecurringTasksPageSim = simList({
  gapId: 'GAP-08',
  title: 'Recurring Tasks',
  table: 'recurring_task_templates',
  iconName: 'Repeat',
  columns: [
    { key: 'template_name', label: 'Template' },
    { key: 'recurrence_pattern', label: 'Pattern' },
    { key: 'is_active', label: 'Active' },
  ],
})
const RaciPageSim = simList({
  gapId: 'GAP-10',
  title: 'RACI Matrix',
  table: 'raci_matrices',
  iconName: 'Table2',
  columns: [
    { key: 'matrix_name', label: 'Matrix' },
    { key: 'project_id', label: 'Project' },
    { key: 'updated_at', label: 'Updated' },
  ],
})
const SkillsPageSim = simList({
  gapId: 'GAP-11',
  title: 'Skills Matrix',
  table: 'skill_catalog',
  iconName: 'BookMarked',
  columns: [
    { key: 'skill_name', label: 'Skill' },
    { key: 'category_name', label: 'Category' },
    { key: 'is_active', label: 'Active' },
  ],
})
const VendorsPageSim = simList({
  gapId: 'GAP-12',
  title: 'Vendor Register',
  table: 'vendors',
  iconName: 'ShoppingCart',
  columns: [
    { key: 'vendor_name', label: 'Vendor' },
    { key: 'vendor_category', label: 'Category' },
    { key: 'rating', label: 'Rating' },
  ],
})
const NotificationPrefsPageSim = simList({
  gapId: 'GAP-21',
  title: 'Notification Preferences',
  table: 'notification_preferences',
  iconName: 'Bell',
  columns: [
    { key: 'channel', label: 'Channel' },
    { key: 'event_type', label: 'Event' },
    { key: 'is_enabled', label: 'Enabled' },
  ],
})
const ScheduledReportsPageSim = simList({
  gapId: 'GAP-23',
  title: 'Scheduled Health Reports',
  table: 'scheduled_health_reports',
  iconName: 'CalendarClock',
  columns: [
    { key: 'report_name', label: 'Report' },
    { key: 'schedule_cron', label: 'Schedule' },
    { key: 'is_active', label: 'Active' },
  ],
})
const IntegrationsPageSim = simList({
  gapId: 'GAP-25',
  title: 'Integrations Marketplace',
  table: 'integration_catalog',
  iconName: 'Plug',
  columns: [
    { key: 'integration_name', label: 'Integration' },
    { key: 'category', label: 'Category' },
    { key: 'is_available', label: 'Available' },
  ],
})
const TrainingPageSim = simList({
  gapId: 'GAP-20',
  title: 'Training Tracker',
  table: 'training_certifications',
  iconName: 'GraduationCap',
  columns: [
    { key: 'certification_name', label: 'Certification' },
    { key: 'issuer', label: 'Issuer' },
    { key: 'validity_months', label: 'Validity (mo)' },
  ],
})

const AutomationTemplatesPage = createGapListPage({
  gapId: 'GAP-01',
  title: 'Automation Templates',
  table: 'automation_rule_templates',
  iconName: 'Layers',
  storageKeyPrefix: 'automation-templates',
  columns: [
    { key: 'template_name', label: 'Template' },
    { key: 'template_category', label: 'Category' },
    { key: 'is_active', label: 'Active' },
  ],
})

const AutomationLogPage = createGapListPage({
  gapId: 'GAP-01',
  title: 'Automation Execution Log',
  table: 'automation_rule_executions',
  iconName: 'Activity',
  storageKeyPrefix: 'automation-log',
  columns: [
    { key: 'rule_id', label: 'Rule' },
    { key: 'execution_status', label: 'Status' },
    { key: 'started_at', label: 'Started' },
  ],
})

const OKRObjectivesPage = createGapListPage({
  gapId: 'GAP-03',
  title: 'Objectives & Key Results',
  table: 'key_results',
  iconName: 'Target',
  storageKeyPrefix: 'okr-objectives',
  columns: [
    { key: 'kr_title', label: 'Key Result' },
    { key: 'target_value', label: 'Target' },
    { key: 'current_value', label: 'Current' },
    { key: 'health_status', label: 'Health' },
  ],
})

/** All PMIS gap routes — import inside Layout/ProtectedRoute in App.jsx */
export function PmisGapRouteElements() {
  return (
    <>
      {/* PM routes */}
      <Route path="pm/calendar" element={wrapPm(<UniversalCalendarPage />)} />
      <Route path="pm/automations" element={wrapPm(<AutomationHubPage />)} />
      <Route path="pm/automations/templates" element={wrapPm(<AutomationTemplatesPage />)} />
      <Route path="pm/automations/log" element={wrapPm(<AutomationLogPage />)} />
      <Route path="pm/automations/builder/:ruleId?" element={wrapPm(<AutomationRuleBuilder />)} />
      <Route path="pm/okr" element={wrapPm(<OKRDashboardPage />)} />
      <Route path="pm/okr/objectives" element={wrapPm(<OKRObjectivesPage />)} />
      <Route path="pm/okr/alignment" element={wrapPm(<OKRDashboardPage />)} />
      <Route path="pm/okr/checkins" element={wrapPm(<OKRObjectivesPage />)} />
      <Route path="pm/settings/custom-fields" element={wrapPm(<CustomFieldsPage />)} />
      <Route path="pm/resources/workload" element={wrapPm(<WorkloadHeatmapPage />)} />
      <Route path="pm/settings/intake-forms" element={wrapPm(<IntakeFormsPage />)} />
      <Route path="pm/settings/intake-forms/submissions" element={wrapPm(<IntakeFormsPage />)} />
      <Route path="pm/settings/client-portal" element={wrapPm(<ClientPortalPage />)} />
      <Route path="pm/settings/recurring-tasks" element={wrapPm(<RecurringTasksPage />)} />
      <Route path="pm/resources/raci" element={wrapPm(<RaciPage />)} />
      <Route path="pm/resources/skills" element={wrapPm(<SkillsPage />)} />
      <Route path="pm/resources/timesheet-approvals" element={wrapPm(<TimesheetApprovalsPage />)} />
      <Route path="pm/resources/training" element={wrapPm(<TrainingPage />)} />
      <Route path="pm/procurement/vendors" element={wrapPm(<VendorsPage />)} />
      <Route path="pm/procurement/requests" element={wrapPm(<VendorsPage />)} />
      <Route path="pm/procurement/orders" element={wrapPm(<VendorsPage />)} />
      <Route path="pm/procurement/contracts" element={wrapPm(<VendorsPage />)} />
      <Route path="pm/procurement/invoices" element={wrapPm(<VendorsPage />)} />
      <Route path="pm/planning/s-curve" element={wrapPm(<SCurvePage />)} />
      <Route path="pm/planning/planning-poker" element={wrapPm(<PlanningPokerPage />)} />
      <Route path="pm/dashboards/builder" element={wrapPm(<DashboardBuilderPage />)} />
      <Route path="pm/strategy/portfolio-map" element={wrapPm(<PortfolioMapPage />)} />
      <Route path="pm/collaboration/whiteboard" element={wrapPm(<WhiteboardPage />)} />
      <Route path="pm/settings/guest-access" element={wrapPm(<GuestAccessPage />)} />
      <Route path="pm/settings/notifications" element={wrapPm(<NotificationPrefsPage />)} />
      <Route path="pm/settings/project-clone" element={wrapPm(<ProjectClonePage />)} />
      <Route path="pm/reporting/scheduled" element={wrapPm(<ScheduledReportsPage />)} />
      <Route path="pm/integrations" element={wrapPm(<IntegrationsPage />)} />
      <Route path="pm/integrations/connections" element={wrapPm(<IntegrationsPage />)} />

      {/* PMO routes */}
      <Route path="pmo/calendar" element={wrapPmo(<UniversalCalendarPage />)} />
      <Route path="pmo/admin/automations" element={wrapPmo(<AutomationHubPage />)} />
      <Route path="pmo/admin/automations/templates" element={wrapPmo(<AutomationTemplatesPage />)} />
      <Route path="pmo/okr" element={wrapPmo(<OKRDashboardPage />)} />
      <Route path="pmo/okr/objectives" element={wrapPmo(<OKRObjectivesPage />)} />
      <Route path="pmo/okr/alignment" element={wrapPmo(<OKRDashboardPage />)} />
      <Route path="pmo/okr/checkins" element={wrapPmo(<OKRObjectivesPage />)} />
      <Route path="pmo/admin/custom-fields" element={wrapPmo(<CustomFieldsPage />)} />
      <Route path="pmo/resources/workload" element={wrapPmo(<WorkloadHeatmapPage />)} />
      <Route path="pmo/admin/intake-forms" element={wrapPmo(<IntakeFormsPage />)} />
      <Route path="pmo/admin/client-portals" element={wrapPmo(<ClientPortalPage />)} />
      <Route path="pmo/resources/raci" element={wrapPmo(<RaciPage />)} />
      <Route path="pmo/resources/skills" element={wrapPmo(<SkillsPage />)} />
      <Route path="pmo/procurement/vendors" element={wrapPmo(<VendorsPage />)} />
      <Route path="pmo/procurement/requests" element={wrapPmo(<VendorsPage />)} />
      <Route path="pmo/procurement/orders" element={wrapPmo(<VendorsPage />)} />
      <Route path="pmo/procurement/contracts" element={wrapPmo(<VendorsPage />)} />
      <Route path="pmo/procurement/invoices" element={wrapPmo(<VendorsPage />)} />
      <Route path="pmo/planning/s-curve" element={wrapPmo(<SCurvePage />)} />
      <Route path="pmo/planning/planning-poker" element={wrapPmo(<PlanningPokerPage />)} />
      <Route path="pmo/dashboards/builder" element={wrapPmo(<DashboardBuilderPage />)} />
      <Route path="pmo/strategy/portfolio-map" element={wrapPmo(<PortfolioMapPage />)} />
      <Route path="pmo/collaboration/whiteboard" element={wrapPmo(<WhiteboardPage />)} />
      <Route path="pmo/settings/notifications" element={wrapPmo(<NotificationPrefsPage />)} />
      <Route path="pmo/admin/integrations" element={wrapPmo(<IntegrationsPage />)} />
      <Route path="pmo/reporting/scheduled" element={wrapPmo(<ScheduledReportsPage />)} />

      {/* Platform DB-driven role routes */}
      <Route path="platform/calendar" element={wrapPlatform(<UniversalCalendarPage />)} />
      <Route path="platform/okr" element={wrapPlatform(<OKRDashboardPage />)} />
      <Route path="platform/resources/workload" element={wrapPlatform(<WorkloadHeatmapPage />)} />
      <Route path="platform/settings/notifications" element={wrapPlatform(<NotificationPrefsPage />)} />
      <Route path="platform/automations" element={wrapPlatform(<AutomationHubPage />)} />
      <Route path="platform/admin/custom-fields" element={wrapPlatform(<CustomFieldsPage />)} />
      <Route path="platform/intake-forms" element={wrapPlatform(<IntakeFormsPage />)} />
      <Route path="platform/client-portal" element={wrapPlatform(<ClientPortalPage />)} />
      <Route path="platform/recurring-tasks" element={wrapPlatform(<RecurringTasksPage />)} />
      <Route path="platform/planning/raci" element={wrapPlatform(<RaciPage />)} />
      <Route path="platform/resources/skills" element={wrapPlatform(<SkillsPage />)} />
      <Route path="platform/procurement" element={wrapPlatform(<VendorsPage />)} />
      <Route path="platform/timesheets/approvals" element={wrapPlatform(<TimesheetApprovalsPage />)} />
      <Route path="platform/planning/s-curve" element={wrapPlatform(<SCurvePage />)} />
      <Route path="platform/planning/planning-poker" element={wrapPlatform(<PlanningPokerPage />)} />
      <Route path="platform/dashboards/builder" element={wrapPlatform(<DashboardBuilderPage />)} />
      <Route path="platform/strategy/portfolio-map" element={wrapPlatform(<PortfolioMapPage />)} />
      <Route path="platform/collaboration/whiteboard" element={wrapPlatform(<WhiteboardPage />)} />
      <Route path="platform/admin/guest-access" element={wrapPlatform(<GuestAccessPage />)} />
      <Route path="platform/resources/training" element={wrapPlatform(<TrainingPage />)} />
      <Route path="platform/admin/project-clone" element={wrapPlatform(<ProjectClonePage />)} />
      <Route path="platform/reporting/scheduled" element={wrapPlatform(<ScheduledReportsPage />)} />
      <Route path="platform/admin/integrations" element={wrapPlatform(<IntegrationsPage />)} />

      {/* Simulator general */}
      <Route path="simulator/calendar" element={wrapSimulator(<UniversalCalendarPage sim />)} />
      <Route path="simulator/okr" element={wrapSimulator(<OKRDashboardPage sim />)} />
      <Route path="simulator/team-mode/setup" element={wrapSimulator(<SimMultiplayerPage />)} />
      <Route path="simulator/team-mode/active" element={wrapSimulator(<SimMultiplayerPage />)} />
      <Route path="simulator/exams" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/exams/results" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/exams/certificates" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/scenarios/marketplace" element={wrapSimulator(<SimMarketplacePage />)} />
      <Route path="simulator/profile/run-analytics" element={wrapSimulator(<SimCrossRunAnalyticsPage />)} />
      <Route path="simulator/profile/improvement" element={wrapSimulator(<SimCrossRunAnalyticsPage />)} />
      <Route path="simulator/planning/recurring-tasks" element={wrapSimulator(<RecurringTasksPageSim />)} />
      <Route path="simulator/planning/raci" element={wrapSimulator(<RaciPageSim />)} />
      <Route path="simulator/dashboards/builder" element={wrapSimulator(<DashboardBuilderPage sim />)} />
      <Route path="simulator/reporting/scheduled" element={wrapSimulator(<ScheduledReportsPageSim />)} />
      <Route path="simulator/collaboration/whiteboard" element={wrapSimulator(<WhiteboardPage sim />)} />
      <Route path="simulator/settings/notifications" element={wrapSimulator(<NotificationPrefsPageSim />)} />

      {/* Simulator PM */}
      <Route path="simulator/pm/calendar" element={wrapSimPm(<UniversalCalendarPage sim />)} />
      <Route path="simulator/pm/automations" element={wrapSimPm(<AutomationHubPage />)} />
      <Route path="simulator/pm/okr" element={wrapSimPm(<OKRDashboardPage sim />)} />
      <Route path="simulator/pm/resources/workload" element={wrapSimPm(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/pm/settings/custom-fields" element={wrapSimPm(<CustomFieldsPageSim />)} />
      <Route path="simulator/pm/settings/intake-forms" element={wrapSimPm(<IntakeFormsPageSim />)} />
      <Route path="simulator/pm/settings/client-portal" element={wrapSimPm(<ClientPortalPageSim />)} />
      <Route path="simulator/pm/settings/recurring-tasks" element={wrapSimPm(<RecurringTasksPageSim />)} />
      <Route path="simulator/pm/resources/raci" element={wrapSimPm(<RaciPageSim />)} />
      <Route path="simulator/pm/resources/skills" element={wrapSimPm(<SkillsPageSim />)} />
      <Route path="simulator/pm/procurement/vendors" element={wrapSimPm(<VendorsPageSim />)} />
      <Route path="simulator/pm/planning/s-curve" element={wrapSimPm(<SCurvePage sim />)} />
      <Route path="simulator/pm/planning/planning-poker" element={wrapSimPm(<PlanningPokerPage sim />)} />
      <Route path="simulator/pm/dashboards/builder" element={wrapSimPm(<DashboardBuilderPage sim />)} />
      <Route path="simulator/pm/collaboration/whiteboard" element={wrapSimPm(<WhiteboardPage sim />)} />
      <Route path="simulator/pm/settings/notifications" element={wrapSimPm(<NotificationPrefsPageSim />)} />
      <Route path="simulator/pm/reporting/scheduled" element={wrapSimPm(<ScheduledReportsPageSim />)} />

      {/* Simulator PMO */}
      <Route path="simulator/pmo/calendar" element={wrapSimPmo(<UniversalCalendarPage sim />)} />
      <Route path="simulator/pmo/admin/automations" element={wrapSimPmo(<AutomationHubPage />)} />
      <Route path="simulator/pmo/okr" element={wrapSimPmo(<OKRDashboardPage sim />)} />
      <Route path="simulator/pmo/resources/workload" element={wrapSimPmo(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/pmo/admin/custom-fields" element={wrapSimPmo(<CustomFieldsPageSim />)} />
      <Route path="simulator/pmo/admin/intake-forms" element={wrapSimPmo(<IntakeFormsPageSim />)} />
      <Route path="simulator/pmo/admin/client-portals" element={wrapSimPmo(<ClientPortalPageSim />)} />
      <Route path="simulator/pmo/resources/raci" element={wrapSimPmo(<RaciPageSim />)} />
      <Route path="simulator/pmo/resources/skills" element={wrapSimPmo(<SkillsPageSim />)} />
      <Route path="simulator/pmo/procurement/vendors" element={wrapSimPmo(<VendorsPageSim />)} />
      <Route path="simulator/pmo/planning/s-curve" element={wrapSimPmo(<SCurvePage sim />)} />
      <Route path="simulator/pmo/strategy/portfolio-map" element={wrapSimPmo(<PortfolioMapPage sim />)} />
      <Route path="simulator/pmo/admin/integrations" element={wrapSimPmo(<IntegrationsPageSim />)} />
      <Route path="simulator/pmo/reporting/scheduled" element={wrapSimPmo(<ScheduledReportsPageSim />)} />

      {/* Simulator TM */}
      <Route path="simulator/tm/calendar" element={wrapSimulator(<UniversalCalendarPage sim />)} />
      <Route path="simulator/tm/workload" element={wrapSimulator(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/tm/raci" element={wrapSimulator(<RaciPageSim />)} />
      <Route path="simulator/tm/skills" element={wrapSimulator(<SkillsPageSim />)} />
      <Route path="simulator/tm/recurring-tasks" element={wrapSimulator(<RecurringTasksPageSim />)} />
      <Route path="simulator/tm/collaboration/whiteboard" element={wrapSimulator(<WhiteboardPage sim />)} />
      <Route path="simulator/tm/settings/notifications" element={wrapSimulator(<NotificationPrefsPageSim />)} />
      <Route path="simulator/tm/training" element={wrapSimulator(<TrainingPageSim />)} />
    </>
  )
}

export default PmisGapRouteElements
