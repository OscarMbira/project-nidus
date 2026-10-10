import { Route, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'
import { ToastProvider } from '@nidus/shared/context/ToastContext'
import { AppLayout as Layout } from '../../../components/AppLayout'
import PMOLayout from '../../../components/pmo/PMOLayout'
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
        <ProtectedRoute requiredPlatform="platform">{el}</ProtectedRoute>
      </ToastProvider>
    </ThemeProvider>
  )
}

function wrapPm(el) {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<Layout scope="pm">{el}</Layout>)}
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

function wrapPmOutlet() {
  return (
    <Suspense fallback={<Loading />}>
      {withProviders(<Layout scope="pm"><Outlet /></Layout>)}
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

/** Pages that live at /platform/<path> (inside the shell's path="platform/*" nested <Routes>).
 *  Do not wrap with Layout — the shell already did. */
function wrapPlatformNested(el) {
  return (
    <Suspense fallback={<Loading />}>
      <ProtectedRoute requiredPlatform="platform">{el}</ProtectedRoute>
    </Suspense>
  )
}

const AutomationHubPage = lazy(() => import('../pages/AutomationHubPage'))
const AutomationRuleBuilder = lazy(() => import('../../../pages/AutomationRuleBuilder'))
// v963 Phase 8 (GAP-03): real OKR CRUD replacing the old read-only PmisGapListHub stub.
const OkrDashboardPage = lazy(() => import('../../../pages/okr/OkrDashboardPage'))
const OkrCycleListPage = lazy(() => import('../../../pages/okr/OkrCycleListPage'))
const OkrCycleForm = lazy(() => import('../../../pages/okr/OkrCycleForm'))
const OkrCycleDetailPage = lazy(() => import('../../../pages/okr/OkrCycleDetailPage'))
const OkrObjectiveListPage = lazy(() => import('../../../pages/okr/OkrObjectiveListPage'))
const OkrObjectiveForm = lazy(() => import('../../../pages/okr/OkrObjectiveForm'))
const OkrObjectiveDetailPage = lazy(() => import('../../../pages/okr/OkrObjectiveDetailPage'))
const WorkloadHeatmapPage = lazy(() => import('../pages/WorkloadHeatmapPage'))
const UniversalCalendarPage = lazy(() => import('../pages/UniversalCalendarPage'))
const PlanningPokerPage = lazy(() => import('../pages/PlanningPokerPage'))
const DashboardBuilderPage = lazy(() => import('../pages/DashboardBuilderPage'))
const PortfolioMapPage = lazy(() => import('../pages/PortfolioMapPage'))
const WhiteboardPage = lazy(() => import('../pages/WhiteboardPage'))
const SCurvePage = lazy(() => import('../pages/SCurvePage'))

// v963 Phase 19 (GAP-13): period-level Timesheet Approvals — real CRUD pages,
// replacing the removed read-only TimesheetApprovalsPage stub.
const WeeklyTimesheetPage = lazy(() => import('../../../pages/timesheetApprovals/WeeklyTimesheetPage'))
const TimesheetApproverQueuePage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetApproverQueuePage'))
const TimesheetPeriodDetailPage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetPeriodDetailPage'))
const TimesheetApprovalSettingsPage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetApprovalSettingsPage'))
// v963 Phase 20 (GAP-23): Scheduled Health Reports — real CRUD, distinct from the generic
// ScheduledReports.jsx/scheduled_reports feature (kept untouched).
const ScheduledHealthReportListPage = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportListPage'))
const ScheduledHealthReportForm = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportForm'))
const ScheduledHealthReportDetailPage = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportDetailPage'))

// v963 Phase 15/16/18 — real CRUD replacing the read-only gap-list stubs for Notification
// Preferences (GAP-21), Project Clone (GAP-22), and Skills Matrix (GAP-11).
const NotificationPreferencesPage = lazy(() => import('../pages/NotificationPreferencesPage'))
const NotificationPreferenceTemplateListPage = lazy(() => import('../pages/NotificationPreferenceTemplateListPage'))
const NotificationPreferenceTemplateDetailPage = lazy(() => import('../pages/NotificationPreferenceTemplateDetailPage'))
const ProjectCloneJobsPage = lazy(() => import('../pages/ProjectCloneJobsPage'))
const ProjectCloneCreatePage = lazy(() => import('../pages/ProjectCloneCreatePage'))
const ProjectCloneDetailPage = lazy(() => import('../pages/ProjectCloneDetailPage'))
const SkillCatalogListPage = lazy(() => import('../pages/SkillCatalogListPage'))
const SkillCatalogDetailPage = lazy(() => import('../pages/SkillCatalogDetailPage'))
const SkillCompetencyMatrixPage = lazy(() => import('../pages/SkillCompetencyMatrixPage'))
const SkillRequirementsListPage = lazy(() => import('../pages/SkillRequirementsListPage'))
const SkillRequirementDetailPage = lazy(() => import('../pages/SkillRequirementDetailPage'))

// v963 Phase 17 (GAP-04): stub removed — 100% redundant with the fully-built Local Data
// Extensions module (apps/platform/src/features/local-data-extensions/). Routes below redirect.

// v963 Phase 9 (GAP-06) / Phase 10 (GAP-07): real CRUD replacing the read-only gap-list stubs
// for Intake Forms and Client Portal.
const IntakeFormListPage = lazy(() => import('../pages/IntakeFormListPage'))
const IntakeFormForm = lazy(() => import('../pages/IntakeFormForm'))
const IntakeFormDetailPage = lazy(() => import('../pages/IntakeFormDetailPage'))
const IntakeFormFieldsPage = lazy(() => import('../pages/IntakeFormFieldsPage'))
const IntakeFormSubmissionListPage = lazy(() => import('../pages/IntakeFormSubmissionListPage'))
const IntakeFormSubmissionDetailPage = lazy(() => import('../pages/IntakeFormSubmissionDetailPage'))
const ClientPortalListPage = lazy(() => import('../pages/ClientPortalListPage'))
const ClientPortalForm = lazy(() => import('../pages/ClientPortalForm'))
const ClientPortalDetailPage = lazy(() => import('../pages/ClientPortalDetailPage'))
const ClientPortalGuestsPage = lazy(() => import('../pages/ClientPortalGuestsPage'))

// v963 Phases 11/12/13/14: real CRUD replacing the read-only gap-list stubs for Recurring
// Tasks (GAP-08), RACI Matrix (GAP-10), Guest Access (GAP-19), and Training Tracker (GAP-20).
const RecurringTaskListPage = lazy(() => import('../pages/RecurringTaskListPage'))
const RecurringTaskForm = lazy(() => import('../pages/RecurringTaskForm'))
const RecurringTaskDetailPage = lazy(() => import('../pages/RecurringTaskDetailPage'))
const RaciListPage = lazy(() => import('../pages/RaciListPage'))
const RaciMatrixEditor = lazy(() => import('../pages/RaciMatrixEditor'))
const GuestAccessListPage = lazy(() => import('../pages/GuestAccessListPage'))
const GuestAccessForm = lazy(() => import('../pages/GuestAccessForm'))
const GuestAccessDetailPage = lazy(() => import('../pages/GuestAccessDetailPage'))
const TrainingCertificationListPage = lazy(() => import('../pages/TrainingCertificationListPage'))
const TrainingCertificationForm = lazy(() => import('../pages/TrainingCertificationForm'))
const TrainingCertificationDetailPage = lazy(() => import('../pages/TrainingCertificationDetailPage'))
const TrainingRecordListPage = lazy(() => import('../pages/TrainingRecordListPage'))
const TrainingRecordForm = lazy(() => import('../pages/TrainingRecordForm'))

// v963 Phase 21 (GAP-25): real CRUD replacing the read-only gap-list stub — a complementary
// discovery/marketplace layer over the DIFFERENT, real "configured connectors" feature at
// apps/platform/src/pages/Integrations.jsx (kept untouched); "Connect" hands off there.
const IntegrationMarketplaceListPage = lazy(() => import('../pages/IntegrationMarketplaceListPage'))
const IntegrationCatalogDetailPage = lazy(() => import('../pages/IntegrationCatalogDetailPage'))

// v1049 (GAP-12): real CRUD for Procurement's Vendors + Vendor Performance leaves — the manifest
// entry and DB tables (SQL/v644) existed but no page/route ever did, unlike this gap's siblings.
const VendorListPage = lazy(() => import('../pages/VendorListPage'))
const VendorDetailPage = lazy(() => import('../pages/VendorDetailPage'))
const VendorCategoryListPage = lazy(() => import('../pages/VendorCategoryListPage'))
const VendorCategoryForm = lazy(() => import('../pages/VendorCategoryForm'))
const VendorPerformanceListPage = lazy(() => import('../pages/VendorPerformanceListPage'))
const VendorRatingForm = lazy(() => import('../pages/VendorRatingForm'))

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
  // v963 Phase 2: was 'automation_rule_executions', which doesn't exist and errored at runtime.
  // The real execution-log table (created by SQL/v31_automation.sql) is 'automation_executions'.
  table: 'automation_executions',
  iconName: 'Activity',
  storageKeyPrefix: 'automation-log',
  columns: [
    { key: 'rule_id', label: 'Rule' },
    { key: 'execution_status', label: 'Status' },
    { key: 'started_at', label: 'Started' },
    { key: 'duration_ms', label: 'Duration (ms)' },
  ],
})

/** All PMIS gap routes — import inside Layout/ProtectedRoute in App.jsx */
export function PmisGapRouteElements() {
  return (
    <>
      {/* PM routes */}

      {/* PMO routes */}

      {/* Platform DB-driven role routes */}

      <Route element={wrapPmOutlet()}>
        <Route path="pm/calendar" element={<UniversalCalendarPage />} />
        <Route path="pm/automations" element={<AutomationHubPage />} />
        <Route path="pm/automations/templates" element={<AutomationTemplatesPage />} />
        <Route path="pm/automations/log" element={<AutomationLogPage />} />
        <Route path="pm/automations/builder/:ruleId?" element={<AutomationRuleBuilder />} />
        <Route path="pm/settings/custom-fields" element={<Navigate to="/app/local-data-extensions/field-definitions" replace />} />
        <Route path="pm/resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="pm/settings/intake-forms" element={<IntakeFormListPage />} />
        <Route path="pm/settings/intake-forms/create" element={<IntakeFormForm />} />
        <Route path="pm/settings/intake-forms/:id" element={<IntakeFormDetailPage />} />
        <Route path="pm/settings/intake-forms/:id/edit" element={<IntakeFormForm />} />
        <Route path="pm/settings/intake-forms/:id/fields" element={<IntakeFormFieldsPage />} />
        <Route path="pm/settings/intake-forms/:id/submissions" element={<IntakeFormSubmissionListPage />} />
        <Route path="pm/settings/intake-forms/:id/submissions/:submissionId" element={<IntakeFormSubmissionDetailPage />} />
        <Route path="pm/settings/client-portal" element={<ClientPortalListPage />} />
        <Route path="pm/settings/client-portal/create" element={<ClientPortalForm />} />
        <Route path="pm/settings/client-portal/:id" element={<ClientPortalDetailPage />} />
        <Route path="pm/settings/client-portal/:id/edit" element={<ClientPortalForm />} />
        <Route path="pm/settings/client-portal/:id/guests" element={<ClientPortalGuestsPage />} />
        <Route path="pm/settings/recurring-tasks" element={<RecurringTaskListPage />} />
        <Route path="pm/settings/recurring-tasks/create" element={<RecurringTaskForm />} />
        <Route path="pm/settings/recurring-tasks/:id" element={<RecurringTaskDetailPage />} />
        <Route path="pm/settings/recurring-tasks/:id/edit" element={<RecurringTaskForm />} />
        <Route path="pm/resources/raci" element={<RaciListPage />} />
        <Route path="pm/resources/raci/create" element={<RaciMatrixEditor />} />
        <Route path="pm/resources/raci/:id" element={<RaciMatrixEditor />} />
        <Route path="pm/resources/skills" element={<SkillCatalogListPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/matrix" element={<SkillCompetencyMatrixPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/requirements" element={<SkillRequirementsListPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/requirements/create" element={<SkillRequirementDetailPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/requirements/:id" element={<SkillRequirementDetailPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/requirements/:id/edit" element={<SkillRequirementDetailPage basePath="/pm/resources/skills" forceEdit />} />
        <Route path="pm/resources/skills/catalog/create" element={<SkillCatalogDetailPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/catalog/:id" element={<SkillCatalogDetailPage basePath="/pm/resources/skills" />} />
        <Route path="pm/resources/skills/catalog/:id/edit" element={<SkillCatalogDetailPage basePath="/pm/resources/skills" forceEdit />} />
        <Route path="pm/resources/timesheet-approval" element={<TimesheetApproverQueuePage />} />
        <Route path="pm/resources/training" element={<TrainingCertificationListPage />} />
        <Route path="pm/resources/training/create" element={<TrainingCertificationForm />} />
        <Route path="pm/resources/training/:id" element={<TrainingCertificationDetailPage />} />
        <Route path="pm/resources/training/:id/edit" element={<TrainingCertificationForm />} />
        <Route path="pm/resources/training/records" element={<TrainingRecordListPage />} />
        <Route path="pm/resources/training/records/create" element={<TrainingRecordForm />} />
        <Route path="pm/resources/training/records/:id/edit" element={<TrainingRecordForm />} />
        <Route path="pm/planning/s-curve" element={<SCurvePage />} />
        <Route path="pm/planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="pm/dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="pm/strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="pm/collaboration/whiteboard" element={<WhiteboardPage />} />
        <Route path="pm/settings/guest-access" element={<GuestAccessListPage />} />
        <Route path="pm/settings/guest-access/create" element={<GuestAccessForm />} />
        <Route path="pm/settings/guest-access/:id" element={<GuestAccessDetailPage />} />
        <Route path="pm/settings/guest-access/:id/edit" element={<GuestAccessForm />} />
        {/* /pm/notifications/preferences is the DB-registered menu path (menu_code
            pm_notification_preferences); /pm/settings/notifications kept as an alias since it
            was already coded and may be linked elsewhere. */}
        <Route path="pm/notifications/preferences" element={<NotificationPreferencesPage />} />
        <Route path="pm/settings/notifications" element={<NotificationPreferencesPage />} />
        {/* /pm/settings/clone is the DB-registered menu path (menu_code pm_clone_project);
            /pm/settings/project-clone kept as an alias. */}
        <Route path="pm/settings/clone" element={<ProjectCloneJobsPage basePath="/pm/settings/clone" scopedToCurrentProject />} />
        <Route path="pm/settings/clone/create" element={<ProjectCloneCreatePage basePath="/pm/settings/clone" />} />
        <Route path="pm/settings/clone/:id" element={<ProjectCloneDetailPage basePath="/pm/settings/clone" />} />
        <Route path="pm/settings/project-clone" element={<ProjectCloneJobsPage basePath="/pm/settings/clone" scopedToCurrentProject />} />
        <Route path="pm/reporting/scheduled" element={<ScheduledHealthReportListPage />} />
        <Route path="pm/reporting/scheduled/create" element={<ScheduledHealthReportForm />} />
        <Route path="pm/reporting/scheduled/:id" element={<ScheduledHealthReportDetailPage />} />
        <Route path="pm/reporting/scheduled/:id/edit" element={<ScheduledHealthReportForm />} />
        <Route path="pm/integrations" element={<IntegrationMarketplaceListPage basePath="/pm/integrations" configBasePath="/integrations" />} />
        <Route path="pm/integrations/connections" element={<IntegrationMarketplaceListPage basePath="/pm/integrations" configBasePath="/integrations" />} />
        <Route path="pm/integrations/catalog/create" element={<IntegrationCatalogDetailPage basePath="/pm/integrations" configBasePath="/integrations" />} />
        <Route path="pm/integrations/catalog/:id" element={<IntegrationCatalogDetailPage basePath="/pm/integrations" configBasePath="/integrations" />} />
        <Route path="pm/integrations/catalog/:id/edit" element={<IntegrationCatalogDetailPage basePath="/pm/integrations" configBasePath="/integrations" forceEdit />} />
      </Route>

      <Route element={wrapPmoOutlet()}>
        <Route path="pmo/calendar" element={<UniversalCalendarPage />} />
        <Route path="pmo/admin/automations" element={<AutomationHubPage />} />
        <Route path="pmo/admin/automations/templates" element={<AutomationTemplatesPage />} />
        <Route path="pmo/admin/custom-fields" element={<Navigate to="/app/local-data-extensions/field-definitions" replace />} />
        <Route path="pmo/resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="pmo/admin/intake-forms" element={<IntakeFormListPage />} />
        <Route path="pmo/admin/intake-forms/create" element={<IntakeFormForm />} />
        <Route path="pmo/admin/intake-forms/:id" element={<IntakeFormDetailPage />} />
        <Route path="pmo/admin/intake-forms/:id/edit" element={<IntakeFormForm />} />
        <Route path="pmo/admin/intake-forms/:id/fields" element={<IntakeFormFieldsPage />} />
        <Route path="pmo/admin/intake-forms/:id/submissions" element={<IntakeFormSubmissionListPage />} />
        <Route path="pmo/admin/intake-forms/:id/submissions/:submissionId" element={<IntakeFormSubmissionDetailPage />} />
        <Route path="pmo/admin/client-portals" element={<ClientPortalListPage />} />
        <Route path="pmo/admin/client-portals/create" element={<ClientPortalForm />} />
        <Route path="pmo/admin/client-portals/:id" element={<ClientPortalDetailPage />} />
        <Route path="pmo/admin/client-portals/:id/edit" element={<ClientPortalForm />} />
        <Route path="pmo/admin/client-portals/:id/guests" element={<ClientPortalGuestsPage />} />
        <Route path="pmo/resources/raci" element={<RaciListPage />} />
        <Route path="pmo/resources/raci/create" element={<RaciMatrixEditor />} />
        <Route path="pmo/resources/raci/:id" element={<RaciMatrixEditor />} />
        <Route path="pmo/resources/skills" element={<SkillCatalogListPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/matrix" element={<SkillCompetencyMatrixPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/requirements" element={<SkillRequirementsListPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/requirements/create" element={<SkillRequirementDetailPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/requirements/:id" element={<SkillRequirementDetailPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/requirements/:id/edit" element={<SkillRequirementDetailPage basePath="/pmo/resources/skills" forceEdit />} />
        <Route path="pmo/resources/skills/catalog/create" element={<SkillCatalogDetailPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/catalog/:id" element={<SkillCatalogDetailPage basePath="/pmo/resources/skills" />} />
        <Route path="pmo/resources/skills/catalog/:id/edit" element={<SkillCatalogDetailPage basePath="/pmo/resources/skills" forceEdit />} />
        <Route path="pmo/financial/timesheet-approvals" element={<TimesheetApproverQueuePage />} />
        <Route path="pmo/settings/timesheet-approvals" element={<TimesheetApprovalSettingsPage />} />
        <Route path="pmo/planning/s-curve" element={<SCurvePage />} />
        <Route path="pmo/planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="pmo/dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="pmo/strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="pmo/collaboration/whiteboard" element={<WhiteboardPage />} />
        {/* /pmo/notifications/preferences is the DB-registered menu path (menu_code
            pmo_notification_preferences); /pmo/settings/notifications kept as an alias. */}
        <Route path="pmo/notifications/preferences" element={<NotificationPreferencesPage showTemplatesLink onOpenTemplates={() => window.location.assign('/pmo/admin/notification-templates')} />} />
        <Route path="pmo/settings/notifications" element={<NotificationPreferencesPage showTemplatesLink onOpenTemplates={() => window.location.assign('/pmo/admin/notification-templates')} />} />
        <Route path="pmo/admin/notification-templates" element={<NotificationPreferenceTemplateListPage basePath="/pmo/admin/notification-templates" />} />
        <Route path="pmo/admin/notification-templates/create" element={<NotificationPreferenceTemplateDetailPage basePath="/pmo/admin/notification-templates" />} />
        <Route path="pmo/admin/notification-templates/:id" element={<NotificationPreferenceTemplateDetailPage basePath="/pmo/admin/notification-templates" />} />
        <Route path="pmo/admin/notification-templates/:id/edit" element={<NotificationPreferenceTemplateDetailPage basePath="/pmo/admin/notification-templates" forceEdit />} />
        <Route path="pmo/admin/project-clone" element={<ProjectCloneJobsPage basePath="/pmo/admin/project-clone" />} />
        <Route path="pmo/admin/project-clone/create" element={<ProjectCloneCreatePage basePath="/pmo/admin/project-clone" />} />
        <Route path="pmo/admin/project-clone/:id" element={<ProjectCloneDetailPage basePath="/pmo/admin/project-clone" />} />
        <Route path="pmo/admin/integrations" element={<IntegrationMarketplaceListPage basePath="/pmo/admin/integrations" configBasePath="/integrations" />} />
        <Route path="pmo/admin/integrations/catalog/create" element={<IntegrationCatalogDetailPage basePath="/pmo/admin/integrations" configBasePath="/integrations" />} />
        <Route path="pmo/admin/integrations/catalog/:id" element={<IntegrationCatalogDetailPage basePath="/pmo/admin/integrations" configBasePath="/integrations" />} />
        <Route path="pmo/admin/integrations/catalog/:id/edit" element={<IntegrationCatalogDetailPage basePath="/pmo/admin/integrations" configBasePath="/integrations" forceEdit />} />
        <Route path="pmo/reporting/scheduled" element={<ScheduledHealthReportListPage />} />
        <Route path="pmo/reporting/scheduled/create" element={<ScheduledHealthReportForm />} />
        <Route path="pmo/reporting/scheduled/:id" element={<ScheduledHealthReportDetailPage />} />
        <Route path="pmo/reporting/scheduled/:id/edit" element={<ScheduledHealthReportForm />} />
      </Route>

      {/* This whole block is nested inside the shell's <Route path="platform/*"> (see
          platformRoutes.jsx), which already consumes the "/platform" segment — a literal
          "platform/" prefix here would resolve to /platform/platform/... and never match the
          plain /platform/... URLs these pages' own basePath props (and the DB menu_items rows)
          point at. Found live 2026-09-11 via the same bug class that broke the Governance
          approval routes (SQL/v1047) — these were unreachable from the sidebar the whole time. */}
      <Route element={wrapPlatformOutlet()}>
        <Route path="calendar" element={<UniversalCalendarPage />} />
        <Route path="okr" element={<OkrDashboardPage />} />
        <Route path="resources/workload" element={<WorkloadHeatmapPage />} />
        <Route path="settings/notifications" element={<NotificationPreferencesPage />} />
        <Route path="automations" element={<AutomationHubPage />} />
        <Route path="admin/custom-fields" element={<Navigate to="/app/local-data-extensions/field-definitions" replace />} />
        <Route path="intake-forms" element={<IntakeFormListPage />} />
        <Route path="client-portal" element={<ClientPortalListPage />} />
        <Route path="recurring-tasks" element={<RecurringTaskListPage />} />
        <Route path="planning/raci" element={<RaciListPage />} />
        <Route path="resources/skills" element={<SkillCatalogListPage basePath="/platform/resources/skills" />} />
        <Route path="timesheets/weekly" element={<WeeklyTimesheetPage />} />
        <Route path="timesheets/weekly/:id" element={<TimesheetPeriodDetailPage />} />
        <Route path="timesheets/approvals" element={<TimesheetApproverQueuePage />} />
        <Route path="timesheets/settings" element={<TimesheetApprovalSettingsPage />} />
        <Route path="planning/s-curve" element={<SCurvePage />} />
        <Route path="planning/planning-poker" element={<PlanningPokerPage />} />
        <Route path="dashboards/builder" element={<DashboardBuilderPage />} />
        <Route path="strategy/portfolio-map" element={<PortfolioMapPage />} />
        <Route path="collaboration/whiteboard" element={<WhiteboardPage />} />
        <Route path="admin/guest-access" element={<GuestAccessListPage />} />
        <Route path="resources/training" element={<TrainingCertificationListPage />} />
        <Route path="admin/project-clone" element={<ProjectCloneJobsPage basePath="/platform/admin/project-clone" />} />
        <Route path="reporting/scheduled" element={<ScheduledHealthReportListPage />} />
        <Route path="admin/integrations" element={<IntegrationMarketplaceListPage basePath="/platform/admin/integrations" configBasePath="/integrations" />} />
        <Route path="admin/integrations/catalog/create" element={<IntegrationCatalogDetailPage basePath="/platform/admin/integrations" configBasePath="/integrations" />} />
        <Route path="admin/integrations/catalog/:id" element={<IntegrationCatalogDetailPage basePath="/platform/admin/integrations" configBasePath="/integrations" />} />
        <Route path="admin/integrations/catalog/:id/edit" element={<IntegrationCatalogDetailPage basePath="/platform/admin/integrations" configBasePath="/integrations" forceEdit />} />
      </Route>

    </>
  )
}

/**
 * Pages registered inside the shell's <Route path="platform/*"> nested <Routes> — the correct
 * home for anything the sidebar links to at /platform/pm/... or /platform/pmo/... . The
 * PmisGapRouteElements() routes above (wrapPmOutlet/wrapPmoOutlet) are called as a TOP-LEVEL
 * sibling of platform/* in platformRoutes.jsx, so their relative "pm/..."/"pmo/..." paths only
 * ever matched the bare /pm/... URL — every menu item pointing at /platform/pm/... (or
 * /platform/pmo/...) hit platform/* with no matching child and rendered a blank pane. Moved here
 * as each one is found broken, using wrapPlatformNested (no separate PMLayout/PMOLayout — the
 * shell's own Layout already resolves the right shell from the URL, see shouldUsePmLayoutShell).
 *
 * GAP-12 Vendors / Vendor Performance — SQL/v1049 (found 2026-09-11).
 * OKR — SQL/v1048 (found 2026-09-11, same audit).
 */
export function PmisGapPlatformNestedRouteElements() {
  return (
    <>
      <Route path="pm/procurement/vendors" element={wrapPlatformNested(<VendorListPage basePath="/platform/pm/procurement/vendors" />)} />
      <Route path="pm/procurement/vendors/create" element={wrapPlatformNested(<VendorDetailPage basePath="/platform/pm/procurement/vendors" />)} />
      <Route path="pm/procurement/vendors/:id" element={wrapPlatformNested(<VendorDetailPage basePath="/platform/pm/procurement/vendors" />)} />
      <Route path="pm/procurement/vendors/:id/edit" element={wrapPlatformNested(<VendorDetailPage basePath="/platform/pm/procurement/vendors" forceEdit />)} />
      <Route path="pm/procurement/vendor-categories" element={wrapPlatformNested(<VendorCategoryListPage basePath="/platform/pm/procurement/vendor-categories" />)} />
      <Route path="pm/procurement/vendor-categories/create" element={wrapPlatformNested(<VendorCategoryForm basePath="/platform/pm/procurement/vendor-categories" />)} />
      <Route path="pm/procurement/vendor-categories/:id" element={wrapPlatformNested(<VendorCategoryForm basePath="/platform/pm/procurement/vendor-categories" />)} />
      <Route path="pm/procurement/vendor-categories/:id/edit" element={wrapPlatformNested(<VendorCategoryForm basePath="/platform/pm/procurement/vendor-categories" forceEdit />)} />
      <Route path="pm/procurement/performance" element={wrapPlatformNested(<VendorPerformanceListPage basePath="/platform/pm/procurement/performance" />)} />
      <Route path="pm/procurement/performance/create" element={wrapPlatformNested(<VendorRatingForm basePath="/platform/pm/procurement/performance" />)} />
      <Route path="pm/procurement/performance/:id/edit" element={wrapPlatformNested(<VendorRatingForm basePath="/platform/pm/procurement/performance" />)} />

      <Route path="pm/okr" element={wrapPlatformNested(<OkrDashboardPage />)} />
      <Route path="pm/okr/objectives" element={wrapPlatformNested(<OkrObjectiveListPage />)} />
      <Route path="pm/okr/objectives/create" element={wrapPlatformNested(<OkrObjectiveForm />)} />
      <Route path="pm/okr/objectives/:objectiveId" element={wrapPlatformNested(<OkrObjectiveDetailPage />)} />
      <Route path="pm/okr/objectives/:objectiveId/edit" element={wrapPlatformNested(<OkrObjectiveForm />)} />
      <Route path="pm/okr/cycles" element={wrapPlatformNested(<OkrCycleListPage />)} />
      <Route path="pm/okr/cycles/create" element={wrapPlatformNested(<OkrCycleForm />)} />
      <Route path="pm/okr/cycles/:cycleId" element={wrapPlatformNested(<OkrCycleDetailPage />)} />
      <Route path="pm/okr/cycles/:cycleId/edit" element={wrapPlatformNested(<OkrCycleForm />)} />
      <Route path="pm/okr/alignment" element={wrapPlatformNested(<OkrDashboardPage />)} />
      <Route path="pm/okr/checkins" element={wrapPlatformNested(<OkrObjectiveListPage />)} />

      <Route path="pmo/okr" element={wrapPlatformNested(<OkrDashboardPage />)} />
      <Route path="pmo/okr/objectives" element={wrapPlatformNested(<OkrObjectiveListPage />)} />
      <Route path="pmo/okr/objectives/create" element={wrapPlatformNested(<OkrObjectiveForm />)} />
      <Route path="pmo/okr/objectives/:objectiveId" element={wrapPlatformNested(<OkrObjectiveDetailPage />)} />
      <Route path="pmo/okr/objectives/:objectiveId/edit" element={wrapPlatformNested(<OkrObjectiveForm />)} />
      <Route path="pmo/okr/cycles" element={wrapPlatformNested(<OkrCycleListPage />)} />
      <Route path="pmo/okr/cycles/create" element={wrapPlatformNested(<OkrCycleForm />)} />
      <Route path="pmo/okr/cycles/:cycleId" element={wrapPlatformNested(<OkrCycleDetailPage />)} />
      <Route path="pmo/okr/cycles/:cycleId/edit" element={wrapPlatformNested(<OkrCycleForm />)} />
      <Route path="pmo/okr/alignment" element={wrapPlatformNested(<OkrDashboardPage />)} />
      <Route path="pmo/okr/checkins" element={wrapPlatformNested(<OkrObjectiveListPage />)} />

      {/* Sidebar Skill Matrix is /platform/resources/skills. Must be a static route inside
          platform/* or resources/:id treats "skills" as a resource UUID (400 + alert). */}
      <Route path="resources/skills" element={wrapPlatformNested(<SkillCatalogListPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/matrix" element={wrapPlatformNested(<SkillCompetencyMatrixPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/requirements" element={wrapPlatformNested(<SkillRequirementsListPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/requirements/create" element={wrapPlatformNested(<SkillRequirementDetailPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/requirements/:id" element={wrapPlatformNested(<SkillRequirementDetailPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/requirements/:id/edit" element={wrapPlatformNested(<SkillRequirementDetailPage basePath="/platform/resources/skills" forceEdit />)} />
      <Route path="resources/skills/catalog/create" element={wrapPlatformNested(<SkillCatalogDetailPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/catalog/:id" element={wrapPlatformNested(<SkillCatalogDetailPage basePath="/platform/resources/skills" />)} />
      <Route path="resources/skills/catalog/:id/edit" element={wrapPlatformNested(<SkillCatalogDetailPage basePath="/platform/resources/skills" forceEdit />)} />
    </>
  )
}

export default PmisGapRouteElements
