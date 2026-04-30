import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import ErrorBoundary from './components/ErrorBoundary'
import AppToPlatformRedirect from './components/AppToPlatformRedirect'
import OfflineIndicator from './components/pwa/OfflineIndicator'
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt'

const LOADING_TIMEOUT_MS = 10000

/** Shows spinner first; after LOADING_TIMEOUT_MS shows "Taking too long? Refresh" so the page never hangs forever. */
function LoadingFallbackWithTimeout() {
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])
  if (timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Taking too long? The page may have failed to load.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
        >
          Refresh page
        </button>
      </div>
    )
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

// Lazy load landing page so initial bundle is minimal and "/" loads in milliseconds
const NidusHomepage = lazy(() => import('./pages/NidusHomepage'))

// Lazy load ALL other components to prevent blocking
// ThemeProvider is preloaded for critical routes
const ThemeProvider = lazy(() => import('./context/ThemeContext').then(m => ({ default: m.ThemeProvider })))
// Preload ThemeProvider for faster initial load
if (typeof window !== 'undefined') {
  import('./context/ThemeContext').catch(() => {});
}
const ToastProvider = lazy(() => import('./context/ToastContext').then(m => ({ default: m.ToastProvider })))
const Layout = lazy(() => import('./components/Layout'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))
const Home = lazy(() => import('./pages/Home'))
const PlatformHomepage = lazy(() => import('./pages/PlatformHomepage'))
const SimulatorHomepage = lazy(() => import('./pages/SimulatorHomepage'))
const Documentation = lazy(() => import('./pages/Documentation'))
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PlatformPricing = lazy(() => import('./pages/PlatformPricing'))
const BundlePricing = lazy(() => import('./pages/BundlePricing'))
const SimulatorPricing = lazy(() => import('./pages/SimulatorPricing'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PlatformRequestDemoPage = lazy(() => import('./pages/PlatformRequestDemoPage'))
const SimulatorRequestDemoPage = lazy(() => import('./pages/SimulatorRequestDemoPage'))

// Lazy load all other pages
const Projects = lazy(() => import('./pages/Projects'))
const ProjectsCreate = lazy(() => import('./pages/ProjectsCreate'))
const ProjectsDetail = lazy(() => import('./pages/ProjectsDetail'))
const ProjectsEdit = lazy(() => import('./pages/ProjectsEdit'))
const ScopeManagementPlanPage = lazy(() => import('./pages/scope/ScopeManagementPlan'))
const ScopeStatementPage = lazy(() => import('./pages/scope/ScopeStatement'))
const RequirementsRegisterPage = lazy(() => import('./pages/scope/RequirementsRegister'))
const RequirementDetailPage = lazy(() => import('./pages/scope/RequirementDetail'))
const TraceabilityMatrixPage = lazy(() => import('./pages/scope/TraceabilityMatrix'))
const WBSBuilderPage = lazy(() => import('./pages/scope/WBSBuilder'))
const ScheduleManagementPlanPage = lazy(() => import('./pages/schedule/ScheduleManagementPlan'))
const ActivityListPage = lazy(() => import('./pages/schedule/ActivityList'))
const ActivityDetailPage = lazy(() => import('./pages/schedule/ActivityDetail'))
const ActivitySequencingPage = lazy(() => import('./pages/schedule/ActivitySequencing'))
const GanttChartPage = lazy(() => import('./pages/schedule/GanttChart'))
// Draft Queue / On Hold Pages
const ProjectsOnHold = lazy(() => import('./pages/projects/ProjectsOnHold'))
const BenefitsOnHold = lazy(() => import('./pages/benefits/BenefitsOnHold'))
const StakeholdersOnHold = lazy(() => import('./pages/platform-app/StakeholdersOnHold'))
const IssuesOnHold = lazy(() => import('./pages/issues/IssuesOnHold'))
const RisksOnHold = lazy(() => import('./pages/risks/RisksOnHold'))
const QualityOnHold = lazy(() => import('./pages/quality/QualityOnHold'))
const DraftExpiryConfig = lazy(() => import('./pages/admin/DraftExpiryConfig'))
const Tasks = lazy(() => import('./pages/Tasks'))
const TasksBoard = lazy(() => import('./pages/TasksBoard'))
const TasksCalendar = lazy(() => import('./pages/TasksCalendar'))
const TasksCreate = lazy(() => import('./pages/TasksCreate'))
const TasksDetail = lazy(() => import('./pages/TasksDetail'))
const MethodologySelection = lazy(() => import('./pages/MethodologySelection'))
// Platform and Simulator Dashboards (new structure)
const PlatformDashboard = lazy(() => import('./pages/platform-app/Dashboard'))
const SimulatorDashboard = lazy(() => import('./pages/simulator-app/Dashboard'))
const SimAIWorkspace = lazy(() => import('./pages/simulator/SimAIWorkspace'))
const AIWorkspace = lazy(() => import('./pages/platform-app/AIWorkspace'))
const SubmitFeedback = lazy(() => import('./pages/support/SubmitFeedback'))
// PMO and PM Independent Dashboards
const PMODashboard = lazy(() => import('./pages/pmo/PMODashboard'))
const PMDashboard = lazy(() => import('./pages/pm/PMDashboard'))
const PMOLayout = lazy(() => import('./components/pmo/PMOLayout'))
const PMLayout = lazy(() => import('./components/pm/PMLayout'))
// PMO Page Wrappers
const PMOGovernanceMandateTemplate = lazy(() => import('./pages/pmo/PMOGovernanceMandateTemplate'))
const PMOGovernanceCMS = lazy(() => import('./pages/pmo/PMOGovernanceCMS'))
const PMOGovernanceConfigMS = lazy(() => import('./pages/pmo/PMOGovernanceConfigMS'))
const PMOGovernanceQMS = lazy(() => import('./pages/pmo/PMOGovernanceQMS'))
const PMOGovernanceRMS = lazy(() => import('./pages/pmo/PMOGovernanceRMS'))
const PMOInitiationBusinessCase = lazy(() => import('./pages/pmo/PMOInitiationBusinessCase'))
const PMOInitiationProjectBrief = lazy(() => import('./pages/pmo/PMOInitiationProjectBrief'))
const PMOInitiationBenefitsReviewPlan = lazy(() => import('./pages/pmo/PMOInitiationBenefitsReviewPlan'))
const PMOOversightRiskRegister = lazy(() => import('./pages/pmo/PMOOversightRiskRegister'))
const PMOOversightIssueRegister = lazy(() => import('./pages/pmo/PMOOversightIssueRegister'))
const PMOOversightQualityRegister = lazy(() => import('./pages/pmo/PMOOversightQualityRegister'))
const PMOOversightLessonsLog = lazy(() => import('./pages/pmo/PMOOversightLessonsLog'))
const PMOOversightScope = lazy(() => import('./pages/pmo/PMOOversightScope'))
const PMOOversightSchedules = lazy(() => import('./pages/pmo/PMOOversightSchedules'))
const PMOReportingHighlight = lazy(() => import('./pages/pmo/PMOReportingHighlight'))
const PMOReportingException = lazy(() => import('./pages/pmo/PMOReportingException'))
const PMOReportingEndStage = lazy(() => import('./pages/pmo/PMOReportingEndStage'))
const PMOReportingEndProject = lazy(() => import('./pages/pmo/PMOReportingEndProject'))
const PMOProcurementRFP = lazy(() => import('./pages/pmo/PMOProcurementRFP'))
const PMORFPView = lazy(() => import('./pages/pmo/PMORFPView'))
const PMORFPCreate = lazy(() => import('./pages/pmo/PMORFPCreate'))
const PMORFPEdit = lazy(() => import('./pages/pmo/PMORFPEdit'))
const PMORFPBulkImport = lazy(() => import('./pages/pmo/PMORFPBulkImport'))
const PMORFPPrint = lazy(() => import('./pages/pmo/PMORFPPrint'))
const PMORFPOnHold = lazy(() => import('./pages/pmo/PMORFPOnHold'))
// PM Page Wrappers
const PMGovernanceMandateTemplate = lazy(() => import('./pages/pm/PMGovernanceMandateTemplate'))
const PMGovernanceCMS = lazy(() => import('./pages/pm/PMGovernanceCMS'))
const PMGovernanceConfigMS = lazy(() => import('./pages/pm/PMGovernanceConfigMS'))
const PMGovernanceQMS = lazy(() => import('./pages/pm/PMGovernanceQMS'))
const PMGovernanceRMS = lazy(() => import('./pages/pm/PMGovernanceRMS'))
const PMInitiationBusinessCase = lazy(() => import('./pages/pm/PMInitiationBusinessCase'))
const PMInitiationProjectBrief = lazy(() => import('./pages/pm/PMInitiationProjectBrief'))
const PMInitiationPID = lazy(() => import('./pages/pm/PMInitiationPID'))
const PMInitiationBenefitsReviewPlan = lazy(() => import('./pages/pm/PMInitiationBenefitsReviewPlan'))
const PMDeliveryWorkPackages = lazy(() => import('./pages/pm/PMDeliveryWorkPackages'))
const PMDeliveryProductDescription = lazy(() => import('./pages/pm/PMDeliveryProductDescription'))
const PMDeliveryProjectProductDescription = lazy(() => import('./pages/pm/PMDeliveryProjectProductDescription'))
const PMDeliveryProductStatusAccount = lazy(() => import('./pages/pm/PMDeliveryProductStatusAccount'))
const PMDeliveryDailyLog = lazy(() => import('./pages/pm/PMDeliveryDailyLog'))
const PMControlsRiskRegister = lazy(() => import('./pages/pm/PMControlsRiskRegister'))
const PMControlsIssueRegister = lazy(() => import('./pages/pm/PMControlsIssueRegister'))
const PMControlsQualityRegister = lazy(() => import('./pages/pm/PMControlsQualityRegister'))
const PMControlsConfigItems = lazy(() => import('./pages/pm/PMControlsConfigItems'))
const PMControlsLessonsLog = lazy(() => import('./pages/pm/PMControlsLessonsLog'))
const PMReportingCheckpoint = lazy(() => import('./pages/pm/PMReportingCheckpoint'))
const PMReportingHighlight = lazy(() => import('./pages/pm/PMReportingHighlight'))
const PMReportingIssueReports = lazy(() => import('./pages/pm/PMReportingIssueReports'))
const PMReportingException = lazy(() => import('./pages/pm/PMReportingException'))
const PMReportingEndStage = lazy(() => import('./pages/pm/PMReportingEndStage'))
const PMClosureLessonsReport = lazy(() => import('./pages/pm/PMClosureLessonsReport'))
const PMClosureEndProjectReport = lazy(() => import('./pages/pm/PMClosureEndProjectReport'))
// Legacy Dashboard (for backward compatibility)
const Dashboard = lazy(() => import('./pages/Dashboard'))
// Platform Module Pages
const Teams = lazy(() => import('./pages/platform-app/Teams'))
const MyTeam = lazy(() => import('./pages/platform-app/MyTeam'))
const Governance = lazy(() => import('./pages/platform-app/Governance'))
const Portfolio = lazy(() => import('./pages/platform-app/Portfolio'))
const PortfolioCreatePage = lazy(() => import('./pages/platform-app/PortfolioCreatePage'))
const PortfolioFormPage = lazy(() => import('./pages/platform-app/PortfolioFormPage'))
const PortfolioDashboard = lazy(() => import('./pages/platform-app/PortfolioDashboard'))
const PortfolioProjects = lazy(() => import('./pages/platform-app/PortfolioProjects'))
const PortfolioResources = lazy(() => import('./pages/platform-app/PortfolioResources'))
const PortfolioFinancial = lazy(() => import('./pages/platform-app/PortfolioFinancial'))
const PortfolioReports = lazy(() => import('./pages/platform-app/PortfolioReports'))
const PortfolioGovernance = lazy(() => import('./pages/platform-app/PortfolioGovernance'))
const PortfolioCategories = lazy(() => import('./pages/platform-app/PortfolioCategories'))
const Programme = lazy(() => import('./pages/platform-app/Programme'))
const ProgrammeDetailPage = lazy(() => import('./pages/platform-app/ProgrammeDetailPage'))
const ProgrammeCreatePage = lazy(() => import('./pages/platform-app/ProgrammeCreatePage'))
const ProgrammeEditPage = lazy(() => import('./pages/platform-app/ProgrammeEditPage'))
const ProgrammeDashboardOverview = lazy(() => import('./pages/platform-app/ProgrammeDashboardOverview'))
const ProgrammeProjectsPage = lazy(() => import('./pages/platform-app/ProgrammeProjects'))
const ProgrammeDependenciesPage = lazy(() => import('./pages/platform-app/ProgrammeDependencies'))
const ProgrammeBenefitsPage = lazy(() => import('./pages/platform-app/ProgrammeBenefits'))
const ProgrammeTimelinePage = lazy(() => import('./pages/platform-app/ProgrammeTimeline'))
const ProgrammeReportsPage = lazy(() => import('./pages/platform-app/ProgrammeReports'))
const Strategy = lazy(() => import('./pages/platform-app/Strategy'))
const StrategicObjectives = lazy(() => import('./pages/StrategicObjectives'))
const StrategicAlignment = lazy(() => import('./pages/StrategicAlignment'))
const StrategicContribution = lazy(() => import('./pages/StrategicContribution'))
const StrategicPortfolio = lazy(() => import('./pages/StrategicPortfolio'))
const StrategicReports = lazy(() => import('./pages/StrategicReports'))
const Quality = lazy(() => import('./pages/platform-app/Quality'))
const QualityManagement = lazy(() => import('./pages/QualityManagement'))
const QualityReviews = lazy(() => import('./pages/QualityReviews'))
const QualityInspections = lazy(() => import('./pages/QualityInspections'))
const QualityReports = lazy(() => import('./pages/QualityReports'))
const QualityActivityView = lazy(() => import('./pages/QualityActivityView'))
const MyQualityActions = lazy(() => import('./pages/MyQualityActions'))
const Stakeholders = lazy(() => import('./pages/platform-app/Stakeholders'))
const StakeholderRegisterPage = lazy(() => import('./pages/platform-app/StakeholderRegisterPage'))
const StakeholderFormPage = lazy(() => import('./pages/platform-app/StakeholderFormPage'))
const StakeholderProfilePage = lazy(() => import('./pages/platform-app/StakeholderProfilePage'))
const StakeholderAnalysisPage = lazy(() => import('./pages/platform-app/StakeholderAnalysisPage'))
const StakeholderEngagementPage = lazy(() => import('./pages/platform-app/StakeholderEngagementPage'))
const CommunicationPlanPage = lazy(() => import('./pages/platform-app/CommunicationPlanPage'))
const StakeholderMonitoringPage = lazy(() => import('./pages/platform-app/StakeholderMonitoringPage'))
const TestDashboard = lazy(() => import('./pages/testing/TestDashboard'))
const TestSuites = lazy(() => import('./pages/testing/TestSuites'))
const TestSuiteDetail = lazy(() => import('./pages/testing/TestSuiteDetail'))
const TestCases = lazy(() => import('./pages/testing/TestCases'))
const TestCaseCreate = lazy(() => import('./pages/testing/TestCaseCreate'))
const TestCaseDetail = lazy(() => import('./pages/testing/TestCaseDetail'))
const TestCaseBulkUpload = lazy(() => import('./pages/testing/TestCaseBulkUpload'))
const TestRuns = lazy(() => import('./pages/testing/TestRuns'))
const TestRunDetail = lazy(() => import('./pages/testing/TestRunDetail'))
const TestRunExecute = lazy(() => import('./pages/testing/TestRunExecute'))
const DefectListPage = lazy(() => import('./pages/testing/DefectList'))
const DefectDetailPage = lazy(() => import('./pages/testing/DefectDetail'))
const DefectDashboardPage = lazy(() => import('./pages/testing/DefectDashboard'))
const SimTestDashboard = lazy(() => import('./pages/sim/testing/SimTestDashboard'))
const SimTestSuites = lazy(() => import('./pages/sim/testing/SimTestSuites'))
const SimTestSuiteDetail = lazy(() => import('./pages/sim/testing/SimTestSuiteDetail'))
const SimTestCases = lazy(() => import('./pages/sim/testing/SimTestCases'))
const SimTestCaseCreate = lazy(() => import('./pages/sim/testing/SimTestCaseCreate'))
const SimTestCaseDetail = lazy(() => import('./pages/sim/testing/SimTestCaseDetail'))
const SimTestCaseBulkUpload = lazy(() => import('./pages/sim/testing/SimTestCaseBulkUpload'))
const SimTestRuns = lazy(() => import('./pages/sim/testing/SimTestRuns'))
const SimTestRunDetail = lazy(() => import('./pages/sim/testing/SimTestRunDetail'))
const SimTestRunExecute = lazy(() => import('./pages/sim/testing/SimTestRunExecute'))
const SimDefectListPage = lazy(() => import('./pages/sim/testing/SimDefectList'))
const SimDefectDetailPage = lazy(() => import('./pages/sim/testing/SimDefectDetail'))
const SimDefectDashboardPage = lazy(() => import('./pages/sim/testing/SimDefectDashboard'))
const BrandingSettings = lazy(() => import('./pages/platform-app/organisation/BrandingSettings'))
const BrandingHistory  = lazy(() => import('./pages/platform-app/organisation/BrandingHistory'))
const PMOAdmin = lazy(() => import('./pages/platform-app/PMOAdmin'))
const ProjectTypes = lazy(() => import('./pages/platform-app/ProjectTypes'))
const ProjectStatuses = lazy(() => import('./pages/platform-app/ProjectStatuses'))
const FundingSources = lazy(() => import('./pages/platform-app/FundingSources'))
const BudgetCategories = lazy(() => import('./pages/platform-app/BudgetCategories'))
const ManagerAssignments = lazy(() => import('./pages/pmo/ManagerAssignments'))
const ManagerAssignmentSettings = lazy(() => import('./pages/pmo/ManagerAssignmentSettings'))
const PMORoleMenuManagement = lazy(() => import('./pages/pmo/PMORoleMenuManagement'))
const AdminRoleMenuManagement = lazy(() => import('./pages/admin/AdminRoleMenuManagement'))
const ProjectCostManagement = lazy(() => import('./pages/platform-app/ProjectCostManagement'))
const ProjectBudgetBaseline = lazy(() => import('./pages/platform-app/ProjectBudgetBaseline'))
const ProjectEVMPage = lazy(() => import('./pages/platform-app/ProjectEVMPage'))
const ProgrammeEVMPage = lazy(() => import('./pages/platform-app/ProgrammeEVMPage'))
const PortfolioEVMPage = lazy(() => import('./pages/platform-app/PortfolioEVMPage'))
const ProgrammeFinancialDashboard = lazy(() => import('./pages/platform-app/ProgrammeFinancialDashboard'))
const ProjectProfitability = lazy(() => import('./pages/platform-app/ProjectProfitability'))
const MyExpenses = lazy(() => import('./pages/platform-app/MyExpenses'))
const ExpenseApproval = lazy(() => import('./pages/platform-app/ExpenseApproval'))
const ExpenseApprovalThresholds = lazy(() => import('./pages/platform-app/ExpenseApprovalThresholds'))
const FinancialReportingHub = lazy(() => import('./pages/platform-app/FinancialReportingHub'))
const SimProjectCostManagement = lazy(() => import('./pages/simulator/SimProjectCostManagement'))
const SimProjectBudgetBaseline = lazy(() => import('./pages/simulator/SimProjectBudgetBaseline'))
const SimProjectEVMPage = lazy(() => import('./pages/simulator/SimProjectEVMPage'))
const SimProgrammeEVMPage = lazy(() => import('./pages/simulator/SimProgrammeEVMPage'))
const SimPortfolioEVMPage = lazy(() => import('./pages/simulator/SimPortfolioEVMPage'))
const SimProgrammeFinancialDashboard = lazy(() => import('./pages/simulator/SimProgrammeFinancialDashboard'))
const SimProjectProfitability = lazy(() => import('./pages/simulator/SimProjectProfitability'))
const SimMyExpenses = lazy(() => import('./pages/simulator/SimMyExpenses'))
const SimExpenseApproval = lazy(() => import('./pages/simulator/SimExpenseApproval'))
const SimExpenseApprovalThresholds = lazy(() => import('./pages/simulator/SimExpenseApprovalThresholds'))
const SimFinancialReportingHub = lazy(() => import('./pages/simulator/SimFinancialReportingHub'))
const SimSprintMetricsDashboard = lazy(() => import('./pages/simulator/SimSprintMetricsDashboard'))
const SimAgileTemplates = lazy(() => import('./pages/simulator/SimAgileTemplates'))
const SimStoryMap = lazy(() => import('./pages/simulator/SimStoryMap'))
const SimAgileReleases = lazy(() => import('./pages/simulator/SimAgileReleases'))
const SimAgileReleaseDetail = lazy(() => import('./pages/simulator/SimAgileReleaseDetail'))
const SimAgileRoadmap = lazy(() => import('./pages/simulator/SimAgileRoadmap'))
const SimXPDashboard = lazy(() => import('./pages/simulator/SimXPDashboard'))
const SimValueStreamMap = lazy(() => import('./pages/simulator/SimValueStreamMap'))
const SimKaizenBoard = lazy(() => import('./pages/simulator/SimKaizenBoard'))
const SimLeanMetrics = lazy(() => import('./pages/simulator/SimLeanMetrics'))
const SimScrumOfScrums = lazy(() => import('./pages/simulator/SimScrumOfScrums'))
const SimAgileMetricsHub = lazy(() => import('./pages/simulator/SimAgileMetricsHub'))
const SimKanbanMetrics = lazy(() => import('./pages/simulator/SimKanbanMetrics'))
const LifecycleTemplates = lazy(() => import('./pages/platform-app/LifecycleTemplates'))
const Reports = lazy(() => import('./pages/platform-app/Reports'))
const OrgKnowledgeHub = lazy(() => import('./pages/org-knowledge/OrgKnowledgeHub'))
const EEFList = lazy(() => import('./pages/eef/EEFList'))
const EEFCreate = lazy(() => import('./pages/eef/EEFCreate'))
const EEFDetail = lazy(() => import('./pages/eef/EEFDetail'))
const EEFEdit = lazy(() => import('./pages/eef/EEFEdit'))
const EEFOnHold = lazy(() => import('./pages/eef/EEFOnHold'))
const EEFBulkUpload = lazy(() => import('./pages/eef/EEFBulkUpload'))
const ITTOTemplateList = lazy(() => import('./pages/itto/ITTOTemplateList'))
const ProjectITTOList = lazy(() => import('./pages/itto/ProjectITTOList'))
const ITTODraftsQueue = lazy(() => import('./pages/itto/ITTODraftsQueue'))
const SimITTOTemplateList = lazy(() => import('./pages/sim/itto/SimITTOTemplateList'))
const SimProjectITTOList = lazy(() => import('./pages/sim/itto/SimProjectITTOList'))
const SimITTODraftsQueue = lazy(() => import('./pages/sim/itto/SimITTODraftsQueue'))
const DelayRegister = lazy(() => import('./pages/delays/DelayRegister'))
const DelayTemplates = lazy(() => import('./pages/pmo/DelayTemplates'))
const SimDelayRegister = lazy(() => import('./pages/sim/delays/SimDelayRegister'))
const SimDelayTemplates = lazy(() => import('./pages/sim/pmo/SimDelayTemplates'))
const PlanningHub = lazy(() => import('./pages/planning/PlanningHub'))
const PlanningIntelligenceDashboard = lazy(() => import('./pages/planning/intelligence/PlanningIntelligenceDashboard'))
const ScenarioList = lazy(() => import('./pages/planning/scenarios/ScenarioList'))
const PBSBuilder = lazy(() => import('./pages/planning/pbs/PBSBuilder'))
const PlanHealthDashboard = lazy(() => import('./pages/planning/health/PlanHealthDashboard'))
const AIPlanGenerator = lazy(() => import('./pages/planning/ai/AIPlanGenerator'))
const ExecutivePlanView = lazy(() => import('./pages/planning/executive/ExecutivePlanView'))
const PortfolioCollisionDashboard = lazy(() => import('./pages/planning/portfolio/PortfolioCollisionDashboard'))
const RecoveryPlanningView = lazy(() => import('./pages/planning/recovery/RecoveryPlanningView'))
const ConfidenceForecastView = lazy(() => import('./pages/planning/confidence/ConfidenceForecastView'))
const GovernanceGateChecklist = lazy(() => import('./pages/planning/governance/GovernanceGateChecklist'))
const MicroPlanList = lazy(() => import('./pages/planning/microplans/MicroPlanList'))
const MicroPlanDetail = lazy(() => import('./pages/planning/microplans/MicroPlanDetail'))
const MicroPlanDraftQueue = lazy(() => import('./pages/planning/microplans/MicroPlanDraftQueue'))
const OPAList = lazy(() => import('./pages/opa/OPAList'))
const OPACreate = lazy(() => import('./pages/opa/OPACreate'))
const OPADetail = lazy(() => import('./pages/opa/OPADetail'))
const OPAEdit = lazy(() => import('./pages/opa/OPAEdit'))
const OPAOnHold = lazy(() => import('./pages/opa/OPAOnHold'))
const OPABulkUpload = lazy(() => import('./pages/opa/OPABulkUpload'))
const SimEEFList = lazy(() => import('./pages/simulator/eef/SimEEFList'))
const SimEEFCreate = lazy(() => import('./pages/simulator/eef/SimEEFCreate'))
const SimEEFDetail = lazy(() => import('./pages/simulator/eef/SimEEFDetail'))
const SimEEFEdit = lazy(() => import('./pages/simulator/eef/SimEEFEdit'))
const SimEEFOnHold = lazy(() => import('./pages/simulator/eef/SimEEFOnHold'))
const SimEEFBulkUpload = lazy(() => import('./pages/simulator/eef/SimEEFBulkUpload'))
const SimOPAList = lazy(() => import('./pages/simulator/opa/SimOPAList'))
const SimOPACreate = lazy(() => import('./pages/simulator/opa/SimOPACreate'))
const SimOPADetail = lazy(() => import('./pages/simulator/opa/SimOPADetail'))
const SimOPAEdit = lazy(() => import('./pages/simulator/opa/SimOPAEdit'))
const SimOPAOnHold = lazy(() => import('./pages/simulator/opa/SimOPAOnHold'))
const SimOPABulkUpload = lazy(() => import('./pages/simulator/opa/SimOPABulkUpload'))
const TemplateLibraryList = lazy(() => import('./pages/templates/TemplateLibraryList'))
const TemplateLibraryManage = lazy(() => import('./pages/templates/TemplateLibraryManage'))
const TemplateCreate = lazy(() => import('./pages/templates/TemplateCreate'))
const TemplateEdit = lazy(() => import('./pages/templates/TemplateEdit'))
const TemplateDetail = lazy(() => import('./pages/templates/TemplateDetail'))
const TemplateMasterVersionHistory = lazy(() => import('./pages/templates/TemplateMasterVersionHistory'))
const TemplateCategories = lazy(() => import('./pages/templates/TemplateCategories'))
const TemplateBulkUpload = lazy(() => import('./pages/templates/TemplateBulkUpload'))
const TemplateUpdateNotifications = lazy(() => import('./pages/templates/TemplateUpdateNotifications'))
const ProjectTemplateCopyList = lazy(() => import('./pages/templates/ProjectTemplateCopyList'))
const ProjectTemplateCopyCreate = lazy(() => import('./pages/templates/ProjectTemplateCopyCreate'))
const ProjectTemplateCopyEdit = lazy(() => import('./pages/templates/ProjectTemplateCopyEdit'))
const ProjectTemplateCopyDetail = lazy(() => import('./pages/templates/ProjectTemplateCopyDetail'))
const ProjectTemplateCopyVersionHistory = lazy(() => import('./pages/templates/ProjectTemplateCopyVersionHistory'))
const TemplateOnHold = lazy(() => import('./pages/templates/TemplateOnHold'))
const SimTemplateLibraryList = lazy(() => import('./pages/simulator/templates/SimTemplateLibraryList'))
const SimTemplateLibraryManage = lazy(() => import('./pages/simulator/templates/SimTemplateLibraryManage'))
const SimTemplateCreate = lazy(() => import('./pages/simulator/templates/SimTemplateCreate'))
const SimTemplateEdit = lazy(() => import('./pages/simulator/templates/SimTemplateEdit'))
const SimTemplateDetail = lazy(() => import('./pages/simulator/templates/SimTemplateDetail'))
const SimTemplateMasterVersionHistory = lazy(() => import('./pages/simulator/templates/SimTemplateMasterVersionHistory'))
const SimTemplateCategories = lazy(() => import('./pages/simulator/templates/SimTemplateCategories'))
const SimTemplateBulkUpload = lazy(() => import('./pages/simulator/templates/SimTemplateBulkUpload'))
const SimTemplateUpdateNotifications = lazy(() => import('./pages/simulator/templates/SimTemplateUpdateNotifications'))
const SimProjectTemplateCopyList = lazy(() => import('./pages/simulator/templates/SimProjectTemplateCopyList'))
const SimProjectTemplateCopyCreate = lazy(() => import('./pages/simulator/templates/SimProjectTemplateCopyCreate'))
const SimProjectTemplateCopyEdit = lazy(() => import('./pages/simulator/templates/SimProjectTemplateCopyEdit'))
const SimProjectTemplateCopyDetail = lazy(() => import('./pages/simulator/templates/SimProjectTemplateCopyDetail'))
const SimProjectTemplateCopyVersionHistory = lazy(() => import('./pages/simulator/templates/SimProjectTemplateCopyVersionHistory'))
const SimTemplateOnHold = lazy(() => import('./pages/simulator/templates/SimTemplateOnHold'))
const CommsHub = lazy(() => import('./pages/comms/CommsHub'))
const DirectMessages = lazy(() => import('./pages/comms/DirectMessages'))
const ChannelView = lazy(() => import('./pages/comms/ChannelView'))
const MeetingList = lazy(() => import('./pages/comms/MeetingList'))
const MeetingSchedule = lazy(() => import('./pages/comms/MeetingSchedule'))
const MeetingRoom = lazy(() => import('./pages/comms/MeetingRoom'))
const MeetingDetail = lazy(() => import('./pages/comms/MeetingDetail'))
const MeetingSummaryView = lazy(() => import('./pages/comms/MeetingSummaryView'))
const PendingAIReview = lazy(() => import('./pages/comms/PendingAIReview'))
const MeetingExtractionReview = lazy(() => import('./pages/comms/MeetingExtractionReview'))
const ExtractedIssueEnrich = lazy(() => import('./pages/comms/ExtractedIssueEnrich'))
const ExtractedRiskEnrich = lazy(() => import('./pages/comms/ExtractedRiskEnrich'))
const DocumentGovernance = lazy(() => import('./pages/platform-app/DocumentGovernance'))
const DocumentRegister = lazy(() => import('./pages/platform-app/DocumentRegister'))
const DocumentCompliance = lazy(() => import('./pages/platform-app/DocumentCompliance'))
const ProgrammeDocuments = lazy(() => import('./pages/platform-app/ProgrammeDocuments'))
const MethodologyDashboard = lazy(() => import('./pages/MethodologyDashboard'))
const StartingUpProject = lazy(() => import('./pages/structured/StartingUpProject'))
const InitiatingProject = lazy(() => import('./pages/structured/InitiatingProject'))
const StageGates = lazy(() => import('./pages/structured/StageGates'))
const ControllingStage = lazy(() => import('./pages/structured/ControllingStage'))
const ManagingProductDelivery = lazy(() => import('./pages/structured/ManagingProductDelivery'))
const DirectingProject = lazy(() => import('./pages/structured/DirectingProject'))
// Plan Documentation Pages
const PlansDashboard = lazy(() => import('./pages/plans/PlansDashboard'))
const ProjectPlanCreate = lazy(() => import('./pages/plans/ProjectPlanCreate'))
const ProjectPlanEdit = lazy(() => import('./pages/plans/ProjectPlanEdit'))
const ProjectPlanViewPage = lazy(() => import('./pages/plans/ProjectPlanViewPage'))
const StagePlanCreate = lazy(() => import('./pages/plans/StagePlanCreate'))
const StagePlanEdit = lazy(() => import('./pages/plans/StagePlanEdit'))
const StagePlanViewPage = lazy(() => import('./pages/plans/StagePlanViewPage'))
// Product Description Pages
const ProductDescriptionList = lazy(() => import('./pages/productDescription/ProductDescriptionList'))
const ProductDescriptionCreate = lazy(() => import('./pages/productDescription/ProductDescriptionCreate'))
const ProductDescriptionEdit = lazy(() => import('./pages/productDescription/ProductDescriptionEdit'))
const ProductDescriptionViewPage = lazy(() => import('./pages/productDescription/ProductDescriptionViewPage'))
const ProductDescriptionTemplates = lazy(() => import('./pages/productDescription/ProductDescriptionTemplates'))
// Product Status Account Pages
const ProductStatusAccountList = lazy(() => import('./pages/productStatusAccount/ProductStatusAccountList'))
const ProductStatusAccountViewPage = lazy(() => import('./pages/productStatusAccount/ProductStatusAccountViewPage'))
const ProductStatusAccountCreate = lazy(() => import('./pages/productStatusAccount/ProductStatusAccountCreate'))
const ProductStatusAccountEdit = lazy(() => import('./pages/productStatusAccount/ProductStatusAccountEdit'))
const ProductStatusAccountDashboard = lazy(() => import('./pages/productStatusAccount/ProductStatusAccountDashboard'))
const Issues = lazy(() => import('./pages/Issues'))
const IssueRegisterView = lazy(() => import('./pages/IssueRegisterView'))
const IssueDetailView = lazy(() => import('./pages/IssueDetailView'))
const IssueAnalytics = lazy(() => import('./pages/IssueAnalytics'))
const MyIssueActions = lazy(() => import('./pages/MyIssueActions'))
const PendingDecisions = lazy(() => import('./pages/PendingDecisions'))
const IssueScaleConfig = lazy(() => import('./pages/IssueScaleConfig'))
const IssueReportCreate = lazy(() => import('./pages/IssueReportCreate'))
const IssueReportEdit = lazy(() => import('./pages/IssueReportEdit'))
const IssueReportView = lazy(() => import('./pages/IssueReportView'))
const IssueReportsList = lazy(() => import('./pages/IssueReportsList'))
const PPDView = lazy(() => import('./pages/PPDView'))
const PPDList = lazy(() => import('./pages/PPDList'))
const PIDView = lazy(() => import('./pages/pid/PIDView'))
const WorkPackageView = lazy(() => import('./pages/workpackage/WorkPackageView'))
const CheckpointReportList = lazy(() => import('./pages/structured/CheckpointReportList'))
const CheckpointReportCreate = lazy(() => import('./pages/structured/CheckpointReportCreate'))
const CheckpointReportView = lazy(() => import('./pages/structured/CheckpointReportView'))
const CheckpointReportEdit = lazy(() => import('./pages/structured/CheckpointReportEdit'))
const ClosingProject = lazy(() => import('./pages/structured/ClosingProject'))
const EndProjectReportView = lazy(() => import('./pages/structured/EndProjectReportView'))
const EndProjectReportWizard = lazy(() => import('./pages/structured/EndProjectReportWizard'))
const EPRComparisonView = lazy(() => import('./pages/structured/EPRComparisonView'))
const StageBoundaries = lazy(() => import('./pages/structured/StageBoundaries'))
const EndStageReportView = lazy(() => import('./pages/structured/EndStageReportView'))
const EndStageReportCreate = lazy(() => import('./pages/structured/EndStageReportCreate'))
const EndStageReportEdit = lazy(() => import('./pages/structured/EndStageReportEdit'))
const ExceptionReportList = lazy(() => import('./pages/structured/ExceptionReportList'))
const ExceptionReportCreate = lazy(() => import('./pages/structured/ExceptionReportCreate'))
const ExceptionReportEdit = lazy(() => import('./pages/structured/ExceptionReportEdit'))
const ExceptionReportView = lazy(() => import('./pages/structured/ExceptionReportView'))
const ExceptionReportDashboard = lazy(() => import('./pages/structured/ExceptionReportDashboard'))
const HighlightReportCreate = lazy(() => import('./pages/structured/HighlightReportCreate'))
const HighlightReportView = lazy(() => import('./pages/structured/HighlightReportView'))
const HighlightReportEdit = lazy(() => import('./pages/structured/HighlightReportEdit'))
const AcceptanceTestingPage = lazy(() => import('./pages/AcceptanceTestingPage'))
const QMSView = lazy(() => import('./pages/QMSView'))
const QMSList = lazy(() => import('./pages/QMSList'))
const QMSTemplates = lazy(() => import('./pages/QMSTemplates'))
const RMSView = lazy(() => import('./pages/RMSView'))
const RMSList = lazy(() => import('./pages/RMSList'))
const CMSView = lazy(() => import('./pages/CMSView'))
const CMSCreate = lazy(() => import('./pages/CMSCreate'))
const CMSEdit = lazy(() => import('./pages/CMSEdit'))
const CMSList = lazy(() => import('./pages/CMSList'))
const CMSTemplates = lazy(() => import('./pages/CMSTemplates'))
const CommunicationActivitiesCalendar = lazy(() => import('./pages/CommunicationActivitiesCalendar'))
const ConfigurationMSView = lazy(() => import('./pages/ConfigurationMSView'))
const ConfigurationMSCreate = lazy(() => import('./pages/ConfigurationMSCreate'))
const ConfigurationMSEdit = lazy(() => import('./pages/ConfigurationMSEdit'))
const ConfigurationMSList = lazy(() => import('./pages/ConfigurationMSList'))
const ConfigurationItemRegister = lazy(() => import('./pages/ConfigurationItemRegister'))
const ConfigurationItemRecordView = lazy(() => import('./pages/ConfigurationItemRecordView'))
const ConfigurationItemRecordCreate = lazy(() => import('./pages/ConfigurationItemRecordCreate'))
const ConfigurationItemRecordEdit = lazy(() => import('./pages/ConfigurationItemRecordEdit'))
const Risks = lazy(() => import('./pages/Risks'))
const RiskDetail = lazy(() => import('./pages/RiskDetail'))
const RAIDLog = lazy(() => import('./pages/RAIDLog'))
const ProductBacklog = lazy(() => import('./pages/scrum/ProductBacklog'))
const SprintPlanning = lazy(() => import('./pages/scrum/SprintPlanning'))
const SprintBoard = lazy(() => import('./pages/scrum/SprintBoard'))
const DailyScrum = lazy(() => import('./pages/scrum/DailyScrum'))
const SprintReview = lazy(() => import('./pages/scrum/SprintReview'))
const SprintRetrospective = lazy(() => import('./pages/scrum/SprintRetrospective'))
const SprintMetricsDashboard = lazy(() => import('./pages/scrum/SprintMetricsDashboard'))
const AgileTemplates = lazy(() => import('./pages/scrum/AgileTemplates'))
const StoryMap = lazy(() => import('./pages/scrum/StoryMap'))
const AgileReleases = lazy(() => import('./pages/scrum/AgileReleases'))
const AgileReleaseDetail = lazy(() => import('./pages/scrum/AgileReleaseDetail'))
const AgileRoadmap = lazy(() => import('./pages/scrum/AgileRoadmap'))
const ScrumOfScrums = lazy(() => import('./pages/scrum/ScrumOfScrums'))
const XPDashboard = lazy(() => import('./pages/xp/XPDashboard'))
const ValueStreamMap = lazy(() => import('./pages/lean/ValueStreamMap'))
const KaizenBoard = lazy(() => import('./pages/lean/KaizenBoard'))
const LeanMetrics = lazy(() => import('./pages/lean/LeanMetrics'))
const AgileMetricsHub = lazy(() => import('./pages/agile/AgileMetricsHub'))
const KanbanBoards = lazy(() => import('./pages/kanban/KanbanBoards'))
const KanbanBoard = lazy(() => import('./pages/kanban/KanbanBoard'))
const MetricsDashboard = lazy(() => import('./pages/kanban/MetricsDashboard'))
const Resources = lazy(() => import('./pages/Resources'))
const ResourceCapacity = lazy(() => import('./pages/ResourceCapacity'))
const ResourceDetail = lazy(() => import('./pages/ResourceDetail'))
const ResourceConflicts = lazy(() => import('./pages/ResourceConflicts'))
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const Benefits = lazy(() => import('./pages/platform-app/Benefits'))
const BenefitsRegisterPage = lazy(() => import('./pages/benefits/Benefits'))
const BenefitsRealizationPage = lazy(() => import('./pages/benefits/BenefitsRealization'))
const BenefitMeasurementsPage = lazy(() => import('./pages/benefits/BenefitMeasurements'))
const BenefitCreatePage = lazy(() => import('./pages/platform-app/BenefitCreatePage'))
const BenefitDetailPage = lazy(() => import('./pages/platform-app/BenefitDetailPage'))
const BenefitsReviewPlan = lazy(() => import('./pages/BenefitsReviewPlan'))
const Dependencies = lazy(() => import('./pages/platform-app/Dependencies'))
const DependencyCreatePage = lazy(() => import('./pages/platform-app/DependencyCreatePage'))
const DependencyMap = lazy(() => import('./pages/DependencyMap'))
const DependencyImpacts = lazy(() => import('./pages/DependencyImpacts'))
const BenefitsRealization = lazy(() => import('./pages/BenefitsRealization')) // Legacy
const DependenciesLegacy = lazy(() => import('./pages/Dependencies')) // Legacy
const IntegrationSync = lazy(() => import('./pages/IntegrationSync'))
const Login = lazy(() => import('./pages/auth/Login'))
const PlatformLogin = lazy(() => import('./pages/auth/PlatformLogin'))
const SimulatorLogin = lazy(() => import('./pages/auth/SimulatorLogin'))
const Register = lazy(() => import('./pages/auth/Register'))
const PlatformRegister = lazy(() => import('./pages/auth/PlatformRegister'))
const SimulatorRegister = lazy(() => import('./pages/auth/SimulatorRegister'))
const EmailConfirmation = lazy(() => import('./pages/auth/EmailConfirmation'))
const RoleSelection = lazy(() => import('./pages/onboarding/RoleSelection'))
const PlatformAccountSetup = lazy(() => import('./pages/onboarding/PlatformAccountSetup'))
const PlatformChoice = lazy(() => import('./pages/onboarding/PlatformChoice'))
const OrganisationSetup = lazy(() => import('./pages/onboarding/OrganisationSetup'))
const OrganisationVerificationNotice = lazy(() => import('./pages/onboarding/OrganisationVerificationNotice'))
const VerifyOrganisation = lazy(() => import('./pages/onboarding/VerifyOrganisation'))
const ProjectTypeSelection = lazy(() => import('./pages/onboarding/ProjectTypeSelection'))
const TrialProjectSetup = lazy(() => import('./pages/onboarding/TrialProjectSetup'))
const PaidProjectSetup = lazy(() => import('./pages/onboarding/PaidProjectSetup'))
const FreeTrialDashboard = lazy(() => import('./pages/dashboard/FreeTrialDashboard'))
const TrialUpgrade = lazy(() => import('./pages/trial/TrialUpgrade'))
const RoleAssignment = lazy(() => import('./pages/admin/RoleAssignment'))
const AssignRolesToProjects = lazy(() => import('./pages/admin/AssignRolesToProjects'))
const SendRoleInvites = lazy(() => import('./pages/admin/SendRoleInvites'))
const ChangeLogPage = lazy(() => import('./pages/change/ChangeLogPage'))
const WorkAuthorisationListPage = lazy(() => import('./pages/workAuthorisation/WorkAuthorisationListPage'))
const WorkAuthorisationDraftsPage = lazy(() => import('./pages/workAuthorisation/WorkAuthorisationDraftsPage'))
const WorkAuthorisationCreatePage = lazy(() => import('./pages/workAuthorisation/WorkAuthorisationCreatePage'))
const WorkAuthorisationDetailPage = lazy(() => import('./pages/workAuthorisation/WorkAuthorisationDetailPage'))
const TestingCentreRoutesPlatform = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesPlatform })))
const TestingCentreRoutesPm = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesPm })))
const TestingCentreRoutesPmo = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesPmo })))
const TestingCentreRoutesSim = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesSim })))
const TestingCentreRoutesSimPm = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesSimPm })))
const TestingCentreRoutesSimPmo = lazy(() => import('./pages/testingCentre/TestingCentreRoutes').then((m) => ({ default: m.TestingCentreRoutesSimPmo })))
const FormsGallery = lazy(() => import('./pages/forms/FormsGallery'))
const FormNew = lazy(() => import('./pages/forms/FormNew'))
const FormEdit = lazy(() => import('./pages/forms/FormEdit'))
const FormView = lazy(() => import('./pages/forms/FormView'))
const FormTemplateAdmin = lazy(() => import('./pages/forms/FormTemplateAdmin'))
const ProjectMemberInvitation = lazy(() => import('./pages/projects/ProjectMemberInvitation'))
const Settings = lazy(() => import('./pages/Settings'))
const PWASettings = lazy(() => import('./pages/app/PWASettings'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))
// Business Case pages (Platform)
const BusinessCaseListPage = lazy(() => import('./pages/businessCase/BusinessCaseListPage'))
const BusinessCaseCreate = lazy(() => import('./pages/businessCase/BusinessCaseCreate'))
const BusinessCaseViewPage = lazy(() => import('./pages/businessCase/BusinessCaseViewPage'))
const BusinessCaseEdit = lazy(() => import('./pages/businessCase/BusinessCaseEdit'))
// Mandate pages (Platform)
const ProjectMandateCreate = lazy(() => import('./pages/mandate/ProjectMandateCreate'))
const ProjectMandateView = lazy(() => import('./pages/mandate/ProjectMandateView'))
const ProjectMandateEdit = lazy(() => import('./pages/mandate/ProjectMandateEdit'))
const MandateList = lazy(() => import('./pages/mandate/MandateList'))
const UnlinkedMandatesList = lazy(() => import('./pages/mandate/UnlinkedMandatesList'))
const ProjectCreationWizard = lazy(() => import('./pages/mandate/ProjectCreationWizard'))
const MandateApprovalDashboard = lazy(() => import('./pages/mandate/MandateApprovalDashboard'))
// Simulator mandate pages (Learning/Practice)
const SimMandateCreate = lazy(() => import('./pages/simulator/SimMandateCreate'))
const SimMandateView = lazy(() => import('./pages/simulator/SimMandateView'))
const SimMandateEdit = lazy(() => import('./pages/simulator/SimMandateEdit'))
const SimMandateList = lazy(() => import('./pages/simulator/SimMandateList'))
// Simulator PM planning (scope & schedule)
const SimScopeManagementPlanPage = lazy(() => import('./pages/simulator/scope/ScopeManagementPlan'))
const SimScopeStatementPage = lazy(() => import('./pages/simulator/scope/ScopeStatement'))
const SimRequirementsRegisterPage = lazy(() => import('./pages/simulator/scope/RequirementsRegister'))
const SimRequirementDetailPage = lazy(() => import('./pages/simulator/scope/RequirementDetail'))
const SimTraceabilityMatrixPage = lazy(() => import('./pages/simulator/scope/TraceabilityMatrix'))
const SimWBSBuilderPage = lazy(() => import('./pages/simulator/scope/WBSBuilder'))
const SimScheduleManagementPlanPage = lazy(() => import('./pages/simulator/schedule/ScheduleManagementPlan'))
const SimActivityListPage = lazy(() => import('./pages/simulator/schedule/ActivityList'))
const SimActivityDetailPage = lazy(() => import('./pages/simulator/schedule/ActivityDetail'))
const SimActivitySequencingPage = lazy(() => import('./pages/simulator/schedule/ActivitySequencing'))
const SimGanttChartPage = lazy(() => import('./pages/simulator/schedule/GanttChart'))
// Practice Projects
const PracticeProjects = lazy(() => import('./pages/simulator/PracticeProjects'))
const SimProjectMembers = lazy(() => import('./pages/simulator/SimProjectMembers'))
const ProjectUsers = lazy(() => import('./pages/app/ProjectUsers'))
const PracticeProjectCreate = lazy(() => import('./pages/simulator/PracticeProjectCreate'))
const PracticeProjectDetail = lazy(() => import('./pages/simulator/PracticeProjectDetail'))
const PracticeTasks = lazy(() => import('./pages/simulator/PracticeTasks'))
const PracticeTaskDetail = lazy(() => import('./pages/simulator/PracticeTaskDetail'))
// Practice Briefs
const PracticeBriefList = lazy(() => import('./pages/simulator/PracticeBriefList'))
const PracticeBriefCreate = lazy(() => import('./pages/simulator/PracticeBriefCreate'))
const PracticeBriefView = lazy(() => import('./pages/simulator/PracticeBriefView'))
const PracticeBriefEdit = lazy(() => import('./pages/simulator/PracticeBriefEdit'))
// Practice Business Cases
const PracticeBusinessCaseList = lazy(() => import('./pages/simulator/PracticeBusinessCaseList'))
const PracticeBusinessCaseCreate = lazy(() => import('./pages/simulator/PracticeBusinessCaseCreate'))
const PracticeBusinessCaseView = lazy(() => import('./pages/simulator/PracticeBusinessCaseView'))
const PracticeBusinessCaseEdit = lazy(() => import('./pages/simulator/PracticeBusinessCaseEdit'))
// Practice PIDs
const PracticePIDList = lazy(() => import('./pages/simulator/PracticePIDList'))
const PracticePIDCreate = lazy(() => import('./pages/simulator/PracticePIDCreate'))
const PracticePIDView = lazy(() => import('./pages/simulator/PracticePIDView'))
// Practice Benefits Review Plan
const PracticeBenefitsReviewPlan = lazy(() => import('./pages/simulator/PracticeBenefitsReviewPlan'))
const PracticeBenefitsReviewPlanList = lazy(() => import('./pages/simulator/PracticeBenefitsReviewPlanList'))
const PracticeBenefitsReviewPlanViewPage = lazy(() => import('./pages/simulator/PracticeBenefitsReviewPlanViewPage'))
const PracticeBenefitsReviewPlanEditPage = lazy(() => import('./pages/simulator/PracticeBenefitsReviewPlanEditPage'))
// Practice Work Packages
const PracticeWorkPackageList = lazy(() => import('./pages/simulator/PracticeWorkPackageList'))
const PracticeWorkPackageCreate = lazy(() => import('./pages/simulator/PracticeWorkPackageCreate'))
const PracticeWorkPackageView = lazy(() => import('./pages/simulator/PracticeWorkPackageView'))
const PracticeWorkPackageEdit = lazy(() => import('./pages/simulator/PracticeWorkPackageEdit'))
// Practice Product Descriptions
const PracticeProductDescriptionList = lazy(() => import('./pages/simulator/PracticeProductDescriptionList'))
const PracticeProductDescriptionCreate = lazy(() => import('./pages/simulator/PracticeProductDescriptionCreate'))
const PracticeProductDescriptionView = lazy(() => import('./pages/simulator/PracticeProductDescriptionView'))
// Practice PPDs
const PracticePPDList = lazy(() => import('./pages/simulator/PracticePPDList'))
const PracticePPDView = lazy(() => import('./pages/simulator/PracticePPDView'))
// Practice PSAs
const PracticePSAList = lazy(() => import('./pages/simulator/PracticePSAList'))
const PracticePSAView = lazy(() => import('./pages/simulator/PracticePSAView'))
// Practice Plans
const PracticePlanList = lazy(() => import('./pages/simulator/PracticePlanList'))
const PracticePlanCreate = lazy(() => import('./pages/simulator/PracticePlanCreate'))
const PracticePlanView = lazy(() => import('./pages/simulator/PracticePlanView'))
const PracticePlanEdit = lazy(() => import('./pages/simulator/PracticePlanEdit'))
// Practice Daily Log
const PracticeDailyLog = lazy(() => import('./pages/simulator/PracticeDailyLog'))
const PracticeDailyLogEntry = lazy(() => import('./pages/simulator/PracticeDailyLogEntry'))
// Practice Risk Register
const PracticeRiskRegister = lazy(() => import('./pages/simulator/PracticeRiskRegister'))
const PracticeRiskDetail = lazy(() => import('./pages/simulator/PracticeRiskDetail'))
// Practice RMS
const PracticeRMSList = lazy(() => import('./pages/simulator/PracticeRMSList'))
const PracticeRMSCreate = lazy(() => import('./pages/simulator/PracticeRMSCreate'))
const PracticeRMSView = lazy(() => import('./pages/simulator/PracticeRMSView'))
// Practice Issue Register
const PracticeIssueRegister = lazy(() => import('./pages/simulator/PracticeIssueRegister'))
const PracticeIssueDetail = lazy(() => import('./pages/simulator/PracticeIssueDetail'))
// Practice Issue Reports
const PracticeIssueReportList = lazy(() => import('./pages/simulator/PracticeIssueReportList'))
const PracticeIssueReportCreate = lazy(() => import('./pages/simulator/PracticeIssueReportCreate'))
const PracticeIssueReportView = lazy(() => import('./pages/simulator/PracticeIssueReportView'))
// Practice Quality Register
const PracticeQualityRegister = lazy(() => import('./pages/simulator/PracticeQualityRegister'))
const PracticeQualityActivityView = lazy(() => import('./pages/simulator/PracticeQualityActivityView'))
const PracticeQualityReviews = lazy(() => import('./pages/simulator/PracticeQualityReviews'))
const PracticeQualityInspections = lazy(() => import('./pages/simulator/PracticeQualityInspections'))
const PracticeQualityReports = lazy(() => import('./pages/simulator/PracticeQualityReports'))
// Practice QMS
const PracticeQMSList = lazy(() => import('./pages/simulator/PracticeQMSList'))
const PracticeQMSCreate = lazy(() => import('./pages/simulator/PracticeQMSCreate'))
const PracticeQMSView = lazy(() => import('./pages/simulator/PracticeQMSView'))
// Practice Lessons Log
const PracticeLessonsLog = lazy(() => import('./pages/simulator/PracticeLessonsLog'))
const PracticeLessonDetail = lazy(() => import('./pages/simulator/PracticeLessonDetail'))
// Practice Config Items
const PracticeConfigItemList = lazy(() => import('./pages/simulator/PracticeConfigItemList'))
const PracticeConfigItemCreate = lazy(() => import('./pages/simulator/PracticeConfigItemCreate'))
const PracticeConfigItemView = lazy(() => import('./pages/simulator/PracticeConfigItemView'))
// Practice CMS
const PracticeCMSList = lazy(() => import('./pages/simulator/PracticeCMSList'))
const PracticeCMSCreate = lazy(() => import('./pages/simulator/PracticeCMSCreate'))
const PracticeCMSView = lazy(() => import('./pages/simulator/PracticeCMSView'))
const PracticeCMSEdit = lazy(() => import('./pages/simulator/PracticeCMSEdit'))
// Practice Config MS
const PracticeConfigMSList = lazy(() => import('./pages/simulator/PracticeConfigMSList'))
const PracticeConfigMSCreate = lazy(() => import('./pages/simulator/PracticeConfigMSCreate'))
const PracticeConfigMSView = lazy(() => import('./pages/simulator/PracticeConfigMSView'))
const PracticeConfigMSEdit = lazy(() => import('./pages/simulator/PracticeConfigMSEdit'))
// Practice Checkpoint Reports
const PracticeCheckpointReportList = lazy(() => import('./pages/simulator/PracticeCheckpointReportList'))
const PracticeCheckpointReportCreate = lazy(() => import('./pages/simulator/PracticeCheckpointReportCreate'))
const PracticeCheckpointReportView = lazy(() => import('./pages/simulator/PracticeCheckpointReportView'))
// Practice Highlight Reports
const PracticeHighlightReportList = lazy(() => import('./pages/simulator/PracticeHighlightReportList'))
const PracticeHighlightReportCreate = lazy(() => import('./pages/simulator/PracticeHighlightReportCreate'))
const PracticeHighlightReportView = lazy(() => import('./pages/simulator/PracticeHighlightReportView'))
// Practice Exception Reports
const PracticeExceptionReportList = lazy(() => import('./pages/simulator/PracticeExceptionReportList'))
const PracticeExceptionReportCreate = lazy(() => import('./pages/simulator/PracticeExceptionReportCreate'))
const PracticeExceptionReportView = lazy(() => import('./pages/simulator/PracticeExceptionReportView'))
// Practice End Stage Reports
const PracticeEndStageReportList = lazy(() => import('./pages/simulator/PracticeEndStageReportList'))
const PracticeEndStageReportCreate = lazy(() => import('./pages/simulator/PracticeEndStageReportCreate'))
const PracticeEndStageReportView = lazy(() => import('./pages/simulator/PracticeEndStageReportView'))
// Practice End Project Reports
const PracticeEndProjectReportList = lazy(() => import('./pages/simulator/PracticeEndProjectReportList'))
const PracticeEndProjectReportCreate = lazy(() => import('./pages/simulator/PracticeEndProjectReportCreate'))
const PracticeEndProjectReportView = lazy(() => import('./pages/simulator/PracticeEndProjectReportView'))
// Practice Lessons Reports
const PracticeLessonsReportList = lazy(() => import('./pages/simulator/PracticeLessonsReportList'))
const PracticeLessonsReportCreate = lazy(() => import('./pages/simulator/PracticeLessonsReportCreate'))
const PracticeLessonsReportView = lazy(() => import('./pages/simulator/PracticeLessonsReportView'))
// Practice Lifecycle
const PracticeStartingUp = lazy(() => import('./pages/simulator/PracticeStartingUp'))
const PracticeInitiating = lazy(() => import('./pages/simulator/PracticeInitiating'))
const PracticeControllingStage = lazy(() => import('./pages/simulator/PracticeControllingStage'))
const PracticeManagingDelivery = lazy(() => import('./pages/simulator/PracticeManagingDelivery'))
const PracticeStageBoundaries = lazy(() => import('./pages/simulator/PracticeStageBoundaries'))
const PracticeClosingProject = lazy(() => import('./pages/simulator/PracticeClosingProject'))
// Practice Portfolio & Governance
const PracticePortfolio = lazy(() => import('./pages/simulator/PracticePortfolio'))
const PracticePortfolioCreate = lazy(() => import('./pages/simulator/PracticePortfolioCreate'))
const PracticeProgramme = lazy(() => import('./pages/simulator/PracticeProgramme'))
const PracticeProgrammeDashboardOverview = lazy(() => import('./pages/simulator/PracticeProgrammeDashboardOverview'))
const PracticeProgrammeProjectsPage = lazy(() => import('./pages/simulator/PracticeProgrammeProjects'))
const PracticeProgrammeDependenciesPage = lazy(() => import('./pages/simulator/PracticeProgrammeDependencies'))
const PracticeProgrammeBenefitsPage = lazy(() => import('./pages/simulator/PracticeProgrammeBenefits'))
const PracticeProgrammeTimelinePage = lazy(() => import('./pages/simulator/PracticeProgrammeTimeline'))
const PracticeBenefitsAll = lazy(() => import('./pages/simulator/PracticeBenefitsAll'))
const PracticeBenefitsRegister = lazy(() => import('./pages/simulator/PracticeBenefitsRegister'))
const PracticeBenefitsMeasurements = lazy(() => import('./pages/simulator/PracticeBenefitsMeasurements'))
const PracticeBenefitsRealization = lazy(() => import('./pages/simulator/PracticeBenefitsRealization'))
const PracticeBenefitsRedirectPage = lazy(() => import('./pages/simulator/PracticeBenefitsRedirectPage'))
const PracticeProgrammeCreate = lazy(() => import('./pages/simulator/PracticeProgrammeCreate'))
const PracticeProgrammeDetail = lazy(() => import('./pages/simulator/PracticeProgrammeDetail'))
const PracticeDependencies = lazy(() => import('./pages/simulator/PracticeDependencies'))
const PracticeStakeholders = lazy(() => import('./pages/simulator/PracticeStakeholders'))
const PracticeStakeholderRegisterPage = lazy(() => import('./pages/simulator/PracticeStakeholderRegisterPage'))
const PracticeStakeholderAnalysis = lazy(() => import('./pages/simulator/PracticeStakeholderAnalysis'))
const PracticeEngagementPlanning = lazy(() => import('./pages/simulator/PracticeEngagementPlanning'))
const PracticeCommunicationPlans = lazy(() => import('./pages/simulator/PracticeCommunicationPlans'))
const PracticeStakeholderMonitoring = lazy(() => import('./pages/simulator/PracticeStakeholderMonitoring'))
const PracticeStakeholderSEAM = lazy(() => import('./pages/simulator/PracticeStakeholderSEAM'))
const PracticeEngagementActionsPage = lazy(() => import('./pages/simulator/PracticeEngagementActionsPage'))
const PracticeSaliencePage = lazy(() => import('./pages/simulator/PracticeSaliencePage'))
const PracticeStakeholdersOnHold = lazy(() => import('./pages/simulator/PracticeStakeholdersOnHold'))
const PracticeStakeholderCreatePage = lazy(() => import('./pages/simulator/PracticeStakeholderCreatePage'))
const PracticeTeams = lazy(() => import('./pages/simulator/PracticeTeams'))
const SimMyTeam = lazy(() => import('./pages/simulator/SimMyTeam'))
const PracticeGovernance = lazy(() => import('./pages/simulator/PracticeGovernance'))
const SimPortfolioCategories = lazy(() => import('./pages/simulator/SimPortfolioCategories'))
const SimPortfolioDashboard = lazy(() => import('./pages/simulator/SimPortfolioDashboard'))
const SimPortfolioProjects = lazy(() => import('./pages/simulator/SimPortfolioProjects'))
const SimPortfolioResources = lazy(() => import('./pages/simulator/SimPortfolioResources'))
const SimPortfolioFinancial = lazy(() => import('./pages/simulator/SimPortfolioFinancial'))
const SimPortfolioReports = lazy(() => import('./pages/simulator/SimPortfolioReports'))
const SimPortfolioGovernance = lazy(() => import('./pages/simulator/SimPortfolioGovernance'))
// Simulator PMO and PM Dashboards
const SimulatorPMODashboard = lazy(() => import('./pages/simulator/pmo/SimulatorPMODashboard'))
const SimManagerAssignments = lazy(() => import('./pages/sim/pmo/SimManagerAssignments'))
const SimManagerAssignmentSettings = lazy(() => import('./pages/sim/pmo/SimManagerAssignmentSettings'))
const SimulatorPMDashboard = lazy(() => import('./pages/simulator/pm/SimulatorPMDashboard'))
const SimulatorPMOLayout = lazy(() => import('./components/sim/pmo/SimulatorPMOLayout'))
const SimulatorPMLayout = lazy(() => import('./components/sim/pm/SimulatorPMLayout'))
// Simulator PMO Page Wrappers
const SimulatorPMOGovernanceMandateTemplate = lazy(() => import('./pages/simulator/pmo/SimulatorPMOGovernanceMandateTemplate'))
const SimulatorPMOGovernanceCMS = lazy(() => import('./pages/simulator/pmo/SimulatorPMOGovernanceCMS'))
const SimulatorPMOGovernanceConfigMS = lazy(() => import('./pages/simulator/pmo/SimulatorPMOGovernanceConfigMS'))
const SimulatorPMOGovernanceQMS = lazy(() => import('./pages/simulator/pmo/SimulatorPMOGovernanceQMS'))
const SimulatorPMOGovernanceRMS = lazy(() => import('./pages/simulator/pmo/SimulatorPMOGovernanceRMS'))
const SimulatorPMOInitiationBusinessCase = lazy(() => import('./pages/simulator/pmo/SimulatorPMOInitiationBusinessCase'))
const SimulatorPMOInitiationProjectBrief = lazy(() => import('./pages/simulator/pmo/SimulatorPMOInitiationProjectBrief'))
const SimulatorPMOInitiationBenefitsReviewPlan = lazy(() => import('./pages/simulator/pmo/SimulatorPMOInitiationBenefitsReviewPlan'))
const SimulatorPMOOversightRiskRegister = lazy(() => import('./pages/simulator/pmo/SimulatorPMOOversightRiskRegister'))
const SimulatorPMOOversightIssueRegister = lazy(() => import('./pages/simulator/pmo/SimulatorPMOOversightIssueRegister'))
const SimulatorPMOOversightQualityRegister = lazy(() => import('./pages/simulator/pmo/SimulatorPMOOversightQualityRegister'))
const SimulatorPMOOversightLessonsLog = lazy(() => import('./pages/simulator/pmo/SimulatorPMOOversightLessonsLog'))
const SimulatorPMOReportingHighlight = lazy(() => import('./pages/simulator/pmo/SimulatorPMOReportingHighlight'))
const SimulatorPMOReportingException = lazy(() => import('./pages/simulator/pmo/SimulatorPMOReportingException'))
const SimulatorPMOReportingEndStage = lazy(() => import('./pages/simulator/pmo/SimulatorPMOReportingEndStage'))
const SimulatorPMOReportingEndProject = lazy(() => import('./pages/simulator/pmo/SimulatorPMOReportingEndProject'))
const SimulatorPMOProcurementRFP = lazy(() => import('./pages/simulator/pmo/SimulatorPMOProcurementRFP'))
const SimulatorPMORFPView = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPView'))
const SimulatorPMORFPCreate = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPCreate'))
const SimulatorPMORFPEdit = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPEdit'))
const SimulatorPMORFPBulkImport = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPBulkImport'))
const SimulatorPMORFPPrint = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPPrint'))
const SimulatorPMORFPOnHold = lazy(() => import('./pages/simulator/pmo/SimulatorPMORFPOnHold'))
// Simulator PM Page Wrappers
const SimulatorPMGovernanceMandateTemplate = lazy(() => import('./pages/simulator/pm/SimulatorPMGovernanceMandateTemplate'))
const SimulatorPMGovernanceCMS = lazy(() => import('./pages/simulator/pm/SimulatorPMGovernanceCMS'))
const SimulatorPMGovernanceConfigMS = lazy(() => import('./pages/simulator/pm/SimulatorPMGovernanceConfigMS'))
const SimulatorPMGovernanceQMS = lazy(() => import('./pages/simulator/pm/SimulatorPMGovernanceQMS'))
const SimulatorPMGovernanceRMS = lazy(() => import('./pages/simulator/pm/SimulatorPMGovernanceRMS'))
const SimulatorPMInitiationBusinessCase = lazy(() => import('./pages/simulator/pm/SimulatorPMInitiationBusinessCase'))
const SimulatorPMInitiationProjectBrief = lazy(() => import('./pages/simulator/pm/SimulatorPMInitiationProjectBrief'))
const SimulatorPMInitiationPID = lazy(() => import('./pages/simulator/pm/SimulatorPMInitiationPID'))
const SimulatorPMInitiationBenefitsReviewPlan = lazy(() => import('./pages/simulator/pm/SimulatorPMInitiationBenefitsReviewPlan'))
const SimulatorPMDeliveryWorkPackages = lazy(() => import('./pages/simulator/pm/SimulatorPMDeliveryWorkPackages'))
const SimulatorPMDeliveryProductDescription = lazy(() => import('./pages/simulator/pm/SimulatorPMDeliveryProductDescription'))
const SimulatorPMDeliveryProjectProductDescription = lazy(() => import('./pages/simulator/pm/SimulatorPMDeliveryProjectProductDescription'))
const SimulatorPMDeliveryProductStatusAccount = lazy(() => import('./pages/simulator/pm/SimulatorPMDeliveryProductStatusAccount'))
const SimulatorPMDeliveryDailyLog = lazy(() => import('./pages/simulator/pm/SimulatorPMDeliveryDailyLog'))
const SimulatorPMControlsRiskRegister = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsRiskRegister'))
const SimulatorPMControlsIssueRegister = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsIssueRegister'))
const SimulatorPMControlsQualityRegister = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsQualityRegister'))
const SimulatorPMControlsConfigItems = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsConfigItems'))
const SimulatorPMControlsLessonsLog = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsLessonsLog'))
const SimulatorPMControlsWorkAuthorisation = lazy(() => import('./pages/simulator/pm/SimulatorPMControlsWorkAuthorisation'))
const SimulatorPMReportingCheckpoint = lazy(() => import('./pages/simulator/pm/SimulatorPMReportingCheckpoint'))
const SimulatorPMReportingHighlight = lazy(() => import('./pages/simulator/pm/SimulatorPMReportingHighlight'))
const SimulatorPMReportingIssueReports = lazy(() => import('./pages/simulator/pm/SimulatorPMReportingIssueReports'))
const SimulatorPMReportingException = lazy(() => import('./pages/simulator/pm/SimulatorPMReportingException'))
const SimulatorPMReportingEndStage = lazy(() => import('./pages/simulator/pm/SimulatorPMReportingEndStage'))
const SimulatorPMClosureLessonsReport = lazy(() => import('./pages/simulator/pm/SimulatorPMClosureLessonsReport'))
const SimulatorPMClosureEndProjectReport = lazy(() => import('./pages/simulator/pm/SimulatorPMClosureEndProjectReport'))
// Brief pages (Platform)
const ProjectBriefCreate = lazy(() => import('./pages/brief/ProjectBriefCreate'))
const ProjectBriefView = lazy(() => import('./pages/brief/ProjectBriefView'))
const ProjectBriefEdit = lazy(() => import('./pages/brief/ProjectBriefEdit'))
const BriefList = lazy(() => import('./pages/brief/BriefList'))
const BriefApprovalDashboard = lazy(() => import('./pages/brief/BriefApprovalDashboard'))
// Daily Log pages
const DailyLogView = lazy(() => import('./pages/DailyLogView'))
const MyDailyLogEntries = lazy(() => import('./pages/MyDailyLogEntries'))
// Lessons Log pages
const LessonsLogView = lazy(() => import('./pages/LessonsLogView'))
const LessonDetailView = lazy(() => import('./pages/LessonDetailView'))
const CorporateLessonsLibrary = lazy(() => import('./pages/CorporateLessonsLibrary'))
const MyLessonActions = lazy(() => import('./pages/MyLessonActions'))
const LessonsReport = lazy(() => import('./pages/LessonsReport'))
const LessonsReportCreate = lazy(() => import('./pages/LessonsReportCreate'))
const LessonsReportEdit = lazy(() => import('./pages/LessonsReportEdit'))
const LessonsReportView = lazy(() => import('./pages/LessonsReportView'))
const LessonsReportsList = lazy(() => import('./pages/LessonsReportsList'))
// Risk Register pages
const RiskRegisterView = lazy(() => import('./pages/RiskRegisterView'))

// Loading fallback: spinner first, then "Refresh page" after timeout so the app never hangs forever
const LoadingFallback = () => <LoadingFallbackWithTimeout />

// Login page skeleton - renders instantly while login chunk loads
const LoginPageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
    <div className="h-16 bg-gray-800/90" />
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
        </div>
        <div className="h-8 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 mx-auto bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        <div className="mt-6 h-10 bg-blue-600/80 rounded-lg animate-pulse" />
      </div>
    </div>
    <div className="h-48 bg-gray-900" />
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OfflineIndicator />
        <PWAUpdatePrompt />
        <Routes>
          {/* Landing page - lazy loaded for fast initial paint; timeout fallback so it never hangs */}
          <Route path="/" element={
            <Suspense fallback={<LoadingFallbackWithTimeout />}>
              <NidusHomepage />
            </Suspense>
          } />
          
          {/* Other homepages - lazy loaded with ThemeProvider */}
          {/* Platform homepage - primary route */}
          <Route path="/platform" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformHomepage />
              </ThemeProvider>
            </Suspense>
          } />
          {/* /pm is now the PM Dashboard namespace - no redirect needed */}
          {/* Alternative route */}
          <Route path="/project-management" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformHomepage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorHomepage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator-home" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorHomepage />
              </ThemeProvider>
            </Suspense>
          } />
          
          {/* Documentation routes */}
          <Route path="/documentation/:platform/:guideId" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <Documentation />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/documentation/:platform" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <Documentation />
              </ThemeProvider>
            </Suspense>
          } />
          
          {/* Standalone page routes */}
          {/* Generic routes (for NidusHomepage) */}
          <Route path="/features" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <FeaturesPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/blog" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <BlogPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/resources" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ResourcesPage />
              </ThemeProvider>
            </Suspense>
          } />
          {/* Platform-specific routes */}
          <Route path="/platform/features" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <FeaturesPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/platform/blog" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <BlogPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/platform/resources" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ResourcesPage />
              </ThemeProvider>
            </Suspense>
          } />
          {/* Simulator-specific routes */}
          <Route path="/simulator/features" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <FeaturesPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator/blog" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <BlogPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator/resources" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ResourcesPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/pricing" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PricingPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/platform/pricing" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformPricing />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/bundle-pricing" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <BundlePricing />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator/pricing" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorPricing />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/about" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <AboutPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/contact" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ContactPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/platform/request-demo" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformRequestDemoPage />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="/simulator/request-demo" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorRequestDemoPage />
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
                        {/* Organisation Settings – Branding (pmo_admin / super_admin) */}
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
                        {/* Project-scoped URLs (code or UUID) — same screens as top-level routes */}
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
                        {/* PM planning — scope & schedule */}
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

          {/* Backward Compatibility: Redirect other old /app/* paths to /platform/* */}
          <Route path="app/*" element={<AppToPlatformRedirect />} />

          {/* Auth routes - lazy loaded with minimal providers */}
          <Route path="login" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <Navigate to="/platform/login" replace />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="platform/login" element={
            <Suspense fallback={<LoginPageSkeleton />}>
              <ThemeProvider>
                <PlatformLogin />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="simulator/login" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorLogin />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="register" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <Register />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="platform/register" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformRegister />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="simulator/register" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <SimulatorRegister />
              </ThemeProvider>
            </Suspense>
          } />

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
          {/* PWA manifest shortcut / legacy “scenario library” URL → practice projects */}
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
              <ThemeProvider>
                <ToastProvider>
                  <ProtectedRoute requiredPlatform="simulator">
                    <Layout>
                      <PracticeStakeholderSEAM />
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
          <Route path="simulator/pm/projects/:projectId/forms" element={<Suspense fallback={<LoadingFallback />}><ThemeProvider><ToastProvider><ProtectedRoute requiredPlatform="simulator"><SimulatorPMLayout><FormsGallery mode="sim" basePath="/simulator/pm/projects" /></SimulatorPMLayout></ProtectedRoute></ToastProvider></ThemeProvider></Suspense>} />
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
          <Route path="role-selection" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <RoleSelection />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/platform-account-setup" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <PlatformAccountSetup />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/platform-choice" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <PlatformChoice />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          {/* New Registration Flow Routes */}
          <Route path="onboarding/organisation-setup" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <OrganisationSetup />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/organisation-verification-notice" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <OrganisationVerificationNotice />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/verify-organisation" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <VerifyOrganisation />
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/project-type-selection" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <ProjectTypeSelection />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/trial-project-setup" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <TrialProjectSetup />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="onboarding/paid-project-setup" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <PaidProjectSetup />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          {/* Trial Dashboard and Upgrade Routes */}
          <Route path="dashboard/trial" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <FreeTrialDashboard />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />
          <Route path="upgrade/trial" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ProtectedRoute>
                  <TrialUpgrade />
                </ProtectedRoute>
              </ThemeProvider>
            </Suspense>
          } />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        <Suspense fallback={null}>
          <PWAInstallPrompt />
        </Suspense>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
