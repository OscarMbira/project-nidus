/**
 * Practice End Project Report List Page
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { getPracticeEndProjectReports } from '../../services/sim/practiceEndProjectReportService'
import ExportListMenu from '../../components/ui/ExportListMenu'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const PRACTICE_END_PROJECT_COLUMNS = [
  { key: 'report_title', label: 'Title' },
  { key: 'report_date', label: 'Date' }
]

export default function PracticeEndProjectReportList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) loadReports()
  }, [projectId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await getPracticeEndProjectReports(projectId)
      if (result.success) setReports(result.data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice End Project Reports</h1>
        <div className="flex gap-2">
          <ExportListMenu columns={PRACTICE_END_PROJECT_COLUMNS} data={reports} baseFilename="PracticeEndProjectReports" disabled={!reports.length} />
          <button onClick={() => navigate(`/simulator/practice-end-project-reports/create?projectId=${projectId}`)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-5 w-5 mr-2" /> Create Report
          </button>
        </div>
      </div>
      {loading ? <div className="text-center py-12">Loading...</div> : reports.length === 0 ? <div className="text-center py-12 text-gray-500">No end project reports found</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, index) => (
            <div key={report.id} onClick={() => navigate(`/simulator/practice-end-project-reports/${report.id}?projectId=${projectId}`)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{report.report_title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Date: {report.report_date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
