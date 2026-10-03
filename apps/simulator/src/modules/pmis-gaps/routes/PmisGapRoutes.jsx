import { Route, Navigate } from 'react-router-dom'
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

const AutomationHubPage = lazy(() => import('../pages/AutomationHubPage'))
const AutomationRuleBuilder = lazy(() => import('../../../pages/AutomationRuleBuilder'))
// v963 Phase 8 (GAP-03): real OKR CRUD replacing the old read-only PmisGapListHub stub. Always
// sim-schema (simDb) — this app must never read/write the public schema.
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
const SimMultiplayerPage = lazy(() => import('../pages/sim/SimMultiplayerPage'))
const SimExamModePage = lazy(() => import('../pages/sim/SimExamModePage'))
const SimMarketplacePage = lazy(() => import('../pages/sim/SimMarketplacePage'))
const SimCrossRunAnalyticsPage = lazy(() => import('../pages/sim/SimCrossRunAnalyticsPage'))

// v963 Phase 19 (GAP-13): period-level Timesheet Approvals — real CRUD pages,
// replacing the removed read-only TimesheetApprovalsPage stub. Built fresh —
// this feature had zero Simulator routes before.
const WeeklyTimesheetPage = lazy(() => import('../../../pages/timesheetApprovals/WeeklyTimesheetPage'))
const TimesheetApproverQueuePage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetApproverQueuePage'))
const TimesheetPeriodDetailPage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetPeriodDetailPage'))
const TimesheetApprovalSettingsPage = lazy(() => import('../../../pages/timesheetApprovals/TimesheetApprovalSettingsPage'))

// v963 Phase 17 (GAP-04): stub removed — 100% redundant with the fully-built Local Data
// Extensions module (apps/simulator/src/features/local-data-extensions/). Routes below redirect.

// v963 Phases 11/12/13 — real CRUD replacing the read-only gap-list stubs for Recurring Tasks
// (GAP-08), RACI Matrix (GAP-10), and Guest Access (GAP-19).
const RecurringTaskListPage = lazy(() => import('../pages/RecurringTaskListPage'))
const RecurringTaskForm = lazy(() => import('../pages/RecurringTaskForm'))
const RecurringTaskDetailPage = lazy(() => import('../pages/RecurringTaskDetailPage'))
const RaciListPage = lazy(() => import('../pages/RaciListPage'))
const RaciMatrixEditor = lazy(() => import('../pages/RaciMatrixEditor'))
const GuestAccessListPage = lazy(() => import('../pages/GuestAccessListPage'))
const GuestAccessForm = lazy(() => import('../pages/GuestAccessForm'))
const GuestAccessDetailPage = lazy(() => import('../pages/GuestAccessDetailPage'))

// v963 Phase 9 (GAP-06): real CRUD replacing the read-only Intake Forms stub. Always sim schema
// via apps/simulator/src/services/intakeFormService.js (practice_project_id, not project_id).
const IntakeFormListPage = lazy(() => import('../pages/IntakeFormListPage'))
const IntakeFormForm = lazy(() => import('../pages/IntakeFormForm'))
const IntakeFormDetailPage = lazy(() => import('../pages/IntakeFormDetailPage'))
const IntakeFormFieldsPage = lazy(() => import('../pages/IntakeFormFieldsPage'))
const IntakeFormSubmissionListPage = lazy(() => import('../pages/IntakeFormSubmissionListPage'))
const IntakeFormSubmissionDetailPage = lazy(() => import('../pages/IntakeFormSubmissionDetailPage'))

// v963 Phase 10 (GAP-07): real CRUD replacing the read-only Client Portal stub. Always sim
// schema via apps/simulator/src/services/clientPortalService.js (practice_project_id NOT NULL).
const ClientPortalListPage = lazy(() => import('../pages/ClientPortalListPage'))
const ClientPortalForm = lazy(() => import('../pages/ClientPortalForm'))
const ClientPortalDetailPage = lazy(() => import('../pages/ClientPortalDetailPage'))
const ClientPortalGuestsPage = lazy(() => import('../pages/ClientPortalGuestsPage'))

// v963 Phase 14 (GAP-20): real CRUD replacing the read-only Training Tracker stub. Always sim
// schema via apps/simulator/src/modules/pmis-gaps/services/trainingService.js.
const TrainingCertificationListPage = lazy(() => import('../pages/TrainingCertificationListPage'))
const TrainingCertificationForm = lazy(() => import('../pages/TrainingCertificationForm'))
const TrainingCertificationDetailPage = lazy(() => import('../pages/TrainingCertificationDetailPage'))
const TrainingRecordListPage = lazy(() => import('../pages/TrainingRecordListPage'))
const TrainingRecordForm = lazy(() => import('../pages/TrainingRecordForm'))

// v963 Phase 15 (GAP-21): real CRUD replacing the read-only Notification Preferences stub.
// Always sim schema via apps/simulator/src/modules/pmis-gaps/services/notificationPreferencesService.js.
const NotificationPreferencesPage = lazy(() => import('../pages/NotificationPreferencesPage'))
const NotificationPreferenceTemplateListPage = lazy(() => import('../pages/NotificationPreferenceTemplateListPage'))
const NotificationPreferenceTemplateDetailPage = lazy(() => import('../pages/NotificationPreferenceTemplateDetailPage'))

// v963 Phase 16 (GAP-22): real CRUD replacing the read-only Project Clone stub. Always sim
// schema via apps/simulator/src/modules/pmis-gaps/services/projectCloneService.js — practice
// projects have no task child table, so `includeTasks` is a documented UI-only no-op here.
const ProjectCloneJobsPage = lazy(() => import('../pages/ProjectCloneJobsPage'))
const ProjectCloneCreatePage = lazy(() => import('../pages/ProjectCloneCreatePage'))
const ProjectCloneDetailPage = lazy(() => import('../pages/ProjectCloneDetailPage'))

// v963 Phase 18 (GAP-11): real CRUD replacing the read-only Skills Matrix stub. Always sim
// schema via apps/simulator/src/modules/pmis-gaps/services/skillCatalogService.js — no
// accountId (Simulator has no organisation concept at the schema level); Competency Matrix is
// a one-row self-assessment grid, not Platform's multi-member matrix. Kept fully separate from
// resource_skills/ResourceSkills.jsx, untouched.
const SkillCatalogListPage = lazy(() => import('../pages/SkillCatalogListPage'))
const SkillCatalogDetailPage = lazy(() => import('../pages/SkillCatalogDetailPage'))
const SkillCompetencyMatrixPage = lazy(() => import('../pages/SkillCompetencyMatrixPage'))
const SkillRequirementsListPage = lazy(() => import('../pages/SkillRequirementsListPage'))
const SkillRequirementDetailPage = lazy(() => import('../pages/SkillRequirementDetailPage'))

// v963 Phase 20 (GAP-23): real CRUD replacing the read-only Scheduled Health Reports stub.
// Always sim schema via apps/simulator/src/services/scheduledHealthReportService.js. Lives at
// pages/scheduledHealthReports/ (not modules/pmis-gaps/pages/), mirroring Platform's placement.
// Kept alongside (not replacing) the existing ScheduledReports.jsx/scheduled_reports feature.
const ScheduledHealthReportListPage = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportListPage'))
const ScheduledHealthReportForm = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportForm'))
const ScheduledHealthReportDetailPage = lazy(() => import('../../../pages/scheduledHealthReports/ScheduledHealthReportDetailPage'))

// v963 Phase 21 (GAP-25): real CRUD replacing the old read-only gap-list stub, for all four
// role scopes (pm/pmo/platform, plus the pre-existing simulator/pmo/admin/integrations route) —
// complementary discovery layer over the different "configured connectors" feature at
// apps/simulator/src/pages/Integrations.jsx (kept untouched); "Connect" hands off there.
const IntegrationMarketplaceListPageSim = lazy(() => import('../pages/IntegrationMarketplaceListPage'))
const IntegrationCatalogDetailPageSim = lazy(() => import('../pages/IntegrationCatalogDetailPage'))

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
  // The real execution-log table (created by SQL/v31_automation.sql, public schema — automation
  // has no sim-schema equivalent) is 'automation_executions'.
  table: 'automation_executions',
  iconName: 'Activity',
  storageKeyPrefix: 'automation-log',
  columns: [
    { key: 'rule_id', label: 'Rule' },
    { key: 'execution_status', label: 'Status' },
    { key: 'started_at', label: 'Started' },
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
      <Route path="pm/okr" element={wrapPm(<OkrDashboardPage />)} />
      <Route path="pm/okr/objectives" element={wrapPm(<OkrObjectiveListPage />)} />
      <Route path="pm/okr/objectives/create" element={wrapPm(<OkrObjectiveForm />)} />
      <Route path="pm/okr/objectives/:objectiveId" element={wrapPm(<OkrObjectiveDetailPage />)} />
      <Route path="pm/okr/objectives/:objectiveId/edit" element={wrapPm(<OkrObjectiveForm />)} />
      <Route path="pm/okr/cycles" element={wrapPm(<OkrCycleListPage />)} />
      <Route path="pm/okr/cycles/create" element={wrapPm(<OkrCycleForm />)} />
      <Route path="pm/okr/cycles/:cycleId" element={wrapPm(<OkrCycleDetailPage />)} />
      <Route path="pm/okr/cycles/:cycleId/edit" element={wrapPm(<OkrCycleForm />)} />
      <Route path="pm/okr/alignment" element={wrapPm(<OkrDashboardPage />)} />
      <Route path="pm/okr/checkins" element={wrapPm(<OkrObjectiveListPage />)} />
      <Route path="pm/settings/custom-fields" element={wrapPm(<Navigate to="/simulator/local-data-extensions/field-definitions" replace />)} />
      <Route path="pm/resources/workload" element={wrapPm(<WorkloadHeatmapPage />)} />
      <Route path="pm/settings/intake-forms" element={wrapPm(<IntakeFormListPage />)} />
      <Route path="pm/settings/intake-forms/create" element={wrapPm(<IntakeFormForm />)} />
      <Route path="pm/settings/intake-forms/:id" element={wrapPm(<IntakeFormDetailPage />)} />
      <Route path="pm/settings/intake-forms/:id/edit" element={wrapPm(<IntakeFormForm />)} />
      <Route path="pm/settings/intake-forms/:id/fields" element={wrapPm(<IntakeFormFieldsPage />)} />
      <Route path="pm/settings/intake-forms/:id/submissions" element={wrapPm(<IntakeFormSubmissionListPage />)} />
      <Route path="pm/settings/intake-forms/:id/submissions/:submissionId" element={wrapPm(<IntakeFormSubmissionDetailPage />)} />
      <Route path="pm/settings/intake-forms/submissions" element={wrapPm(<IntakeFormSubmissionListPage />)} />
      <Route path="pm/settings/client-portal" element={wrapPm(<ClientPortalListPage />)} />
      <Route path="pm/settings/client-portal/create" element={wrapPm(<ClientPortalForm />)} />
      <Route path="pm/settings/client-portal/:id" element={wrapPm(<ClientPortalDetailPage />)} />
      <Route path="pm/settings/client-portal/:id/edit" element={wrapPm(<ClientPortalForm />)} />
      <Route path="pm/settings/client-portal/:id/guests" element={wrapPm(<ClientPortalGuestsPage />)} />
      <Route path="pm/settings/recurring-tasks" element={wrapPm(<RecurringTaskListPage />)} />
      <Route path="pm/settings/recurring-tasks/create" element={wrapPm(<RecurringTaskForm />)} />
      <Route path="pm/settings/recurring-tasks/:id" element={wrapPm(<RecurringTaskDetailPage />)} />
      <Route path="pm/settings/recurring-tasks/:id/edit" element={wrapPm(<RecurringTaskForm />)} />
      <Route path="pm/resources/raci" element={wrapPm(<RaciListPage />)} />
      <Route path="pm/resources/raci/create" element={wrapPm(<RaciMatrixEditor />)} />
      <Route path="pm/resources/raci/:id" element={wrapPm(<RaciMatrixEditor />)} />
      <Route path="pm/resources/skills" element={wrapPm(<SkillCatalogListPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/matrix" element={wrapPm(<SkillCompetencyMatrixPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/requirements" element={wrapPm(<SkillRequirementsListPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/requirements/create" element={wrapPm(<SkillRequirementDetailPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/requirements/:id" element={wrapPm(<SkillRequirementDetailPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/requirements/:id/edit" element={wrapPm(<SkillRequirementDetailPage basePath="/pm/resources/skills" forceEdit />)} />
      <Route path="pm/resources/skills/catalog/create" element={wrapPm(<SkillCatalogDetailPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/catalog/:id" element={wrapPm(<SkillCatalogDetailPage basePath="/pm/resources/skills" />)} />
      <Route path="pm/resources/skills/catalog/:id/edit" element={wrapPm(<SkillCatalogDetailPage basePath="/pm/resources/skills" forceEdit />)} />
      <Route path="pm/resources/timesheet-approval" element={wrapPm(<TimesheetApproverQueuePage />)} />
      <Route path="pm/resources/training" element={wrapPm(<TrainingCertificationListPage />)} />
      <Route path="pm/resources/training/create" element={wrapPm(<TrainingCertificationForm />)} />
      <Route path="pm/resources/training/:id" element={wrapPm(<TrainingCertificationDetailPage />)} />
      <Route path="pm/resources/training/:id/edit" element={wrapPm(<TrainingCertificationForm />)} />
      <Route path="pm/resources/training/records" element={wrapPm(<TrainingRecordListPage />)} />
      <Route path="pm/resources/training/records/create" element={wrapPm(<TrainingRecordForm />)} />
      <Route path="pm/resources/training/records/:id/edit" element={wrapPm(<TrainingRecordForm />)} />
      <Route path="pm/planning/s-curve" element={wrapPm(<SCurvePage />)} />
      <Route path="pm/planning/planning-poker" element={wrapPm(<PlanningPokerPage />)} />
      <Route path="pm/dashboards/builder" element={wrapPm(<DashboardBuilderPage />)} />
      <Route path="pm/strategy/portfolio-map" element={wrapPm(<PortfolioMapPage />)} />
      <Route path="pm/collaboration/whiteboard" element={wrapPm(<WhiteboardPage />)} />
      <Route path="pm/settings/guest-access" element={wrapPm(<GuestAccessListPage />)} />
      <Route path="pm/settings/guest-access/create" element={wrapPm(<GuestAccessForm />)} />
      <Route path="pm/settings/guest-access/:id" element={wrapPm(<GuestAccessDetailPage />)} />
      <Route path="pm/settings/guest-access/:id/edit" element={wrapPm(<GuestAccessForm />)} />
      <Route path="pm/settings/notifications" element={wrapPm(<NotificationPreferencesPage />)} />
      <Route path="pm/settings/clone" element={wrapPm(<ProjectCloneJobsPage basePath="/pm/settings/clone" scopedToCurrentProject />)} />
      <Route path="pm/settings/clone/create" element={wrapPm(<ProjectCloneCreatePage basePath="/pm/settings/clone" />)} />
      <Route path="pm/settings/clone/:id" element={wrapPm(<ProjectCloneDetailPage basePath="/pm/settings/clone" />)} />
      <Route path="pm/settings/project-clone" element={wrapPm(<ProjectCloneJobsPage basePath="/pm/settings/clone" scopedToCurrentProject />)} />
      <Route path="pm/reporting/scheduled" element={wrapPm(<ScheduledHealthReportListPage />)} />
      <Route path="pm/reporting/scheduled/create" element={wrapPm(<ScheduledHealthReportForm />)} />
      <Route path="pm/reporting/scheduled/:id" element={wrapPm(<ScheduledHealthReportDetailPage />)} />
      <Route path="pm/reporting/scheduled/:id/edit" element={wrapPm(<ScheduledHealthReportForm />)} />
      <Route path="pm/integrations" element={wrapPm(<IntegrationMarketplaceListPageSim basePath="/pm/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pm/integrations/connections" element={wrapPm(<IntegrationMarketplaceListPageSim basePath="/pm/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pm/integrations/catalog/create" element={wrapPm(<IntegrationCatalogDetailPageSim basePath="/pm/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pm/integrations/catalog/:id" element={wrapPm(<IntegrationCatalogDetailPageSim basePath="/pm/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pm/integrations/catalog/:id/edit" element={wrapPm(<IntegrationCatalogDetailPageSim basePath="/pm/integrations" configBasePath="/simulator/integrations" forceEdit />)} />

      {/* PMO routes */}
      <Route path="pmo/calendar" element={wrapPmo(<UniversalCalendarPage />)} />
      <Route path="pmo/admin/automations" element={wrapPmo(<AutomationHubPage />)} />
      <Route path="pmo/admin/automations/templates" element={wrapPmo(<AutomationTemplatesPage />)} />
      <Route path="pmo/okr" element={wrapPmo(<OkrDashboardPage />)} />
      <Route path="pmo/okr/objectives" element={wrapPmo(<OkrObjectiveListPage />)} />
      <Route path="pmo/okr/objectives/create" element={wrapPmo(<OkrObjectiveForm />)} />
      <Route path="pmo/okr/objectives/:objectiveId" element={wrapPmo(<OkrObjectiveDetailPage />)} />
      <Route path="pmo/okr/objectives/:objectiveId/edit" element={wrapPmo(<OkrObjectiveForm />)} />
      <Route path="pmo/okr/cycles" element={wrapPmo(<OkrCycleListPage />)} />
      <Route path="pmo/okr/cycles/create" element={wrapPmo(<OkrCycleForm />)} />
      <Route path="pmo/okr/cycles/:cycleId" element={wrapPmo(<OkrCycleDetailPage />)} />
      <Route path="pmo/okr/cycles/:cycleId/edit" element={wrapPmo(<OkrCycleForm />)} />
      <Route path="pmo/okr/alignment" element={wrapPmo(<OkrDashboardPage />)} />
      <Route path="pmo/okr/checkins" element={wrapPmo(<OkrObjectiveListPage />)} />
      <Route path="pmo/admin/custom-fields" element={wrapPmo(<Navigate to="/simulator/local-data-extensions/field-definitions" replace />)} />
      <Route path="pmo/resources/workload" element={wrapPmo(<WorkloadHeatmapPage />)} />
      <Route path="pmo/admin/intake-forms" element={wrapPmo(<IntakeFormListPage />)} />
      <Route path="pmo/admin/intake-forms/create" element={wrapPmo(<IntakeFormForm />)} />
      <Route path="pmo/admin/intake-forms/:id" element={wrapPmo(<IntakeFormDetailPage />)} />
      <Route path="pmo/admin/intake-forms/:id/edit" element={wrapPmo(<IntakeFormForm />)} />
      <Route path="pmo/admin/intake-forms/:id/fields" element={wrapPmo(<IntakeFormFieldsPage />)} />
      <Route path="pmo/admin/intake-forms/:id/submissions" element={wrapPmo(<IntakeFormSubmissionListPage />)} />
      <Route path="pmo/admin/intake-forms/:id/submissions/:submissionId" element={wrapPmo(<IntakeFormSubmissionDetailPage />)} />
      <Route path="pmo/admin/client-portals" element={wrapPmo(<ClientPortalListPage />)} />
      <Route path="pmo/admin/client-portals/create" element={wrapPmo(<ClientPortalForm />)} />
      <Route path="pmo/admin/client-portals/:id" element={wrapPmo(<ClientPortalDetailPage />)} />
      <Route path="pmo/admin/client-portals/:id/edit" element={wrapPmo(<ClientPortalForm />)} />
      <Route path="pmo/admin/client-portals/:id/guests" element={wrapPmo(<ClientPortalGuestsPage />)} />
      <Route path="pmo/resources/raci" element={wrapPmo(<RaciListPage />)} />
      <Route path="pmo/resources/raci/create" element={wrapPmo(<RaciMatrixEditor />)} />
      <Route path="pmo/resources/raci/:id" element={wrapPmo(<RaciMatrixEditor />)} />
      <Route path="pmo/resources/skills" element={wrapPmo(<SkillCatalogListPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/matrix" element={wrapPmo(<SkillCompetencyMatrixPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/requirements" element={wrapPmo(<SkillRequirementsListPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/requirements/create" element={wrapPmo(<SkillRequirementDetailPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/requirements/:id" element={wrapPmo(<SkillRequirementDetailPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/requirements/:id/edit" element={wrapPmo(<SkillRequirementDetailPage basePath="/pmo/resources/skills" forceEdit />)} />
      <Route path="pmo/resources/skills/catalog/create" element={wrapPmo(<SkillCatalogDetailPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/catalog/:id" element={wrapPmo(<SkillCatalogDetailPage basePath="/pmo/resources/skills" />)} />
      <Route path="pmo/resources/skills/catalog/:id/edit" element={wrapPmo(<SkillCatalogDetailPage basePath="/pmo/resources/skills" forceEdit />)} />
      <Route path="pmo/financial/timesheet-approvals" element={wrapPmo(<TimesheetApproverQueuePage />)} />
      <Route path="pmo/settings/timesheet-approvals" element={wrapPmo(<TimesheetApprovalSettingsPage />)} />
      <Route path="pmo/planning/s-curve" element={wrapPmo(<SCurvePage />)} />
      <Route path="pmo/planning/planning-poker" element={wrapPmo(<PlanningPokerPage />)} />
      <Route path="pmo/dashboards/builder" element={wrapPmo(<DashboardBuilderPage />)} />
      <Route path="pmo/strategy/portfolio-map" element={wrapPmo(<PortfolioMapPage />)} />
      <Route path="pmo/collaboration/whiteboard" element={wrapPmo(<WhiteboardPage />)} />
      <Route path="pmo/settings/notifications" element={wrapPmo(<NotificationPreferencesPage showTemplatesLink onOpenTemplates={() => window.location.assign('/simulator/pmo/admin/notification-templates')} />)} />
      <Route path="pmo/admin/notification-templates" element={wrapPmo(<NotificationPreferenceTemplateListPage basePath="/simulator/pmo/admin/notification-templates" />)} />
      <Route path="pmo/admin/notification-templates/create" element={wrapPmo(<NotificationPreferenceTemplateDetailPage basePath="/simulator/pmo/admin/notification-templates" />)} />
      <Route path="pmo/admin/notification-templates/:id" element={wrapPmo(<NotificationPreferenceTemplateDetailPage basePath="/simulator/pmo/admin/notification-templates" />)} />
      <Route path="pmo/admin/notification-templates/:id/edit" element={wrapPmo(<NotificationPreferenceTemplateDetailPage basePath="/simulator/pmo/admin/notification-templates" forceEdit />)} />
      <Route path="pmo/admin/integrations" element={wrapPmo(<IntegrationMarketplaceListPageSim basePath="/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pmo/admin/integrations/catalog/create" element={wrapPmo(<IntegrationCatalogDetailPageSim basePath="/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pmo/admin/integrations/catalog/:id" element={wrapPmo(<IntegrationCatalogDetailPageSim basePath="/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="pmo/admin/integrations/catalog/:id/edit" element={wrapPmo(<IntegrationCatalogDetailPageSim basePath="/pmo/admin/integrations" configBasePath="/simulator/integrations" forceEdit />)} />
      <Route path="pmo/reporting/scheduled" element={wrapPmo(<ScheduledHealthReportListPage />)} />
      <Route path="pmo/reporting/scheduled/create" element={wrapPmo(<ScheduledHealthReportForm />)} />
      <Route path="pmo/reporting/scheduled/:id" element={wrapPmo(<ScheduledHealthReportDetailPage />)} />
      <Route path="pmo/reporting/scheduled/:id/edit" element={wrapPmo(<ScheduledHealthReportForm />)} />

      {/* Platform DB-driven role routes */}
      <Route path="platform/calendar" element={wrapPlatform(<UniversalCalendarPage />)} />
      <Route path="platform/okr" element={wrapPlatform(<OkrDashboardPage />)} />
      <Route path="platform/resources/workload" element={wrapPlatform(<WorkloadHeatmapPage />)} />
      <Route path="platform/settings/notifications" element={wrapPlatform(<NotificationPreferencesPage />)} />
      <Route path="platform/automations" element={wrapPlatform(<AutomationHubPage />)} />
      <Route path="platform/admin/custom-fields" element={wrapPlatform(<Navigate to="/simulator/local-data-extensions/field-definitions" replace />)} />
      <Route path="platform/intake-forms" element={wrapPlatform(<IntakeFormListPage />)} />
      <Route path="platform/client-portal" element={wrapPlatform(<ClientPortalListPage />)} />
      <Route path="platform/recurring-tasks" element={wrapPlatform(<RecurringTaskListPage />)} />
      <Route path="platform/planning/raci" element={wrapPlatform(<RaciListPage />)} />
      <Route path="platform/resources/skills" element={wrapPlatform(<SkillCatalogListPage basePath="/platform/resources/skills" />)} />
      <Route path="platform/timesheets/weekly" element={wrapPlatform(<WeeklyTimesheetPage />)} />
      <Route path="platform/timesheets/weekly/:id" element={wrapPlatform(<TimesheetPeriodDetailPage />)} />
      <Route path="platform/timesheets/approvals" element={wrapPlatform(<TimesheetApproverQueuePage />)} />
      <Route path="platform/timesheets/settings" element={wrapPlatform(<TimesheetApprovalSettingsPage />)} />
      <Route path="platform/planning/s-curve" element={wrapPlatform(<SCurvePage />)} />
      <Route path="platform/planning/planning-poker" element={wrapPlatform(<PlanningPokerPage />)} />
      <Route path="platform/dashboards/builder" element={wrapPlatform(<DashboardBuilderPage />)} />
      <Route path="platform/strategy/portfolio-map" element={wrapPlatform(<PortfolioMapPage />)} />
      <Route path="platform/collaboration/whiteboard" element={wrapPlatform(<WhiteboardPage />)} />
      <Route path="platform/admin/guest-access" element={wrapPlatform(<GuestAccessListPage />)} />
      <Route path="platform/resources/training" element={wrapPlatform(<TrainingCertificationListPage />)} />
      <Route path="platform/admin/project-clone" element={wrapPlatform(<ProjectCloneJobsPage basePath="/platform/admin/project-clone" />)} />
      <Route path="platform/reporting/scheduled" element={wrapPlatform(<ScheduledHealthReportListPage />)} />
      <Route path="platform/admin/integrations" element={wrapPlatform(<IntegrationMarketplaceListPageSim basePath="/platform/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="platform/admin/integrations/catalog/create" element={wrapPlatform(<IntegrationCatalogDetailPageSim basePath="/platform/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="platform/admin/integrations/catalog/:id" element={wrapPlatform(<IntegrationCatalogDetailPageSim basePath="/platform/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="platform/admin/integrations/catalog/:id/edit" element={wrapPlatform(<IntegrationCatalogDetailPageSim basePath="/platform/admin/integrations" configBasePath="/simulator/integrations" forceEdit />)} />

      {/* Simulator general */}
      <Route path="simulator/calendar" element={wrapSimulator(<UniversalCalendarPage sim />)} />
      <Route path="simulator/okr" element={wrapSimulator(<OkrDashboardPage />)} />
      <Route path="simulator/team-mode/setup" element={wrapSimulator(<SimMultiplayerPage />)} />
      <Route path="simulator/team-mode/active" element={wrapSimulator(<SimMultiplayerPage />)} />
      <Route path="simulator/exams" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/exams/results" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/exams/certificates" element={wrapSimulator(<SimExamModePage />)} />
      <Route path="simulator/scenarios/marketplace" element={wrapSimulator(<SimMarketplacePage />)} />
      <Route path="simulator/profile/run-analytics" element={wrapSimulator(<SimCrossRunAnalyticsPage />)} />
      <Route path="simulator/profile/improvement" element={wrapSimulator(<SimCrossRunAnalyticsPage />)} />
      <Route path="simulator/planning/recurring-tasks" element={wrapSimulator(<RecurringTaskListPage />)} />
      <Route path="simulator/planning/raci" element={wrapSimulator(<RaciListPage />)} />
      <Route path="simulator/dashboards/builder" element={wrapSimulator(<DashboardBuilderPage sim />)} />
      <Route path="simulator/reporting/scheduled" element={wrapSimulator(<ScheduledHealthReportListPage />)} />
      <Route path="simulator/collaboration/whiteboard" element={wrapSimulator(<WhiteboardPage sim />)} />
      <Route path="simulator/settings/notifications" element={wrapSimulator(<NotificationPreferencesPage />)} />

      {/* Simulator PM */}
      <Route path="simulator/pm/calendar" element={wrapSimPm(<UniversalCalendarPage sim />)} />
      <Route path="simulator/pm/automations" element={wrapSimPm(<AutomationHubPage />)} />
      <Route path="simulator/pm/okr" element={wrapSimPm(<OkrDashboardPage />)} />
      <Route path="simulator/pm/okr/objectives" element={wrapSimPm(<OkrObjectiveListPage />)} />
      <Route path="simulator/pm/okr/objectives/create" element={wrapSimPm(<OkrObjectiveForm />)} />
      <Route path="simulator/pm/okr/objectives/:objectiveId" element={wrapSimPm(<OkrObjectiveDetailPage />)} />
      <Route path="simulator/pm/okr/objectives/:objectiveId/edit" element={wrapSimPm(<OkrObjectiveForm />)} />
      <Route path="simulator/pm/okr/cycles" element={wrapSimPm(<OkrCycleListPage />)} />
      <Route path="simulator/pm/okr/cycles/create" element={wrapSimPm(<OkrCycleForm />)} />
      <Route path="simulator/pm/okr/cycles/:cycleId" element={wrapSimPm(<OkrCycleDetailPage />)} />
      <Route path="simulator/pm/okr/cycles/:cycleId/edit" element={wrapSimPm(<OkrCycleForm />)} />
      <Route path="simulator/pm/resources/workload" element={wrapSimPm(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/pm/settings/custom-fields" element={wrapSimPm(<Navigate to="/simulator/local-data-extensions/field-definitions" replace />)} />
      <Route path="simulator/pm/settings/intake-forms" element={wrapSimPm(<IntakeFormListPage />)} />
      <Route path="simulator/pm/settings/client-portal" element={wrapSimPm(<ClientPortalListPage />)} />
      <Route path="simulator/pm/settings/recurring-tasks" element={wrapSimPm(<RecurringTaskListPage />)} />
      <Route path="simulator/pm/resources/raci" element={wrapSimPm(<RaciListPage />)} />
      <Route path="simulator/pm/resources/skills" element={wrapSimPm(<SkillCatalogListPage basePath="/simulator/pm/resources/skills" />)} />
      <Route path="simulator/pm/resources/timesheet-approval" element={wrapSimPm(<TimesheetApproverQueuePage />)} />
      <Route path="simulator/pm/planning/s-curve" element={wrapSimPm(<SCurvePage sim />)} />
      <Route path="simulator/pm/planning/planning-poker" element={wrapSimPm(<PlanningPokerPage sim />)} />
      <Route path="simulator/pm/dashboards/builder" element={wrapSimPm(<DashboardBuilderPage sim />)} />
      <Route path="simulator/pm/collaboration/whiteboard" element={wrapSimPm(<WhiteboardPage sim />)} />
      <Route path="simulator/pm/settings/notifications" element={wrapSimPm(<NotificationPreferencesPage />)} />
      <Route path="simulator/pm/reporting/scheduled" element={wrapSimPm(<ScheduledHealthReportListPage />)} />

      {/* Simulator PMO */}
      <Route path="simulator/pmo/calendar" element={wrapSimPmo(<UniversalCalendarPage sim />)} />
      <Route path="simulator/pmo/admin/automations" element={wrapSimPmo(<AutomationHubPage />)} />
      <Route path="simulator/pmo/okr" element={wrapSimPmo(<OkrDashboardPage />)} />
      <Route path="simulator/pmo/resources/workload" element={wrapSimPmo(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/pmo/admin/custom-fields" element={wrapSimPmo(<Navigate to="/simulator/local-data-extensions/field-definitions" replace />)} />
      <Route path="simulator/pmo/admin/intake-forms" element={wrapSimPmo(<IntakeFormListPage />)} />
      <Route path="simulator/pmo/admin/client-portals" element={wrapSimPmo(<ClientPortalListPage />)} />
      <Route path="simulator/pmo/resources/raci" element={wrapSimPmo(<RaciListPage />)} />
      <Route path="simulator/pmo/resources/skills" element={wrapSimPmo(<SkillCatalogListPage basePath="/simulator/pmo/resources/skills" />)} />
      <Route path="simulator/pmo/financial/timesheet-approvals" element={wrapSimPmo(<TimesheetApproverQueuePage />)} />
      <Route path="simulator/pmo/settings/timesheet-approvals" element={wrapSimPmo(<TimesheetApprovalSettingsPage />)} />
      <Route path="simulator/pmo/planning/s-curve" element={wrapSimPmo(<SCurvePage sim />)} />
      <Route path="simulator/pmo/strategy/portfolio-map" element={wrapSimPmo(<PortfolioMapPage sim />)} />
      <Route path="simulator/pmo/admin/integrations" element={wrapSimPmo(<IntegrationMarketplaceListPageSim basePath="/simulator/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="simulator/pmo/admin/integrations/catalog/create" element={wrapSimPmo(<IntegrationCatalogDetailPageSim basePath="/simulator/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="simulator/pmo/admin/integrations/catalog/:id" element={wrapSimPmo(<IntegrationCatalogDetailPageSim basePath="/simulator/pmo/admin/integrations" configBasePath="/simulator/integrations" />)} />
      <Route path="simulator/pmo/admin/integrations/catalog/:id/edit" element={wrapSimPmo(<IntegrationCatalogDetailPageSim basePath="/simulator/pmo/admin/integrations" configBasePath="/simulator/integrations" forceEdit />)} />
      <Route path="simulator/pmo/reporting/scheduled" element={wrapSimPmo(<ScheduledHealthReportListPage />)} />

      {/* Simulator TM */}
      <Route path="simulator/tm/calendar" element={wrapSimulator(<UniversalCalendarPage sim />)} />
      <Route path="simulator/tm/workload" element={wrapSimulator(<WorkloadHeatmapPage sim />)} />
      <Route path="simulator/tm/raci" element={wrapSimulator(<RaciListPage />)} />
      <Route path="simulator/tm/skills" element={wrapSimulator(<SkillCatalogListPage basePath="/simulator/tm/skills" />)} />
      <Route path="simulator/tm/recurring-tasks" element={wrapSimulator(<RecurringTaskListPage />)} />
      <Route path="simulator/tm/collaboration/whiteboard" element={wrapSimulator(<WhiteboardPage sim />)} />
      <Route path="simulator/tm/settings/notifications" element={wrapSimulator(<NotificationPreferencesPage />)} />
      <Route path="simulator/tm/training" element={wrapSimulator(<TrainingCertificationListPage />)} />
      <Route path="simulator/tm/timesheets/submit" element={wrapSimulator(<WeeklyTimesheetPage />)} />
      <Route path="simulator/tm/timesheets/weekly/:id" element={wrapSimulator(<TimesheetPeriodDetailPage />)} />
    </>
  )
}

export default PmisGapRouteElements
