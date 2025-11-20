import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './context/ToastContext'
import Home from './pages/Home'
import Projects from './pages/Projects'
import ProjectsCreate from './pages/ProjectsCreate'
import ProjectsDetail from './pages/ProjectsDetail'
import ProjectsEdit from './pages/ProjectsEdit'
import Tasks from './pages/Tasks'
import TasksBoard from './pages/TasksBoard'
import TasksCalendar from './pages/TasksCalendar'
import TasksCreate from './pages/TasksCreate'
import TasksDetail from './pages/TasksDetail'
import MethodologySelection from './pages/MethodologySelection'
import Dashboard from './pages/Dashboard'
import MethodologyDashboard from './pages/MethodologyDashboard'
import StartingUpProject from './pages/structured/StartingUpProject'
import InitiatingProject from './pages/structured/InitiatingProject'
import StageGates from './pages/structured/StageGates'
import ControllingStage from './pages/structured/ControllingStage'
import ManagingProductDelivery from './pages/structured/ManagingProductDelivery'
import DirectingProject from './pages/structured/DirectingProject'
import Issues from './pages/Issues'
import Risks from './pages/Risks'
import RiskDetail from './pages/RiskDetail'
import RAIDLog from './pages/RAIDLog'
import ProductBacklog from './pages/scrum/ProductBacklog'
import SprintPlanning from './pages/scrum/SprintPlanning'
import SprintBoard from './pages/scrum/SprintBoard'
import DailyScrum from './pages/scrum/DailyScrum'
import SprintReview from './pages/scrum/SprintReview'
import SprintRetrospective from './pages/scrum/SprintRetrospective'
import KanbanBoards from './pages/kanban/KanbanBoards'
import KanbanBoard from './pages/kanban/KanbanBoard'
import MetricsDashboard from './pages/kanban/MetricsDashboard'
import Resources from './pages/Resources'
import ResourceCapacity from './pages/ResourceCapacity'
import ResourceDetail from './pages/ResourceDetail'
import ResourceConflicts from './pages/ResourceConflicts'
import Reports from './pages/Reports'
import ReportBuilder from './pages/ReportBuilder'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import ScheduledReports from './pages/ScheduledReports'
import Integrations from './pages/Integrations'
import IntegrationConfig from './pages/IntegrationConfig'
import IntegrationSync from './pages/IntegrationSync'
import Notifications from './pages/Notifications'
import ActivityFeed from './pages/ActivityFeed'
import Automation from './pages/Automation'
import AutomationRuleBuilder from './pages/AutomationRuleBuilder'
import Portfolio from './pages/portfolio/Portfolio'
import PortfolioDetail from './pages/portfolio/PortfolioDetail'
import PortfolioEdit from './pages/portfolio/PortfolioEdit'
import Programme from './pages/programme/Programme'
import ProgrammeDetail from './pages/programme/ProgrammeDetail'
import ProgrammeEdit from './pages/programme/ProgrammeEdit'
import CrossProjectResources from './pages/CrossProjectResources'
import ResourceForecasts from './pages/ResourceForecasts'
import ResourceUtilization from './pages/ResourceUtilization'
import Dependencies from './pages/Dependencies'
import DependencyMap from './pages/DependencyMap'
import DependencyImpacts from './pages/DependencyImpacts'
import Benefits from './pages/benefits/Benefits'
import BenefitMeasurements from './pages/benefits/BenefitMeasurements'
import BenefitsRealization from './pages/benefits/BenefitsRealization'
import StrategicObjectives from './pages/StrategicObjectives'
import StrategicAlignment from './pages/StrategicAlignment'
import StrategicContribution from './pages/StrategicContribution'
import StrategicPortfolio from './pages/StrategicPortfolio'
import StrategicReports from './pages/StrategicReports'
import QualityManagement from './pages/QualityManagement'
import QualityReviews from './pages/QualityReviews'
import QualityInspections from './pages/QualityInspections'
import QualityReports from './pages/QualityReports'
import StakeholderManagement from './pages/StakeholderManagement'
import AnalyticsKPIs from './pages/analytics/AnalyticsKPIs'
import AnalyticsExecutive from './pages/analytics/AnalyticsExecutive'
import AnalyticsProjectHealth from './pages/analytics/AnalyticsProjectHealth'
import AnalyticsPortfolio from './pages/analytics/AnalyticsPortfolio'
import AnalyticsTrends from './pages/analytics/AnalyticsTrends'
import ChangeRequests from './pages/change/ChangeRequests'
import ChangeRequestDetail from './pages/change/ChangeRequestDetail'
import ChangeBoard from './pages/change/ChangeBoard'
import ChangeLogPage from './pages/change/ChangeLogPage'
// Phase 8: Security & Compliance
import SecurityMonitoring from './pages/admin/SecurityMonitoring'
import SecurityAlerts from './pages/admin/SecurityAlerts'
import SecurityIncidents from './pages/admin/SecurityIncidents'
import AuditLogs from './pages/admin/AuditLogs'
import GDPRCompliance from './pages/admin/GDPRCompliance'
import SSOManagement from './pages/admin/SSOManagement'
import SecuritySettings from './pages/settings/SecuritySettings'
import PrivacyCenter from './pages/settings/PrivacyCenter'
import MFASetup from './pages/security/MFASetup'
import SSOCallback from './pages/auth/SSOCallback'
import Login from './pages/auth/Login'
// Phase 7: Integrations & API
import ApiDocs from './pages/ApiDocs'
import Webhooks from './pages/Webhooks'
// Phase 9: Help System
import HelpCenter from './pages/HelpCenter'
import PerformanceDashboard from './pages/admin/PerformanceDashboard'
import HelpManagement from './pages/admin/HelpManagement'
import BugTracking from './pages/admin/BugTracking'
// Phase 10: Launch & Support
import FeatureRequests from './pages/support/FeatureRequests'
import SubmitFeedback from './pages/support/SubmitFeedback'
import SupportTickets from './pages/support/SupportTickets'
import FeedbackAnalysis from './pages/admin/FeedbackAnalysis'
import MonitoringDashboard from './pages/admin/MonitoringDashboard'
import FeatureRequestsManagement from './pages/admin/FeatureRequestsManagement'
import ImprovementBacklog from './pages/admin/ImprovementBacklog'
import MaintenanceDashboard from './pages/admin/MaintenanceDashboard'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true }}>
          <PWAInstallPrompt />
        <Routes>
        {/* Standalone home page with its own header */}
        <Route path="/" element={<Home />} />
        
        {/* App routes with Layout wrapper */}
        <Route element={<Layout />}>
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="dashboard/methodology/:methodologyCode" element={<ProtectedRoute><MethodologyDashboard /></ProtectedRoute>} />
          <Route path="methodology-selection" element={<ProtectedRoute><MethodologySelection /></ProtectedRoute>} />
          <Route path="projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="projects/create" element={<ProtectedRoute><ProjectsCreate /></ProtectedRoute>} />
          <Route path="projects/:id" element={<ProtectedRoute><ProjectsDetail /></ProtectedRoute>} />
          <Route path="projects/:id/edit" element={<ProtectedRoute><ProjectsEdit /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="tasks/board" element={<ProtectedRoute><TasksBoard /></ProtectedRoute>} />
          <Route path="tasks/calendar" element={<ProtectedRoute><TasksCalendar /></ProtectedRoute>} />
          <Route path="tasks/create" element={<ProtectedRoute><TasksCreate /></ProtectedRoute>} />
          <Route path="tasks/:id" element={<ProtectedRoute><TasksDetail /></ProtectedRoute>} />
          <Route path="projects/:projectId/structured/starting-up" element={<ProtectedRoute><StartingUpProject /></ProtectedRoute>} />
          <Route path="projects/:projectId/structured/initiating" element={<ProtectedRoute><InitiatingProject /></ProtectedRoute>} />
                <Route path="projects/:projectId/structured/stage-gates" element={<ProtectedRoute><StageGates /></ProtectedRoute>} />
                <Route path="projects/:projectId/structured/controlling-stage" element={<ProtectedRoute><ControllingStage /></ProtectedRoute>} />
                <Route path="projects/:projectId/structured/managing-product-delivery" element={<ProtectedRoute><ManagingProductDelivery /></ProtectedRoute>} />
                <Route path="projects/:projectId/structured/directing" element={<ProtectedRoute><DirectingProject /></ProtectedRoute>} />
                <Route path="projects/:projectId/issues" element={<ProtectedRoute><Issues /></ProtectedRoute>} />
                <Route path="projects/:projectId/risks" element={<ProtectedRoute><Risks /></ProtectedRoute>} />
                <Route path="projects/:projectId/risks/:riskId" element={<ProtectedRoute><RiskDetail /></ProtectedRoute>} />
                <Route path="projects/:projectId/raid-log" element={<ProtectedRoute><RAIDLog /></ProtectedRoute>} />
                <Route path="projects/:projectId/scrum/product-backlog" element={<ProtectedRoute><ProductBacklog /></ProtectedRoute>} />
          <Route path="projects/:projectId/scrum/sprint-planning" element={<ProtectedRoute><SprintPlanning /></ProtectedRoute>} />
                <Route path="projects/:projectId/scrum/sprint/:sprintId/board" element={<ProtectedRoute><SprintBoard /></ProtectedRoute>} />
                <Route path="projects/:projectId/scrum/sprint/:sprintId/daily-scrum" element={<ProtectedRoute><DailyScrum /></ProtectedRoute>} />
                <Route path="projects/:projectId/scrum/sprint/:sprintId/review" element={<ProtectedRoute><SprintReview /></ProtectedRoute>} />
                <Route path="projects/:projectId/scrum/sprint/:sprintId/retrospective" element={<ProtectedRoute><SprintRetrospective /></ProtectedRoute>} />
                <Route path="projects/:projectId/kanban" element={<ProtectedRoute><KanbanBoards /></ProtectedRoute>} />
          <Route path="projects/:projectId/kanban/board/:boardId" element={<ProtectedRoute><KanbanBoard /></ProtectedRoute>} />
          <Route path="projects/:projectId/kanban/metrics" element={<ProtectedRoute><MetricsDashboard /></ProtectedRoute>} />
          
          {/* Phase 4: Resource Planning */}
          <Route path="resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="resources/:id" element={<ProtectedRoute><ResourceDetail /></ProtectedRoute>} />
          <Route path="resources/capacity" element={<ProtectedRoute><ResourceCapacity /></ProtectedRoute>} />
          <Route path="resources/conflicts" element={<ProtectedRoute><ResourceConflicts /></ProtectedRoute} />
          
          {/* Phase 6: Cross-Project Resource Management */}
          <Route path="resources/cross-project" element={<ProtectedRoute><CrossProjectResources /></ProtectedRoute>} />
          <Route path="resources/forecast" element={<ProtectedRoute><ResourceForecasts /></ProtectedRoute>} />
          <Route path="resources/utilization" element={<ProtectedRoute><ResourceUtilization /></ProtectedRoute>} />
          
          {/* Phase 4: Enhanced Reporting */}
          <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="reports/builder" element={<ProtectedRoute><ReportBuilder /></ProtectedRoute>} />
          <Route path="reports/analytics" element={<ProtectedRoute><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="reports/scheduled" element={<ProtectedRoute><ScheduledReports /></ProtectedRoute>} />
          
          {/* Phase 4: Integrations */}
          <Route path="integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
          <Route path="integrations/create" element={<ProtectedRoute><IntegrationConfig /></ProtectedRoute>} />
          <Route path="integrations/:id/edit" element={<ProtectedRoute><IntegrationConfig /></ProtectedRoute>} />
          <Route path="integrations/:id/sync" element={<ProtectedRoute><IntegrationSync /></ProtectedRoute>} />
          
          {/* Phase 7: API & Webhooks */}
          <Route path="api/docs" element={<ProtectedRoute><ApiDocs /></ProtectedRoute>} />
          <Route path="webhooks" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
          <Route path="webhooks/:id" element={<ProtectedRoute><Webhooks /></ProtectedRoute>} />
          
          {/* Phase 4: Collaboration */}
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="activity" element={<ProtectedRoute><ActivityFeed /></ProtectedRoute>} />
          <Route path="projects/:projectId/activity" element={<ProtectedRoute><ActivityFeed /></ProtectedRoute>} />
          
          {/* Phase 4: Automation */}
          <Route path="automation" element={<ProtectedRoute><Automation /></ProtectedRoute>} />
          <Route path="automation/create" element={<ProtectedRoute><AutomationRuleBuilder /></ProtectedRoute>} />
          <Route path="automation/:id/edit" element={<ProtectedRoute><AutomationRuleBuilder /></ProtectedRoute>} />
          
          {/* Phase 6: Portfolio Management */}
          <Route path="portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          <Route path="portfolio/:id" element={<ProtectedRoute><PortfolioDetail /></ProtectedRoute>} />
          <Route path="portfolio/:id/edit" element={<ProtectedRoute><PortfolioEdit /></ProtectedRoute>} />
          
          {/* Phase 6: Programme Management */}
          <Route path="programme" element={<ProtectedRoute><Programme /></ProtectedRoute>} />
          <Route path="programme/:id" element={<ProtectedRoute><ProgrammeDetail /></ProtectedRoute>} />
          <Route path="programme/:id/edit" element={<ProtectedRoute><ProgrammeEdit /></ProtectedRoute>} />
          
          {/* Phase 6: Inter-Project Dependencies */}
          <Route path="dependencies" element={<ProtectedRoute><Dependencies /></ProtectedRoute>} />
          <Route path="dependencies/inter-project" element={<ProtectedRoute><Dependencies /></ProtectedRoute>} />
          <Route path="dependencies/map" element={<ProtectedRoute><DependencyMap /></ProtectedRoute>} />
          <Route path="dependencies/impacts" element={<ProtectedRoute><DependencyImpacts /></ProtectedRoute>} />
          
          {/* Phase 6: Benefits Realization */}
          <Route path="benefits" element={<ProtectedRoute><Benefits /></ProtectedRoute>} />
          <Route path="benefits/register" element={<ProtectedRoute><Benefits /></ProtectedRoute>} />
          <Route path="benefits/measurements" element={<ProtectedRoute><BenefitMeasurements /></ProtectedRoute>} />
          <Route path="benefits/realization" element={<ProtectedRoute><BenefitsRealization /></ProtectedRoute>} />
          
          {/* Phase 6: Strategic Alignment */}
          <Route path="strategy/objectives" element={<ProtectedRoute><StrategicObjectives /></ProtectedRoute>} />
          <Route path="strategy/alignment" element={<ProtectedRoute><StrategicAlignment /></ProtectedRoute>} />
          <Route path="strategy/contribution" element={<ProtectedRoute><StrategicContribution /></ProtectedRoute>} />
          <Route path="strategy/portfolio" element={<ProtectedRoute><StrategicPortfolio /></ProtectedRoute>} />
          <Route path="strategy/reports" element={<ProtectedRoute><StrategicReports /></ProtectedRoute>} />
          
          {/* Phase 5: Quality Management */}
          <Route path="quality-management" element={<ProtectedRoute><QualityManagement /></ProtectedRoute>} />
          <Route path="quality-management/reviews" element={<ProtectedRoute><QualityReviews /></ProtectedRoute>} />
          <Route path="quality-management/inspections" element={<ProtectedRoute><QualityInspections /></ProtectedRoute>} />
          <Route path="quality-management/reports" element={<ProtectedRoute><QualityReports /></ProtectedRoute>} />
          
          {/* Phase 5: Stakeholder Management */}
          <Route path="stakeholders" element={<ProtectedRoute><StakeholderManagement /></ProtectedRoute>} />
          
          {/* Phase 5: Change Management */}
          <Route path="change-management" element={<ProtectedRoute><ChangeRequests /></ProtectedRoute>} />
          <Route path="change-management/requests" element={<ProtectedRoute><ChangeRequests /></ProtectedRoute>} />
          <Route path="change-management/:id" element={<ProtectedRoute><ChangeRequestDetail /></ProtectedRoute>} />
          <Route path="change-management/board/:boardId" element={<ProtectedRoute><ChangeBoard /></ProtectedRoute>} />
          <Route path="change-management/log" element={<ProtectedRoute><ChangeLogPage /></ProtectedRoute>} />
          <Route path="projects/:projectId/change-management/board/:boardId" element={<ProtectedRoute><ChangeBoard /></ProtectedRoute>} />
          
          {/* Phase 5: Analytics & KPIs */}
          <Route path="analytics" element={<ProtectedRoute><AnalyticsExecutive /></ProtectedRoute>} />
          <Route path="analytics/kpis" element={<ProtectedRoute><AnalyticsKPIs /></ProtectedRoute>} />
          <Route path="analytics/executive" element={<ProtectedRoute><AnalyticsExecutive /></ProtectedRoute>} />
          <Route path="analytics/project-health" element={<ProtectedRoute><AnalyticsProjectHealth /></ProtectedRoute>} />
          <Route path="analytics/portfolio" element={<ProtectedRoute><AnalyticsPortfolio /></ProtectedRoute>} />
          <Route path="analytics/trends" element={<ProtectedRoute><AnalyticsTrends /></ProtectedRoute>} />
          
          {/* Phase 8: Security & Compliance - Admin */}
          <Route path="admin/security/monitoring" element={<ProtectedRoute><SecurityMonitoring /></ProtectedRoute>} />
          <Route path="admin/security/alerts" element={<ProtectedRoute><SecurityAlerts /></ProtectedRoute>} />
          <Route path="admin/security/alerts/:id" element={<ProtectedRoute><SecurityAlerts /></ProtectedRoute>} />
          <Route path="admin/security/incidents" element={<ProtectedRoute><SecurityIncidents /></ProtectedRoute>} />
          <Route path="admin/security/incidents/:id" element={<ProtectedRoute><SecurityIncidents /></ProtectedRoute>} />
          <Route path="admin/security/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
          <Route path="admin/security/data-access-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
          <Route path="admin/gdpr" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/consent" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/export-requests" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/deletion-requests" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/data-breaches" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/data-breaches/:id" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/gdpr/reports" element={<ProtectedRoute><GDPRCompliance /></ProtectedRoute>} />
          <Route path="admin/authentication/sso-providers" element={<ProtectedRoute><SSOManagement /></ProtectedRoute>} />
          <Route path="admin/authentication/mfa-policies" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="admin/authentication/password-policies" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="admin/authentication/sessions" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="admin/encryption/keys" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="admin/encryption/fields" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="admin/encryption/rotation" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          
          {/* Phase 8: User Settings */}
          <Route path="settings/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
          <Route path="settings/privacy" element={<ProtectedRoute><PrivacyCenter /></ProtectedRoute>} />
          <Route path="security/mfa-setup" element={<ProtectedRoute><MFASetup /></ProtectedRoute>} />
          
          {/* Phase 9: Help System */}
          <Route path="help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="help/tutorials" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="help/guides" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="help/faq" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="help/contact" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          <Route path="help/article/:slug" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
          
          {/* Phase 9: Admin - Performance & Help Management */}
          <Route path="admin/performance" element={<ProtectedRoute><PerformanceDashboard /></ProtectedRoute>} />
          <Route path="admin/help" element={<ProtectedRoute><HelpManagement /></ProtectedRoute>} />
          <Route path="admin/bugs" element={<ProtectedRoute><BugTracking /></ProtectedRoute>} />
          
          {/* Phase 10: Support & Feedback */}
          <Route path="support/feature-requests" element={<ProtectedRoute><FeatureRequests /></ProtectedRoute>} />
          <Route path="support/feedback" element={<ProtectedRoute><SubmitFeedback /></ProtectedRoute>} />
          <Route path="support/tickets" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
          <Route path="admin/feedback/analysis" element={<ProtectedRoute><FeedbackAnalysis /></ProtectedRoute>} />
          <Route path="admin/monitoring" element={<ProtectedRoute><MonitoringDashboard /></ProtectedRoute>} />
          <Route path="admin/feature-requests" element={<ProtectedRoute><FeatureRequestsManagement /></ProtectedRoute>} />
          <Route path="admin/improvements" element={<ProtectedRoute><ImprovementBacklog /></ProtectedRoute>} />
          <Route path="admin/maintenance" element={<ProtectedRoute><MaintenanceDashboard /></ProtectedRoute>} />
        </Route>
        
        {/* Phase 8: Authentication (public routes) */}
        <Route path="login" element={<Login />} />
        <Route path="auth/sso/callback" element={<SSOCallback />} />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
