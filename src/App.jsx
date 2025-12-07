import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
// Keep NidusHomepage completely standalone - no providers needed
import NidusHomepage from './pages/NidusHomepage'

// Lazy load ALL other components to prevent blocking
const ThemeProvider = lazy(() => import('./context/ThemeContext').then(m => ({ default: m.ThemeProvider })))
const ToastProvider = lazy(() => import('./context/ToastContext').then(m => ({ default: m.ToastProvider })))
const Layout = lazy(() => import('./components/Layout'))
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'))
const Home = lazy(() => import('./pages/Home'))
const PlatformHomepage = lazy(() => import('./pages/PlatformHomepage'))
const SimulatorHomepage = lazy(() => import('./pages/SimulatorHomepage'))
const Documentation = lazy(() => import('./pages/Documentation'))

// Lazy load all other pages
const Projects = lazy(() => import('./pages/Projects'))
const ProjectsCreate = lazy(() => import('./pages/ProjectsCreate'))
const ProjectsDetail = lazy(() => import('./pages/ProjectsDetail'))
const ProjectsEdit = lazy(() => import('./pages/ProjectsEdit'))
const Tasks = lazy(() => import('./pages/Tasks'))
const TasksBoard = lazy(() => import('./pages/TasksBoard'))
const TasksCalendar = lazy(() => import('./pages/TasksCalendar'))
const TasksCreate = lazy(() => import('./pages/TasksCreate'))
const TasksDetail = lazy(() => import('./pages/TasksDetail'))
const MethodologySelection = lazy(() => import('./pages/MethodologySelection'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const MethodologyDashboard = lazy(() => import('./pages/MethodologyDashboard'))
const StartingUpProject = lazy(() => import('./pages/structured/StartingUpProject'))
const InitiatingProject = lazy(() => import('./pages/structured/InitiatingProject'))
const StageGates = lazy(() => import('./pages/structured/StageGates'))
const ControllingStage = lazy(() => import('./pages/structured/ControllingStage'))
const ManagingProductDelivery = lazy(() => import('./pages/structured/ManagingProductDelivery'))
const DirectingProject = lazy(() => import('./pages/structured/DirectingProject'))
const Issues = lazy(() => import('./pages/Issues'))
const Risks = lazy(() => import('./pages/Risks'))
const RiskDetail = lazy(() => import('./pages/RiskDetail'))
const RAIDLog = lazy(() => import('./pages/RAIDLog'))
const ProductBacklog = lazy(() => import('./pages/scrum/ProductBacklog'))
const SprintPlanning = lazy(() => import('./pages/scrum/SprintPlanning'))
const SprintBoard = lazy(() => import('./pages/scrum/SprintBoard'))
const DailyScrum = lazy(() => import('./pages/scrum/DailyScrum'))
const SprintReview = lazy(() => import('./pages/scrum/SprintReview'))
const SprintRetrospective = lazy(() => import('./pages/scrum/SprintRetrospective'))
const KanbanBoards = lazy(() => import('./pages/kanban/KanbanBoards'))
const KanbanBoard = lazy(() => import('./pages/kanban/KanbanBoard'))
const MetricsDashboard = lazy(() => import('./pages/kanban/MetricsDashboard'))
const Resources = lazy(() => import('./pages/Resources'))
const ResourceCapacity = lazy(() => import('./pages/ResourceCapacity'))
const ResourceDetail = lazy(() => import('./pages/ResourceDetail'))
const ResourceConflicts = lazy(() => import('./pages/ResourceConflicts'))
const Reports = lazy(() => import('./pages/Reports'))
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const BenefitsRealization = lazy(() => import('./pages/BenefitsRealization'))
const Dependencies = lazy(() => import('./pages/Dependencies'))
const IntegrationSync = lazy(() => import('./pages/IntegrationSync'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const EmailConfirmation = lazy(() => import('./pages/auth/EmailConfirmation'))
const RoleSelection = lazy(() => import('./pages/onboarding/RoleSelection'))
const PWAInstallPrompt = lazy(() => import('./components/PWAInstallPrompt'))

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
)

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* NidusHomepage - Completely standalone, no providers, instant load */}
        <Route path="/" element={<NidusHomepage />} />
          
          {/* Other homepages - lazy loaded with ThemeProvider */}
          <Route path="/pm" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <PlatformHomepage />
              </ThemeProvider>
            </Suspense>
          } />
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
          
          {/* App routes with providers - lazy loaded */}
          <Route path="app/*" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <ToastProvider>
                  <Suspense fallback={<LoadingFallback />}>
                    <Layout>
                      <Routes>
                        <Route path="dashboard" element={
                          <Suspense fallback={<LoadingFallback />}>
                            <ProtectedRoute>
                              <Dashboard />
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
                        <Route path="issues" element={
                          <Suspense fallback={<LoadingFallback />}>
                            <ProtectedRoute>
                              <Issues />
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
                              <BenefitsRealization />
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
                        <Route path="integrations" element={
                          <Suspense fallback={<LoadingFallback />}>
                            <ProtectedRoute>
                              <IntegrationSync />
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

          {/* Auth routes - lazy loaded with minimal providers */}
          <Route path="login" element={
            <Suspense fallback={<LoadingFallback />}>
              <ThemeProvider>
                <Login />
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

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
