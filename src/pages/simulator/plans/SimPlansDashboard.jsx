import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, FileText, Calendar } from 'lucide-react'
import { useThemeContext } from '../../../context/ThemeContext'
import { getPracticePlan } from '../../../services/sim/practicePlanService'
import { getPracticeStagePlansByProject } from '../../../services/sim/practiceStageplanService'

export default function SimPlansDashboard() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { theme } = useThemeContext()
  const [projectPlan, setProjectPlan] = useState(null)
  const [stagePlans, setStagePlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('project')
  const base = `/simulator/practice-projects/${projectId}/plans`

  useEffect(() => {
    if (projectId) loadPlans()
  }, [projectId])

  const loadPlans = async () => {
    try {
      setLoading(true)
      const planRes = await getPracticePlan(projectId)
      if (planRes.success) setProjectPlan(planRes.data)
      const stageRes = await getPracticeStagePlansByProject(projectId)
      if (stageRes.success) setStagePlans(stageRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link to={`/simulator/practice-projects/${projectId}`} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← Practice project
          </Link>
        </div>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plans</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Project and stage plans</p>
          </div>
          {activeTab === 'project' && !projectPlan && (
            <button
              type="button"
              onClick={() => navigate(`${base}/project-plan/create`)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project Plan
            </button>
          )}
          {activeTab === 'stage' && projectPlan && (
            <button
              type="button"
              onClick={() => navigate(`${base}/stage-plan/create`)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Stage Plan
            </button>
          )}
        </div>

        <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('project')}
            className={`flex items-center py-4 border-b-2 text-sm font-medium ${
              activeTab === 'project'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Project Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stage')}
            className={`flex items-center py-4 border-b-2 text-sm font-medium ${
              activeTab === 'stage'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Stage Plans ({stagePlans.length})
          </button>
        </nav>

        {activeTab === 'project' && (
          projectPlan ? (
            <button
              type="button"
              onClick={() => navigate(`${base}/project-plan`)}
              className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {projectPlan.plan_title || 'Project plan'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {projectPlan.plan_purpose || projectPlan.plan_scope}
              </p>
            </button>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 mb-4">No project plan yet</p>
              <button
                type="button"
                onClick={() => navigate(`${base}/project-plan/create`)}
                className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Project Plan
              </button>
            </div>
          )
        )}

        {activeTab === 'stage' && (
          stagePlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stagePlans.map((plan, index) => (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Stage {plan.stage_number}: {plan.stage_title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 capitalize">{plan.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {projectPlan ? 'No stage plans yet' : 'Create a project plan first'}
              </p>
              {projectPlan && (
                <button
                  type="button"
                  onClick={() => navigate(`${base}/stage-plan/create`)}
                  className="inline-flex items-center px-4 py-2 text-sm text-white bg-blue-600 rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Stage Plan
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
