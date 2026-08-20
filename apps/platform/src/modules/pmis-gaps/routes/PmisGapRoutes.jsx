import { Route, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'
import { ToastProvider } from '@nidus/shared/context/ToastContext'
import Layout from '../../../components/Layout'
import PMLayout from '../../../components/pm/PMLayout'
import PMOLayout from '../../../components/pmo/PMOLayout'
import SimulatorPMOLayout from '../../../components/sim/pmo/SimulatorPMOLayout'
import SimulatorPMLayout from '../../../components/sim/pm/SimulatorPMLayout'
import { createGapListPage } from '../pages/gapPageFactory.jsx'

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

function wrapPmOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<PMLayout><Outlet /></PMLayout>)}
    </Suspense>
  )
}

function wrapPmoOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<PMOLayout><Outlet /></PMOLayout>)}
    </Suspense>
  )
}

function wrapPlatformOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<Layout><Outlet /></Layout>)}
    </Suspense>
  )
}

function wrapSimulatorOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      <ThemeProvider>
        <ToastProvider>
          <ProtectedRoute requiredPlatform="simulator">
            <Layout><Outlet /></Layout>
          </ProtectedRoute>
        </ToastProvider>
      </ThemeProvider>
    </Suspense>
  )
}

function wrapSimPmOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMLayout><Outlet /></SimulatorPMLayout>)}
    </Suspense>
  )
}

function wrapSimPmoOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<SimulatorPMOLayout><Outlet /></SimulatorPMOLayout>)}
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

      {/* PMO routes */}

      {/* Platform DB-driven role routes */}

      {/* Simulator general */}

      {/* Simulator PM */}

      {/* Simulator PMO */}

      {/* Simulator TM */}
      <Route element={wrapPmOutlet()}>
        <Route path="pm/calendar" element={<UniversalCalendarPage />} />
        <Route path="pm/automations" element={<AutomationHubPage />} />
        <Route path="pm/automations/templates" element={<AutomationTemplatesPage />} />
        <Route path="pm/automations/log" element={<AutomationLogPage />} />
        <Route path="pm/automations/builder/:ruleId?" element={<AutomationRuleBuilder />} />
        <Route path="pm/okr" element={<OKRDashboardPage />} />
        <Route path="pm/okr/objectives" element={<OKRObjectivesPage />} />
        <Route path="pm/okr/alignment" element={<OKRDashboardPage />} />
        <Route path="pm/okr/checkins" element={<OKRObjectivesPage />} />
        <Route path="pm/settings/custom-fields" element={<CustomFieldsPage />} />
        <Route path="pm/resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="pm/settings/intake-forms" element={<IntakeFormsPage />} />
        <Route path="pm/settings/intake-forms/submissions" element={<IntakeFormsPage />} />
        <Route path="pm/settings/client-portal" element={<ClientPortalPage />} />
        <Route path="pm/settings/recurring-tasks" element={<RecurringTasksPage />} />
        <Route path="pm/resources/raci" element={<RaciPage />} />
        <Route path="pm/resources/skills" element={<SkillsPage />} />
        <Route path="pm/resources/timesheet-approvals" element={<TimesheetApprovalsPage />} />
        <Route path="pm/resources/training" element={<TrainingPage />} />
        <Route path="pm/procurement/vendors" element={<VendorsPage />} />
        <Route path="pm/procurement/requests" element={<VendorsPage />} />
        <Route path="pm/procurement/orders" element={<VendorsPage />} />
        <Route path="pm/procurement/contracts" element={<VendorsPage />} />
        <Route path="pm/procurement/invoices" element={<VendorsPage />} />
        <Route path="pm/planning/s-curve" element={<SCurvePage />} />
        <Route path="pm/planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="pm/dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="pm/strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="pm/collaboration/whiteboard" element={<WhiteboardPage />} />
        <Route path="pm/settings/guest-access" element={<GuestAccessPage />} />
        <Route path="pm/settings/notifications" element={<NotificationPrefsPage />} />
        <Route path="pm/settings/project-clone" element={<ProjectClonePage />} />
        <Route path="pm/reporting/scheduled" element={<ScheduledReportsPage />} />
        <Route path="pm/integrations" element={<IntegrationsPage />} />
        <Route path="pm/integrations/connections" element={<IntegrationsPage />} />
      </Route>

      <Route element={wrapPmoOutlet()}>
        <Route path="pmo/calendar" element={<UniversalCalendarPage />} />
        <Route path="pmo/admin/automations" element={<AutomationHubPage />} />
        <Route path="pmo/admin/automations/templates" element={<AutomationTemplatesPage />} />
        <Route path="pmo/okr" element={<OKRDashboardPage />} />
        <Route path="pmo/okr/objectives" element={<OKRObjectivesPage />} />
        <Route path="pmo/okr/alignment" element={<OKRDashboardPage />} />
        <Route path="pmo/okr/checkins" element={<OKRObjectivesPage />} />
        <Route path="pmo/admin/custom-fields" element={<CustomFieldsPage />} />
        <Route path="pmo/resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="pmo/admin/intake-forms" element={<IntakeFormsPage />} />
        <Route path="pmo/admin/client-portals" element={<ClientPortalPage />} />
        <Route path="pmo/resources/raci" element={<RaciPage />} />
        <Route path="pmo/resources/skills" element={<SkillsPage />} />
        <Route path="pmo/procurement/vendors" element={<VendorsPage />} />
        <Route path="pmo/procurement/requests" element={<VendorsPage />} />
        <Route path="pmo/procurement/orders" element={<VendorsPage />} />
        <Route path="pmo/procurement/contracts" element={<VendorsPage />} />
        <Route path="pmo/procurement/invoices" element={<VendorsPage />} />
        <Route path="pmo/planning/s-curve" element={<SCurvePage />} />
        <Route path="pmo/planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="pmo/dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="pmo/strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="pmo/collaboration/whiteboard" element={<WhiteboardPage />} />
        <Route path="pmo/settings/notifications" element={<NotificationPrefsPage />} />
        <Route path="pmo/admin/integrations" element={<IntegrationsPage />} />
        <Route path="pmo/reporting/scheduled" element={<ScheduledReportsPage />} />
      </Route>

      <Route element={wrapPlatformOutlet()}>
        <Route path="platform/calendar" element={<UniversalCalendarPage />} />
        <Route path="platform/okr" element={<OKRDashboardPage />} />
        <Route path="platform/resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="platform/settings/notifications" element={<NotificationPrefsPage />} />
        <Route path="platform/automations" element={<AutomationHubPage />} />
        <Route path="platform/admin/custom-fields" element={<CustomFieldsPage />} />
        <Route path="platform/intake-forms" element={<IntakeFormsPage />} />
        <Route path="platform/client-portal" element={<ClientPortalPage />} />
        <Route path="platform/recurring-tasks" element={<RecurringTasksPage />} />
        <Route path="platform/planning/raci" element={<RaciPage />} />
        <Route path="platform/resources/skills" element={<SkillsPage />} />
        <Route path="platform/procurement" element={<VendorsPage />} />
        <Route path="platform/timesheets/approvals" element={<TimesheetApprovalsPage />} />
        <Route path="platform/planning/s-curve" element={<SCurvePage />} />
        <Route path="platform/planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="platform/dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="platform/strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="platform/collaboration/whiteboard" element={<WhiteboardPage />} />
        <Route path="platform/admin/guest-access" element={<GuestAccessPage />} />
        <Route path="platform/resources/training" element={<TrainingPage />} />
        <Route path="platform/admin/project-clone" element={<ProjectClonePage />} />
        <Route path="platform/reporting/scheduled" element={<ScheduledReportsPage />} />
        <Route path="platform/admin/integrations" element={<IntegrationsPage />} />
      </Route>

      <Route element={wrapSimulatorOutlet()}>
        <Route path="simulator/calendar" element={<UniversalCalendarPage sim />} />
        <Route path="simulator/okr" element={<OKRDashboardPage sim />} />
        <Route path="simulator/team-mode/setup" element={<SimMultiplayerPage />} />
        <Route path="simulator/team-mode/active" element={<SimMultiplayerPage />} />
        <Route path="simulator/exams" element={<SimExamModePage />} />
        <Route path="simulator/exams/results" element={<SimExamModePage />} />
        <Route path="simulator/exams/certificates" element={<SimExamModePage />} />
        <Route path="simulator/scenarios/marketplace" element={<SimMarketplacePage />} />
        <Route path="simulator/profile/run-analytics" element={<SimCrossRunAnalyticsPage />} />
        <Route path="simulator/profile/improvement" element={<SimCrossRunAnalyticsPage />} />
        <Route path="simulator/planning/recurring-tasks" element={<RecurringTasksPageSim />} />
        <Route path="simulator/planning/raci" element={<RaciPageSim />} />
        <Route path="simulator/dashboards/builder" element={<DashboardBuilderPage sim />} />
        <Route path="simulator/reporting/scheduled" element={<ScheduledReportsPageSim />} />
        <Route path="simulator/collaboration/whiteboard" element={<WhiteboardPage sim />} />
        <Route path="simulator/settings/notifications" element={<NotificationPrefsPageSim />} />
        <Route path="simulator/tm/calendar" element={<UniversalCalendarPage sim />} />
        <Route path="simulator/tm/workload" element={<WorkloadHeatmapPage sim />} />
        <Route path="simulator/tm/raci" element={<RaciPageSim />} />
        <Route path="simulator/tm/skills" element={<SkillsPageSim />} />
        <Route path="simulator/tm/recurring-tasks" element={<RecurringTasksPageSim />} />
        <Route path="simulator/tm/collaboration/whiteboard" element={<WhiteboardPage sim />} />
        <Route path="simulator/tm/settings/notifications" element={<NotificationPrefsPageSim />} />
        <Route path="simulator/tm/training" element={<TrainingPageSim />} />
      </Route>

      <Route element={wrapSimPmOutlet()}>
        <Route path="simulator/pm/calendar" element={<UniversalCalendarPage sim />} />
        <Route path="simulator/pm/automations" element={<AutomationHubPage />} />
        <Route path="simulator/pm/okr" element={<OKRDashboardPage sim />} />
        <Route path="simulator/pm/resources/workload" element={<WorkloadHeatmapPage sim />} />
        <Route path="simulator/pm/settings/custom-fields" element={<CustomFieldsPageSim />} />
        <Route path="simulator/pm/settings/intake-forms" element={<IntakeFormsPageSim />} />
        <Route path="simulator/pm/settings/client-portal" element={<ClientPortalPageSim />} />
        <Route path="simulator/pm/settings/recurring-tasks" element={<RecurringTasksPageSim />} />
        <Route path="simulator/pm/resources/raci" element={<RaciPageSim />} />
        <Route path="simulator/pm/resources/skills" element={<SkillsPageSim />} />
        <Route path="simulator/pm/procurement/vendors" element={<VendorsPageSim />} />
        <Route path="simulator/pm/planning/s-curve" element={<SCurvePage sim />} />
        <Route path="simulator/pm/planning/planning-poker" element={<PlanningPokerPage sim />} />
        <Route path="simulator/pm/dashboards/builder" element={<DashboardBuilderPage sim />} />
        <Route path="simulator/pm/collaboration/whiteboard" element={<WhiteboardPage sim />} />
        <Route path="simulator/pm/settings/notifications" element={<NotificationPrefsPageSim />} />
        <Route path="simulator/pm/reporting/scheduled" element={<ScheduledReportsPageSim />} />
      </Route>

      <Route element={wrapSimPmoOutlet()}>
        <Route path="simulator/pmo/calendar" element={<UniversalCalendarPage sim />} />
        <Route path="simulator/pmo/admin/automations" element={<AutomationHubPage />} />
        <Route path="simulator/pmo/okr" element={<OKRDashboardPage sim />} />
        <Route path="simulator/pmo/resources/workload" element={<WorkloadHeatmapPage sim />} />
        <Route path="simulator/pmo/admin/custom-fields" element={<CustomFieldsPageSim />} />
        <Route path="simulator/pmo/admin/intake-forms" element={<IntakeFormsPageSim />} />
        <Route path="simulator/pmo/admin/client-portals" element={<ClientPortalPageSim />} />
        <Route path="simulator/pmo/resources/raci" element={<RaciPageSim />} />
        <Route path="simulator/pmo/resources/skills" element={<SkillsPageSim />} />
        <Route path="simulator/pmo/procurement/vendors" element={<VendorsPageSim />} />
        <Route path="simulator/pmo/planning/s-curve" element={<SCurvePage sim />} />
        <Route path="simulator/pmo/strategy/portfolio-map" element={<PortfolioMapPage sim />} />
        <Route path="simulator/pmo/admin/integrations" element={<IntegrationsPageSim />} />
        <Route path="simulator/pmo/reporting/scheduled" element={<ScheduledReportsPageSim />} />
      </Route>

    </>
  )
}

export default PmisGapRouteElements
