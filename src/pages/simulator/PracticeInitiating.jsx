/**
 * Practice Initiating a Project Page
 * Trigger: Initiation stage authorized
 * Outputs: PID, Business Case (detailed), Project Plan
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import { getPracticePIDs } from '../../services/sim/practicePIDService'
import { getPracticeBusinessCases } from '../../services/sim/practiceBusinessCaseService'
import { getPracticePlan } from '../../services/sim/practicePlanService'

export default function PracticeInitiating() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [pid, setPid] = useState(null)
  const [businessCase, setBusinessCase] = useState(null)
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
      const [pidResult, caseResult, planResult] = await Promise.all([
        getPracticePIDs(projectId),
        getPracticeBusinessCases(projectId),
        getPracticePlan(projectId)
      ])
      if (pidResult.success && pidResult.data?.length > 0) setPid(pidResult.data[0])
      if (caseResult.success && caseResult.data?.length > 0) setBusinessCase(caseResult.data[0])
      if (planResult.success) setPlan(planResult.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Initiating a Project</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This process is triggered when the Initiation stage is authorized. The main outputs are:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>Project Initiation Document (PID)</li>
          <li>Business Case (detailed)</li>
          <li>Project Plan</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">PID</h3>
          {pid ? (
            <button onClick={() => navigate(`/simulator/practice-pids/${pid.id}?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
              View PID <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button onClick={() => navigate(`/simulator/practice-pids/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create PID
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Business Case</h3>
          {businessCase ? (
            <button onClick={() => navigate(`/simulator/practice-business-cases/${businessCase.id}?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
              View Business Case <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button onClick={() => navigate(`/simulator/practice-business-cases/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Business Case
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Project Plan</h3>
          {plan ? (
            <button onClick={() => navigate(`/simulator/practice-plans/${plan.id}?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700 inline-flex items-center">
              View Plan <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          ) : (
            <button onClick={() => navigate(`/simulator/practice-plans/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
