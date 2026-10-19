/** Platform routes — extracted from App.jsx (v729 Option B) */
import { Route, Navigate, Routes, Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import AppToPlatformRedirect from '../components/AppToPlatformRedirect'
import { PmisGapRouteElements, PmisGapPlatformNestedRouteElements } from '../modules/pmis-gaps/routes/PmisGapRoutes.jsx'
import { RecordLifecycleRouteElements, RecordLifecyclePlatformNestedRouteElements } from '../modules/record-lifecycle/routes/RecordLifecycleRoutes.jsx'
import { PmPlanningFederated, PmoPlanningFederated } from './PlanningFederatedOutlet.jsx'
import { PmoFederated } from './PmoFederatedOutlet.jsx'
import { AiSettingsPage, ReportLayoutsPage, ReportLayoutEditor } from './lazyImports' // v1272 AI settings + report layouts
import {
  LoadingFallback,
  LoadingFallbackWithTimeout,
  LoginPageSkeleton,
  RedirectProjectsTemplatesToLibrary,  ThemeProvider,
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
  DeliverableRegisterListPage,
  DeliverableRegisterFormPage,
  ScheduleManagementPlanPage,
  ActivityDetailPage,
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
  ProjectManagerHome,
  PMOLayout,
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
  PMInitiationDocumentSignatory,
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
  TeamCreate,
  TeamDetail,
  TeamAllocationHistory,
  ProjectFunctionalRolesPage,
  ProjectFunctionalRoleCreate,
  ProjectFunctionalRoleFromLibrary,
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
  StakeholderAnalysisFormPage,
  StakeholderEngagementPage,
  EngagementPlanFormPage,
  CommunicationPlanPage,
  CommunicationPlanFormPage,
  CommunicationPlanAudiencePage,
  CommunicationInformationOptionsPage,
  CommunicationInformationOptionFormPage,
  StakeholderMonitoringPage,
  StakeholderAssessmentMatrixPage,
  StakeholderAssessmentMatrixFormPage,
  StakeholdersAssessmentMatrixOnHold,
  TestDashboard,
  TestSuites,
  TestSuiteDetail,
  TestSuiteFormPage,
  TestEnvironments,
  TestEnvironmentFormPage,
  TestCases,
  TestCaseCreate,
  TestCaseDetail,
  TestCaseBulkUpload,
  TestRuns,
  TestRunEditor,
  TestRunDetail,
  TestRunExecute,
  DefectListPage,
  DefectDetailPage,
  DefectDashboardPage,
  TestEvidencePage,
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
  PmoAdminUserManagement,
  DataManagementAdmin,
  DataBreachRecordForm,
  PrivacyCenter,
  PortfolioMembersPage,
  ProgrammeMembersPage,
  MyWorkHome,
  PortfolioManagerHome,
  ProgrammeManagerHome,
  PmoConfigurationHome,
  ProjectClassifications,
  RiskCategoryCatalog,
  RiskCategoryDetail,
  OrganisationRegionalFormatSettingsPage,
  ProjectRegionalFormatSettingsPage,
  OrganisationAuthorities,
  OrganisationApprovalChains,
  RolesAndResponsibilities,
  CapabilityProfilePicker,
  ProjectTypes,
  ProjectStatuses,
  ExpenseCategories,
  AssignmentRoles,
  TimesheetReviewReasons,
  TimesheetWorkCategories,
  TimesheetOvertimeTypes,
  TimesheetSettings,
  ProjectTimesheetSettings,
  TimesheetOverviewReport,
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
  DocumentationAdminList,
  DocumentationAdminEditor,
  AuthenticationSettings,
  SecuritySettings,
  PWASettingsV675,
  ExecutiveDashboard,
  SubscriptionManagement, SwitchEditionPage,
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
  ProjectBudgetPage,
  ProjectDetailsPage,
  ProjectCharterList,
  ProjectCharterForm,
  ProjectCharterView,
  ProjectOrgStructurePage,
  ProjectContactsPage,
  ProjectContactsBulkUploadPage,
  GovernanceStructurePage,
  SteeringCommitteePage,
  ProjectBoardPage,
  GovernanceMembersBulkUploadPage,
  GovernanceMeetingCalendarPage,
  PlanningBaselinesPage, ScheduleRoutes, ScheduleDependenciesScreen, ScheduleCalendarScreen,
  ProjectBudgetBaseline,
  ProjectEVMPage,
  ProjectsEVMLandingPage,
  ProgrammeEVMPage,
  ProgrammeEVMLandingPage,
  PortfolioEVMPage,
  ProgrammeFinancialDashboard,
  ProjectProfitability,
  MyExpenses,
  ExpenseClaimDetail,
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
  LegacyTemplateUploadPage,
  LegacyReferenceTemplatesPage,
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
  PBSNodeForm,
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
  PmOrganisationalTemplatesPage,
  PmOrganisationalTemplateDetailPage,
  ProjectTemplatesEntry,
  OrganisationalTemplatesEntry,
  ProjectDocumentsEntry,
  DocumentVersionHistoryPage,
  DocumentOversightPortfolioPage,
  DocumentOversightProgrammePage,
  DocumentOversightPmoPage,
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
  ProjectClosureFormPage,
  ProjectHandoverFormPage,
  FollowOnActionFormPage,
  EndProjectReportView,
  EndProjectReportWizard,
  EPRComparisonView,
  ProjectArchiveListPage,
  ProjectArchiveItemForm,
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
  NonConformanceRegisterPage,
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
  ConfigurationItemTypeListPage,
  ConfigurationItemTypeFormPage,
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
  ResourceCalendarOverviewPage,
  ResourceCalendarPage,
  ResourceCalendarEntryPage,
  Notifications,
  ResourceCapacity,
  CrossProjectResources,
  ResourceUtilization,
  ResourceForecasts,
  ResourceDetail,
  ResourceEdit,
  ResourceAssignmentEdit,
  ResourceConflicts,
  ReportBuilder,
  AnalyticsDashboard,
  ProjectStatusReportPage,
  ExecutiveReportPage,
  ScheduleReportPage,
  CostReportPage,
  WorkPlanVarianceReport,
  Benefits,
  BenefitsRegisterPage,
  BenefitsRealizationPage,
  BenefitMeasurementsPage,
  BenefitMeasurementFormPage,
  BenefitRealizationReports,
  BenefitRealizationReportForm,
  BenefitCreatePage,
  BenefitDetailPage,
  BenefitsReviewPlan,
  Dependencies,
  DependencyCreatePage,
  DependencyRecordPage,
  ExternalDependencyCataloguePage,
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
  ManageRoles,
  OrgRoleDetail,
  ManageMenuBundles,
  MenuBundleDetail,
  OrganisationIndustrySettings,
  GettingStarted,
  SystemRoleCatalog,
  SystemRoleEditPage,
  AssignRolesToProjects,
  SendRoleInvites,
  InvitationExpirySettingsPage,
  EmailSettings,
  EmailSenderProfiles,
  ChangeLogPage,
  ChangeManagementPage,
  ChangeRequestDetailPage,
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
  LocalRegisterListPage,
  LocalRegisterForm,
  LocalRegisterDetailPage,
  RegisterDefinitionBuilder,
  LocalRegistersIndexPage,
  ManageLocalRegistersPage,
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
  PracticeStakeholderAssessmentMatrixFormPage,
  PracticeStakeholdersAssessmentMatrixOnHold,
  PracticeEngagementActionsPage,
  PracticeSaliencePage,
  PracticeStakeholdersOnHold,
  PracticeStakeholderCreatePage,
  PracticeTeams,
  PracticeTeamCreate,
  PracticeProjectFunctionalRolesPage,
  PracticeProjectFunctionalRoleFromLibrary,
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
  LessonFormPage,
  CorporateLessonsLibrary,
  MyLessonActions,
  LessonsReport,
  LessonsReportCreate,
  LessonsReportEdit,
  LessonsReportView,
  LessonsReportsList,
  RiskRegisterView,
  IntegrationsHomePage,
  IntegrationConfigPage,
  IntegrationSyncPage,
  AssumptionsListPage,
  AssumptionDetailPage,
  AssumptionForm,
  ConstraintsListPage,
  ConstraintDetailPage,
  ConstraintForm,
  MilestonesListPage,
  MilestoneDetailPage,
  MilestoneForm,
  GovernanceActionsRegisterPage,
  CostActualsListPage,
  CostActualDetailPage,
  CostActualForm,
  UnifiedApprovalsRegisterPage
} from './routeCommon'


export function PlatformRouteElements() {
  return (
    <>
                {/* v963 Phase 21 — Integrations.jsx/IntegrationConfig.jsx/IntegrationSync.jsx
                    existed as files but were never routed anywhere. They call navigate('/integrations'...)
                    with absolute paths internally, so these must be true root-level routes, not
                    nested under platform/* — sibling to it in this same fragment, matching the
                    literal /integrations/* URL space. */}
                <Route path="integrations" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <Layout>
                            <IntegrationsHomePage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="integrations/create" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <Layout>
                            <IntegrationConfigPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="integrations/:id/edit" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <Layout>
                            <IntegrationConfigPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
                <Route path="integrations/:id/sync" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <Layout>
                            <IntegrationSyncPage />
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
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
                              {/* v982 Phase 7 — Main Application Zones: "My Work" zone landing */}
                              <Route path="my-work" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyWorkHome />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="getting-started" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GettingStarted />
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
                              {/* Static template leaves BEFORE templates/:id so "project"/"organisational" are never treated as library ids.
                                  v864: keyed list/detail /templates/{organisational|project}/:projectId[/:nodeId] */}
                              <Route path="templates/organisational/:projectId/:nodeId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PmOrganisationalTemplateDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/organisational/:projectId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationalTemplatesEntry />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/organisational" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationalTemplatesEntry />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/project/:projectId/:nodeId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PmOrganisationalTemplateDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/project/:projectId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplatesEntry />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="templates/project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTemplatesEntry />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="documents/project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectDocumentsEntry />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="documents/project/:nodeId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PmOrganisationalTemplateDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="documents/history" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentVersionHistoryPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* v897 — Document Oversight: read-only cross-project register for
                                  Portfolio/Programme/PMO roles, scoped to their own branch. */}
                              <Route path="portfolio/document-oversight" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentOversightPortfolioPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="programme/document-oversight" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentOversightProgrammePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo/document-oversight" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DocumentOversightPmoPage />
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
                              {/*
                                PM-safe Form Template Builder mount — "Manage form fields" from
                                /platform/templates/organisational must not deep-link into /app/pmo/*
                                (RoleScopeGate redirects PMs to /pm/dashboard). Page still enforces
                                PMO Admin via getSessionPMOAdminStatus.
                              */}
                              <Route path="templates/forms/:templateCode/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FormTemplateBuilder mode="platform" />
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
                              <Route path="comms/meetings/:meetingId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MeetingSchedule />
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
                                    <AIWorkspace settingsPath="/platform/organisation/ai-settings" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-roles/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectFunctionalRoleCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-roles/from-library" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectFunctionalRoleFromLibrary />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-roles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectFunctionalRolesPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TeamCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="my-team" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MyTeam />
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
                              <Route path="teams/:id/allocation-history" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TeamAllocationHistory />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TeamDetail mode="edit" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="teams/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TeamDetail mode="view" />
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
                              <Route path="portfolio/:portfolioId/members" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PortfolioMembersPage />
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
                              <Route path="programme/:programmeId/members" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProgrammeMembersPage />
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
                              <Route path="stakeholders/analysis/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAnalysisFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/analysis/edit/:analysisId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAnalysisFormPage />
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
                              <Route path="stakeholders/assessment-matrix/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAssessmentMatrixFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/assessment-matrix/view/:recordKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAssessmentMatrixFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/assessment-matrix/edit/:recordKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <StakeholderAssessmentMatrixFormPage />
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
                              <Route path="stakeholders/engagement/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EngagementPlanFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/engagement/view/:engagementId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EngagementPlanFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/engagement/edit/:engagementId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <EngagementPlanFormPage />
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
                              <Route path="stakeholders/communication-options/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationInformationOptionFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communication-options/:kind/:code/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationInformationOptionFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communication-options/:kind/:code" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationInformationOptionFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communication-options" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationInformationOptionsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communications/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationPlanFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communications/:planId/stakeholders" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationPlanAudiencePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communications/view/:planId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationPlanFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="stakeholders/communications/edit/:planId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CommunicationPlanFormPage />
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
                              <Route path="testing/suites/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestSuiteFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/suites/:suiteId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestSuiteFormPage />
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
                              <Route path="testing/cases/:caseId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestCaseDetail />
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
                              <Route path="testing/runs/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestRunEditor />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/runs/:runId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestRunEditor />
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
                              <Route path="testing/environments/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestEnvironmentFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/environments/:environmentKey/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestEnvironmentFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/environments/:environmentKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestEnvironmentFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/environments" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestEnvironments />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="testing/evidence" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TestEvidencePage />
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
                              <Route path="pmo-admin/settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PMOAdmin />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/data-management" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DataManagementAdmin />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/data-management/breaches/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DataBreachRecordForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/data-management/breaches/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DataBreachRecordForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/users" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PmoAdminUserManagement />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/local-registers" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManageLocalRegistersPage />
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
                              <Route path="pmo-admin/expense-categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExpenseCategories />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/assignment-roles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssignmentRoles />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/timesheet-review-reasons" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TimesheetReviewReasons />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/timesheet-work-categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TimesheetWorkCategories />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/timesheet-overtime-types" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TimesheetOvertimeTypes />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/timesheet-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TimesheetSettings />
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
                              {/* v982 Phase 2 — PMO Configuration Zone */}
                              <Route path="pmo-admin/configuration" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PmoConfigurationHome />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/regional-format-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationRegionalFormatSettingsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="report-layouts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ReportLayoutsPage basePath="/platform/report-layouts" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="report-layouts/:nodeId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ReportLayoutEditor basePath="/platform/report-layouts" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="organisation/ai-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AiSettingsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="organisation/regional-format-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationRegionalFormatSettingsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/project-classifications" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectClassifications />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/risk-categories" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskCategoryCatalog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/risk-categories/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskCategoryDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/risk-categories/:code/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskCategoryDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/risk-categories/:code/subcategories/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskCategoryDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/risk-categories/:code/subcategories/:subCode/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskCategoryDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/authorities" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationAuthorities />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/approval-chains" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationApprovalChains />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="pmo-admin/roles-responsibilities" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RolesAndResponsibilities />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* v982 Phase 6 — Capability Profiles */}
                              <Route path="pmo-admin/capability-profile" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CapabilityProfilePicker />
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
                              <Route path="expenses/my/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExpenseClaimDetail />
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
                              {/* Static segment — must be before projects/:id or "all" is treated as a project id */}
                              <Route path="projects/all" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <Projects />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
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
                              {/* Local Register Engine (v931) — generic list/create/view/edit for
                                  any system-defined or member-created local register. */}
                              <Route path="local-registers" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LocalRegistersIndexPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="local-registers/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RegisterDefinitionBuilder />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="local-registers/:registerId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LocalRegisterListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="local-registers/:registerId/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LocalRegisterForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="local-registers/:registerId/:recordId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LocalRegisterDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="local-registers/:registerId/:recordId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LocalRegisterForm />
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
                              <Route path="projects/:projectId/budget" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBudgetPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Flat, id-less route for sidebar access from /pm/* pages (no project
                                  path segment there) — resolveMenuRoutePath() can't substitute
                                  :projectId when the CURRENT page's own URL has no id in its path
                                  (e.g. /pm/dashboard), so the menu_item points here instead;
                                  ProjectBudgetPage resolves the project via usePlatformProjectId()'s
                                  CurrentProjectContext fallback either way. */}
                              <Route path="budget" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBudgetPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* v1020: Project Setup taxonomy expansion — flat routes, same
                                  usePlatformProjectId() resolution pattern as ProjectBudgetPage above. */}
                              <Route path="project-details" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectDetailsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-setup/regional-format-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectRegionalFormatSettingsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-setup/timesheet-settings" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectTimesheetSettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* v1024: Scope & Deliverables — flat routes + usePlatformProjectId */}
                              <Route path="scope/statement" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScopeStatementPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scope/wbs" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WBSBuilderPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scope/pbs" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PBSBuilder />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scope/pbs/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PBSNodeForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="scope/pbs/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PBSNodeForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="deliverable-register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DeliverableRegisterListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="deliverable-register/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DeliverableRegisterFormPage mode="create" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="deliverable-register/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DeliverableRegisterFormPage mode="view" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="deliverable-register/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DeliverableRegisterFormPage mode="edit" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-charter" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCharterList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-charter/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCharterForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-charter/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCharterView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-charter/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectCharterForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-team/team-structure" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectOrgStructurePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-team/org-structure" element={
                                <Navigate to="/platform/project-team/team-structure" replace />
                              } />
                              <Route path="project-contacts/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectContactsBulkUploadPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="project-contacts" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectContactsPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance-structure" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GovernanceStructurePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance/steering-committee" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SteeringCommitteePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance/steering-committee/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GovernanceMembersBulkUploadPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance/project-board" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBoardPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance/project-board/bulk-upload" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GovernanceMembersBulkUploadPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="governance/meeting-calendar" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GovernanceMeetingCalendarPage />
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
                              {/* v1035: flat sibling for sidebar access from /pm/* — ProjectEVMPage
                                  now resolves projectId via usePlatformProjectId() */}
                              <Route path="evm" element={
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
                              {/* Lessons Log routes — static paths before :lessonId */}
                              <Route path="projects/:projectId/lessons" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsLogView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/lessons/:lessonId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonFormPage />
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
                              <Route path="projects/:projectId/lessons/reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonsReportEdit />
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
                              <Route path="projects/:projectId/lessons/:lessonId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <LessonDetailView />
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
                              <Route path="settings/privacy" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PrivacyCenter />
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
                              <Route path="projects/:projectId/charter/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBriefCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/charter/view" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectBriefView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/charter/edit" element={
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
                              <Route path="projects/:projectId/configuration-item-types" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemTypeListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-item-types/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemTypeFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-item-types/:typeKey/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemTypeFormPage forceEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/configuration-item-types/:typeKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConfigurationItemTypeFormPage />
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
                              <Route path="projects/:projectId/risks/:riskId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RiskDetail />
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
                              {/* Project-scoped checkpoint reports (PM area / no work package) */}
                              <Route path="projects/:projectId/checkpoint-reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportList />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/checkpoint-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportCreate />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/checkpoint-reports/:reportId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportView />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/checkpoint-reports/:reportId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CheckpointReportEdit />
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
                              <Route path="scope/requirements" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <RequirementsRegisterPage />
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
                              {/* v1239 Slice 3.5 — shared schedule screens (@nidus/planning) on tasks. ActivityDetail and
                                  ScheduleManagementPlan keep their explicit routes above, which rank before these splats. */}
                              <Route path="schedule/*" element={<ProtectedRoute><ScheduleRoutes fallback={<LoadingFallback />} /></ProtectedRoute>} />
                              <Route path="projects/:projectId/schedule/*" element={<ProtectedRoute><ScheduleRoutes fallback={<LoadingFallback />} /></ProtectedRoute>} />
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
                              {/* v1025: flat, id-less siblings for sidebar access from /pm/* (Planning
                                  group) — same pattern as ProjectBudgetPage; these 3 page components
                                  already resolve projectId via usePlatformProjectId(). */}
                              <Route path="planning/dependencies" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScheduleDependenciesScreen />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="planning/calendars" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScheduleCalendarScreen />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="planning/baselines" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <PlanningBaselinesPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Project Calendar (v963 Phase 4) */}
                              {/* End Project Report Routes */}
                              <Route path="projects/:projectId/closure" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ClosingProject />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/form" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectClosureFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/handover/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectHandoverFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/handover" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectHandoverFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/actions/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FollowOnActionFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/actions/:actionKey/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FollowOnActionFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="projects/:projectId/closure/actions/:actionKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <FollowOnActionFormPage />
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
                                    <EndProjectReportView />
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
                              <Route path="closure/archive" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectArchiveListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="closure/archive/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectArchiveItemForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="closure/archive/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectArchiveItemForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="closure/archive/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectArchiveItemForm forceEdit />
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
                              {/* v1036: Non-Conformance Register — real table/service, zero prior UI */}
                              <Route path="quality/non-conformance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <NonConformanceRegisterPage />
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
                              {/* Assumptions Register (v963 Phase 3) */}
                              <Route path="assumptions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssumptionsListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="assumptions/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssumptionForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="assumptions/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssumptionDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="assumptions/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <AssumptionForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Constraints Register (v1100) */}
                              <Route path="constraints" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConstraintsListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="constraints/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConstraintForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="constraints/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConstraintDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="constraints/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ConstraintForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Milestone Register (v966 Phase 11) */}
                              <Route path="milestones" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MilestonesListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="milestones/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MilestoneForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="milestones/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MilestoneDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="milestones/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MilestoneForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Governance Action Register (v966 Phase 12) — read-only rollup,
                                  no create route (see governanceActionService.js). */}
                              <Route path="governance-actions" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <GovernanceActionsRegisterPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Cost Actuals ledger (v963 Phase 6) */}
                              <Route path="cost-actuals" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CostActualsListPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="cost-actuals/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CostActualForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="cost-actuals/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CostActualDetailPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="cost-actuals/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CostActualForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* Unified Approvals register (v963 Phase 5) — read-only rollup,
                                  no create route (see unifiedApprovalsService.js). */}
                              <Route path="pmo/approvals/register" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <UnifiedApprovalsRegisterPage />
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
                              <Route path="resources/directory" element={
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
                              <Route path="resources/calendar" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceCalendarOverviewPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              {/* v1034: Resource Plan (Demand/Supply/Skills/Forecast) — real page, never routed */}
                              <Route path="resources/plan" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceForecasts />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/cross-project" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CrossProjectResources />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/utilization" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceUtilization />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/assignments/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceAssignmentEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/assignments/:assignmentId/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceAssignmentEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/calendar" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceCalendarPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/calendar/entry/new" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceCalendarEntryPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="resources/:id/calendar/entry/:entryId" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ResourceCalendarEntryPage />
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
                              <Route path="reports/timesheet-overview" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <TimesheetOverviewReport />
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
                              {/* v1055: Reports taxonomy expansion — 4 new dedicated report pages */}
                              <Route path="reports/status" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ProjectStatusReportPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports/executive" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExecutiveReportPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports/schedule" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ScheduleReportPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports/cost" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <CostReportPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="reports/work-plan-variance" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <WorkPlanVarianceReport />
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
                              <Route path="benefits/measurements/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitMeasurementFormPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/measurements/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitMeasurementFormPage />
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
                              <Route path="benefits/realization-reports" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitRealizationReports />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/realization-reports/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitRealizationReportForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/realization-reports/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitRealizationReportForm />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="benefits/realization-reports/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <BenefitRealizationReportForm forceEdit />
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
                              <Route path="dependency-parties" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ExternalDependencyCataloguePage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="external-dependencies" element={<Navigate to="/platform/dependency-parties" replace />} />
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
                              <Route path="dependencies/:dependencyKey/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DependencyRecordPage mode="edit" />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="dependencies/:dependencyKey" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <DependencyRecordPage mode="view" />
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
                              <Route path="admin/manage-roles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManageRoles />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-roles/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrgRoleDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-roles/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrgRoleDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-roles/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrgRoleDetail forceEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/organisation-industries" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <OrganisationIndustrySettings />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-menu-bundles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ManageMenuBundles />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-menu-bundles/create" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MenuBundleDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-menu-bundles/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MenuBundleDetail />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/manage-menu-bundles/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <MenuBundleDetail forceEdit />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/system-roles" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SystemRoleCatalog />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="admin/system-roles/:id/edit" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <SystemRoleEditPage />
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
                              {/* Menu (v681) uses /platform/change; canonical path is change-log */}
                              <Route path="change" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ChangeLogPage />
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
                              {/* v1032: Change Control taxonomy expansion — hub (Requests/Assessment)
                                  + per-request detail (Assessment/Decisions/Implementation tabs) */}
                              <Route path="change-requests" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ChangeManagementPage />
                                  </ProtectedRoute>
                                </Suspense>
                              } />
                              <Route path="change-requests/:id" element={
                                <Suspense fallback={<LoadingFallback />}>
                                  <ProtectedRoute>
                                    <ChangeRequestDetailPage />
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
                              <Route path="projects/:projectId/field-templates" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><ProjectFieldTemplates /></ProtectedRoute></Suspense>} />
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

                              {/* v733: Documentation Manager */}
                              <Route path="admin/documentation" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><DocumentationAdminList /></ProtectedRoute></Suspense>} />
                              <Route path="admin/documentation/new" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><DocumentationAdminEditor /></ProtectedRoute></Suspense>} />
                              <Route path="admin/documentation/edit/:id" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><DocumentationAdminEditor /></ProtectedRoute></Suspense>} />
      
                              {/* v675: Executive Dashboard */}
                              <Route path="executive/dashboard" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><ExecutiveDashboard /></ProtectedRoute></Suspense>} />

                              {/* v675: Subscription */}
                              <Route path="subscription" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="subscription/edition" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SwitchEditionPage /></ProtectedRoute></Suspense>} />
                              <Route path="subscription/upgrade" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="subscription/billing-history" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />
                              <Route path="subscription/payment-methods" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><SubscriptionManagement /></ProtectedRoute></Suspense>} />

                              {/* v675: Organisation Profile */}
                              <Route path="organisation/profile" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><OrganisationProfile /></ProtectedRoute></Suspense>} />

                              {/* v675: Stage Gate Reviews */}
                              <Route path="stage-gates" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateList /></ProtectedRoute></Suspense>} />
                              <Route path="stage-gates/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateForm /></ProtectedRoute></Suspense>} />
                              <Route path="stage-gates/:id" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateView /></ProtectedRoute></Suspense>} />
                              <Route path="stage-gates/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><StageGateForm /></ProtectedRoute></Suspense>} />

                              {/* v675: Governance Framework */}
                              <Route path="governance/framework" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkList /></ProtectedRoute></Suspense>} />
                              <Route path="governance/framework/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkForm /></ProtectedRoute></Suspense>} />
                              <Route path="governance/framework/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceFrameworkForm /></ProtectedRoute></Suspense>} />

                              {/* v675: Policies & Compliance */}
                              <Route path="governance/policies" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceList /></ProtectedRoute></Suspense>} />
                              <Route path="governance/policies/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceForm /></ProtectedRoute></Suspense>} />
                              <Route path="governance/policies/:id" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceView /></ProtectedRoute></Suspense>} />
                              <Route path="governance/policies/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><PoliciesComplianceForm /></ProtectedRoute></Suspense>} />

                              {/* v675: Intelligence & Governance Rules */}
                              <Route path="pmo/planning/intelligence-rules" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><IntelligenceRulesPage /></ProtectedRoute></Suspense>} />
                              <Route path="pmo/planning/governance-rules" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><GovernanceRulesConfigPage /></ProtectedRoute></Suspense>} />

                              {/* v675: Custom Metrics */}
                              <Route path="analytics/custom-metrics" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><CustomMetricsPage /></ProtectedRoute></Suspense>} />

                              {/* v675: Workstream Plans */}
                              <Route path="workstream-plans" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanList /></ProtectedRoute></Suspense>} />
                              <Route path="workstream-plans/create" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanForm /></ProtectedRoute></Suspense>} />
                              <Route path="workstream-plans/:id/edit" element={<Suspense fallback={<LoadingFallback />}><ProtectedRoute><WorkstreamPlanForm /></ProtectedRoute></Suspense>} />

                              {/* GAP-12 Vendors / Vendor Performance — sidebar URLs are /platform/pm/procurement/* */}
                              {PmisGapPlatformNestedRouteElements()}
                              {RecordLifecyclePlatformNestedRouteElements()}
      
                            </Routes>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                } />
      
                {/* PMO field templates (v764 Phase 2) — before app/* redirect */}
                <Route path="app/pmo/*" element={<PmoFederated />} />

                {/*
                  Canonical app-area URL for Project Members (menu + SQL use /app/project-members).
                  Must be declared before app/* so it is not swallowed by AppToPlatformRedirect.
                  /platform/project-members and /platform/project-users are first-class aliases (same page).
                */}
                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <Suspense fallback={<LoadingFallback />}>
                          <Layout>
                            <Suspense fallback={<LoadingFallback />}>
                              <ProtectedRoute>
                                <Outlet />
                              </ProtectedRoute>
                            </Suspense>
                          </Layout>
                        </Suspense>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                }>
                  <Route path="app/project-members" element={<ProjectUsers />} />
                  <Route path="app/invitation-tracker" element={<PMInvitationTracker />} />
                  <Route path="app/invitation-tracker/view" element={<InvitationDetailPage />} />
                  <Route path="app/project-users" element={<ProjectUsers />} />
                  <Route path="app/settings/invitation-templates" element={<InvitationTemplatesPage />} />
                  <Route path="app/local-data-extensions/*" element={<LocalDataExtensionsRoutes />} />
                </Route>
      

                {/* Backward Compatibility: Redirect other old /app/* paths to /platform/* */}
                <Route path="app/*" element={<AppToPlatformRedirect />} />
      

                {/* PMO Dashboard - redirect to unified platform dashboard */}
                <Route path="pmo/dashboard" element={<Navigate to="/platform/dashboard" replace />} />
                <Route path="pmo/planning/*" element={<PmoPlanningFederated />} />
                {/* PMO Governance Routes */}
                {/* PMO Mandate CRUD Routes - maintains PMO sidebar context */}
                {/* PMO Initiation Routes */}
                {/* PMO Oversight Routes */}
                {/* PMO Reporting Routes */}
                <Route path="pmo/rfp/:id/print" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ProtectedRoute>
                        <PMORFPPrint />
                      </ProtectedRoute>
                    </ThemeProvider>
                  </Suspense>
                } />
                {/*
                  v808 fix: pmo/forms* above are top-level routes (verified via AST — NOT nested
                  inside platform/*, despite matching its indentation), so they only ever resolved
                  at the bare /pmo/forms/... URL. But app/pmo/* further up is a blanket redirect to
                  the federated pmo_module, which doesn't implement /forms, so /app/pmo/forms/...
                  (used by the "Manage form fields" link from Organisational Templates) fell through
                  to the module's unmatched-route fallback instead. These three routes are more
                  specific than app/pmo/* and win regardless of declaration order, giving the
                  /app/pmo/forms/... URL the exact same working element tree pmo/forms/... already has.
                */}

                {/* PM Dashboard Routes */}
                {/* v631 PMIS gap features â€” GAP-01 through GAP-29 */}
                {PmisGapRouteElements()}
                {RecordLifecycleRouteElements()}
                {/* PM Planning Intelligence — federated planning-hub module */}
                <Route path="pm/planning/*" element={<PmPlanningFederated />} />
                {/* â”€â”€ Team Member Plans Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
                {/* â”€â”€ Team Charter Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
                {/* â”€â”€ Decision Log Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
                {/* â”€â”€ Timesheets Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
                {/* â”€â”€ Communications Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      
                {/* Simulator Team Member Routes */}
      
                {/* PM Governance Routes */}
                {/* PM Initiation Routes */}
                {/* PM Delivery Routes */}
                {/* PM Controls Routes */}
                {/* PM Reporting Routes */}
                {/* PM Closure Routes */}
      
                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <PMOLayout>
                            <Suspense fallback={<LoadingFallback />}>
                              <Outlet />
                            </Suspense>
                          </PMOLayout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                }>
                  <Route path="pmo/testing-centre/*" element={<TestingCentreRoutesPmo />} />
                  <Route path="pmo/process-templates/*" element={<ProcessTemplatesRoutesPmo />} />
                  <Route path="pmo/itto/templates" element={<ITTOTemplateList />} />
                  <Route path="pmo/itto/drafts" element={<ITTODraftsQueue />} />
                  <Route path="pmo/industry-templates" element={<IndustryTemplateList />} />
                  <Route path="pmo/legacy-templates/upload" element={<LegacyTemplateUploadPage />} />
                  <Route path="pmo/legacy-templates" element={<LegacyReferenceTemplatesPage />} />
                  <Route path="pmo/invitation-tracker" element={<PMOInvitationTracker />} />
                  <Route path="pmo/invitation-tracker/view" element={<InvitationDetailPage />} />
                  <Route path="pmo/industry-templates/new" element={<IndustryTemplateForm />} />
                  <Route path="pmo/industry-templates/on-hold" element={<IndustryTemplateOnHold />} />
                  <Route path="pmo/industry-templates/:id/edit" element={<IndustryTemplateForm />} />
                  <Route path="pmo/industry-templates/:id" element={<IndustryTemplateDetail />} />
                  <Route path="pmo/governance/mandate" element={<PMOGovernanceMandateTemplate />} />
                  <Route path="pmo/mandates/create" element={<ProjectMandateCreate />} />
                  <Route path="pmo/mandates/:mandateId/view" element={<ProjectMandateView />} />
                  <Route path="pmo/mandates/:mandateId/edit" element={<ProjectMandateEdit />} />
                  <Route path="pmo/mandates/approvals" element={<MandateApprovalDashboard />} />
                  <Route path="pmo/governance/communication-strategy" element={<PMOGovernanceCMS />} />
                  <Route path="pmo/governance/configuration-strategy" element={<PMOGovernanceConfigMS />} />
                  <Route path="pmo/governance/quality-strategy" element={<PMOGovernanceQMS />} />
                  <Route path="pmo/governance/risk-strategy" element={<PMOGovernanceRMS />} />
                  <Route path="pmo/initiation/business-case" element={<BusinessCaseListPage />} />
                  <Route path="pmo/initiation/business-case/create" element={<BusinessCaseCreate />} />
                  <Route path="pmo/initiation/business-case/:id/view" element={<BusinessCaseViewPage />} />
                  <Route path="pmo/initiation/business-case/:id/edit" element={<BusinessCaseEdit />} />
                  <Route path="pmo/initiation/project-brief" element={<PMOInitiationProjectBrief />} />
                  <Route path="pmo/initiation/benefits-review-plan" element={<PMOInitiationBenefitsReviewPlan />} />
                  {/* Project-scoped Brief/Benefits Create/View/Edit — maintains PMO sidebar context (see pm/projects/* above) */}
                  <Route path="pmo/projects/:projectId/brief/create" element={<ProjectBriefCreate />} />
                  <Route path="pmo/projects/:projectId/brief/view" element={<ProjectBriefView />} />
                  <Route path="pmo/projects/:projectId/brief/edit" element={<ProjectBriefEdit />} />
                  <Route path="pmo/projects/:projectId/benefits/review-plan" element={<BenefitsReviewPlan />} />
                  <Route path="pmo/oversight/risk-register" element={<PMOOversightRiskRegister />} />
                  <Route path="pmo/oversight/issue-register" element={<PMOOversightIssueRegister />} />
                  <Route path="pmo/registers/changes" element={<PMOOversightChangeRegister />} />
                  <Route path="pmo/oversight/quality-register" element={<PMOOversightQualityRegister />} />
                  <Route path="pmo/oversight/lessons-log" element={<PMOOversightLessonsLog />} />
                  <Route path="pmo/oversight/scope" element={<PMOOversightScope />} />
                  <Route path="pmo/oversight/schedules" element={<PMOOversightSchedules />} />
                  <Route path="pmo/oversight/delays" element={<DelayRegister />} />
                  <Route path="pmo/delays/templates" element={<DelayTemplates />} />
                  <Route path="pmo/reporting/highlight-reports" element={<PMOReportingHighlight />} />
                  <Route path="pmo/reporting/exception-reports" element={<PMOReportingException />} />
                  <Route path="pmo/reporting/end-stage-reports" element={<PMOReportingEndStage />} />
                  <Route path="pmo/reporting/end-project-reports" element={<PMOReportingEndProject />} />
                  <Route path="pmo/procurement/rfp" element={<PMOProcurementRFP />} />
                  <Route path="pmo/rfp/create" element={<PMORFPCreate />} />
                  <Route path="pmo/rfp/:id/view" element={<PMORFPView />} />
                  <Route path="pmo/rfp/:id/edit" element={<PMORFPEdit />} />
                  <Route path="pmo/rfp/:id/import" element={<PMORFPBulkImport />} />
                  <Route path="pmo/rfp/on-hold" element={<PMORFPOnHold />} />
                  <Route path="pmo/forms" element={<FormTemplateAdmin mode="platform" />} />
                  <Route path="pmo/forms/new" element={<FormTemplateBuilder mode="platform" />} />
                  <Route path="pmo/forms/:templateCode/edit" element={<FormTemplateBuilder mode="platform" />} />
                  <Route path="app/pmo/forms" element={<FormTemplateAdmin mode="platform" />} />
                  <Route path="app/pmo/forms/new" element={<FormTemplateBuilder mode="platform" />} />
                  <Route path="app/pmo/forms/:templateCode/edit" element={<FormTemplateBuilder mode="platform" />} />
                </Route>

                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider>
                      <ToastProvider>
                        <ProtectedRoute>
                          <Layout scope="pm">
                            <Suspense fallback={<LoadingFallback />}>
                              <Outlet />
                            </Suspense>
                          </Layout>
                        </ProtectedRoute>
                      </ToastProvider>
                    </ThemeProvider>
                  </Suspense>
                }>
                  {/* v982 Phase 5: framework-composed Project Manager Home — route unchanged */}
                  <Route path="pm/dashboard" element={<ProjectManagerHome />} />
                  <Route path="pm/team-members" element={<ProjectUsers />} />
                  <Route path="pm/invitation-tracker" element={<PMInvitationTracker />} />
                  <Route path="pm/invitation-tracker/view" element={<InvitationDetailPage />} />
                  <Route path="pm/profile" element={<Settings />} />
                  <Route path="platform/portfolio-manager/assignments" element={<PortfolioManagerAssignments />} />
                  <Route path="platform/programme-manager/assignments" element={<ProgrammeManagerAssignments />} />
                  {/* v982 Phase 5 follow-up — Portfolio/Programme Manager Home */}
                  <Route path="platform/portfolio-manager/home" element={<PortfolioManagerHome />} />
                  <Route path="platform/programme-manager/home" element={<ProgrammeManagerHome />} />
                  <Route path="pm/industry-templates" element={<IndustryTemplateBrowser />} />
                  <Route path="pm/projects/:projectId/industry-plan" element={<ProjectIndustryPlanView />} />
                  <Route path="pm/projects/:projectId/industry-plan/new" element={<IndustryPlanCopyWizard />} />
                  <Route path="pm/projects/:projectId/industry-plan/edit" element={<IndustryPlanCopyWizard />} />
                  <Route path="pm/projects/:projectId/forms" element={<FormsGallery mode="platform" basePath="/pm/projects" />} />
                  <Route path="pm/projects/:projectId/forms/:templateCode/new" element={<FormNew mode="platform" basePath="/pm/projects" />} />
                  <Route path="pm/projects/:projectId/forms/:formInstanceId/edit" element={<FormEdit mode="platform" />} />
                  <Route path="pm/projects/:projectId/forms/:formInstanceId/view" element={<FormView mode="platform" />} />
                  <Route path="pm/testing-centre/*" element={<TestingCentreRoutesPm />} />
                  <Route path="pm/process-templates/*" element={<ProcessTemplatesRoutesPm />} />
                  <Route path="pm/itto/templates" element={<ITTOTemplateList />} />
                  <Route path="pm/itto/project" element={<ProjectITTOList />} />
                  <Route path="pm/itto/drafts" element={<ITTODraftsQueue />} />
                  <Route path="pm/delays" element={<DelayRegister />} />
                  <Route path="pm/delays/drafts" element={<DelayRegister />} />
                  <Route path="pm/governance/mandate" element={<PMGovernanceMandateTemplate />} />
                  <Route path="pm/governance/communication-strategy" element={<PMGovernanceCMS />} />
                  <Route path="pm/governance/configuration-strategy" element={<PMGovernanceConfigMS />} />
                  <Route path="pm/governance/quality-strategy" element={<PMGovernanceQMS />} />
                  <Route path="pm/governance/risk-strategy" element={<PMGovernanceRMS />} />
                  <Route path="pm/initiation/business-case" element={<PMInitiationBusinessCase />} />
                  <Route path="pm/initiation/business-case/create" element={<BusinessCaseCreate />} />
                  <Route path="pm/initiation/business-case/:id/view" element={<BusinessCaseViewPage />} />
                  <Route path="pm/initiation/business-case/:id/edit" element={<BusinessCaseEdit />} />
                  <Route path="pm/initiation/project-brief" element={<PMInitiationProjectBrief />} />
                  <Route path="pm/initiation/project-charter" element={<PMInitiationProjectBrief />} />
                  <Route path="pm/initiation/pid" element={<PMInitiationPID />} />
                  <Route path="pm/initiation/benefits-review-plan" element={<PMInitiationBenefitsReviewPlan />} />
                  <Route path="pm/initiation/document-signatory" element={<PMInitiationDocumentSignatory />} />
                  {/*
                    Project-scoped Create/View/Edit for Brief, Charter, Benefits Review Plan and
                    Mandate — mounted under PMLayout so these actions (reached from the sidebar
                    lists above) stay inside the PM sidebar instead of dropping into the generic
                    /platform/projects/* shell (a different, collapsed Sidebar). Mirrors the
                    pmo/mandates/* "maintains PMO sidebar context" routes below.
                  */}
                  <Route path="pm/projects/:projectId/brief/create" element={<ProjectBriefCreate />} />
                  <Route path="pm/projects/:projectId/brief/view" element={<ProjectBriefView />} />
                  <Route path="pm/projects/:projectId/brief/edit" element={<ProjectBriefEdit />} />
                  <Route path="pm/projects/:projectId/charter/create" element={<ProjectBriefCreate />} />
                  <Route path="pm/projects/:projectId/charter/view" element={<ProjectBriefView />} />
                  <Route path="pm/projects/:projectId/charter/edit" element={<ProjectBriefEdit />} />
                  <Route path="pm/projects/:projectId/benefits/review-plan" element={<BenefitsReviewPlan />} />
                  <Route path="pm/mandates/create" element={<ProjectMandateCreate />} />
                  <Route path="pm/mandates/:mandateId/view" element={<ProjectMandateView />} />
                  <Route path="pm/mandates/:mandateId/edit" element={<ProjectMandateEdit />} />
                  <Route path="pm/delivery/work-packages" element={<PMDeliveryWorkPackages />} />
                  <Route path="pm/delivery/product-description" element={<PMDeliveryProductDescription />} />
                  <Route path="pm/delivery/project-product-description" element={<PMDeliveryProjectProductDescription />} />
                  <Route path="pm/delivery/product-status-account" element={<PMDeliveryProductStatusAccount />} />
                  <Route path="pm/delivery/daily-log" element={<PMDeliveryDailyLog />} />
                  <Route path="pm/controls/risk-register" element={<PMControlsRiskRegister />} />
                  <Route path="pm/controls/issue-register" element={<PMControlsIssueRegister />} />
                  <Route path="pm/controls/quality-register" element={<PMControlsQualityRegister />} />
                  <Route path="pm/controls/configuration-items" element={<PMControlsConfigItems />} />
                  <Route path="pm/controls/configuration-item-types" element={<ConfigurationItemTypeListPage />} />
                  <Route path="pm/controls/lessons-log" element={<PMControlsLessonsLog />} />
                  <Route path="pm/reporting/checkpoint-reports" element={<PMReportingCheckpoint />} />
                  <Route path="pm/reporting/highlight-reports" element={<PMReportingHighlight />} />
                  <Route path="pm/reporting/issue-reports" element={<PMReportingIssueReports />} />
                  <Route path="pm/reporting/exception-reports" element={<PMReportingException />} />
                  <Route path="pm/reporting/end-stage-reports" element={<PMReportingEndStage />} />
                  <Route path="pm/closure/lessons-report" element={<PMClosureLessonsReport />} />
                  <Route path="pm/closure/end-project-report" element={<PMClosureEndProjectReport />} />
                </Route>

                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute><Layout><Suspense fallback={<LoadingFallback />}><Outlet /></Suspense></Layout></ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                }>
                  <Route path="platform/plans/my-plans" element={<MicroPlanList scope="individual" />} />
                  <Route path="platform/plans/team-workstreams" element={<MicroPlanList scope="team" />} />
                  <Route path="platform/plans/new" element={<MicroPlanForm />} />
                  <Route path="platform/plans/:id/edit" element={<MicroPlanForm />} />
                  <Route path="platform/notifications" element={<Notifications />} />
                  <Route path="platform/team-charter" element={<TeamCharterPage />} />
                  <Route path="platform/projects/:projectId/team-charter" element={<TeamCharterPage />} />
                  <Route path="platform/team-charter/edit" element={<TeamCharterEditPage />} />
                  <Route path="platform/projects/:projectId/team-charter/edit" element={<TeamCharterEditPage />} />
                  <Route path="platform/governance/decisions" element={<DecisionLogPage />} />
                  <Route path="platform/governance/decisions/new" element={<DecisionLogForm />} />
                  <Route path="platform/governance/decisions/:id" element={<DecisionLogDetail />} />
                  <Route path="platform/governance/decisions/:id/edit" element={<DecisionLogForm />} />
                  <Route path="platform/timesheets" element={<MyTimesheetsPage />} />
                  <Route path="platform/timesheets/new" element={<TimesheetEntryForm />} />
                  <Route path="platform/timesheets/team" element={<TeamTimesheetsPage />} />
                  <Route path="platform/timesheets/:id" element={<TimesheetEntryDetail />} />
                  <Route path="platform/timesheets/:id/edit" element={<TimesheetEntryForm />} />
                  <Route path="platform/communications/chat" element={<TeamChatPage />} />
                  <Route path="platform/communications/video-calls" element={<VideoCallsPage />} />
                  <Route path="platform/communications/voice-calls" element={<VoiceCallsPage />} />
                </Route>

                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <SimulatorTMLayout>
                          <Suspense fallback={<LoadingFallback />}>
                            <Outlet />
                          </Suspense>
                        </SimulatorTMLayout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                }>
                  <Route path="simulator/tm/dashboard" element={<SimulatorTMDashboard />} />
                  <Route path="simulator/tm/plans/my-plans" element={<MicroPlanList scope="individual" />} />
                  <Route path="simulator/tm/plans/new" element={<MicroPlanForm />} />
                  <Route path="simulator/tm/plans/:id/edit" element={<MicroPlanForm />} />
                  <Route path="simulator/tm/decisions" element={<DecisionLogPage />} />
                  <Route path="simulator/tm/decisions/new" element={<DecisionLogForm />} />
                  <Route path="simulator/tm/decisions/:id" element={<DecisionLogDetail />} />
                  <Route path="simulator/tm/decisions/:id/edit" element={<DecisionLogForm />} />
                  <Route path="simulator/tm/timesheets" element={<MyTimesheetsPage />} />
                  <Route path="simulator/tm/timesheets/new" element={<TimesheetEntryForm />} />
                  <Route path="simulator/tm/timesheets/:id" element={<TimesheetEntryDetail />} />
                  <Route path="simulator/tm/timesheets/:id/edit" element={<TimesheetEntryForm />} />
                  <Route path="simulator/tm/team-charter" element={<TeamCharterPage />} />
                  <Route path="simulator/tm/communications/chat" element={<TeamChatPage />} />
                  <Route path="simulator/tm/communications/video-calls" element={<VideoCallsPage />} />
                  <Route path="simulator/tm/communications/voice-calls" element={<SimVoiceCallsPage />} />
                </Route>

                <Route element={
                  <Suspense fallback={<LoadingFallback />}>
                    <ThemeProvider><ToastProvider>
                      <ProtectedRoute requiredPlatform="simulator">
                        <Layout>
                          <Suspense fallback={<LoadingFallback />}>
                            <Outlet />
                          </Suspense>
                        </Layout>
                      </ProtectedRoute>
                    </ToastProvider></ThemeProvider>
                  </Suspense>
                }>
                  <Route path="simulator/practice-teams" element={<PracticeTeams />} />
                  <Route path="simulator/practice-teams/create" element={<PracticeTeamCreate />} />
                  <Route path="simulator/practice-teams/my-team" element={<SimMyTeam />} />
                  <Route path="simulator/practice-project-roles" element={<PracticeProjectFunctionalRolesPage />} />
                  <Route path="simulator/practice-project-roles/from-library" element={<PracticeProjectFunctionalRoleFromLibrary />} />
                  {/* Practice-mode (Simulator) pages routed inside the Platform app — v1150 route registration pass */}
                  <Route path="simulator/practice-projects" element={<PracticeProjects />} />
                  <Route path="simulator/practice-projects/create" element={<PracticeProjectCreate />} />
                  <Route path="simulator/practice-projects/:id" element={<PracticeProjectDetail />} />
                  <Route path="simulator/practice-tasks" element={<PracticeTasks />} />
                  <Route path="simulator/practice-tasks/:id" element={<PracticeTaskDetail />} />
                  <Route path="simulator/practice-briefs" element={<PracticeBriefList />} />
                  <Route path="simulator/practice-briefs/create" element={<PracticeBriefCreate />} />
                  <Route path="simulator/practice-briefs/:id" element={<PracticeBriefView />} />
                  <Route path="simulator/practice-briefs/:id/edit" element={<PracticeBriefEdit />} />
                  <Route path="simulator/practice-business-cases" element={<PracticeBusinessCaseList />} />
                  <Route path="simulator/practice-business-cases/create" element={<PracticeBusinessCaseCreate />} />
                  <Route path="simulator/practice-business-cases/:id" element={<PracticeBusinessCaseView />} />
                  <Route path="simulator/practice-business-cases/:id/edit" element={<PracticeBusinessCaseEdit />} />
                  <Route path="simulator/practice-benefits-review-plans" element={<PracticeBenefitsReviewPlanList />} />
                  <Route path="simulator/practice-benefits-review-plans/create" element={<PracticeBenefitsReviewPlan />} />
                  <Route path="simulator/practice-benefits-review-plans/:id" element={<PracticeBenefitsReviewPlanViewPage />} />
                  <Route path="simulator/practice-benefits-review-plans/:id/edit" element={<PracticeBenefitsReviewPlanEditPage />} />
                  <Route path="simulator/practice-pids" element={<PracticePIDList />} />
                  <Route path="simulator/practice-pids/create" element={<PracticePIDCreate />} />
                  <Route path="simulator/practice-pids/:id" element={<PracticePIDView />} />
                  <Route path="simulator/benefits/create" element={<PracticeBenefitsRedirectPage />} />
                  <Route path="simulator/benefits/:id/edit" element={<PracticeBenefitsRedirectPage />} />
                  <Route path="simulator/benefits/:id" element={<PracticeBenefitsRedirectPage />} />
                  <Route path="simulator/benefits/register" element={<PracticeBenefitsRegister />} />
                  <Route path="simulator/benefits/measurements" element={<PracticeBenefitsMeasurements />} />
                  <Route path="simulator/benefits/realization" element={<PracticeBenefitsRealization />} />
                  <Route path="simulator/benefits" element={<PracticeBenefitsAll />} />
                  <Route path="simulator/practice-benefits" element={<PracticeBenefitsReviewPlan />} />
                  <Route path="simulator/practice-work-packages" element={<PracticeWorkPackageList />} />
                  <Route path="simulator/practice-work-packages/create" element={<PracticeWorkPackageCreate />} />
                  <Route path="simulator/practice-work-packages/:id" element={<PracticeWorkPackageView />} />
                  <Route path="simulator/practice-work-packages/:id/edit" element={<PracticeWorkPackageEdit />} />
                  <Route path="simulator/practice-product-descriptions" element={<PracticeProductDescriptionList />} />
                  <Route path="simulator/practice-product-descriptions/create" element={<PracticeProductDescriptionCreate />} />
                  <Route path="simulator/practice-product-descriptions/:id" element={<PracticeProductDescriptionView />} />
                  <Route path="simulator/practice-ppds" element={<PracticePPDList />} />
                  <Route path="simulator/practice-ppds/:id" element={<PracticePPDView />} />
                  <Route path="simulator/practice-psas" element={<PracticePSAList />} />
                  <Route path="simulator/practice-psas/:id" element={<PracticePSAView />} />
                  <Route path="simulator/practice-plans" element={<PracticePlanList />} />
                  <Route path="simulator/practice-plans/create" element={<PracticePlanCreate />} />
                  <Route path="simulator/practice-plans/:id" element={<PracticePlanView />} />
                  <Route path="simulator/practice-plans/:id/edit" element={<PracticePlanEdit />} />
                  <Route path="simulator/practice-daily-log" element={<PracticeDailyLog />} />
                  <Route path="simulator/practice-daily-log/:id" element={<PracticeDailyLogEntry />} />
                  <Route path="simulator/practice-risk-register" element={<PracticeRiskRegister />} />
                  <Route path="simulator/practice-risk-register/:id" element={<PracticeRiskDetail />} />
                  <Route path="simulator/practice-rms" element={<PracticeRMSList />} />
                  <Route path="simulator/practice-rms/create" element={<PracticeRMSCreate />} />
                  <Route path="simulator/practice-rms/:id" element={<PracticeRMSView />} />
                  <Route path="simulator/practice-issue-register" element={<PracticeIssueRegister />} />
                  <Route path="simulator/practice-issue-register/:id" element={<PracticeIssueDetail />} />
                  <Route path="simulator/practice-issue-reports" element={<PracticeIssueReportList />} />
                  <Route path="simulator/practice-issue-reports/create" element={<PracticeIssueReportCreate />} />
                  <Route path="simulator/practice-issue-reports/:id" element={<PracticeIssueReportView />} />
                  <Route path="simulator/practice-quality-register" element={<PracticeQualityRegister />} />
                  <Route path="simulator/practice-quality-activity/:id" element={<PracticeQualityActivityView />} />
                  <Route path="simulator/practice-quality-reviews" element={<PracticeQualityReviews />} />
                  <Route path="simulator/practice-quality-inspections" element={<PracticeQualityInspections />} />
                  <Route path="simulator/practice-quality-reports" element={<PracticeQualityReports />} />
                  <Route path="simulator/practice-qms" element={<PracticeQMSList />} />
                  <Route path="simulator/practice-qms/create" element={<PracticeQMSCreate />} />
                  <Route path="simulator/practice-qms/:id" element={<PracticeQMSView />} />
                  <Route path="simulator/practice-lessons-log" element={<PracticeLessonsLog />} />
                  <Route path="simulator/practice-lessons-log/:id" element={<PracticeLessonDetail />} />
                  <Route path="simulator/practice-config-items" element={<PracticeConfigItemList />} />
                  <Route path="simulator/practice-config-items/create" element={<PracticeConfigItemCreate />} />
                  <Route path="simulator/practice-config-items/:id" element={<PracticeConfigItemView />} />
                  <Route path="simulator/practice-cms" element={<PracticeCMSList />} />
                  <Route path="simulator/practice-cms/create" element={<PracticeCMSCreate />} />
                  <Route path="simulator/practice-cms/:id" element={<PracticeCMSView />} />
                  <Route path="simulator/practice-cms/:id/edit" element={<PracticeCMSEdit />} />
                  <Route path="simulator/practice-config-ms" element={<PracticeConfigMSList />} />
                  <Route path="simulator/practice-config-ms/create" element={<PracticeConfigMSCreate />} />
                  <Route path="simulator/practice-config-ms/:id" element={<PracticeConfigMSView />} />
                  <Route path="simulator/practice-config-ms/:id/edit" element={<PracticeConfigMSEdit />} />
                  <Route path="simulator/practice-checkpoint-reports" element={<PracticeCheckpointReportList />} />
                  <Route path="simulator/practice-checkpoint-reports/create" element={<PracticeCheckpointReportCreate />} />
                  <Route path="simulator/practice-checkpoint-reports/:id" element={<PracticeCheckpointReportView />} />
                  <Route path="simulator/practice-highlight-reports" element={<PracticeHighlightReportList />} />
                  <Route path="simulator/practice-highlight-reports/create" element={<PracticeHighlightReportCreate />} />
                  <Route path="simulator/practice-highlight-reports/:id" element={<PracticeHighlightReportView />} />
                  <Route path="simulator/practice-exception-reports" element={<PracticeExceptionReportList />} />
                  <Route path="simulator/practice-exception-reports/create" element={<PracticeExceptionReportCreate />} />
                  <Route path="simulator/practice-exception-reports/:id" element={<PracticeExceptionReportView />} />
                  <Route path="simulator/practice-end-stage-reports" element={<PracticeEndStageReportList />} />
                  <Route path="simulator/practice-end-stage-reports/create" element={<PracticeEndStageReportCreate />} />
                  <Route path="simulator/practice-end-stage-reports/:id" element={<PracticeEndStageReportView />} />
                  <Route path="simulator/practice-end-project-reports" element={<PracticeEndProjectReportList />} />
                  <Route path="simulator/practice-end-project-reports/create" element={<PracticeEndProjectReportCreate />} />
                  <Route path="simulator/practice-end-project-reports/:id" element={<PracticeEndProjectReportView />} />
                  <Route path="simulator/practice-lessons-reports" element={<PracticeLessonsReportList />} />
                  <Route path="simulator/practice-lessons-reports/create" element={<PracticeLessonsReportCreate />} />
                  <Route path="simulator/practice-lessons-reports/:id" element={<PracticeLessonsReportView />} />
                  <Route path="simulator/practice-starting-up" element={<PracticeStartingUp />} />
                  <Route path="simulator/practice-initiating" element={<PracticeInitiating />} />
                  <Route path="simulator/practice-controlling-stage" element={<PracticeControllingStage />} />
                  <Route path="simulator/practice-managing-delivery" element={<PracticeManagingDelivery />} />
                  <Route path="simulator/practice-stage-boundaries" element={<PracticeStageBoundaries />} />
                  <Route path="simulator/practice-closing-project" element={<PracticeClosingProject />} />
                  <Route path="simulator/practice-portfolio" element={<PracticePortfolio />} />
                  <Route path="simulator/practice-portfolio/create" element={<PracticePortfolioCreate />} />
                  <Route path="simulator/practice-programme/dashboard" element={<PracticeProgrammeDashboardOverview />} />
                  <Route path="simulator/practice-programme/projects" element={<PracticeProgrammeProjectsPage />} />
                  <Route path="simulator/practice-programme/dependencies" element={<PracticeProgrammeDependenciesPage />} />
                  <Route path="simulator/practice-programme/benefits" element={<PracticeProgrammeBenefitsPage />} />
                  <Route path="simulator/practice-programme/timeline" element={<PracticeProgrammeTimelinePage />} />
                  <Route path="simulator/practice-programme" element={<PracticeProgramme />} />
                  <Route path="simulator/practice-programme/create" element={<PracticeProgrammeCreate />} />
                  <Route path="simulator/practice-programme/:programmeId" element={<PracticeProgrammeDetail />} />
                  <Route path="simulator/practice-dependencies" element={<PracticeDependencies />} />
                  <Route path="simulator/practice-dependencies/inter-project" element={<PracticeDependencies />} />
                  <Route path="simulator/practice-dependencies/map" element={<PracticeDependencies />} />
                  <Route path="simulator/practice-dependencies/impact" element={<PracticeDependencies />} />
                  <Route path="simulator/practice-stakeholders/register" element={<PracticeStakeholderRegisterPage />} />
                  <Route path="simulator/practice-stakeholders/create" element={<PracticeStakeholderCreatePage />} />
                  <Route path="simulator/practice-stakeholders/analysis" element={<PracticeStakeholderAnalysis />} />
                  <Route path="simulator/practice-stakeholders/engagement" element={<PracticeEngagementPlanning />} />
                  <Route path="simulator/practice-stakeholders/communications" element={<PracticeCommunicationPlans />} />
                  <Route path="simulator/practice-stakeholders/monitoring" element={<PracticeStakeholderMonitoring />} />
                  <Route path="simulator/practice-stakeholders/assessment-matrix/new" element={<PracticeStakeholderAssessmentMatrixFormPage />} />
                  <Route path="simulator/practice-stakeholders/assessment-matrix/view/:recordKey" element={<PracticeStakeholderAssessmentMatrixFormPage />} />
                  <Route path="simulator/practice-stakeholders/assessment-matrix/edit/:recordKey" element={<PracticeStakeholderAssessmentMatrixFormPage />} />
                  <Route path="simulator/practice-stakeholders/assessment-matrix" element={<PracticeStakeholderAssessmentMatrixPage />} />
                  <Route path="simulator/practice-stakeholders/assessment-matrix/on-hold" element={<PracticeStakeholdersAssessmentMatrixOnHold />} />
                  <Route path="simulator/practice-stakeholders/engagement-actions" element={<PracticeEngagementActionsPage />} />
                  <Route path="simulator/practice-stakeholders/salience" element={<PracticeSaliencePage />} />
                  <Route path="simulator/practice-stakeholders/on-hold" element={<PracticeStakeholdersOnHold />} />
                  <Route path="simulator/practice-stakeholders" element={<Navigate to="/simulator/practice-stakeholders/register" replace />} />
                  <Route path="simulator/practice-governance" element={<PracticeGovernance />} />
                </Route>

    </>
  )
}
