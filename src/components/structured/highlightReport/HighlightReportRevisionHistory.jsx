import { useState, useEffect } from 'react'
import { History } from 'lucide-react'
import { getRevisionHistory } from '../../../services/highlightReportRevisionService'
import { format } from 'date-fns'

export default function HighlightReportRevisionHistory({ reportId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    try {
      setLoading(true)
      const data = await getRevisionHistory(reportId)
      setHistory(data || [])
    } catch (e) {
      console.warn('Load revision history:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Loading revision history…
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
          Version history and change tracking for this highlight report.
        </p>
      </div>

      <div className="space-y-3">
        {history.map((r) => (
          <div
            key={r.id}
            className="border-l-4 border-blue-500 pl-4 py-3 bg-white dark:bg-gray-800 rounded-r-lg"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">Version {r.version_number}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {format(new Date(r.revision_date), 'MMM dd, yyyy')}
              </span>
            </div>
            {r.previous_version_number && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Previous: {r.previous_version_number}</p>
            )}
            {r.summary_of_changes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{r.summary_of_changes}</p>
            )}
            {r.changes_marked && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Changes marked: {r.changes_marked}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
