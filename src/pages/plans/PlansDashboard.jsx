/**
 * Plans Dashboard Page
 * Shows all plans for a project
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { Plus, FileText, Calendar, LayoutDashboard } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { getProjectPlanByProject } from '../../services/projectPlanService'
import { getStagePlansByProject } from '../../services/stagePlanService'
import ProjectPlanCard from '../../components/plans/ProjectPlanCard'
import StagePlanCard from '../../components/plans/StagePlanCard'

export default function PlansDashboard() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const { theme } = useThemeContext()
  const [projectPlan, setProjectPlan] = useState(null)
  const [stagePlans, setStagePlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('project')

  useEffect(() => {
    if (projectId) {
      loadPlans()
    }
  }, [projectId])

  const loadPlans = async () => {
    try {
      setLoading(true)
      
      const projectPlanResult = await getProjectPlanByProject(projectId)
      if (projectPlanResult.success) {
        setProjectPlan(projectPlanResult.data)
      }
      
      const stagePlansResult = await getStagePlansByProject(projectId)
      if (stagePlansResult.success) {
        setStagePlans(stagePlansResult.data || [])
      }
    } catch (error) {
      console.error('Error loading plans:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plans</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Project plans and stage plans
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {projectId && (
              <Link
                to={`/pm/planning/executive?projectId=${encodeURIComponent(projectId)}`}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                View in Executive Mode
              </Link>
            )}
            {activeTab === 'project' && !projectPlan && (
              <button
                onClick={() => navigate(`/app/projects/${projectId}/plans/project-plan/create`)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project Plan
              </button>
            )}
            {activeTab === 'stage' && (
              <button
                onClick={() => navigate(`/app/projects/${projectId}/plans/stage-plan/create`)}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Stage Plan
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('project')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'project'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Project Plan
            </button>
            <button
              onClick={() => setActiveTab('stage')}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stage'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Stage Plans ({stagePlans.length})
            </button>
          </nav>
        </div>

        {activeTab === 'project' && (
          <div>
            {projectPlan ? (
              <ProjectPlanCard plan={projectPlan} projectId={projectId} />
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No project plan created yet</p>
                <button
                  onClick={() => navigate(`/app/projects/${projectId}/plans/project-plan/create`)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project Plan
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stage' && (
          <div>
            {stagePlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stagePlans.map(plan => (
                  <StagePlanCard key={plan.id} plan={plan} projectId={projectId} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No stage plans created yet</p>
                <button
                  onClick={() => navigate(`/app/projects/${projectId}/plans/stage-plan/create`)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Stage Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
