/**
 * Practice Managing Stage Boundaries Page
 * End Stage Report creation, Next Stage Plan preparation, Business Case update
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, ArrowRight } from 'lucide-react'
import { getPracticeEndStageReports } from '../../services/sim/practiceEndStageReportService'

export default function PracticeStageBoundaries() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadReports()
    }
  }, [projectId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await getPracticeEndStageReports(projectId)
      if (result.success) setReports(result.data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Managing Stage Boundaries</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Process Overview</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This process manages stage boundaries. The main activities are:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>End Stage Report creation</li>
          <li>Next Stage Plan preparation</li>
          <li>Business Case update</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">End Stage Reports</h2>
          <button onClick={() => navigate(`/simulator/practice-end-stage-reports/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create End Stage Report
          </button>
        </div>
        {reports.length === 0 ? (
          <p className="text-gray-500">No end stage reports found</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} onClick={() => navigate(`/simulator/practice-end-stage-reports/${report.id}?projectId=${projectId}`)} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                <h3 className="font-semibold">{report.report_title}</h3>
                <p className="text-sm text-gray-500">Date: {report.report_date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
