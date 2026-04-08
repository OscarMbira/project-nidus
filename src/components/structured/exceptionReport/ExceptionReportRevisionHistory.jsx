import { useState, useEffect } from 'react'
import { History, User, Calendar } from 'lucide-react'
import { getVersionHistory } from '../../../services/exceptionReportVersionService'
import { format } from 'date-fns'

export default function ExceptionReportRevisionHistory({ reportId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadHistory()
    }
  }, [reportId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const data = await getVersionHistory(reportId)
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading revision history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Loading revision history...
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No revision history</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <History className="h-5 w-5" />
          Revision History
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Complete version history and change tracking for this exception report.
        </p>
      </div>

      <div className="space-y-3">
        {history.map((revision, index) => (
          <div
            key={revision.id || index}
            className="border-l-4 border-blue-500 pl-4 py-3 bg-white dark:bg-gray-800 rounded-r-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Version {revision.version_no}
                  </span>
                  <span className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    {revision.revision_date ? format(new Date(revision.revision_date), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-1 text-xs rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Current
                    </span>
                  )}
                </div>
                {revision.previous_revision_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Previous revision: {format(new Date(revision.previous_revision_date), 'MMM dd, yyyy')}
                  </p>
                )}
                {revision.summary_of_changes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {revision.summary_of_changes}
                  </p>
                )}
                {revision.changes_marked && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Changes marked:</strong> {revision.changes_marked}
                  </p>
                )}
              </div>
              {revision.revised_by_user && (
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {revision.revised_by_user?.full_name || revision.revised_by_user?.email || 'Unknown'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
