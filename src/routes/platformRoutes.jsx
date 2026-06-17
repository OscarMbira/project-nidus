/** Platform routes — extracted from App.jsx (v729 Option B) */
import { Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'
import AppToPlatformRedirect from '../components/AppToPlatformRedirect'
import { PmisGapRouteElements } from '../modules/pmis-gaps/routes/PmisGapRoutes.jsx'
import { RecordLifecycleRouteElements } from '../modules/record-lifecycle/routes/RecordLifecycleRoutes.jsx'
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
  FormNew,
  FormEdit,
  FormView,
  FormTemplateAdmin,
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
  RiskRegisterView
} from './routeCommon'


export function PlatformRouteElements() {
  return (
    <>
                {/* Platform App routes with providers - lazy loaded */}
                <Route path="platform/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Routes>
                              <Route path="dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PlatformDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="org-knowledge" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrgKnowledgeHub />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFBulkUpload />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="eef/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EEFDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="itto/templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ITTOTemplateList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="itto/project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectITTOList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="itto/drafts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ITTODraftsQueue />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="industry-templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IndustryTemplateBrowser />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/industry-plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectIndustryPlanView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/industry-plan/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IndustryPlanCopyWizard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/industry-plan/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IndustryPlanCopyWizard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="delays" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DelayRegister />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="delays/drafts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DelayRegister />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPAList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPACreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Alias: DB menu items seeded with /create before the path was standardised to /new */}
                              <Route path="opa/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPACreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPAOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPABulkUpload />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPAEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="opa/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OPADetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/copies/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplateCopyCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/copies/:copyId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplateCopyEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/copies/:copyId/versions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplateCopyVersionHistory />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/copies/:copyId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplateCopyDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/manage" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateLibraryManage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateCategories />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateBulkUpload />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/notifications" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateUpdateNotifications />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/project-copies" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplateCopyList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/:id/versions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateMasterVersionHistory />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TemplateLibraryList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/messages" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommsHub />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/direct" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DirectMessages />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/channel/:channelId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ChannelView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingSchedule />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings/summaries" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingSummaryView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings/:meetingId/room" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingRoom />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings/:meetingId/summary" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingSummaryView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings/:meetingId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/meetings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/pending-review" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PendingAIReview />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/review/:meetingId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingExtractionReview />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/enrich/issue/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExtractedIssueEnrich />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms/enrich/risk/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExtractedRiskEnrich />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="comms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommsHub />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="ai" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AIWorkspace />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Teams />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Teams />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Teams />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/my-team" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyTeam />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Governance />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentGovernance />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentRegister />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance/register/:projectId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentRegister />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance/compliance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentCompliance />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance/programme" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeDocuments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="document-governance/programme/:programmeId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeDocuments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Portfolio />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/edit/:portfolioId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/projects" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioProjects />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/resources" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioResources />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/financial" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioFinancial />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/evm" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioEVMPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioReports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="portfolio/governance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioGovernance />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Programme />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeEditPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeDashboardOverview />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/projects" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeProjectsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/dependencies" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeDependenciesPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/benefits" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeBenefitsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/timeline" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeTimelinePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeReportsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/evm" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeEVMLandingPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/:id/evm" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeEVMPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/:id/financial" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeFinancialDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Strategy />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/objectives" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicObjectives />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/alignment" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicAlignment />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/contribution" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicContribution />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/portfolio" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicPortfolio />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/portfolio/:portfolioId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicPortfolio />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="strategy/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StrategicReports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Quality />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality-management" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality/reviews" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityReviews />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality/inspections" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityInspections />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityReports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality/activity/:identifier" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityActivityView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="my-quality-actions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyQualityActions />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Navigate to="/platform/stakeholders/register" replace />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderRegisterPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/register/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/register/view/:stakeholderId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderProfilePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/register/edit/:stakeholderId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholdersOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/analysis" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAnalysisPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/assessment-matrix" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAssessmentMatrixPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/assessment-matrix/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholdersAssessmentMatrixOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/engagement" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderEngagementPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communications" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationPlanPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/monitoring" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderMonitoringPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/suites" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestSuites />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/suites/:suiteId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestSuiteDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/cases" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestCases />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/cases/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestCaseCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/cases/:caseId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestCaseDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/import" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestCaseBulkUpload />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/runs" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestRuns />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/runs/:runId/execute" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestRunExecute />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/runs/:runId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestRunDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/defects/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DefectDashboardPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/defects/:defectId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DefectDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/defects" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DefectListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Organisation Settings â€“ Branding (pmo_admin / super_admin) */}
                              <Route path="organisation/branding" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BrandingSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="organisation/colours" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BrandingSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="organisation/typography" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BrandingSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="organisation/branding-history" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BrandingHistory />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PMOAdmin />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/users" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LP.PmoAdminUserManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/issue-scales" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueScaleConfig />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/project-types" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTypes />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/project-statuses" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectStatuses />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/funding-sources" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FundingSources />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/portfolio-categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioCategories />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/budget-categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BudgetCategories />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/manager-assignments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManagerAssignments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/appointments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AppointmentDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="my-appointments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyAppointments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="app/team-appointments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TeamAppointmentDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="my-team-appointments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyTeamAppointments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/manager-assignment-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManagerAssignmentSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/expense-thresholds" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExpenseApprovalThresholds />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/lifecycle-templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LifecycleTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/cms-templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CMSTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/draft-expiry-config" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DraftExpiryConfig />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Reports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="financial-reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FinancialReportingHub />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="expenses/my" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyExpenses />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="expenses/approvals" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExpenseApproval />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="home" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <Home />
                                </Suspense>
                              } />
                              <Route path="projects" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Projects />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Alias route for /projects/new (same as /projects/create) */}
                              <Route path="projects/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/templates/*" element={<RedirectProjectsTemplatesToLibrary />} />
                              <Route path="projects/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/invite" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectMemberInvitation />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/costs" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCostManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/budget-baseline" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBudgetBaseline />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/evm" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsEVMLandingPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/evm" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectEVMPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/profitability" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectProfitability />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Draft Queue / On Hold Routes */}
                              <Route path="projects/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectsOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-members" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectUsers />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Alias: same page (many menus/links use project-users) */}
                              <Route path="project-users" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectUsers />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitsOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssuesOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="risks/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RisksOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="quality/on-hold" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QualityOnHold />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/daily-log" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DailyLogView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/daily-log/entry/:entryId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DailyLogView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="daily-log/my-entries" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyDailyLogEntries />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Lessons Log routes */}
                              <Route path="projects/:projectId/lessons" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsLogView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/:lessonId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonDetailView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/report" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReport />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReportsList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="lessons/corporate" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CorporateLessonsLibrary />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="lessons/my-actions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyLessonActions />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Plan Documentation routes */}
                              <Route path="projects/:projectId/plans" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PlansDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/project-plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectPlanViewPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/project-plan/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectPlanCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/project-plan/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectPlanEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/stage-plan/:stagePlanId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StagePlanViewPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/stage-plan/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StagePlanCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/plans/stage-plan/:stagePlanId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StagePlanEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Product Description routes */}
                              <Route path="projects/:projectId/opa-templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectOPATemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/opa-templates/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectOPACopy />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/opa-templates/:customisationId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectOPACopy />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/opa-templates/:customisationId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectOPACustomisationDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-descriptions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductDescriptionList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-descriptions/:pdId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductDescriptionViewPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-descriptions/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductDescriptionCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-descriptions/:pdId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductDescriptionEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-status-accounts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductStatusAccountList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-status-accounts/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductStatusAccountDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-status-accounts/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductStatusAccountCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-status-accounts/:psaId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductStatusAccountViewPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/product-status-accounts/:psaId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductStatusAccountEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/my-actions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyIssueActions />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/pending-decisions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PendingDecisions />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="tasks" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Tasks />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="tasks/board" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TasksBoard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="tasks/calendar" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TasksCalendar />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="tasks/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TasksCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="tasks/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TasksDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="profile" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Settings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Settings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pwa-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PWASettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="methodology/select" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MethodologySelection />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="methodology/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MethodologyDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/starting-up" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StartingUpProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/initiating" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <InitiatingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/stage-gates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StageGates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/controlling" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ControllingStage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/managing-delivery" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManagingProductDelivery />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="structured/directing" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DirectingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project Mandate Routes */}
                              <Route path="mandates/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectMandateCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="mandates/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MandateList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="mandates/unlinked" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <UnlinkedMandatesList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="mandates/:mandateId/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectMandateView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="mandates/:mandateId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectMandateEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="mandates/:mandateId/create-project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCreationWizard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project-linked mandate route */}
                              <Route path="projects/:projectId/mandate/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectMandateView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Approval routes */}
                              <Route path="mandates/approvals" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MandateApprovalDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project Brief Routes */}
                              <Route path="projects/:projectId/brief/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBriefCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/brief/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBriefView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/brief/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBriefEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* CMS Routes */}
                              <Route path="projects/:projectId/cms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/cms/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CMSCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/cms/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CMSEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/cms/activities" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationActivitiesCalendar />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Configuration MS Routes */}
                              <Route path="projects/:projectId/configuration-ms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-ms/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationMSCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-ms/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationMSEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Configuration Item Record Routes */}
                              <Route path="projects/:projectId/configuration-items" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemRegister />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-items/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemRecordCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-items/:itemId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemRecordView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-items/:itemId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemRecordEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="briefs/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BriefList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="briefs/approvals" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BriefApprovalDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="ppd/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PPDList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="qms/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QMSList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="rms/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RMSList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="qms/templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QMSTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="qms/templates/:templateId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QMSTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/product-description-templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductDescriptionTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="cms/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CMSList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="configuration-ms/list" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationMSList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Issues />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueRegisterView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/:issueId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueDetailView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/:issueId/reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/:issueId/reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/:issueId/reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueReportsList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="issues/analytics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueAnalytics />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="ppd" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PPDView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project Initiation Document (PID) Routes */}
                              <Route path="projects/:projectId/pid" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PIDView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project-scoped URLs (code or UUID) â€” same screens as top-level routes */}
                              <Route path="projects/:projectId/structured/starting-up" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StartingUpProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/structured/initiating" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <InitiatingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/structured/stage-gates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StageGates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/structured/controlling" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ControllingStage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/structured/managing-delivery" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManagingProductDelivery />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/structured/directing" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DirectingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/ppd" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PPDView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/qms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/rms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/issues" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Issues />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/issues/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IssueRegisterView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/risks" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Risks />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/raid-log" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RAIDLog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/product-backlog" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductBacklog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/sprint-planning" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintPlanning />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/sprint/:sprintId/board" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintBoard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/sprint/:sprintId/daily-scrum" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DailyScrum />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/sprint/:sprintId/review" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintReview />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/sprint/:sprintId/retrospective" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintRetrospective />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/metrics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintMetricsDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/story-map" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StoryMap />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/templates" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AgileTemplates />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/releases" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AgileReleases />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/releases/:releaseId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AgileReleaseDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/roadmap" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AgileRoadmap />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scrum/scrum-of-scrums" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScrumOfScrums />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/xp/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <XPDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lean/value-stream-map" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ValueStreamMap />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lean/kaizen" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <KaizenBoard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lean/metrics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LeanMetrics />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/agile/metrics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AgileMetricsHub />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/kanban/metrics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MetricsDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/kanban" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <KanbanBoards />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/work-packages/:wpId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkPackageView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/work-packages/:workPackageId/checkpoint-reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/work-packages/:workPackageId/checkpoint-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/work-packages/:workPackageId/checkpoint-reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/work-packages/:workPackageId/checkpoint-reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Stage Boundaries Routes */}
                              <Route path="projects/:projectId/stage-boundaries" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StageBoundaries />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* End Stage Report Routes */}
                              <Route path="projects/:projectId/stage-boundaries/end-stage-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndStageReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/stage-boundaries/end-stage-reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndStageReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/stage-boundaries/end-stage-reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndStageReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Exception Report Routes */}
                              <Route path="projects/:projectId/exception-reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/exception-reports/dashboard" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/exception-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/exception-reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/exception-reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/exceptions/:exceptionId/report" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExceptionReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Highlight Report Routes */}
                              <Route path="projects/:projectId/highlight-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <HighlightReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/highlight-reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <HighlightReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/highlight-reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <HighlightReportEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* PM planning â€” scope & schedule */}
                              <Route path="projects/:projectId/scope/management-plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScopeManagementPlanPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/statement" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScopeStatementPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/requirements" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RequirementsRegisterPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/requirements/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RequirementDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/requirements/:reqId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RequirementDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/traceability" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TraceabilityMatrixPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/scope/wbs" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WBSBuilderPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/management-plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScheduleManagementPlanPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/activities" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ActivityListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/activities/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ActivityDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/activities/:actId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ActivityDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/dependencies" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ActivitySequencingPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/schedule/gantt" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GanttChartPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* End Project Report Routes */}
                              <Route path="projects/:projectId/closure" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ClosingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/end-project-report/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndProjectReportWizard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/end-project-report/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndProjectReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/end-project-report/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EndProjectReportWizard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/end-project-report/:reportId/compare" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EPRComparisonView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="ppd/acceptance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AcceptanceTestingPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="qms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <QMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="rms" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RMSView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="risks" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Risks />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="risks/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskRegisterView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="risks/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="raid-log" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RAIDLog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/product-backlog" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProductBacklog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/sprint-planning" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintPlanning />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/sprint-board" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintBoard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/daily-scrum" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DailyScrum />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/sprint-review" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintReview />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scrum/sprint-retrospective" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SprintRetrospective />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="kanban/boards" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <KanbanBoards />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="kanban/board/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <KanbanBoard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="kanban/metrics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MetricsDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Resources />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/capacity" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceCapacity />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/conflicts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceConflicts />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Reports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports/builder" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ReportBuilder />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="analytics" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AnalyticsDashboard />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Benefits />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitsRegisterPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/measurements" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitMeasurementsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/realization" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitsRealizationPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/benefits/review-plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitsReviewPlan />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Dependencies />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DependencyCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies/inter-project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Dependencies />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies/map" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DependencyMap />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies/impact" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DependencyImpacts />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="integrations" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <IntegrationSync />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/role-assignment" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RoleAssignment />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/assign-roles-to-projects" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssignRolesToProjects />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/send-role-invites" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SendRoleInvites />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/invitation-tracker" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PMOInvitationTracker />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/invitation-tracker/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <InvitationDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="invitation-tracker" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PMInvitationTracker />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="invitation-tracker/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <InvitationDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/invitation-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <InvitationExpirySettingsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/email-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EmailSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/email-sender-profiles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EmailSenderProfiles />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="change-log" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ChangeLogPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="work-authorisations" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkAuthorisationListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="work-authorisations/drafts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkAuthorisationDraftsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="work-authorisations/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkAuthorisationCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="work-authorisations/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkAuthorisationCreatePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="work-authorisations/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkAuthorisationDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing-centre/*" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestingCentreRoutesPlatform />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/forms" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><FormsGallery mode="platform" basePath="/platform/projects" /></ProtectedRoute></Suspense>} />
                              <Route path="projects/:projectId/forms/:templateCode/new" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><FormNew mode="platform" basePath="/platform/projects" /></ProtectedRoute></Suspense>} />
                              <Route path="projects/:projectId/forms/:formInstanceId/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><FormEdit mode="platform" /></ProtectedRoute></Suspense>} />
                              <Route path="projects/:projectId/forms/:formInstanceId/view" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><FormView mode="platform" /></ProtectedRoute></Suspense>} />
                              <Route path="admin/form-templates" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><FormTemplateAdmin mode="platform" /></ProtectedRoute></Suspense>} />
                              <Route path="pmo/role-menu-access" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PMORoleMenuManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/role-menu-access" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AdminRoleMenuManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
      
                              {/* v675: new admin routes */}
                              <Route path="admin/authentication-settings" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><AuthenticationSettings /></ProtectedRoute></Suspense>} />
                              <Route path="admin/security-settings" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SecuritySettings /></ProtectedRoute></Suspense>} />
                              <Route path="admin/pwa-settings-v2" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PWASettingsV675 /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Executive Dashboard */}
                              <Route path="platform/executive/dashboard" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><ExecutiveDashboard /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Subscription */}
                              <Route path="platform/subscription" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="platform/subscription/upgrade" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="platform/subscription/billing-history" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="platform/subscription/payment-methods" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Organisation Profile */}
                              <Route path="platform/organisation/profile" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><OrganisationProfile /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Stage Gate Reviews */}
                              <Route path="platform/stage-gates" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateList /></ProtectedRoute></Suspense>} />
                              <Route path="platform/stage-gates/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateForm /></ProtectedRoute></Suspense>} />
                              <Route path="platform/stage-gates/:id" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateView /></ProtectedRoute></Suspense>} />
                              <Route path="platform/stage-gates/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateForm /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Governance Framework */}
                              <Route path="platform/governance/framework" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkList /></ProtectedRoute></Suspense>} />
                              <Route path="platform/governance/framework/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkForm /></ProtectedRoute></Suspense>} />
                              <Route path="platform/governance/framework/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkForm /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Policies & Compliance */}
                              <Route path="platform/governance/policies" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceList /></ProtectedRoute></Suspense>} />
                              <Route path="platform/governance/policies/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceForm /></ProtectedRoute></Suspense>} />
                              <Route path="platform/governance/policies/:id" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceView /></ProtectedRoute></Suspense>} />
                              <Route path="platform/governance/policies/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceForm /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Intelligence & Governance Rules */}
                              <Route path="pmo/planning/intelligence-rules" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><IntelligenceRulesPage /></ProtectedRoute></Suspense>} />
                              <Route path="pmo/planning/governance-rules" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceRulesConfigPage /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Custom Metrics */}
                              <Route path="platform/analytics/custom-metrics" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><CustomMetricsPage /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Workstream Plans */}
                              <Route path="platform/workstream-plans" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanList /></ProtectedRoute></Suspense>} />
                              <Route path="platform/workstream-plans/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanForm /></ProtectedRoute></Suspense>} />
                              <Route path="platform/workstream-plans/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanForm /></ProtectedRoute></Suspense>} />
      
                            </Routes>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/*
                  Canonical app-area URL for Project Members (menu + SQL use /app/project-members).
                  Must be declared before app/* so it is not swallowed by AppToPlatformRedirect.
                  /platform/project-members and /platform/project-users are first-class aliases (same page).
                */}
                <Route path="app/project-members" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <ProjectUsers />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="app/invitation-tracker" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <PMInvitationTracker />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="app/invitation-tracker/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <InvitationDetailPage />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="app/project-users" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <ProjectUsers />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                <Route path="app/settings/invitation-templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <InvitationTemplatesPage />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                <Route path="app/local-data-extensions/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <LocalDataExtensionsRoutes />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      

                {/* Backward Compatibility: Redirect other old /app/* paths to /platform/* */}
                <Route path="app/*" element={<AppToPlatformRedirect />} />
      

                {/* PMO Dashboard - redirect to unified platform dashboard */}
                <Route path="pmo/dashboard" element={<Navigate to="/platform/dashboard" replace />} />
                <Route path="pmo/testing-centre/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <TestingCentreRoutesPmo />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/process-templates/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ProcessTemplatesRoutesPmo />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/itto/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ITTOTemplateList />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/itto/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ITTODraftsQueue />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/industry-templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <IndustryTemplateList />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/invitation-tracker" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOInvitationTracker />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/invitation-tracker/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <InvitationDetailPage />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/industry-templates/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <IndustryTemplateForm />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/industry-templates/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <IndustryTemplateOnHold />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/industry-templates/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <IndustryTemplateForm />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/industry-templates/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <IndustryTemplateDetail />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/planning" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PlanningHub />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/planning/collisions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PortfolioCollisionDashboard />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/planning/intelligence" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PlanningIntelligenceDashboard />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/planning/governance-config" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <GovernanceGateChecklist />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PMO Governance Routes */}
                <Route path="pmo/governance/mandate" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOGovernanceMandateTemplate />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PMO Mandate CRUD Routes - maintains PMO sidebar context */}
                <Route path="pmo/mandates/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ProjectMandateCreate />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/mandates/:mandateId/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ProjectMandateView />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/mandates/:mandateId/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <ProjectMandateEdit />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/mandates/approvals" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <MandateApprovalDashboard />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/governance/communication-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOGovernanceCMS />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/governance/configuration-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOGovernanceConfigMS />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/governance/quality-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOGovernanceQMS />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/governance/risk-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOGovernanceRMS />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PMO Initiation Routes */}
                <Route path="pmo/initiation/business-case" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <BusinessCaseListPage />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/initiation/business-case/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <BusinessCaseCreate />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/initiation/business-case/:id/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <BusinessCaseViewPage />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/initiation/business-case/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <BusinessCaseEdit />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/initiation/project-brief" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOInitiationProjectBrief />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/initiation/benefits-review-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOInitiationBenefitsReviewPlan />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PMO Oversight Routes */}
                <Route path="pmo/oversight/risk-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightRiskRegister />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/issue-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightIssueRegister />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/registers/changes" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightChangeRegister />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/quality-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightQualityRegister />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/lessons-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightLessonsLog />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/scope" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightScope />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/schedules" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOOversightSchedules />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/oversight/delays" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <DelayRegister />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/delays/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <DelayTemplates />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PMO Reporting Routes */}
                <Route path="pmo/reporting/highlight-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOReportingHighlight />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/reporting/exception-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOReportingException />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/reporting/end-stage-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOReportingEndStage />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/reporting/end-project-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOReportingEndProject />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/procurement/rfp" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMOProcurementRFP />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMORFPCreate />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/:id/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMORFPView />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMORFPEdit />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/:id/print" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ProtectedRoute>
                        <PMORFPPrint />
                      </ProtectedRoute>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/:id/import" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMORFPBulkImport />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/rfp/on-hold" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <PMORFPOnHold />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pmo/forms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <FormTemplateAdmin mode="platform" />
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* PM Dashboard Routes */}
                <Route path="pm/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDashboard />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/team-members" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ProjectUsers />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/invitation-tracker" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMInvitationTracker />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/invitation-tracker/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <InvitationDetailPage />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/profile" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <Settings />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/portfolio-manager/assignments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PortfolioManagerAssignments />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/programme-manager/assignments" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ProgrammeManagerAssignments />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/industry-templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <IndustryTemplateBrowser />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/industry-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ProjectIndustryPlanView />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/industry-plan/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <IndustryPlanCopyWizard />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/industry-plan/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <IndustryPlanCopyWizard />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/forms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <FormsGallery mode="platform" basePath="/pm/projects" />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/forms/:templateCode/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <FormNew mode="platform" basePath="/pm/projects" />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/forms/:formInstanceId/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <FormEdit mode="platform" />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/projects/:projectId/forms/:formInstanceId/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <FormView mode="platform" />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/testing-centre/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <TestingCentreRoutesPm />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/process-templates/*" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ProcessTemplatesRoutesPm />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* v631 PMIS gap features â€” GAP-01 through GAP-29 */}
                {PmisGapRouteElements()}
                {RecordLifecycleRouteElements()}
                <Route path="pm/itto/templates" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ITTOTemplateList />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/itto/project" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ProjectITTOList />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/itto/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ITTODraftsQueue />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delays" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <DelayRegister />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delays/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <DelayRegister />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Planning Intelligence */}
                <Route path="pm/planning" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PlanningHub />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/intelligence" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PlanningIntelligenceDashboard />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/scenarios" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ScenarioList />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/pbs" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PBSBuilder />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/health" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PlanHealthDashboard />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/ai" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <AIPlanGenerator />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/executive" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ExecutivePlanView />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/recovery" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <RecoveryPlanningView />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/confidence" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <ConfidenceForecastView />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/governance" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <GovernanceGateChecklist />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/microplans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <MicroPlanList />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/microplans/drafts" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <MicroPlanDraftQueue />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/planning/microplans/:microPlanId" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <MicroPlanDetail />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* â”€â”€ Team Member Plans Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Route path="platform/plans/my-plans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><MicroPlanList scope="individual" /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/plans/team-workstreams" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><MicroPlanList scope="team" /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/plans/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><MicroPlanForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/plans/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><MicroPlanForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* â”€â”€ Team Charter Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Route path="platform/team-charter" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamCharterPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/projects/:projectId/team-charter" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamCharterPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/team-charter/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamCharterEditPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/projects/:projectId/team-charter/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamCharterEditPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* â”€â”€ Decision Log Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Route path="platform/governance/decisions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><DecisionLogPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/governance/decisions/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><DecisionLogForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/governance/decisions/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><DecisionLogDetail /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/governance/decisions/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><DecisionLogForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* â”€â”€ Timesheets Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Route path="platform/timesheets" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><MyTimesheetsPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/timesheets/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TimesheetEntryForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/timesheets/team" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamTimesheetsPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/timesheets/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TimesheetEntryDetail /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/timesheets/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TimesheetEntryForm /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* â”€â”€ Communications Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                <Route path="platform/communications/chat" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><TeamChatPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/communications/video-calls" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><VideoCallsPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="platform/communications/voice-calls" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><VoiceCallsPage /></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* Simulator Team Member Routes */}
                <Route path="simulator/tm/dashboard" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><SimulatorTMDashboard /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/plans/my-plans" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><MicroPlanList scope="individual" /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/plans/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><MicroPlanForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/plans/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><MicroPlanForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/decisions" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><DecisionLogPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/decisions/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><DecisionLogForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/decisions/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><DecisionLogDetail /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/decisions/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><DecisionLogForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/timesheets" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><MyTimesheetsPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/timesheets/new" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><TimesheetEntryForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/timesheets/:id" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><TimesheetEntryDetail /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/timesheets/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><TimesheetEntryForm /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/team-charter" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><TeamCharterPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/communications/chat" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><TeamChatPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/communications/video-calls" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><VideoCallsPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
                <Route path="simulator/tm/communications/voice-calls" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout><SimVoiceCallsPage /></SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                } />
      
                {/* PM Governance Routes */}
                <Route path="pm/governance/mandate" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMGovernanceMandateTemplate />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/governance/communication-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMGovernanceCMS />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/governance/configuration-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMGovernanceConfigMS />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/governance/quality-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMGovernanceQMS />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/governance/risk-strategy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMGovernanceRMS />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Initiation Routes */}
                <Route path="pm/initiation/business-case" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMInitiationBusinessCase />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/business-case/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <BusinessCaseCreate />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/business-case/:id/view" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <BusinessCaseViewPage />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/business-case/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <BusinessCaseEdit />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/project-brief" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMInitiationProjectBrief />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/pid" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMInitiationPID />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/initiation/benefits-review-plan" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMInitiationBenefitsReviewPlan />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Delivery Routes */}
                <Route path="pm/delivery/work-packages" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDeliveryWorkPackages />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delivery/product-description" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDeliveryProductDescription />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delivery/project-product-description" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDeliveryProjectProductDescription />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delivery/product-status-account" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDeliveryProductStatusAccount />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/delivery/daily-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMDeliveryDailyLog />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Controls Routes */}
                <Route path="pm/controls/risk-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMControlsRiskRegister />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/controls/issue-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMControlsIssueRegister />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/controls/quality-register" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMControlsQualityRegister />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/controls/configuration-items" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMControlsConfigItems />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/controls/lessons-log" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMControlsLessonsLog />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Reporting Routes */}
                <Route path="pm/reporting/checkpoint-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMReportingCheckpoint />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/reporting/highlight-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMReportingHighlight />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/reporting/issue-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMReportingIssueReports />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/reporting/exception-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMReportingException />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/reporting/end-stage-reports" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMReportingEndStage />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/* PM Closure Routes */}
                <Route path="pm/closure/lessons-report" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMClosureLessonsReport />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="pm/closure/end-project-report" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMLayout>
                            <PMClosureEndProjectReport />
                          </PMLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
    </>
  )
}
