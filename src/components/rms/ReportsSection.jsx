/**
 * Risk Reports Section Component
 * Simplified version
 */

import { useState, useEffect } from 'react'
import { getReports } from '../../services/rmsReportsService'

export default function ReportsSection({ rmsId, readOnly = false }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rmsId) {
      loadReports()
    }
  }, [rmsId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await getReports(rmsId)
      if (result.success) {
        setReports(result.data || [])
      }
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Risk Reports
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Risk management reports and their frequency
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p>No risk reports defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{report.report_name}</h4>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {report.report_type?.replace('_', ' ')}
                </span>
                {report.frequency && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                    {report.frequency?.replace('_', ' ')}
                  </span>
                )}
              </div>
              {report.report_description && <p className="text-gray-700 dark:text-gray-300 mb-2">{report.report_description}</p>}
              {report.recipients && (
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Recipients:</strong> {report.recipients}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
