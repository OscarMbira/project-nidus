/**
 * Practice Controlling a Stage Page
 * Work package authorization, progress monitoring, exception handling
 */

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, FileText, AlertTriangle } from 'lucide-react'
import { getPracticeWorkPackages } from '../../services/sim/practiceWorkPackageService'
import { getPracticeCheckpointReports } from '../../services/sim/practiceCheckpointReportService'
import { getPracticeExceptionReports } from '../../services/sim/practiceExceptionReportService'

export default function PracticeControllingStage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [workPackages, setWorkPackages] = useState([])
  const [checkpointReports, setCheckpointReports] = useState([])
  const [exceptionReports, setExceptionReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('work-packages')

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [wpResult, checkpointResult, exceptionResult] = await Promise.all([
        getPracticeWorkPackages(projectId),
        getPracticeCheckpointReports(projectId),
        getPracticeExceptionReports(projectId)
      ])
      if (wpResult.success) setWorkPackages(wpResult.data || [])
      if (checkpointResult.success) setCheckpointReports(checkpointResult.data || [])
      if (exceptionResult.success) setExceptionReports(exceptionResult.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Practice: Controlling a Stage</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['work-packages', 'progress', 'exceptions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'work-packages' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Work Packages</h2>
                <button onClick={() => navigate(`/simulator/practice-work-packages/create?projectId=${projectId}`)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Work Package
                </button>
              </div>
              {workPackages.length === 0 ? (
                <p className="text-gray-500">No work packages found</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workPackages.map((wp) => (
                    <div key={wp.id} onClick={() => navigate(`/simulator/practice-work-packages/${wp.id}?projectId=${projectId}`)} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <h3 className="font-semibold">{wp.work_package_name}</h3>
                      <p className="text-sm text-gray-500">{wp.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'progress' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Checkpoint Reports</h2>
              {checkpointReports.length === 0 ? (
                <p className="text-gray-500">No checkpoint reports found</p>
              ) : (
                <div className="space-y-4">
                  {checkpointReports.map((report) => (
                    <div key={report.id} onClick={() => navigate(`/simulator/practice-checkpoint-reports/${report.id}?projectId=${projectId}`)} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <h3 className="font-semibold">{report.report_title || 'Checkpoint Report'}</h3>
                      <p className="text-sm text-gray-500">Date: {report.checkpoint_date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exceptions' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Exception Reports</h2>
              {exceptionReports.length === 0 ? (
                <p className="text-gray-500">No exception reports found</p>
              ) : (
                <div className="space-y-4">
                  {exceptionReports.map((report) => (
                    <div key={report.id} onClick={() => navigate(`/simulator/practice-exception-reports/${report.id}?projectId=${projectId}`)} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
                      <h3 className="font-semibold">{report.report_title}</h3>
                      <p className="text-sm text-gray-500">Date: {report.report_date}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
