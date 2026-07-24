/**
 * Practice Starting Up a Project Page
 * Trigger: Project Mandate received
 * Outputs: Project Brief (draft), Stage Plan (Initiation)
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import { getPracticeBriefs } from '../../services/sim/practiceBriefService'
import { getPracticePlan } from '../../services/sim/practicePlanService'

export default function PracticeStartingUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [brief, setBrief] = useState(null)
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [briefResult, planResult] = await Promise.all([
        getPracticeBriefs(projectId),
        getPracticePlan(projectId)
      ])
      if (briefResult.success && briefResult.data?.length > 0) setBrief(briefResult.data[0])
      if (planResult.success) setPlan(planResult.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Starting Up a Project</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This process is triggered when a Project Mandate is received. The main outputs are:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>Project Brief (draft)</li>
          <li>Stage Plan for Initiation</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" /> Project Brief
          </h3>
          {brief ? (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{brief.brief_title}</p>
              <button onClick={() => navigate(`/simulator/practice-briefs/${brief.id}?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
                View Brief <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-4">No brief created yet</p>
              <button onClick={() => navigate(`/simulator/practice-briefs/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Brief
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" /> Stage Plan (Initiation)
          </h3>
          {plan ? (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.plan_title}</p>
              <button onClick={() => navigate(`/simulator/practice-plans/${plan.id}?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
                View Plan <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-4">No plan created yet</p>
              <button onClick={() => navigate(`/simulator/practice-plans/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
