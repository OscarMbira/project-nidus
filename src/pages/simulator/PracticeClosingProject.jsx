/**
 * Practice Closing a Project Page
 * End Project Report, Lessons Report, Benefits Review Plan handover
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, BookOpen, Target } from 'lucide-react'
import { getPracticeEndProjectReports } from '../../services/sim/practiceEndProjectReportService'
import { createPracticeLessonsReport } from '../../services/sim/practiceLessonsService'
import { getPracticeBenefitsReviewPlan } from '../../services/sim/practiceBenefitsService'

export default function PracticeClosingProject() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [endReports, setEndReports] = useState([])
  const [benefitsPlan, setBenefitsPlan] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportsResult, planResult] = await Promise.all([
        getPracticeEndProjectReports(projectId),
        getPracticeBenefitsReviewPlan(projectId)
      ])
      if (reportsResult.success) setEndReports(reportsResult.data || [])
      if (planResult.success) setBenefitsPlan(planResult.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Closing a Project</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This process closes the project. The main outputs are:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>End Project Report</li>
          <li>Lessons Report</li>
          <li>Benefits Review Plan handover</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" /> End Project Report
          </h3>
          <button onClick={() => navigate(`/simulator/practice-end-project-reports/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Report
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BookOpen className="h-5 w-5 mr-2" /> Lessons Report
          </h3>
          <button onClick={() => navigate(`/simulator/practice-lessons-reports/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Report
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2" /> Benefits Review Plan
          </h3>
          {benefitsPlan ? (
            <button onClick={() => navigate(`/simulator/practice-benefits-plan?projectId=${projectId}`)} className="text-blue-600 hover:text-blue-700">
              View Plan
            </button>
          ) : (
            <button onClick={() => navigate(`/simulator/practice-benefits-plan?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Plan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
