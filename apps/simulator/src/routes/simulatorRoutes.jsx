/** Simulator routes — extracted from App.jsx (v729 Option B) */
import { Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import AppToPlatformRedirect from '../components/AppToPlatformRedirect'
import { PmisGapRouteElements } from '../modules/pmis-gaps/routes/PmisGapRoutes.jsx'
import { RecordLifecycleRouteElements } from '../modules/record-lifecycle/routes/RecordLifecycleRoutes.jsx'
import { V734RoleRouteElements } from './v734RoleRoutes.jsx'
import { SimPmoFederated, SimPmoTemplateLibraryFederated, SimPmoOrganisationalTemplatesFederated } from './SimPmoFederatedOutlet.jsx'
import {
  LoadingFallback,
  LoadingFallbackWithTimeout,
  LoginPageSkeleton,
  RedirectProjectsTemplatesToLibrary,
  NidusHomepage,
  ThemeProvider,
  ToastProvider,
  Layout,
  ProtectedRoute,
  Home,
  PlatformHomepage,
  SimulatorHomepage,
  Documentation,
  FeaturesPage,
  BlogPage,
  ResourcesPage,
  PricingPage,
  PlatformPricing,
  BundlePricing,
  SimulatorPricing,
  AboutPage,
  ContactPage,
  PlatformRequestDemoPage,
  SimulatorRequestDemoPage,
  Projects,
  ProjectsCreate,
  ProjectsDetail,
  LocalDataExtensionsRoutes,
  SimulatorLocalDataExtensionsRoutes,
  ProjectsEdit,
  ScopeManagementPlanPage,
  ScopeStatementPage,
  RequirementsRegisterPage,
  RequirementDetailPage,
  TraceabilityMatrixPage,
  WBSBuilderPage,
  ScheduleManagementPlanPage,
  ActivityListPage,
  ActivityDetailPage,
  ActivitySequencingPage,
  GanttChartPage,
  ProjectsOnHold,
  BenefitsOnHold,
  StakeholdersOnHold,
  IssuesOnHold,
  RisksOnHold,
  QualityOnHold,
  DraftExpiryConfig,
  Tasks,
  TasksBoard,
  TasksCalendar,
  TasksCreate,
  TasksDetail,
  MethodologySelection,
  PlatformDashboard,
  SimulatorDashboard,
  SimulationSetup,
  SimulationRunDashboard,
  TeamSeatsDashboard,
  TeamSeatClaimPage,
  SimEventInbox,
  SimStageGateReview,
  SimExceptionReportFlow,
  SimEVMDashboard,
  SimulationRunHistory,
  SimulationDebrief,
  SimLiveRunRedirect,
  SimAIWorkspace,
  AIWorkspace,
  SubmitFeedback,
  PMODashboard,
  PMDashboard,
  PMOLayout,
  PMLayout,
  PMOGovernanceMandateTemplate,
  PMOGovernanceCMS,
  PMOGovernanceConfigMS,
  PMOGovernanceQMS,
  PMOGovernanceRMS,
  PMOInitiationBusinessCase,
  PMOInitiationProjectBrief,
  PMOInitiationBenefitsReviewPlan,
  PMOOversightRiskRegister,
  PMOOversightIssueRegister,
  PMOOversightQualityRegister,
  PMOOversightChangeRegister,
  PMOOversightLessonsLog,
  PMOOversightScope,
  PMOOversightSchedules,
  PMOReportingHighlight,
  PMOReportingException,
  PMOReportingEndStage,
  PMOReportingEndProject,
  PMOProcurementRFP,
  PMORFPView,
  PMORFPCreate,
  PMORFPEdit,
  PMORFPBulkImport,
  PMORFPPrint,
  PMORFPOnHold,
  PMGovernanceMandateTemplate,
  PMGovernanceCMS,
  PMGovernanceConfigMS,
  PMGovernanceQMS,
  PMGovernanceRMS,
  PMInitiationBusinessCase,
  PMInitiationProjectBrief,
  PMInitiationPID,
  PMInitiationBenefitsReviewPlan,
  PMDeliveryWorkPackages,
  PMDeliveryProductDescription,
  PMDeliveryProjectProductDescription,
  PMDeliveryProductStatusAccount,
  PMDeliveryDailyLog,
  PMControlsRiskRegister,
  PMControlsIssueRegister,
  PMControlsQualityRegister,
  PMControlsConfigItems,
  PMControlsLessonsLog,
  PMReportingCheckpoint,
  PMReportingHighlight,
  PMReportingIssueReports,
  PMReportingException,
  PMReportingEndStage,
  PMClosureLessonsReport,
  PMClosureEndProjectReport,
  Dashboard,
  Teams,
  MyTeam,
  Governance,
  Portfolio,
  PortfolioCreatePage,
  PortfolioFormPage,
  PortfolioDashboard,
  PortfolioProjects,
  PortfolioResources,
  PortfolioFinancial,
  PortfolioReports,
  PortfolioGovernance,
  PortfolioCategories,
  Programme,
  ProgrammeDetailPage,
  ProgrammeCreatePage,
  ProgrammeEditPage,
  ProgrammeDashboardOverview,
  ProgrammeProjectsPage,
  ProgrammeDependenciesPage,
  ProgrammeBenefitsPage,
  ProgrammeTimelinePage,
  ProgrammeReportsPage,
  Strategy,
  StrategicObjectives,
  StrategicAlignment,
  StrategicContribution,
  StrategicPortfolio,
  StrategicReports,
  Quality,
  QualityManagement,
  QualityReviews,
  QualityInspections,
  QualityReports,
  QualityActivityView,
  MyQualityActions,
  Stakeholders,
  StakeholderRegisterPage,
  StakeholderFormPage,
  StakeholderProfilePage,
  StakeholderAnalysisPage,
  StakeholderEngagementPage,
  CommunicationPlanPage,
  StakeholderMonitoringPage,
  StakeholderAssessmentMatrixPage,
  StakeholdersAssessmentMatrixOnHold,
  TestDashboard,
  TestSuites,
  TestSuiteDetail,
  TestCases,
  TestCaseCreate,
  TestCaseDetail,
  TestCaseBulkUpload,
  TestRuns,
  TestRunDetail,
  TestRunExecute,
  DefectListPage,
  DefectDetailPage,
  DefectDashboardPage,
  SimTestDashboard,
  SimTestSuites,
  SimTestSuiteDetail,
  SimTestCases,
  SimTestCaseCreate,
  SimTestCaseDetail,
  SimTestCaseBulkUpload,
  SimTestRuns,
  SimTestRunDetail,
  SimTestRunExecute,
  SimDefectListPage,
  SimDefectDetailPage,
  SimDefectDashboardPage,
  BrandingSettings,
  BrandingHistory,
  PMOAdmin,
  ProjectTypes,
  ProjectStatuses,
  FundingSources,
  BudgetCategories,
  ManagerAssignments,
  AppointmentDashboard,
  MyAppointments,
  TeamAppointmentDashboard,
  MyTeamAppointments,
  SimAppointmentDashboard,
  SimMyAppointments,
  SimTeamAppointmentDashboard,
  SimMyTeamAppointments,
  PortfolioManagerAssignments,
  ProgrammeManagerAssignments,
  ManagerAssignmentSettings,
  PMORoleMenuManagement,
  AdminRoleMenuManagement,
  AuthenticationSettings,
  SecuritySettings,
  PWASettingsV675,
  ExecutiveDashboard,
  SubscriptionManagement,
  OrganisationProfile,
  StageGateList,
  StageGateForm,
  StageGateView,
  GovernanceFrameworkList,
  GovernanceFrameworkForm,
  PoliciesComplianceList,
  PoliciesComplianceForm,
  PoliciesComplianceView,
  IntelligenceRulesPage,
  GovernanceRulesConfigPage,
  CustomMetricsPage,
  WorkstreamPlanList,
  WorkstreamPlanForm,
  LeaderboardAdmin,
  CertificateAdmin,
  ScenarioAdmin,
  SimUserManagement,
  ProjectCostManagement,
  ProjectBudgetBaseline,
  ProjectEVMPage,
  ProjectsEVMLandingPage,
  ProgrammeEVMPage,
  ProgrammeEVMLandingPage,
  PortfolioEVMPage,
  ProgrammeFinancialDashboard,
  ProjectProfitability,
  MyExpenses,
  ExpenseApproval,
  ExpenseApprovalThresholds,
  FinancialReportingHub,
  SimProjectCostManagement,
  SimProjectBudgetBaseline,
  SimProjectEVMPage,
  SimProgrammeEVMPage,
  SimPortfolioEVMPage,
  SimProgrammeFinancialDashboard,
  SimProjectProfitability,
  SimMyExpenses,
  SimExpenseApproval,
  SimExpenseApprovalThresholds,
  SimFinancialReportingHub,
  SimSprintMetricsDashboard,
  SimAgileTemplates,
  SimStoryMap,
  SimAgileReleases,
  SimAgileReleaseDetail,
  SimAgileRoadmap,
  SimXPDashboard,
  SimValueStreamMap,
  SimKaizenBoard,
  SimLeanMetrics,
  SimScrumOfScrums,
  SimAgileMetricsHub,
  SimKanbanMetrics,
  LifecycleTemplates,
  Reports,
  OrgKnowledgeHub,
  EEFList,
  EEFCreate,
  EEFDetail,
  EEFEdit,
  EEFOnHold,
  EEFBulkUpload,
  ITTOTemplateList,
  ProjectITTOList,
  ITTODraftsQueue,
  IndustryTemplateList,
  PMOInvitationTracker,
  PMInvitationTracker,
  InvitationDetailPage,
  IndustryTemplateForm,
  IndustryTemplateDetail,
  IndustryTemplateOnHold,
  IndustryTemplateBrowser,
  IndustryPlanCopyWizard,
  ProjectIndustryPlanView,
  SimIndustryTemplateBrowser,
  SimIndustryPlanCopy,
  SimPracticeIndustryPlan,
  SimITTOTemplateList,
  SimProjectITTOList,
  SimITTODraftsQueue,
  DelayRegister,
  DelayTemplates,
  SimDelayRegister,
  SimDelayTemplates,
  PlanningHub,
  PlanningIntelligenceDashboard,
  ScenarioList,
  PBSBuilder,
  PlanHealthDashboard,
  AIPlanGenerator,
  ExecutivePlanView,
  PortfolioCollisionDashboard,
  RecoveryPlanningView,
  ConfidenceForecastView,
  GovernanceGateChecklist,
  MicroPlanList,
  MicroPlanDetail,
  MicroPlanDraftQueue,
  MicroPlanForm,
  TeamCharterPage,
  TeamCharterEditPage,
  DecisionLogPage,
  DecisionLogForm,
  DecisionLogDetail,
  MyTimesheetsPage,
  TimesheetEntryForm,
  TimesheetEntryDetail,
  TeamTimesheetsPage,
  TeamChatPage,
  VideoCallsPage,
  VoiceCallsPage,
  OPAList,
  OPACreate,
  OPADetail,
  OPAEdit,
  OPAOnHold,
  OPABulkUpload,
  SimEEFList,
  SimEEFCreate,
  SimEEFDetail,
  SimEEFEdit,
  SimEEFOnHold,
  SimEEFBulkUpload,
  SimOPAList,
  SimOPACreate,
  SimOPADetail,
  SimOPAEdit,
  SimOPAOnHold,
  SimOPABulkUpload,
  TemplateLibraryList,
  TemplateLibraryManage,
  TemplateCreate,
  TemplateEdit,
  TemplateDetail,
  TemplateMasterVersionHistory,
  TemplateCategories,
  TemplateBulkUpload,
  TemplateUpdateNotifications,
  ProjectTemplateCopyList,
  ProjectTemplateCopyCreate,
  ProjectTemplateCopyEdit,
  ProjectTemplateCopyDetail,
  ProjectTemplateCopyVersionHistory,
  ProjectOPATemplates,
  ProjectOPACopy,
  ProjectOPACustomisationDetail,
  TemplateOnHold,
  SimTemplateLibraryList,
  SimTemplateLibraryManage,
  SimTemplateCreate,
  SimTemplateEdit,
  SimTemplateDetail,
  SimTemplateMasterVersionHistory,
  SimTemplateCategories,
  SimTemplateBulkUpload,
  SimTemplateUpdateNotifications,
  SimProjectTemplateCopyList,
  SimProjectTemplateCopyCreate,
  SimProjectTemplateCopyEdit,
  SimProjectTemplateCopyDetail,
  SimProjectTemplateCopyVersionHistory,
  SimTemplateOnHold,
  CommsHub,
  DirectMessages,
  ChannelView,
  MeetingList,
  MeetingSchedule,
  MeetingRoom,
  MeetingDetail,
  MeetingSummaryView,
  PendingAIReview,
  MeetingExtractionReview,
  ExtractedIssueEnrich,
  ExtractedRiskEnrich,
  DocumentGovernance,
  DocumentRegister,
  DocumentCompliance,
  ProgrammeDocuments,
  MethodologyDashboard,
  StartingUpProject,
  InitiatingProject,
  StageGates,
  ControllingStage,
  ManagingProductDelivery,
  DirectingProject,
  PlansDashboard,
  ProjectPlanCreate,
  ProjectPlanEdit,
  ProjectPlanViewPage,
  StagePlanCreate,
  StagePlanEdit,
  StagePlanViewPage,
  ProductDescriptionList,
  ProductDescriptionCreate,
  ProductDescriptionEdit,
  ProductDescriptionViewPage,
  ProductDescriptionTemplates,
  ProductStatusAccountList,
  ProductStatusAccountViewPage,
  ProductStatusAccountCreate,
  ProductStatusAccountEdit,
  ProductStatusAccountDashboard,
  Issues,
  IssueRegisterView,
  IssueDetailView,
  IssueAnalytics,
  MyIssueActions,
  PendingDecisions,
  IssueScaleConfig,
  IssueReportCreate,
  IssueReportEdit,
  IssueReportView,
  IssueReportsList,
  PPDView,
  PPDList,
  PIDView,
  WorkPackageView,
  CheckpointReportList,
  CheckpointReportCreate,
  CheckpointReportView,
  CheckpointReportEdit,
  ClosingProject,
  EndProjectReportView,
  EndProjectReportWizard,
  EPRComparisonView,
  StageBoundaries,
  EndStageReportView,
  EndStageReportCreate,
  EndStageReportEdit,
  ExceptionReportList,
  ExceptionReportCreate,
  ExceptionReportEdit,
  ExceptionReportView,
  ExceptionReportDashboard,
  HighlightReportCreate,
  HighlightReportView,
  HighlightReportEdit,
  AcceptanceTestingPage,
  QMSView,
  QMSList,
  QMSTemplates,
  RMSView,
  RMSList,
  CMSView,
  CMSCreate,
  CMSEdit,
  CMSList,
  CMSTemplates,
  CommunicationActivitiesCalendar,
  ConfigurationMSView,
  ConfigurationMSCreate,
  ConfigurationMSEdit,
  ConfigurationMSList,
  ConfigurationItemRegister,
  ConfigurationItemRecordView,
  ConfigurationItemRecordCreate,
  ConfigurationItemRecordEdit,
  Risks,
  RiskDetail,
  RAIDLog,
  ProductBacklog,
  SprintPlanning,
  SprintBoard,
  DailyScrum,
  SprintReview,
  SprintRetrospective,
  SprintMetricsDashboard,
  AgileTemplates,
  StoryMap,
  AgileReleases,
  AgileReleaseDetail,
  AgileRoadmap,
  ScrumOfScrums,
  XPDashboard,
  ValueStreamMap,
  KaizenBoard,
  LeanMetrics,
  AgileMetricsHub,
  KanbanBoards,
  KanbanBoard,
  MetricsDashboard,
  Resources,
  ResourceCapacity,
  ResourceDetail,
  ResourceConflicts,
  ReportBuilder,
  AnalyticsDashboard,
  Benefits,
  BenefitsRegisterPage,
  BenefitsRealizationPage,
  BenefitMeasurementsPage,
  BenefitCreatePage,
  BenefitDetailPage,
  BenefitsReviewPlan,
  Dependencies,
  DependencyCreatePage,
  DependencyMap,
  DependencyImpacts,
  BenefitsRealization,
  DependenciesLegacy,
  IntegrationSync,
  Login,
  PlatformLogin,
  SimulatorLogin,
  Register,
  PlatformRegister,
  SimulatorRegister,
  EmailConfirmation,
  InvitationAccept,
  RoleSelection,
  PlatformAccountSetup,
  PlatformChoice,
  OrganisationSetup,
  OrganisationVerificationNotice,
  VerifyOrganisation,
  ProjectTypeSelection,
  TrialProjectSetup,
  PaidProjectSetup,
  FreeTrialDashboard,
  TrialUpgrade,
  RoleAssignment,
  AssignRolesToProjects,
  SendRoleInvites,
  InvitationExpirySettingsPage,
  EmailSettings,
  EmailSenderProfiles,
  ChangeLogPage,
  WorkAuthorisationListPage,
  WorkAuthorisationDraftsPage,
  WorkAuthorisationCreatePage,
  WorkAuthorisationDetailPage,
  TestingCentreRoutesPlatform,
  TestingCentreRoutesPm,
  TestingCentreRoutesPmo,
  TestingCentreRoutesSim,
  TestingCentreRoutesSimPm,
  TestingCentreRoutesSimPmo,
  ProcessTemplatesRoutesPmo,
  ProcessTemplatesRoutesPm,
  ProcessTemplatesRoutesSimPmo,
  ProcessTemplatesRoutesSimPm,
  FormsGallery,
  ProjectFieldTemplates,
  FormNew,
  FormEdit,
  FormView,
  FormTemplateAdmin,
  FormTemplateBuilder,
  ProjectMemberInvitation,
  Settings,
  PWASettings,
  PWAInstallPrompt,
  BusinessCaseListPage,
  BusinessCaseCreate,
  BusinessCaseViewPage,
  BusinessCaseEdit,
  ProjectMandateCreate,
  ProjectMandateView,
  ProjectMandateEdit,
  MandateList,
  UnlinkedMandatesList,
  ProjectCreationWizard,
  MandateApprovalDashboard,
  SimMandateCreate,
  SimMandateView,
  SimMandateEdit,
  SimMandateList,
  SimScopeManagementPlanPage,
  SimScopeStatementPage,
  SimRequirementsRegisterPage,
  SimRequirementDetailPage,
  SimTraceabilityMatrixPage,
  SimWBSBuilderPage,
  SimScheduleManagementPlanPage,
  SimActivityListPage,
  SimActivityDetailPage,
  SimActivitySequencingPage,
  SimGanttChartPage,
  PracticeProjects,
  SimProjectMembers,
  ProjectUsers,
  InvitationTemplatesPage,
  PracticeProjectCreate,
  PracticeProjectDetail,
  PracticeTasks,
  PracticeTaskDetail,
  PracticeBriefList,
  PracticeBriefCreate,
  PracticeBriefView,
  PracticeBriefEdit,
  PracticeBusinessCaseList,
  PracticeBusinessCaseCreate,
  PracticeBusinessCaseView,
  PracticeBusinessCaseEdit,
  PracticePIDList,
  PracticePIDCreate,
  PracticePIDView,
  PracticeBenefitsReviewPlan,
  PracticeBenefitsReviewPlanList,
  PracticeBenefitsReviewPlanViewPage,
  PracticeBenefitsReviewPlanEditPage,
  PracticeWorkPackageList,
  PracticeWorkPackageCreate,
  PracticeWorkPackageView,
  PracticeWorkPackageEdit,
  PracticeProductDescriptionList,
  PracticeProductDescriptionCreate,
  PracticeProductDescriptionView,
  PracticePPDList,
  PracticePPDView,
  PracticePSAList,
  PracticePSAView,
  PracticePlanList,
  PracticePlanCreate,
  PracticePlanView,
  PracticePlanEdit,
  SimPlansDashboard,
  SimProjectPlanView,
  SimProjectPlanCreate,
  SimStagePlanCreate,
  PracticeDailyLog,
  PracticeDailyLogEntry,
  PracticeRiskRegister,
  PracticeRiskDetail,
  PracticeRMSList,
  PracticeRMSCreate,
  PracticeRMSView,
  PracticeIssueRegister,
  PracticeIssueDetail,
  PracticeIssueReportList,
  PracticeIssueReportCreate,
  PracticeIssueReportView,
  PracticeQualityRegister,
  PracticeQualityActivityView,
  PracticeQualityReviews,
  PracticeQualityInspections,
  PracticeQualityReports,
  PracticeQMSList,
  PracticeQMSCreate,
  PracticeQMSView,
  PracticeLessonsLog,
  PracticeLessonDetail,
  PracticeConfigItemList,
  PracticeConfigItemCreate,
  PracticeConfigItemView,
  PracticeCMSList,
  PracticeCMSCreate,
  PracticeCMSView,
  PracticeCMSEdit,
  PracticeConfigMSList,
  PracticeConfigMSCreate,
  PracticeConfigMSView,
  PracticeConfigMSEdit,
  PracticeCheckpointReportList,
  PracticeCheckpointReportCreate,
  PracticeCheckpointReportView,
  PracticeHighlightReportList,
  PracticeHighlightReportCreate,
  PracticeHighlightReportView,
  PracticeExceptionReportList,
  PracticeExceptionReportCreate,
  PracticeExceptionReportView,
  PracticeEndStageReportList,
  PracticeEndStageReportCreate,
  PracticeEndStageReportView,
  PracticeEndProjectReportList,
  PracticeEndProjectReportCreate,
  PracticeEndProjectReportView,
  PracticeLessonsReportList,
  PracticeLessonsReportCreate,
  PracticeLessonsReportView,
  PracticeStartingUp,
  PracticeInitiating,
  PracticeControllingStage,
  PracticeManagingDelivery,
  PracticeStageBoundaries,
  PracticeClosingProject,
  PracticePortfolio,
  PracticePortfolioCreate,
  PracticeProgramme,
  PracticeProgrammeDashboardOverview,
  PracticeProgrammeProjectsPage,
  PracticeProgrammeDependenciesPage,
  PracticeProgrammeBenefitsPage,
  PracticeProgrammeTimelinePage,
  PracticeBenefitsAll,
  PracticeBenefitsRegister,
  PracticeBenefitsMeasurements,
  PracticeBenefitsRealization,
  PracticeBenefitsRedirectPage,
  PracticeProgrammeCreate,
  PracticeProgrammeDetail,
  PracticeDependencies,
  PracticeStakeholders,
  PracticeStakeholderRegisterPage,
  PracticeStakeholderAnalysis,
  PracticeEngagementPlanning,
  PracticeCommunicationPlans,
  PracticeStakeholderMonitoring,
  PracticeStakeholderSEAM,
  PracticeStakeholderAssessmentMatrixPage,
  PracticeStakeholdersAssessmentMatrixOnHold,
  PracticeEngagementActionsPage,
  PracticeSaliencePage,
  PracticeStakeholdersOnHold,
  PracticeStakeholderCreatePage,
  PracticeTeams,
  SimMyTeam,
  PracticeGovernance,
  SimPortfolioCategories,
  SimPortfolioDashboard,
  SimPortfolioProjects,
  SimPortfolioResources,
  SimPortfolioFinancial,
  SimPortfolioReports,
  SimPortfolioGovernance,
  SimulatorPMODashboard,
  SimManagerAssignments,
  SimPortfolioManagerAssignments,
  SimProgrammeManagerAssignments,
  SimManagerAssignmentSettings,
  SimulatorPMDashboard,
  SimulatorPMOLayout,
  SimulatorPMOInvitationTracker,
  SimulatorPMLayout,
  SimulatorTMLayout,
  SimulatorTMDashboard,
  SimVoiceCallsPage,
  SimulatorPMInvitationTracker,
  SimulatorPMOGovernanceMandateTemplate,
  SimulatorPMOGovernanceCMS,
  SimulatorPMOGovernanceConfigMS,
  SimulatorPMOGovernanceQMS,
  SimulatorPMOGovernanceRMS,
  SimulatorPMOInitiationBusinessCase,
  SimulatorPMOInitiationProjectBrief,
  SimulatorPMOInitiationBenefitsReviewPlan,
  SimulatorPMOOversightRiskRegister,
  SimulatorPMOOversightIssueRegister,
  SimulatorPMOOversightQualityRegister,
  SimulatorPMOOversightLessonsLog,
  SimulatorPMOReportingHighlight,
  SimulatorPMOReportingException,
  SimulatorPMOReportingEndStage,
  SimulatorPMOReportingEndProject,
  SimulatorPMOProcurementRFP,
  SimulatorPMORFPView,
  SimulatorPMORFPCreate,
  SimulatorPMORFPEdit,
  SimulatorPMORFPBulkImport,
  SimulatorPMORFPPrint,
  SimulatorPMORFPOnHold,
  SimulatorPMGovernanceMandateTemplate,
  SimulatorPMGovernanceCMS,
  SimulatorPMGovernanceConfigMS,
  SimulatorPMGovernanceQMS,
  SimulatorPMGovernanceRMS,
  SimulatorPMInitiationBusinessCase,
  SimulatorPMInitiationProjectBrief,
  SimulatorPMInitiationPID,
  SimulatorPMInitiationBenefitsReviewPlan,
  SimulatorPMDeliveryWorkPackages,
  SimulatorPMDeliveryProductDescription,
  SimulatorPMDeliveryProjectProductDescription,
  SimulatorPMDeliveryProductStatusAccount,
  SimulatorPMDeliveryDailyLog,
  SimulatorPMControlsRiskRegister,
  SimulatorPMControlsIssueRegister,
  SimulatorPMControlsQualityRegister,
  SimulatorPMControlsConfigItems,
  SimulatorPMControlsLessonsLog,
  SimulatorPMControlsWorkAuthorisation,
  SimulatorPMReportingCheckpoint,
  SimulatorPMReportingHighlight,
  SimulatorPMReportingIssueReports,
  SimulatorPMReportingException,
  SimulatorPMReportingEndStage,
  SimulatorPMClosureLessonsReport,
  SimulatorPMClosureEndProjectReport,
  ProjectBriefCreate,
  ProjectBriefView,
  ProjectBriefEdit,
  BriefList,
  BriefApprovalDashboard,
  DailyLogView,
  MyDailyLogEntries,
  LessonsLogView,
  LessonDetailView,
  CorporateLessonsLibrary,
  MyLessonActions,
  LessonsReport,
  LessonsReportCreate,
  LessonsReportEdit,
  LessonsReportView,
  LessonsReportsList,
  RiskRegisterView,
  DocumentationAdminList,
  DocumentationAdminEditor,
} from './routeCommon'


export function SimulatorRouteElements() {
  return (
    <>
                {/* Simulator Dashboard and App Routes */}
                <Route path="simulator/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimulatorDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/setup" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimulationSetup />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/team/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <TeamSeatsDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/team/claim" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <TeamSeatClaimPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/active/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimLiveRunRedirect suffix="dashboard" />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/active/inbox" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimLiveRunRedirect suffix="inbox" />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/active/evm" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimLiveRunRedirect suffix="evm" />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimulationRunDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/inbox" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEventInbox />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/stage-gate/:stageName" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimStageGateReview />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/exception" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimExceptionReportFlow />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/evm" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEVMDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/run/:runId/debrief" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimulationDebrief />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/runs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimulationRunHistory />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/local-data-extensions/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <SimulatorLocalDataExtensionsRoutes />
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/testing-centre/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <TestingCentreRoutesSim />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFOnHold />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef/bulk-upload" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFBulkUpload />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/eef/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimEEFDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/itto/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimITTOTemplateList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/itto/project" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectITTOList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/itto/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimITTODraftsQueue />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/delays" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimDelayRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/delays/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimDelayRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPAList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPACreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPAOnHold />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa/bulk-upload" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPABulkUpload />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPAEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/opa/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimOPADetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/copies/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectTemplateCopyCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/copies/:copyId/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectTemplateCopyEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/copies/:copyId/versions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectTemplateCopyVersionHistory />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/copies/:copyId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectTemplateCopyDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/manage" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateLibraryManage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/categories" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateCategories />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateOnHold />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/bulk-upload" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateBulkUpload />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/notifications" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateUpdateNotifications />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/project-copies" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectTemplateCopyList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/:id/versions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateMasterVersionHistory />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTemplateLibraryList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/messages" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <CommsHub />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/direct" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <DirectMessages />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/channel/:channelId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ChannelView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingSchedule />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings/summaries" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingSummaryView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings/:meetingId/room" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingRoom />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings/:meetingId/summary" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingSummaryView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings/:meetingId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/meetings" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/pending-review" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PendingAIReview />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/review/:meetingId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <MeetingExtractionReview />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/enrich/issue/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ExtractedIssueEnrich />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms/enrich/risk/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ExtractedRiskEnrich />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/comms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <CommsHub />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PWA manifest shortcut / legacy â€œscenario libraryâ€ URL â†’ practice projects */}
                <Route path="simulator/scenarios" element={<Navigate to="/simulator/practice-projects" replace />} />
                <Route path="simulator/pwa-settings" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PWASettings />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* v675: Simulator admin routes */}
                <Route path="simulator/admin/leaderboard" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><LeaderboardAdmin /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/admin/certificates" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><CertificateAdmin /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/admin/scenarios" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><ScenarioAdmin /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/admin/users" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><SimUserManagement /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                {/* v733: Documentation Manager (simulator) */}
                <Route path="simulator/admin/documentation" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><DocumentationAdminList /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/admin/documentation/new" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><DocumentationAdminEditor /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/admin/documentation/edit/:id" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><Layout><DocumentationAdminEditor /></Layout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/ai" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAIWorkspace />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* Simulator Strategy Routes (parity with Platform) */}
                <Route path="simulator/strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <Strategy />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/objectives" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicObjectives />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/alignment" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicAlignment />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/contribution" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicContribution />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/portfolio" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicPortfolio />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/portfolio/:portfolioId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicPortfolio />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/strategy/reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <StrategicReports />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* Simulator Mandate Routes (Practice/Learning) */}
                <Route path="simulator/mandates/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimMandateCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/mandates/list" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimMandateList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/mandates/:mandateId/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimMandateView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Projects Routes */}
                <Route path="simulator/practice-projects" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProjects />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProjectCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-project-members" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectMembers />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/industry-templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimIndustryTemplateBrowser />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/industry-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPracticeIndustryPlan />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/industry-plan/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimIndustryPlanCopy />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/industry-plan/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimIndustryPlanCopy />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/management-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimScopeManagementPlanPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/statement" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimScopeStatementPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/requirements" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimRequirementsRegisterPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/requirements/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimRequirementDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/requirements/:reqId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimRequirementDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/traceability" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTraceabilityMatrixPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scope/wbs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimWBSBuilderPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/management-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimScheduleManagementPlanPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/activities" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimActivityListPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/activities/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimActivityDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/activities/:actId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimActivityDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/dependencies" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimActivitySequencingPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/schedule/gantt" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimGanttChartPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/opa-templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ProjectOPATemplates />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/opa-templates/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ProjectOPACopy />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/opa-templates/:customisationId/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ProjectOPACopy />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/opa-templates/:customisationId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <ProjectOPACustomisationDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/costs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectCostManagement />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/budget-baseline" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectBudgetBaseline />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/evm" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectEVMPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/profitability" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectProfitability />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/metrics" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimSprintMetricsDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/story-map" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimStoryMap />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAgileTemplates />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/releases" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAgileReleases />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/releases/:releaseId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAgileReleaseDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/roadmap" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAgileRoadmap />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/scrum/scrum-of-scrums" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimScrumOfScrums />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/xp/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimXPDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/lean/value-stream-map" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimValueStreamMap />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/lean/kaizen" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimKaizenBoard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/lean/metrics" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimLeanMetrics />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/agile/metrics" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimAgileMetricsHub />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/kanban/metrics" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimKanbanMetrics />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/plans/stage-plan/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimStagePlanCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/plans/project-plan/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectPlanCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/plans/project-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProjectPlanView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:projectId/plans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPlansDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-projects/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProjectDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-tasks" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeTasks />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-tasks/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeTaskDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Briefs Routes */}
                <Route path="simulator/practice-briefs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBriefList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-briefs/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBriefCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-briefs/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBriefView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-briefs/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBriefEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Business Cases Routes */}
                <Route path="simulator/practice-business-cases" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBusinessCaseList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-business-cases/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBusinessCaseCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-business-cases/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBusinessCaseView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-business-cases/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBusinessCaseEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Benefits Review Plans (list + create + view by id) */}
                <Route path="simulator/practice-benefits-review-plans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsReviewPlanList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-benefits-review-plans/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsReviewPlan />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-benefits-review-plans/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsReviewPlanViewPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-benefits-review-plans/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsReviewPlanEditPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice PIDs Routes */}
                <Route path="simulator/practice-pids" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePIDList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-pids/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePIDCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-pids/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePIDView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator Benefits section: Create, All, Register, Measurements, Realization, view/edit by id */}
                <Route path="simulator/benefits/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <PracticeBenefitsRedirectPage />
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <PracticeBenefitsRedirectPage />
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <PracticeBenefitsRedirectPage />
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits/register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits/measurements" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsMeasurements />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits/realization" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsRealization />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/benefits" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsAll />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* Practice Benefits Routes */}
                <Route path="simulator/practice-benefits" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeBenefitsReviewPlan />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Work Packages Routes */}
                <Route path="simulator/practice-work-packages" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeWorkPackageList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-work-packages/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeWorkPackageCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-work-packages/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeWorkPackageView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-work-packages/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeWorkPackageEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Product Descriptions Routes */}
                <Route path="simulator/practice-product-descriptions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProductDescriptionList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-product-descriptions/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProductDescriptionCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-product-descriptions/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProductDescriptionView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice PPDs Routes */}
                <Route path="simulator/practice-ppds" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePPDList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-ppds/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePPDView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice PSAs Routes */}
                <Route path="simulator/practice-psas" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePSAList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-psas/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePSAView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Plans Routes */}
                <Route path="simulator/practice-plans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePlanList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-plans/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePlanCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-plans/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePlanView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-plans/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePlanEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Daily Log Routes */}
                <Route path="simulator/practice-daily-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDailyLog />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-daily-log/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDailyLogEntry />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Risk Register Routes */}
                <Route path="simulator/practice-risk-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeRiskRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-risk-register/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeRiskDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice RMS Routes */}
                <Route path="simulator/practice-rms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeRMSList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-rms/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeRMSCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-rms/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeRMSView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Issue Register Routes */}
                <Route path="simulator/practice-issue-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeIssueRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-issue-register/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeIssueDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Issue Reports Routes */}
                <Route path="simulator/practice-issue-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeIssueReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-issue-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeIssueReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-issue-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeIssueReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Quality Register Routes */}
                <Route path="simulator/practice-quality-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQualityRegister />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-quality-activity/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQualityActivityView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-quality-reviews" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQualityReviews />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-quality-inspections" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQualityInspections />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-quality-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQualityReports />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice QMS Routes */}
                <Route path="simulator/practice-qms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQMSList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-qms/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQMSCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-qms/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeQMSView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Lessons Log Routes */}
                <Route path="simulator/practice-lessons-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeLessonsLog />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-lessons-log/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeLessonDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Config Items Routes */}
                <Route path="simulator/practice-config-items" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigItemList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-config-items/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigItemCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-config-items/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigItemView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice CMS Routes */}
                <Route path="simulator/practice-cms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCMSList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-cms/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCMSCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-cms/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCMSView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-cms/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCMSEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Config MS Routes */}
                <Route path="simulator/practice-config-ms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigMSList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-config-ms/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigMSCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-config-ms/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigMSView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-config-ms/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeConfigMSEdit />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Checkpoint Reports Routes */}
                <Route path="simulator/practice-checkpoint-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCheckpointReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-checkpoint-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCheckpointReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-checkpoint-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCheckpointReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Highlight Reports Routes */}
                <Route path="simulator/practice-highlight-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeHighlightReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-highlight-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeHighlightReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-highlight-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeHighlightReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Exception Reports Routes */}
                <Route path="simulator/practice-exception-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeExceptionReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-exception-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeExceptionReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-exception-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeExceptionReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice End Stage Reports Routes */}
                <Route path="simulator/practice-end-stage-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndStageReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-end-stage-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndStageReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-end-stage-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndStageReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice End Project Reports Routes */}
                <Route path="simulator/practice-end-project-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndProjectReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-end-project-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndProjectReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-end-project-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEndProjectReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Lessons Reports Routes */}
                <Route path="simulator/practice-lessons-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeLessonsReportList />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-lessons-reports/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeLessonsReportCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-lessons-reports/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeLessonsReportView />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Lifecycle Routes */}
                <Route path="simulator/practice-starting-up" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStartingUp />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-initiating" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeInitiating />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-controlling-stage" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeControllingStage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-managing-delivery" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeManagingDelivery />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stage-boundaries" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStageBoundaries />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-closing-project" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeClosingProject />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Practice Portfolio & Governance Routes */}
                <Route path="simulator/practice-portfolio" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePortfolio />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticePortfolioCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/categories" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioCategories />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/projects" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioProjects />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/resources" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioResources />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/financial" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioFinancial />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/evm" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioEVMPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioReports />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-portfolio/governance" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimPortfolioGovernance />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeDashboardOverview />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/projects" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeProjectsPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/dependencies" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeDependenciesPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/benefits" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeBenefitsPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/timeline" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeTimelinePage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgramme />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/:programmeId/evm" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProgrammeEVMPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/:programmeId/financial" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimProgrammeFinancialDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-programme/:programmeId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeProgrammeDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-dependencies" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDependencies />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-dependencies/inter-project" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDependencies />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-dependencies/map" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDependencies />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-dependencies/impact" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeDependencies />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestDashboard />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/suites" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestSuites />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/suites/:suiteId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestSuiteDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/cases" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestCases />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/cases/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestCaseCreate />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/cases/:caseId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestCaseDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/import" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestCaseBulkUpload />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/runs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestRuns />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/runs/:runId/execute" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestRunExecute />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/runs/:runId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimTestRunDetail />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/defects/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimDefectDashboardPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/defects/:defectId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimDefectDetailPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-testing/defects" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimDefectListPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <Navigate to="/simulator/practice-stakeholders/register" replace />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholderRegisterPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholderCreatePage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/analysis" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholderAnalysis />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/engagement" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEngagementPlanning />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/communications" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeCommunicationPlans />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/monitoring" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholderMonitoring />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/seam" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Navigate to="/simulator/practice-stakeholders/assessment-matrix" replace />
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/assessment-matrix" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholderAssessmentMatrixPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/assessment-matrix/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholdersAssessmentMatrixOnHold />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/engagement-actions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeEngagementActionsPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/salience" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeSaliencePage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-stakeholders/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeStakeholdersOnHold />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-teams" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeTeams />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-teams/my-team" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimMyTeam />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/practice-governance" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <PracticeGovernance />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/financial-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimFinancialReportingHub />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/expenses/my" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimMyExpenses />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/expenses/approvals" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <Layout>
                            <SimExpenseApproval />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Dashboard Routes */}
                <Route path="simulator/pmo/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMODashboard />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/invitation-tracker" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOInvitationTracker />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/invitation-tracker/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <InvitationDetailPage />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/field-templates/*" element={<SimPmoFederated />} />
                <Route path="simulator/pmo/template-library/*" element={<SimPmoTemplateLibraryFederated />} />
                <Route path="simulator/pmo/organisational-templates/*" element={<SimPmoOrganisationalTemplatesFederated />} />
                <Route path="simulator/pmo/forms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <FormTemplateAdmin mode="sim" />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/forms/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <FormTemplateBuilder mode="sim" />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/forms/:templateCode/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <FormTemplateBuilder mode="sim" />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/testing-centre/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <TestingCentreRoutesSimPmo />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/process-templates/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <ProcessTemplatesRoutesSimPmo />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/manager-assignments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimManagerAssignments />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/appointments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimAppointmentDashboard />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/my-appointments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimMyAppointments />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/app/team-appointments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimTeamAppointmentDashboard />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/my-team-appointments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimMyTeamAppointments />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/manager-assignment-settings" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimManagerAssignmentSettings />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/expense-thresholds" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimExpenseApprovalThresholds />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/itto/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimITTOTemplateList />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/itto/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimITTODraftsQueue />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/oversight/delays" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimDelayRegister />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/delays/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimDelayTemplates />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Dashboard Routes */}
                <Route path="simulator/pm/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDashboard />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/invitation-tracker" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMInvitationTracker />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/invitation-tracker/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <InvitationDetailPage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/portfolio-manager/assignments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimPortfolioManagerAssignments />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/programme-manager/assignments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimProgrammeManagerAssignments />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/testing-centre/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <TestingCentreRoutesSimPm />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/process-templates/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <ProcessTemplatesRoutesSimPm />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/projects/:projectId/forms" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><FormsGallery mode="sim" basePath="/simulator/pm/projects" /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/pm/projects/:projectId/field-templates" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><ProjectFieldTemplates /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/pm/projects/:projectId/forms/:templateCode/new" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><FormNew mode="sim" basePath="/simulator/pm/projects" /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/pm/projects/:projectId/forms/:formInstanceId/edit" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><FormEdit mode="sim" /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/pm/projects/:projectId/forms/:formInstanceId/view" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><FormView mode="sim" /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
                <Route path="simulator/pm/itto/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimITTOTemplateList />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/itto/project" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimProjectITTOList />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/itto/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimITTODraftsQueue />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delays" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimDelayRegister />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delays/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimDelayRegister />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <PlanningHub />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/intelligence" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <PlanningIntelligenceDashboard />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/scenarios" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <ScenarioList />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/pbs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <PBSBuilder />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/health" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <PlanHealthDashboard />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/ai" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <AIPlanGenerator />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/executive" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <ExecutivePlanView />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/recovery" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <RecoveryPlanningView />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/confidence" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <ConfidenceForecastView />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/governance" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <GovernanceGateChecklist />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/microplans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <MicroPlanList />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/microplans/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <MicroPlanDraftQueue />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/planning/microplans/:microPlanId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <MicroPlanDetail />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Governance Routes */}
                <Route path="simulator/pmo/governance/mandate" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOGovernanceMandateTemplate />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/governance/communication-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOGovernanceCMS />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/governance/configuration-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOGovernanceConfigMS />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/governance/quality-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOGovernanceQMS />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/governance/risk-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOGovernanceRMS />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Initiation Routes */}
                <Route path="simulator/pmo/initiation/business-case" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOInitiationBusinessCase />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/initiation/project-brief" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOInitiationProjectBrief />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/initiation/benefits-review-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOInitiationBenefitsReviewPlan />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Oversight Routes */}
                <Route path="simulator/pmo/oversight/risk-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOOversightRiskRegister />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/oversight/issue-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOOversightIssueRegister />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/registers/changes" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOOversightIssueRegister />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/oversight/quality-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOOversightQualityRegister />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/oversight/lessons-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOOversightLessonsLog />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Reporting Routes */}
                <Route path="simulator/pmo/reporting/highlight-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOReportingHighlight />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/reporting/exception-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOReportingException />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/reporting/end-stage-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOReportingEndStage />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/reporting/end-project-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOReportingEndProject />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PMO Procurement (RFP) Routes */}
                <Route path="simulator/pmo/procurement/rfp" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMOProcurementRFP />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMORFPCreate />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/:id/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMORFPView />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMORFPEdit />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/:id/import" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMORFPBulkImport />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/:id/print" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorPMORFPPrint />
                      </ProtectedRoute>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pmo/rfp/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMOLayout>
                            <SimulatorPMORFPOnHold />
                          </SimulatorPMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Governance Routes */}
                <Route path="simulator/pm/governance/mandate" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMGovernanceMandateTemplate />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/governance/communication-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMGovernanceCMS />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/governance/configuration-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMGovernanceConfigMS />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/governance/quality-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMGovernanceQMS />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/governance/risk-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMGovernanceRMS />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Initiation Routes */}
                <Route path="simulator/pm/initiation/business-case" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMInitiationBusinessCase />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/initiation/project-brief" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMInitiationProjectBrief />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/initiation/pid" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMInitiationPID />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/initiation/benefits-review-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMInitiationBenefitsReviewPlan />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Delivery Routes */}
                <Route path="simulator/pm/delivery/work-packages" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDeliveryWorkPackages />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delivery/product-description" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDeliveryProductDescription />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delivery/project-product-description" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDeliveryProjectProductDescription />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delivery/product-status-account" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDeliveryProductStatusAccount />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/delivery/daily-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMDeliveryDailyLog />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Controls Routes */}
                <Route path="simulator/pm/controls/risk-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsRiskRegister />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/issue-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsIssueRegister />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/quality-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsQualityRegister />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/configuration-items" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsConfigItems />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/lessons-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsLessonsLog />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/work-authorisations/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <WorkAuthorisationDraftsPage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/work-authorisations/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <WorkAuthorisationCreatePage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/work-authorisations/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <WorkAuthorisationCreatePage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/work-authorisations/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <WorkAuthorisationDetailPage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/controls/work-authorisations" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMControlsWorkAuthorisation />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Reporting Routes */}
                <Route path="simulator/pm/reporting/checkpoint-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMReportingCheckpoint />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/reporting/highlight-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMReportingHighlight />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/reporting/issue-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMReportingIssueReports />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/reporting/exception-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMReportingException />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/reporting/end-stage-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMReportingEndStage />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator PM Closure Routes */}
                <Route path="simulator/pm/closure/lessons-report" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMClosureLessonsReport />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/pm/closure/end-project-report" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute requiredPlatform="simulator">
                          <SimulatorPMLayout>
                            <SimulatorPMClosureEndProjectReport />
                          </SimulatorPMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                <Route path="auth/confirm-email" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <EmailConfirmation />
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* Short clean URL for new invitation emails: /i/{token} */}
                <Route path="i/:token" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <InvitationAccept />
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* Legacy routes kept for older invitation emails */}
                <Route path="auth/invitation/:projectSlug/:roleSlug/:token" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <InvitationAccept />
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="auth/invitation/:projectSlug/:roleSlug" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <InvitationAccept />
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="role-selection" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ProtectedRoute>
                        <RoleSelection />
                      </ProtectedRoute>
                    </ThemeProvider>
                  </Suspense>
                } />
                {V734RoleRouteElements()}
    </>
  )
}
